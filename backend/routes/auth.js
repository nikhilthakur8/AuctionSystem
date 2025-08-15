const { Router } = require("express");
const {
	handleLogin,
	handleRegister,
} = require("../controllers/auth.controller");
const authRouter = Router();

authRouter.post("/register", handleRegister);

authRouter.post("/login", handleLogin);

module.exports = authRouter;
