const { Router } = require("express");
const {
	handleGetAllAuctionsAdmin,
	handleGetAllUsersAdmin,
	handleGetAdminStats,
	handleStartAuction,
	handleResetAuction,
} = require("../controllers/admin.controller");

const adminRouter = Router();

// Admin middleware to check if user is admin
const checkAdmin = (req, res, next) => {
	if (req.user.role !== "admin") {
		return res.status(403).json({ message: "Admin access required" });
	}
	next();
};

// Apply admin middleware to all routes
adminRouter.use(checkAdmin);

// Admin routes
adminRouter.get("/auctions", handleGetAllAuctionsAdmin);
adminRouter.get("/users", handleGetAllUsersAdmin);
adminRouter.get("/stats", handleGetAdminStats);
adminRouter.post("/auctions/:id/start", handleStartAuction);
adminRouter.post("/auctions/:id/reset", handleResetAuction);

module.exports = adminRouter;
