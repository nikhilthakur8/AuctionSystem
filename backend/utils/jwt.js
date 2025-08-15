const jwt = require("jsonwebtoken");

function createToken(payload) {
	return jwt.sign(payload, process.env.JWT_SECRET, {
		expiresIn: "7d",
	});
}

function verifyToken(token) {
	try {
		return jwt.verify(token, process.env.JWT_SECRET);
	} catch (err) {
		return null;
	}
}

module.exports = { createToken, verifyToken };
