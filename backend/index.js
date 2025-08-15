require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const db = require("./models"); 
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const auctionRouter = require("./routes/auction");
const authenticateUser = require("./middleware/authenticate");
const { initSocket } = require("./sockets/io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(express.json());
app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	})
);
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/auction", authenticateUser, auctionRouter);
app.use("/api/user", authenticateUser, userRouter);

db.sequelize.sync({ alter: true }).then(() => {
	server.listen(process.env.PORT, () => console.log("Server running"));
});
