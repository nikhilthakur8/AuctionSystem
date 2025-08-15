const { Server } = require("socket.io");
const { redis } = require("../config/redis");
const { Auction } = require("../models");

let ioInstance = null;

function initSocket(server) {
	ioInstance = new Server(server, {
		cors: {
			origin: "http://localhost:5173",
			methods: ["GET", "POST"],
		},
	});
	console.log("Socket.io initialized");

	ioInstance.on("connection", (socket) => {
		console.log("New client connected:", socket.id);

		// Join auction room and send current highest bid
		socket.on("joinAuctionRoom", async (roomId) => {
			socket.join(roomId);

			let highestBidderData = await getHighestBid(roomId);

			if (!highestBidderData) {
				// No bids yet — fetch starting price from DB and store in Redis
				const auction = await Auction.findByPk(roomId);

				if (auction) {
					highestBidderData = {
						name: null,
						email: null,
						bid: parseFloat(auction.startingPrice),
						socket: null,
					};
					await redis.set(
						`auction:${roomId}:highestBid`,
						JSON.stringify(highestBidderData)
					);
				}
			}

			if (highestBidderData) {
				socket.emit("bidUpdated", {
					...highestBidderData,
					message: highestBidderData.name
						? `Current highest bid: ₹${highestBidderData.bid} by ${highestBidderData.name}`
						: `No bids yet. Starting price: ₹${highestBidderData.bid}`,
				});
			}
		});

		// Leave auction room
		socket.on("leaveRoom", (roomId) => {
			socket.leave(roomId);
			console.log(`Socket ${socket.id} left room ${roomId}`);
		});

		// Disconnect
		socket.on("disconnect", () => {
			console.log("Client disconnected:", socket.id);
		});
	});
}

async function getHighestBid(roomId) {
	const jsonData = await redis.get(`auction:${roomId}:highestBid`);
	return jsonData ? JSON.parse(jsonData) : null;
}

function getIO() {
	if (!ioInstance) {
		throw new Error("Socket.io not initialized!");
	}
	return ioInstance;
}

module.exports = { initSocket, getIO };
