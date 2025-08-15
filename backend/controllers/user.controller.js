const { raw } = require("express");
const { User } = require("../models");

async function handleGetProfile(req, res) {
	try {
		const user = await User.findByPk(req.user.id, { raw: true });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}
		delete user.password;
		res.status(200).json({ success: true, user });
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
	}
}

module.exports = {
	handleGetProfile,
};
