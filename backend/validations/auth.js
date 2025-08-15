const { z } = require("zod");

const registerSchema = z.object({
	name: z
		.string()
		.min(3, "Name must be at least 3 characters")
		.max(50, "Name must be less than 50 characters"),
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters")
		.max(100, "Password must be less than 100 characters"),
});

const loginSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

module.exports = {
	registerSchema,
	loginSchema,
};
