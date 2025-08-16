const { Router } = require("express");
const {
	handleLogin,
	handleLogout,
	handleRegister,
} = require("../controllers/auth.controller");
const authRouter = Router();

authRouter.post("/register", handleRegister);

authRouter.post("/login", handleLogin);

authRouter.post("/logout", handleLogout);

module.exports = authRouter;
