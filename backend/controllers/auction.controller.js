const { Auction, Bid, User } = require("../models");

const { auctionSchema } = require("../validations/auction");
const { redis } = require("../config/redis");
const sendEmail = require("../utils/sendEmail");
const { getIO } = require("../sockets/io");
const PDFDocument = require("pdfkit");
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
		if (
			currentTime >
			new Date(auctionStartTime.getTime() + auction.duration * 60000)
		) {
			return res
				.status(400)
				.json({ message: "Auction has already ended" });
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

		// Notify previous highest bidder they've been outbid
		if (
			highestBidderData.name &&
			highestBidderData.email !== req.user.email
		) {
			io.to(auctionId).emit("outbid", {
				previousBidder: highestBidderData.email,
				message: `You have been outbid! New highest bid: ₹${amount.toLocaleString()}`,
				newAmount: amount,
			});
		}

		// Notify seller of new bid
		io.to(auctionId).emit("newBidNotification", {
			seller: auction.sellerId,
			message: `New bid placed: ₹${amount.toLocaleString()} by ${
				req.user.name
			}`,
			bidder: req.user.name,
			amount: amount,
		});

		// Broadcast bid update to all participants with clear messages for different user types
		io.to(auctionId).emit("bidUpdated", {
			...newBidderData,
			message: `New highest bid: ₹${amount.toLocaleString()}`,
			bidderMessage: `Your bid of ₹${amount.toLocaleString()} is now the highest!`,
			sellerMessage: `New bid received: ₹${amount.toLocaleString()} from ${
				req.user.name
			}`,
			viewerMessage: `New highest bid: ₹${amount.toLocaleString()} by ${
				req.user.name
			}`,
			bidderName: req.user.name,
			bidderId: req.user.id,
			sellerId: auction.sellerId,
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

		// Generate PDF invoice
		const pdfData = await generateInvoicePDF(
			auction,
			highest.bidder,
			auction.seller
		);

		// Send confirmation email to both buyer and seller with invoice attachment
		const finalPrice = auction.counterOfferPrice || highest.amount;

		// Send email to buyer
		await sendEmail({
			to: highest.bidder.email,
			subject: `Auction Won: Your bid for ${auction.itemName} has been accepted - Payment and Invoice Details Enclosed`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
					<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
						<h1 style="color: #4CAF50; text-align: center; margin-bottom: 30px;">Congratulations!</h1>
						
						<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Your Bid Has Been Accepted</h2>
						
						<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
							<h3 style="color: #555; margin-top: 0;">Transaction Details:</h3>
							<p><strong>Item:</strong> ${auction.itemName}</p>
							<p><strong>Description:</strong> ${auction.description || "N/A"}</p>
							<p><strong>Final Price:</strong> <span style="color: #4CAF50; font-size: 1.2em; font-weight: bold;">₹${parseFloat(
								finalPrice
							).toLocaleString()}</span></p>
							<p><strong>Seller:</strong> ${auction.seller.name}</p>
						</div>
						
						<div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
							<h4 style="color: #1976D2; margin-top: 0;">Next Steps:</h4>
							<ul style="color: #333; margin: 0;">
								<li>Please check the attached invoice for complete transaction details</li>
								<li>The seller will contact you soon for payment and delivery arrangements</li>
								<li>Keep this email for your records</li>
							</ul>
						</div>
						
						<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
							<p>Thank you for using our auction platform!</p>
							<p style="color: #999;">This is an automated email. Please do not reply.</p>
						</div>
					</div>
				</div>
			`,
			attachments: [
				{
					filename: `invoice-${auction.id}.pdf`,
					content: pdfData.toString("base64"),
					type: "application/pdf",
					disposition: "attachment",
				},
			],
		});

		// Send email to seller
		await sendEmail({
			to: auction.seller.email,
			subject: `Sale Completed: Your auction for ${
				auction.itemName
			} has been sold for Rs.${parseFloat(
				finalPrice
			).toLocaleString()} - Invoice and Details Enclosed`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
					<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
						<h1 style="color: #FF9800; text-align: center; margin-bottom: 30px;">Auction Sold!</h1>
						
						<h2 style="color: #333; border-bottom: 2px solid #FF9800; padding-bottom: 10px;">Your Item Has Been Sold</h2>
						
						<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
							<h3 style="color: #555; margin-top: 0;">Sale Details:</h3>
							<p><strong>Item:</strong> ${auction.itemName}</p>
							<p><strong>Starting Price:</strong> ₹${parseFloat(
								auction.startingPrice
							).toLocaleString()}</p>
							<p><strong>Final Sale Price:</strong> <span style="color: #FF9800; font-size: 1.2em; font-weight: bold;">₹${parseFloat(
								finalPrice
							).toLocaleString()}</span></p>
							<p><strong>Buyer:</strong> ${highest.bidder.name} (${highest.bidder.email})</p>
						</div>
						
						<div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50;">
							<h4 style="color: #2E7D32; margin-top: 0;">Next Steps:</h4>
							<ul style="color: #333; margin: 0;">
								<li>The buyer has been notified and will contact you for payment</li>
								<li>Please arrange delivery once payment is confirmed</li>
								<li>Invoice attached for your records</li>
								<li>Congratulations on your successful sale!</li>
							</ul>
						</div>
						
						<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
							<p>Thank you for using our auction platform!</p>
							<p style="color: #999;">This is an automated email. Please do not reply.</p>
						</div>
					</div>
				</div>
			`,
			attachments: [
				{
					filename: `invoice-${auction.id}.pdf`,
					content: pdfData.toString("base64"),
					type: "application/pdf",
					disposition: "attachment",
				},
			],
		});

		const io = getIO();
		io.to(auction.id).emit("bidAccepted", {
			auctionId: auction.id,
			amount: parseFloat(highest.amount),
			winnerId: highest.bidder.id,
			winnerName: highest.bidder.name,
			sellerMessage: `You accepted the bid of ₹${parseFloat(
				highest.amount
			).toLocaleString()} from ${highest.bidder.name}`,
			winnerMessage: `Congratulations! Your bid of ₹${parseFloat(
				highest.amount
			).toLocaleString()} has been accepted by the seller`,
			viewerMessage: `Auction completed! Winning bid: ₹${parseFloat(
				highest.amount
			).toLocaleString()} by ${highest.bidder.name}`,
			sellerName: auction.seller.name,
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
			include: [
				{ model: Bid, as: "bids" },
				{ model: User, as: "seller" },
			],
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

		// Notify via email with proper HTML formatting
		if (highest) {
			await sendEmail({
				to: highest.bidder.email,
				subject: `Auction Result: Your bid for ${auction.itemName} was not accepted by the seller`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
						<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
							<h1 style="color: #f44336; text-align: center; margin-bottom: 30px;">Bid Rejected</h1>
							
							<h2 style="color: #333; border-bottom: 2px solid #f44336; padding-bottom: 10px;">Unfortunately, Your Bid Was Not Accepted</h2>
							
							<div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
								<h3 style="color: #555; margin-top: 0;">Bid Details:</h3>
								<p><strong>Item:</strong> ${auction.itemName}</p>
								<p><strong>Your Bid Amount:</strong> ₹${parseFloat(
									highest.amount
								).toLocaleString()}</p>
								<p><strong>Status:</strong> <span style="color: #f44336; font-weight: bold;">Rejected by Seller</span></p>
							</div>
							
							<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
								<h4 style="color: #1976D2; margin-top: 0;">Don't Give Up!</h4>
								<p style="color: #333; margin: 10px 0 0 0;">Keep browsing our platform for other exciting auctions. Better luck next time!</p>
							</div>
							
							<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
								<p>Thank you for participating in our auction!</p>
								<p style="color: #999;">This is an automated email. Please do not reply.</p>
							</div>
						</div>
					</div>
				`,
				text: `Sorry, your bid of ₹${parseFloat(
					highest.amount
				).toLocaleString()} for "${
					auction.itemName
				}" was rejected by the seller.`,
			});

			// Also send notification email to seller confirming the rejection
			await sendEmail({
				to: auction.seller.email,
				subject: `Action Confirmed: You have successfully rejected the bid for ${auction.itemName}`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
						<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
							<h1 style="color: #FF9800; text-align: center; margin-bottom: 30px;">Bid Rejection Confirmed</h1>
							
							<h2 style="color: #333; border-bottom: 2px solid #FF9800; padding-bottom: 10px;">Bid Successfully Rejected</h2>
							
							<div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
								<h3 style="color: #555; margin-top: 0;">Rejection Details:</h3>
								<p><strong>Item:</strong> ${auction.itemName}</p>
								<p><strong>Rejected Bid:</strong> ₹${parseFloat(
									highest.amount
								).toLocaleString()}</p>
								<p><strong>Bidder:</strong> ${highest.bidder.name}</p>
								<p><strong>Status:</strong> <span style="color: #f44336; font-weight: bold;">Auction Closed - No Winner</span></p>
							</div>
							
							<div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50;">
								<h4 style="color: #2E7D32; margin-top: 0;">Next Steps:</h4>
								<p style="color: #333; margin: 10px 0 0 0;">The bidder has been notified. You can create a new auction with different terms if desired.</p>
							</div>
							
							<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
								<p>Thank you for using our auction platform!</p>
								<p style="color: #999;">This is an automated email. Please do not reply.</p>
							</div>
						</div>
					</div>
				`,
			});
		}

		const io = getIO();
		io.to(auction.id).emit("bidRejected", {
			auctionId: auction.id,
			rejectedAmount: parseFloat(highest.amount),
			rejectedBidderName: highest.bidder.name,
			sellerMessage: `You rejected the bid of ₹${parseFloat(
				highest.amount
			).toLocaleString()} from ${highest.bidder.name}`,
			bidderMessage: `Your bid of ₹${parseFloat(
				highest.amount
			).toLocaleString()} was not accepted by the seller`,
			viewerMessage: `Auction ended - highest bid of ₹${parseFloat(
				highest.amount
			).toLocaleString()} was not accepted`,
		});

		res.json({ success: true, message: "Bid rejected" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function handleCounterOffer(req, res) {
	const { amount } = req.body;
	try {
		const auction = await Auction.findByPk(req.params.id, {
			include: [{ model: User, as: "seller" }],
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
		if (!highest)
			return res.status(400).json({ message: "No bids to counter" });
		if (parseFloat(amount) <= parseFloat(highest.amount))
			return res
				.status(400)
				.json({
					message:
						"Counter offer must be higher than the highest bid",
				});
		auction.statusAfterBid = "countered";
		auction.counterOfferPrice = parseFloat(amount); 
		await auction.save(); 

		await sendEmail({
			to: highest.bidder.email,
			subject: `Counter Offer Proposal: Seller has made a Counter Offer of Rs.${parseFloat(
				amount
			).toLocaleString()} for ${auction.itemName} - Response Required`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
					<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
						<h1 style="color: #FF9800; text-align: center; margin-bottom: 30px;">Counter Offer Received</h1>
						
						<h2 style="color: #333; border-bottom: 2px solid #FF9800; padding-bottom: 10px;">The Seller Has Made a Counter Offer</h2>
						
						<div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
							<h3 style="color: #555; margin-top: 0;">Offer Details:</h3>
							<p><strong>Item:</strong> ${auction.itemName}</p>
							<p><strong>Your Original Bid:</strong> ₹${parseFloat(
								highest.amount
							).toLocaleString()}</p>
							<p><strong>Seller's Counter Offer:</strong> <span style="color: #FF9800; font-size: 1.2em; font-weight: bold;">₹${parseFloat(
								amount
							).toLocaleString()}</span></p>
							<p><strong>Seller:</strong> ${auction.seller.name}</p>
						</div>
						
						<div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
							<h4 style="color: #1976D2; margin-top: 0;">Action Required:</h4>
							<ul style="color: #333; margin: 0;">
								<li>Please log in to your account to accept or reject this Counter Offer</li>
								<li>You have the choice to accept the new price or decline</li>
								<li>The seller is waiting for your response</li>
							</ul>
						</div>
						
						<div style="text-align: center; margin-top: 30px;">
							<p style="background-color: #FF9800; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; font-weight: bold;">
								Please respond to this Counter Offer at your earliest convenience
							</p>
						</div>
						
						<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
							<p>Thank you for using our auction platform!</p>
							<p style="color: #999;">This is an automated email. Please do not reply.</p>
						</div>
					</div>
				</div>
			`,
			text: `The seller has sent a Counter Offer of ₹${parseFloat(
				amount
			).toLocaleString()} for "${
				auction.itemName
			}". Please log in to respond.`,
		});

		// Also notify seller that Counter Offer was sent successfully
		await sendEmail({
			to: auction.seller.email,
			subject: `Counter Offer Confirmation: Your Counter Offer of Rs.${parseFloat(
				amount
			).toLocaleString()} for ${
				auction.itemName
			} has been sent to the bidder`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
					<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
						<h1 style="color: #4CAF50; text-align: center; margin-bottom: 30px;">Counter Offer Sent</h1>
						
						<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Your Counter Offer Has Been Delivered</h2>
						
						<div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
							<h3 style="color: #555; margin-top: 0;">Counter Offer Details:</h3>
							<p><strong>Item:</strong> ${auction.itemName}</p>
							<p><strong>Original Bid:</strong> ₹${parseFloat(
								highest.amount
							).toLocaleString()}</p>
							<p><strong>Your Counter Offer:</strong> <span style="color: #4CAF50; font-size: 1.2em; font-weight: bold;">₹${parseFloat(
								amount
							).toLocaleString()}</span></p>
							<p><strong>Bidder:</strong> ${highest.bidder.name} (${highest.bidder.email})</p>
						</div>
						
						<div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
							<h4 style="color: #1976D2; margin-top: 0;">What Happens Next:</h4>
							<ul style="color: #333; margin: 0;">
								<li>The bidder has been notified via email</li>
								<li>They will log in to accept or reject your Counter Offer</li>
								<li>You'll be notified immediately of their decision</li>
								<li>If accepted, both parties will receive confirmation and invoice</li>
							</ul>
						</div>
						
						<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
							<p>Thank you for using our auction platform!</p>
							<p style="color: #999;">This is an automated email. Please do not reply.</p>
						</div>
					</div>
				</div>
			`,
		});

		const io = getIO();
		io.to(auction.id).emit("counterOffer", {
			auctionId: auction.id,
			bidderId: highest.bidderId,
			amount,
			counterAmount: amount,
			originalBid: parseFloat(highest.amount),
			bidderName: highest.bidder.name,
			sellerMessage: `You sent a Counter Offer of ₹${amount.toLocaleString()} to ${
				highest.bidder.name
			}`,
			bidderMessage: `Seller sent you a Counter Offer of ₹${amount.toLocaleString()} (original bid: ₹${parseFloat(
				highest.amount
			).toLocaleString()})`,
			viewerMessage: `Seller sent a Counter Offer of ₹${amount.toLocaleString()} to the highest bidder`,
		});

		res.json({ success: true, message: "Counter Offer sent", amount });
	} catch (error) {
		console.error("Error sending Counter Offer:", error);
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
					"Forbidden: Not eligible to respond to this Counter Offer.",
			});
		}

		const io = getIO();
		const counterOfferAmount = auction.counterOfferPrice;

		if (accept) {
			auction.winnerId = req.user.id;
			auction.status = "closed";
			auction.statusAfterBid = "accepted";

			await auction.save();

			// Generate PDF invoice for successful transaction
			const pdfData = await generateInvoicePDF(
				auction,
				req.user,
				auction.seller
			);

			// Send confirmation emails to both buyer and seller with invoice
			await sendEmail({
				to: req.user.email,
				subject: `Purchase Confirmed: Counter Offer accepted for ${
					auction.itemName
				} at Rs.${parseFloat(
					counterOfferAmount
				).toLocaleString()} - Payment and Invoice Details Enclosed`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
						<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
							<h1 style="color: #4CAF50; text-align: center; margin-bottom: 30px;">Congratulations! You Won!</h1>
							
							<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Counter Offer Accepted Successfully</h2>
							
							<div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
								<h3 style="color: #555; margin-top: 0;">Final Transaction Details:</h3>
								<p><strong>Item:</strong> ${auction.itemName}</p>
								<p><strong>Original Bid:</strong> ₹${parseFloat(
									highestBid.amount
								).toLocaleString()}</p>
								<p><strong>Seller's Counter Offer:</strong> <span style="color: #4CAF50; font-size: 1.2em; font-weight: bold;">₹${parseFloat(
									counterOfferAmount
								).toLocaleString()}</span></p>
								<p><strong>Seller:</strong> ${auction.seller.name} (${auction.seller.email})</p>
							</div>
							
							<div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
								<h4 style="color: #1976D2; margin-top: 0;">Next Steps:</h4>
								<ul style="color: #333; margin: 0;">
									<li>Invoice attached with complete transaction details</li>
									<li>The seller will contact you for payment arrangements</li>
									<li>Delivery will be arranged once payment is confirmed</li>
									<li>Keep this email for your records</li>
								</ul>
							</div>
							
							<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
								<p>Thank you for using our auction platform!</p>
								<p style="color: #999;">This is an automated email. Please do not reply.</p>
							</div>
						</div>
					</div>
				`,
				attachments: [
					{
						filename: `invoice-${auction.id}.pdf`,
						content: pdfData.toString("base64"),
						type: "application/pdf",
						disposition: "attachment",
					},
				],
			});

			// Notify seller via email
			await sendEmail({
				to: auction.seller.email,
				subject: `Sale Finalized: Your Counter Offer for ${
					auction.itemName
				} has been accepted at Rs.${parseFloat(
					counterOfferAmount
				).toLocaleString()} - Transaction Complete`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
						<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
							<h1 style="color: #4CAF50; text-align: center; margin-bottom: 30px;">Counter Offer Accepted!</h1>
							
							<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Your Item Has Been Sold</h2>
							
							<div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
								<h3 style="color: #555; margin-top: 0;">Final Sale Details:</h3>
								<p><strong>Item:</strong> ${auction.itemName}</p>
								<p><strong>Original Bid:</strong> ₹${parseFloat(
									highestBid.amount
								).toLocaleString()}</p>
								<p><strong>Your Counter Offer (ACCEPTED):</strong> <span style="color: #4CAF50; font-size: 1.2em; font-weight: bold;">₹${parseFloat(
									counterOfferAmount
								).toLocaleString()}</span></p>
								<p><strong>Buyer:</strong> ${req.user.name} (${req.user.email})</p>
							</div>
							
							<div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
								<h4 style="color: #1976D2; margin-top: 0;">Next Steps:</h4>
								<ul style="color: #333; margin: 0;">
									<li>The buyer will contact you for payment arrangements</li>
									<li>Please arrange delivery once payment is confirmed</li>
									<li>Invoice attached for your records</li>
									<li>Congratulations on your successful sale!</li>
								</ul>
							</div>
							
							<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
								<p>Thank you for using our auction platform!</p>
								<p style="color: #999;">This is an automated email. Please do not reply.</p>
							</div>
						</div>
					</div>
				`,
				attachments: [
					{
						filename: `invoice-${auction.id}.pdf`,
						content: pdfData.toString("base64"),
						type: "application/pdf",
						disposition: "attachment",
					},
				],
			});

			io.to(auction.id).emit("counterAccepted", {
				auctionId: auction.id,
				amount: parseFloat(counterOfferAmount),
				winnerId: req.user.id,
				winnerName: req.user.name,
				sellerMessage: `Your Counter Offer of ₹${parseFloat(
					counterOfferAmount
				).toLocaleString()} has been accepted by ${req.user.name}`,
				winnerMessage: `You accepted the Counter Offer of ₹${parseFloat(
					counterOfferAmount
				).toLocaleString()}. Payment details sent via email.`,
				viewerMessage: `Counter Offer accepted! Final price: ₹${parseFloat(
					counterOfferAmount
				).toLocaleString()}`,
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

			// Notify seller via email about Counter Offer rejection
			await sendEmail({
				to: auction.seller.email,
				subject: `Counter Offer Response: Your Counter Offer for ${auction.itemName} was declined by the bidder`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
						<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
							<h1 style="color: #f44336; text-align: center; margin-bottom: 30px;">Counter Offer Rejected</h1>
							
							<h2 style="color: #333; border-bottom: 2px solid #f44336; padding-bottom: 10px;">Unfortunately, Your Counter Offer Was Declined</h2>
							
							<div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
								<h3 style="color: #555; margin-top: 0;">Rejected Offer Details:</h3>
								<p><strong>Item:</strong> ${auction.itemName}</p>
								<p><strong>Original Bid:</strong> ₹${parseFloat(
									highestBid.amount
								).toLocaleString()}</p>
								<p><strong>Your Counter Offer:</strong> ₹${parseFloat(
									counterOfferAmount
								).toLocaleString()}</p>
								<p><strong>Bidder:</strong> ${highestBid.bidder.name}</p>
								<p><strong>Final Status:</strong> <span style="color: #f44336; font-weight: bold;">Auction Closed - No Winner</span></p>
							</div>
							
							<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
								<h4 style="color: #1976D2; margin-top: 0;">What's Next:</h4>
								<p style="color: #333; margin: 10px 0 0 0;">You can create a new auction with different terms or pricing if you'd like to try selling this item again.</p>
							</div>
							
							<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
								<p>Thank you for using our auction platform!</p>
								<p style="color: #999;">This is an automated email. Please do not reply.</p>
							</div>
						</div>
					</div>
				`,
				text: `Unfortunately, your Counter Offer of ₹${parseFloat(
					counterOfferAmount
				).toLocaleString()} for "${auction.itemName}" was rejected by ${
					highestBid.bidder.name
				}.`,
			});

			// Also notify buyer confirming their rejection
			await sendEmail({
				to: req.user.email,
				subject: `Action Confirmed: You have declined the Counter Offer for ${auction.itemName} - Auction Closed`,
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
						<div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
							<h1 style="color: #FF9800; text-align: center; margin-bottom: 30px;">Counter Offer Rejected</h1>
							
							<h2 style="color: #333; border-bottom: 2px solid #FF9800; padding-bottom: 10px;">Counter Offer Successfully Declined</h2>
							
							<div style="background-color: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
								<h3 style="color: #555; margin-top: 0;">Rejection Details:</h3>
								<p><strong>Item:</strong> ${auction.itemName}</p>
								<p><strong>Your Original Bid:</strong> ₹${parseFloat(
									highestBid.amount
								).toLocaleString()}</p>
								<p><strong>Seller's Counter Offer:</strong> ₹${parseFloat(
									counterOfferAmount
								).toLocaleString()}</p>
								<p><strong>Your Decision:</strong> <span style="color: #f44336; font-weight: bold;">Rejected</span></p>
							</div>
							
							<div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
								<h4 style="color: #1976D2; margin-top: 0;">Keep Bidding!</h4>
								<p style="color: #333; margin: 10px 0 0 0;">Browse our platform for other exciting auctions. Your perfect item might be just a bid away!</p>
							</div>
							
							<div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
								<p>Thank you for using our auction platform!</p>
								<p style="color: #999;">This is an automated email. Please do not reply.</p>
							</div>
						</div>
					</div>
				`,
			});

			io.to(auction.id).emit("counterRejected", {
				auctionId: auction.id,
				counterAmount: parseFloat(auction.counterOfferPrice),
				rejectedBy: req.user.name,
				sellerMessage: `Your Counter Offer of ₹${parseFloat(
					auction.counterOfferPrice
				).toLocaleString()} was rejected by ${req.user.name}`,
				bidderMessage: `You rejected the Counter Offer of ₹${parseFloat(
					auction.counterOfferPrice
				).toLocaleString()}`,
				viewerMessage: `Counter Offer of ₹${parseFloat(
					auction.counterOfferPrice
				).toLocaleString()} was rejected. Auction ended with no sale.`,
			});

			res.json({ success: true, message: "Counter Offer rejected" });
		}
	} catch (error) {
		console.error("Error responding to Counter Offer:", error);
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

// Helper function to generate PDF invoice and return buffer
async function generateInvoicePDF(auction, buyer, seller) {
	try {
		const doc = new PDFDocument({ size: "A4", margin: 50 });
		const buffers = [];

		doc.on("data", buffers.push.bind(buffers));

		return new Promise((resolve, reject) => {
			doc.on("end", () => {
				try {
					const pdfData = Buffer.concat(buffers);
					resolve(pdfData);
				} catch (error) {
					reject(error);
				}
			});

			doc.on("error", reject);

			// Generate PDF content with enhanced styling
			doc.fontSize(24)
				.fillColor("#2E7D32")
				.text("AUCTION INVOICE", { align: "center" })
				.fillColor("#000000")
				.moveDown();

			doc.fontSize(14).text(`Invoice #: INV-${auction.id}`, {
				align: "right",
			});
			doc.text(`Date: ${new Date().toLocaleDateString()}`, {
				align: "right",
			}).moveDown();

			// Add a line separator
			doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

			doc.fontSize(18)
				.fillColor("#1976D2")
				.text("Transaction Details", { underline: true })
				.fillColor("#000000")
				.moveDown();
			doc.fontSize(12)
				.text(`Item: ${auction.itemName}`)
				.text(`Description: ${auction.description || "N/A"}`)
				.text(
					`Starting Price: Rs. ${parseFloat(
						auction.startingPrice
					).toLocaleString()}`
				)
				.text(
					`Final Price: Rs. ${parseFloat(
						auction.counterOfferPrice ||
							auction.highestBid ||
							auction.startingPrice
					).toLocaleString()}`,
					{ fontSize: 14, fillColor: "#2E7D32" }
				)
				.fillColor("#000000")
				.moveDown();

			doc.fontSize(18)
				.fillColor("#1976D2")
				.text("Seller Information", { underline: true })
				.fillColor("#000000")
				.moveDown();
			doc.fontSize(12)
				.text(`Name: ${seller.name}`)
				.text(`Email: ${seller.email}`)
				.moveDown();

			doc.fontSize(18)
				.fillColor("#1976D2")
				.text("Buyer Information", { underline: true })
				.fillColor("#000000")
				.moveDown();
			doc.fontSize(12)
				.text(`Name: ${buyer.name}`)
				.text(`Email: ${buyer.email}`)
				.moveDown();

			// Add a line separator
			doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown();

			doc.fontSize(10)
				.fillColor("#666666")
				.text(
					"This is a computer-generated invoice. Thank you for using our auction platform!",
					{ align: "center" }
				)
				.text(`Generated on: ${new Date().toLocaleString()}`, {
					align: "center",
				});

			doc.end();
		});
	} catch (error) {
		console.error("Error generating invoice:", error);
		throw error;
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
