const { Auction, Bid } = require("../models");

const { auctionSchema } = require("../validations/auction");
const { redis } = require("../config/redis");
const sendEmail = require("../utils/sendEmail");
async function handleCreateAuction(req, res) {
	try {
		const {
			itemName,
			description,
			startingPrice,
			bidIncrement,
			goLiveTime,
			duration,
		} = auctionSchema.parse(req.body);

		const auction = await Auction.create({
			sellerId: req.user.id,
			itemName,
			description,
			startingPrice,
			bidIncrement,
			goLiveTime: new Date(goLiveTime),
			duration,
			status: new Date(goLiveTime) <= new Date() ? "active" : "upcoming",
		});

		res.status(201).json({ success: true, auction });
	} catch (error) {
		if (error.name === "ZodError") {
			return res.status(400).json({
				errors: error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			});
		}
		res.status(500).json({ message: error.message });
	}
}

async function handleGetAllAuction(req, res) {
	try {
		const auctions = await Auction.findAll({
			order: [["goLiveTime", "DESC"]],
		});
		res.json({ success: true, auctions });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}
async function handleGetAuctionById(req, res) {
	try {
		// Fetch auction details with associated seller and bids (highest bid)
		const auction = await Auction.findByPk(req.params.id, {
			include: [
				{
					model: User,
					as: "seller",
					attributes: ["id", "name", "email"],
				},
				{
					model: Bid,
					as: "bids",
					limit: 1, // Get only the highest bid
					order: [["amount", "DESC"]],
					include: [
						{
							model: User,
							as: "bidder",
							attributes: ["id", "name", "email"],
						},
					],
				},
			],
		});

		if (!auction) {
			return res.status(404).json({ message: "Auction not found" });
		}

		// Compute status
		const goLiveDate = new Date(auction.goLiveTime);
		const now = new Date();
		const endDate = new Date(
			goLiveDate.getTime() + auction.duration * 60000
		);

		let computedStatus = "upcoming";
		if (now >= goLiveDate && now <= endDate) {
			computedStatus = "active";
		} else if (now > endDate) {
			computedStatus = "closed";
		}

		// Extract highest bid data
		const highestBidData = auction.bids.length > 0 ? auction.bids[0] : null;

		let changed = false;

		// Update status if changed
		if (auction.status !== computedStatus) {
			auction.status = computedStatus;
			changed = true;
		}

		// If auction closed, update highestBidId and winnerId from highest bid
		let winnerDetails = null;
		if (computedStatus === "closed" && highestBidData) {
			if (!auction.highestBidId) {
				auction.highestBidId = highestBidData.id;
				changed = true;
			}
			if (!auction.winnerId) {
				auction.winnerId = highestBidData.bidder.id;
				changed = true;
			}

			// Set winnerDetails from highest bidder
			winnerDetails = {
				id: highestBidData.bidder.id,
				name: highestBidData.bidder.name,
				email: highestBidData.bidder.email,
			};
		}

		if (changed) {
			await auction.save();
		}

		const highestBidDetails = highestBidData
			? {
					id: highestBidData.id,
					amount: parseFloat(highestBidData.amount),
					bidder: highestBidData.bidder,
			  }
			: null;

		const responseData = {
			success: true,
			auction: auction.toJSON(),
			highestBidDetails,
			winnerDetails,
		};

		if (computedStatus === "closed") {
			responseData.auction.statusAfterBid = auction.statusAfterBid;
			responseData.auction.counterOfferPrice = auction.counterOfferPrice;
		}

		delete responseData.auction.bids;

		res.json(responseData);
	} catch (error) {
		console.error("Error fetching auction:", error);
		res.status(500).json({ message: error.message });
	}
}

async function handleUpdateAuction(req, res) {
	try {
		const auction = await Auction.findByPk(req.params.id);
		if (!auction)
			return res.status(404).json({ message: "Auction not found" });
		if (auction.sellerId !== req.user.id)
			return res
				.status(403)
				.json({ message: "Forbidden: Not the owner" });

		const updates = auctionSchema.partial().parse(req.body); // allow partial updates
		await auction.update(updates);

		res.json({ success: true, auction });
	} catch (error) {
		if (error.name === "ZodError") {
			return res.status(400).json({
				errors: error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			});
		}
		res.status(500).json({ message: error.message });
	}
}

async function handleDeleteAuction(req, res) {
	try {
		const auction = await Auction.findByPk(req.params.id);
		if (!auction)
			return res.status(404).json({ message: "Auction not found" });
		if (auction.sellerId !== req.user.id)
			return res
				.status(403)
				.json({ message: "Forbidden: Not the owner" });

		await auction.destroy();
		res.json({ success: true, message: "Auction deleted" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function handleGetMyAuctions(req, res) {
	try {
		const auctions = await Auction.findAll({
			where: { sellerId: req.user.id },
			order: [["goLiveTime", "DESC"]],
		});
		res.json({ success: true, auctions });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

const { getIO } = require("../sockets/io");
const PDFDocument = require("pdfkit");
const { User } = require("../models");
async function handlePlaceBid(req, res) {
	const { auctionId, amount, socketId } = req.body;

	try {
		const auction = await Auction.findByPk(auctionId);
		if (!auction) {
			return res.status(404).json({ message: "Auction not found" });
		}

		const auctionStartTime = new Date(auction.goLiveTime);
		const currentTime = new Date();

		if (currentTime < auctionStartTime) {
			return res
				.status(400)
				.json({ message: "Auction has not started yet" });
		}

		// Get current highest bid from Redis
		let highestBidderData = await getHighestBid(auctionId);

		// If no current highest bid, start with starting price
		if (!highestBidderData) {
			highestBidderData = {
				name: req.user.name,
				email: req.user.email,
				bid: parseFloat(auction.startingPrice),
				socket: socketId,
			};
			await updateHighestBid(auctionId, highestBidderData);
		}

		// Validate bid amount
		if (amount <= highestBidderData.bid) {
			return res.status(400).json({
				message: `Bid must be higher than current bid of ₹${highestBidderData.bid}`,
			});
		}

		// New highest bid data
		const newBidderData = {
			name: req.user.name,
			email: req.user.email,
			bid: amount,
			socket: socketId,
		};

		// Update Redis
		await updateHighestBid(auctionId, newBidderData);

		// Save bid in DB
		await Bid.create({
			auctionId: auction.id,
			amount,
			bidderId: req.user.id,
		});

		// Broadcast to all in the auction room
		const io = getIO();
		io.to(auctionId).emit("bidUpdated", {
			...newBidderData,
			message: `New highest bid by ${
				req.user.name
			}: ₹${amount.toLocaleString()}`,
		});

		res.json({
			success: true,
			auction,
			highestBid: newBidderData,
		});
	} catch (error) {
		console.error("Error placing bid:", error);
		res.status(500).json({ message: error.message });
	}
}

// Seller accepts the highest bid
async function handleAcceptBid(req, res) {
	try {
		const auction = await Auction.findByPk(req.params.id, {
			include: [
				{
					model: Bid,
					as: "bids",
					order: [["amount", "DESC"]],
					limit: 1,
					include: [{ model: User, as: "bidder" }],
				},
				{ model: User, as: "seller" },
			],
		});
		if (!auction)
			return res.status(404).json({ message: "Auction not found" });
		if (auction.sellerId !== req.user.id)
			return res.status(403).json({ message: "Forbidden" });

		const highest = auction.bids.length > 0 ? auction.bids[0] : null; // Get highest bid from included data
		if (!highest)
			return res.status(400).json({ message: "No bids to accept" });

		// Update auction details
		auction.winnerId = highest.bidder.id; // Use bidder's ID from the included highest bid
		auction.status = "closed";
		auction.statusAfterBid = "accepted"; // Set statusAfterBid to accepted
		auction.highestBidId = highest.id; // Set highestBidId
		await auction.save();

		// Notify via email
		await sendEmail({
			to: highest.bidder.email,
			subject: "Your bid has been accepted!",
			text: `Congratulations! Your bid of ₹${parseFloat(
				highest.amount
			).toLocaleString()} for "${auction.itemName}" has been accepted.`,
		});

		const io = getIO();
		io.to(auction.id).emit("bidAccepted", {
			auctionId: auction.id,
			amount: parseFloat(highest.amount),
			winnerId: highest.bidder.id,
		});

		res.json({
			success: true,
			message: "Bid accepted",
			amount: parseFloat(highest.amount),
		});
	} catch (error) {
		console.error("Error accepting bid:", error);
		res.status(500).json({ message: error.message });
	}
}

async function handleRejectBid(req, res) {
	try {
		const auction = await Auction.findByPk(req.params.id, {
			include: [{ model: Bid, as: "bids" }],
		});
		if (!auction)
			return res.status(404).json({ message: "Auction not found" });
		if (auction.sellerId !== req.user.id)
			return res.status(403).json({ message: "Forbidden" });

		const highest = await Bid.findOne({
			where: { auctionId: auction.id },
			order: [["amount", "DESC"]],
			include: [{ model: User, as: "bidder" }],
		});

		auction.status = "closed";
		auction.statusAfterBid = "rejected";
		await auction.save();

		// Notify via email
		if (highest) {
			await sendEmail({
				to: highest.bidder.email,
				subject: "Your bid was rejected",
				text: `Sorry, your bid of ₹${highest.amount} for "${auction.itemName}" was rejected by the seller.`,
			});
		}

		const io = getIO();
		io.to(auction.id).emit("bidRejected", { auctionId: auction.id });

		res.json({ success: true, message: "Bid rejected" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function handleCounterOffer(req, res) {
	const { amount } = req.body;
	try {
		const auction = await Auction.findByPk(req.params.id);
		if (!auction)
			return res.status(404).json({ message: "Auction not found" });
		if (auction.sellerId !== req.user.id)
			return res.status(403).json({ message: "Forbidden" });

		const highest = await Bid.findOne({
			where: { auctionId: auction.id },
			order: [["amount", "DESC"]],
			include: [{ model: User, as: "bidder" }],
		});
		if (!highest)
			return res.status(400).json({ message: "No bids to counter" });

		// NEW: Update auction with counter offer details
		auction.statusAfterBid = "countered";
		auction.counterOfferPrice = parseFloat(amount); // Ensure it's stored as a number/decimal
		await auction.save(); // Save the changes to the database

		// Notify via email
		await sendEmail({
			to: highest.bidder.email,
			subject: "Seller sent a counter-offer",
			text: `The seller has sent a counter-offer of ₹${amount} for "${auction.itemName}".`,
		});

		const io = getIO();
		io.to(auction.id).emit("counterOffer", {
			auctionId: auction.id,
			bidderId: highest.bidderId,
			amount,
		});

		res.json({ success: true, message: "Counter-offer sent", amount });
	} catch (error) {
		console.error("Error sending counter-offer:", error);
		res.status(500).json({ message: error.message });
	}
}

async function handleCounterResponse(req, res) {
	const { accept } = req.body; 
	try {
		const auction = await Auction.findByPk(req.params.id, {
			include: [
				{
					model: Bid,
					as: "bids",
					order: [["amount", "DESC"]],
					limit: 1,
					include: [{ model: User, as: "bidder" }],
				},
				{ model: User, as: "seller" },
			],
		});

		if (!auction)
			return res.status(404).json({ message: "Auction not found" });

		const highestBid = auction.bids.length > 0 ? auction.bids[0] : null;

		if (
			!highestBid ||
			highestBid.bidderId !== req.user.id ||
			auction.statusAfterBid !== "countered"
		) {
			return res.status(403).json({
				message:
					"Forbidden: Not eligible to respond to this counter-offer.",
			});
		}

		const io = getIO();
		const counterOfferAmount = auction.counterOfferPrice;

		if (accept) {
			auction.winnerId = req.user.id;
			auction.status = "closed";
			auction.statusAfterBid = "accepted";

			await auction.save();

			// Notify seller via email
			await sendEmail({
				to: auction.seller.email,
				subject: "Counter-offer Accepted!",
				text: `Good news! Your counter-offer of ₹${parseFloat(
					counterOfferAmount
				).toLocaleString()} for "${
					auction.itemName
				}" has been accepted by ${highestBid.bidder.name}.`,
			});

			io.to(auction.id).emit("counterAccepted", {
				auctionId: auction.id,
				amount: parseFloat(counterOfferAmount),
				winnerId: req.user.id,
			});

			res.json({
				success: true,
				message: "Counter Offer accepted",
				amount: parseFloat(counterOfferAmount),
			});
		} else {
			auction.status = "closed";
			auction.statusAfterBid = "rejected";
			auction.winnerId = null;
			auction.counterOfferPrice = null;

			await auction.save();

			// Notify seller via email
			await sendEmail({
				to: auction.seller.email,
				subject: "Counter Offer Rejected",
				text: `Unfortunately, your counter-offer of ₹${parseFloat(
					counterOfferAmount
				).toLocaleString()} for "${auction.itemName}" was rejected by ${
					highestBid.bidder.name
				}.`,
			});

			io.to(auction.id).emit("counterRejected", {
				auctionId: auction.id,
			});

			res.json({ success: true, message: "Counter Offer rejected" });
		}
	} catch (error) {
		console.error("Error responding to counter-offer:", error);
		res.status(500).json({ message: error.message });
	}
}

// Generate and send invoice PDF for closed auctions
async function handleGetInvoice(req, res) {
	try {
		const auction = await Auction.findByPk(req.params.id);
		if (!auction || auction.status !== "closed" || !auction.winnerId) {
			return res.status(400).json({ message: "Invoice not available" });
		}
		const seller = await User.findByPk(auction.sellerId);
		const buyer = await User.findByPk(auction.winnerId);
		const doc = new PDFDocument({ size: "A4", margin: 50 });
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=invoice-${auction.id}.pdf`
		);
		doc.fontSize(20).text("Invoice", { align: "center" }).moveDown();
		doc.fontSize(12)
			.text(`Auction ID: ${auction.id}`)
			.text(`Item: ${auction.itemName}`)
			.text(
				`Final Price: ₹${(
					auction.highestBid || auction.startingPrice
				).toLocaleString()}`
			)
			.moveDown()
			.text("Seller Details:", { underline: true })
			.text(`Name: ${seller.name}`)
			.text(`Email: ${seller.email}`)
			.moveDown()
			.text("Buyer Details:", { underline: true })
			.text(`Name: ${buyer.name}`)
			.text(`Email: ${buyer.email}`)
			.moveDown()
			.text(`Date: ${new Date().toLocaleDateString()}`);
		doc.end();
		doc.pipe(res);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

// Redis helpers
async function getHighestBid(roomId) {
	const jsonData = await redis.get(`auction:${roomId}:highestBid`);
	return jsonData ? JSON.parse(jsonData) : null;
}

async function updateHighestBid(roomId, bidderData) {
	await redis.set(`auction:${roomId}:highestBid`, JSON.stringify(bidderData));
}

module.exports = {
	handleCreateAuction,
	handleGetAllAuction,
	handleGetAuctionById,
	handleUpdateAuction,
	handleDeleteAuction,
	handleGetMyAuctions,
	handlePlaceBid,
	handleAcceptBid,
	handleRejectBid,
	handleCounterOffer,
	handleCounterResponse,
	handleGetInvoice,
};
