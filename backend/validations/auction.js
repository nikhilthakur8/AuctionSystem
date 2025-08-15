const { z } = require("zod");

const auctionSchema = z.object({
	itemName: z
		.string({ required_error: "Item name is required" })
		.min(3, "Item name must be at least 3 characters"),
	description: z
		.string({ required_error: "Description is required" })
		.min(5, "Description must be at least 5 characters"),
	startingPrice: z
		.number({ required_error: "Starting price is required" })
		.positive("Starting price must be greater than 0"),
	bidIncrement: z
		.number({ required_error: "Bid increment is required" })
		.positive("Bid increment must be greater than 0"),
	goLiveTime: z
		.string({ required_error: "Go-live time is required" })
		.refine((val) => !isNaN(Date.parse(val)), {
			message: "Go-live time must be a valid date string",
		}),
	duration: z
		.number({ required_error: "Duration is required" })
		.positive("Duration must be greater than 0"), // in minutes or seconds
});

module.exports = { auctionSchema };
