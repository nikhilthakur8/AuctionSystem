require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const db = require("./models");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const auctionRouter = require("./routes/auction");
const adminRouter = require("./routes/admin");
const authenticateUser = require("./middleware/authenticate");
const { initSocket } = require("./sockets/io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
initSocket(server);
app.use(express.static(path.join(__dirname, "public")));
app.get(/^\/(?!api).*/, (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.json());
app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	})
);
app.use(cookieParser());
app.get("/api/status", (req, res) => {
	res.json({ status: "OK" });
});
app.use("/api/auth", authRouter);
app.use("/api/auction", auctionRouter);
app.use("/api/user", authenticateUser, userRouter);
app.use("/api/admin", authenticateUser, adminRouter);

db.sequelize.sync({ alter: true }).then(() => {
	server.listen(process.env.PORT, () => console.log("Server running"));
});
