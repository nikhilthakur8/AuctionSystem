const { Router } = require("express");
const {
	handleCreateAuction,
	handleGetAuctionById,
	handleUpdateAuction,
	handleDeleteAuction,
	handleGetAllAuction,
	handleGetMyAuctions,
	handlePlaceBid,
	handleAcceptBid,
	handleRejectBid,
	handleCounterOffer,
	handleCounterResponse,
	handleGetInvoice,
} = require("../controllers/auction.controller");
const authenticateUser = require("../middleware/authenticate");
const auctionRouter = Router();

auctionRouter.post("/create", authenticateUser, handleCreateAuction);
auctionRouter.get("/my-auctions", authenticateUser, handleGetMyAuctions);
auctionRouter.get("/list", handleGetAllAuction);
auctionRouter.get("/:id", handleGetAuctionById);
auctionRouter.put("/:id", authenticateUser, handleUpdateAuction);
auctionRouter.delete("/:id", authenticateUser, handleDeleteAuction);
auctionRouter.post("/place-bid", handlePlaceBid);
// Seller actions: accept or reject highest bid
auctionRouter.post("/:id/accept", handleAcceptBid);
auctionRouter.post("/:id/reject", handleRejectBid);
auctionRouter.post("/:id/counter-offer", handleCounterOffer);
// Counter-response by bidder
auctionRouter.post("/:id/counter-response", handleCounterResponse);
// Invoice generation
auctionRouter.get("/:id/invoice", handleGetInvoice);
module.exports = auctionRouter;
