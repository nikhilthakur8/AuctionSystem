const { Router } = require("express");
const { handleGetProfile } = require("../controllers/user.controller");

const userRouter = Router();

userRouter.get("/profile", handleGetProfile);

module.exports = userRouter;
