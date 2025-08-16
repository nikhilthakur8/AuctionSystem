const bcrypt = require("bcrypt");
const { createToken } = require("../utils/jwt");
const { User } = require("../models");
const { z } = require("zod");
const { loginSchema, registerSchema } = require("../validations/auth");

async function handleRegister(req, res) {
	try {
		const { name, email, password } = registerSchema.parse(req.body);

		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			return res.status(400).json({ message: "Email already in use" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const userInstance = await User.create({
			name,
			email,
			password: hashedPassword,
		});
		const user = userInstance.get({ plain: true });
		delete user.password;
		const token = createToken({ id: user.id, email: user.email });
		res.cookie("SESSION_ID", token);
		return res.status(201).json({ success: true, user });
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

async function handleLogin(req, res) {
	try {
		const { email, password } = loginSchema.parse(req.body);

		const user = await User.findOne({ where: { email }, raw: true });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
		}
		delete user.password;
		const token = createToken({ id: user.id, email: user.email });
		res.cookie("SESSION_ID", token);
		return res.json({ success: true, user });
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

async function handleLogout(req, res) {
	try {
		res.clearCookie("SESSION_ID");
		return res.json({ success: true });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

module.exports = { handleRegister, handleLogin, handleLogout };
