const { Auction, User, Bid } = require("../models");
const { Op } = require("sequelize");

// Get all auctions for admin
async function handleGetAllAuctionsAdmin(req, res) {
	try {
		const auctions = await Auction.findAll({
			include: [
				{ model: User, as: "seller", attributes: ["name", "email"] },
			],
			order: [["createdAt", "DESC"]],
		});
		res.json({ success: true, auctions });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

// Get all users for admin
async function handleGetAllUsersAdmin(req, res) {
	try {
		const users = await User.findAll({
			attributes: ["id", "name", "email", "role", "createdAt"],
			order: [["createdAt", "DESC"]],
		});
		res.json({ success: true, users });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

// Get admin stats
async function handleGetAdminStats(req, res) {
	try {
		const [totalAuctions, activeAuctions, totalUsers, totalBids] =
			await Promise.all([
				Auction.count(),
				Auction.count({ where: { status: "active" } }),
				User.count(),
				Bid.count(),
			]);

		res.json({
			success: true,
			stats: {
				totalAuctions,
				activeAuctions,
				totalUsers,
				totalBids,
			},
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

// Manually start auction
async function handleStartAuction(req, res) {
	try {
		const auction = await Auction.findByPk(req.params.id);
		if (!auction) {
			return res.status(404).json({ message: "Auction not found" });
		}

		auction.status = "active";
		auction.goLiveTime = new Date();
		await auction.save();

		res.json({ success: true, message: "Auction started manually" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

// Reset auction
async function handleResetAuction(req, res) {
	try {
		const auction = await Auction.findByPk(req.params.id);
		if (!auction) {
			return res.status(404).json({ message: "Auction not found" });
		}

		// Delete all bids
		await Bid.destroy({ where: { auctionId: auction.id } });

		// Reset auction fields
		auction.status = "upcoming";
		auction.winnerId = null;
		auction.highestBidId = null;
		auction.statusAfterBid = null;
		auction.counterOfferPrice = null;
		await auction.save();

		res.json({ success: true, message: "Auction reset successfully" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

module.exports = {
	handleGetAllAuctionsAdmin,
	handleGetAllUsersAdmin,
	handleGetAdminStats,
	handleStartAuction,
	handleResetAuction,
};
