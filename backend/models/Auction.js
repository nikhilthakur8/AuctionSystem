// models/Auction.js
module.exports = (sequelize, DataTypes) => {
	const Auction = sequelize.define(
		"Auction",
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},
			sellerId: {
				type: DataTypes.UUID,
				allowNull: false,
			},
			itemName: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			startingPrice: {
				type: DataTypes.DECIMAL,
				allowNull: false,
			},
			bidIncrement: {
				type: DataTypes.DECIMAL,
				allowNull: false,
			},
			goLiveTime: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			duration: {
				type: DataTypes.INTEGER, // in minutes
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM("upcoming", "active", "closed"),
				defaultValue: "upcoming",
			},
			highestBidId: {
				type: DataTypes.UUID,
				allowNull: true,
			},
			winnerId: {
				type: DataTypes.UUID,
				allowNull: true,
			},
			statusAfterBid: {
				type: DataTypes.ENUM(
					"pending",
					"accepted",
					"rejected",
					"countered"
				),
				defaultValue: "pending",
			},
			counterOfferPrice: {
				type: DataTypes.DECIMAL,
				allowNull: true,
			},
		},
		{
			tableName: "auctions",
			timestamps: true,
		}
	);

	Auction.associate = (models) => {
		Auction.belongsTo(models.User, {
			foreignKey: "sellerId",
			as: "seller",
		});
		Auction.hasMany(models.Bid, { foreignKey: "auctionId", as: "bids" });

		Auction.belongsTo(models.User, {
			foreignKey: "winnerId",
			as: "winner",
		});
	};

	return Auction;
};
