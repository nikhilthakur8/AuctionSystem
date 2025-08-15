// models/User.js
module.exports = (sequelize, DataTypes) => {
	const User = sequelize.define(
		"User",
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			email: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
				validate: {
					isEmail: true,
				},
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			role: {
				type: DataTypes.ENUM("user", "admin"),
				defaultValue: "user",
			},
		},
		{
			tableName: "users",
			timestamps: true,
		}
	);

	User.associate = (models) => {
		User.hasMany(models.Auction, {
			foreignKey: "sellerId",
			as: "auctions",
		});
		User.hasMany(models.Bid, { foreignKey: "bidderId", as: "bids" });
	};

	return User;
};
