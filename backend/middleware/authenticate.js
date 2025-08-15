const { User } = require("../models");
const { verifyToken } = require("../utils/jwt");

async function authenticateUser(req, res, next) {
	try {
		const token = req.cookies?.SESSION_ID;
		if (!token) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const user = verifyToken(token);
		if (!user) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const userData = await User.findOne({ where: { id: user.id } });
		if (!userData) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		req.user = userData;
		next();
	} catch (error) {
		return res.status(401).json({ message: "Invalid token" });
	}
}

module.exports = authenticateUser;
