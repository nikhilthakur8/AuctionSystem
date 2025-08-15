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
const auctionRouter = Router();

auctionRouter.post("/create", handleCreateAuction);
auctionRouter.get("/my-auctions", handleGetMyAuctions);
auctionRouter.get("/list", handleGetAllAuction);
auctionRouter.get("/:id", handleGetAuctionById);
auctionRouter.put("/:id", handleUpdateAuction);
auctionRouter.delete("/:id", handleDeleteAuction);
auctionRouter.post("/place-bid", handlePlaceBid);
// Seller actions: accept or reject highest bid
auctionRouter.post("/:id/accept", handleAcceptBid);
auctionRouter.post("/:id/reject", handleRejectBid);
auctionRouter.post("/:id/counter-offer", handleCounterOffer);
// Counter-response by bidder
auctionRouter.post("/:id/counter-response", handleCounterResponse);
module.exports = auctionRouter;
