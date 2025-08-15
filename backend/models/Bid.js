// models/Bid.js
module.exports = (sequelize, DataTypes) => {
	const Bid = sequelize.define(
		"Bid",
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
				primaryKey: true,
			},
			auctionId: {
				type: DataTypes.UUID,
				allowNull: false,
			},
			bidderId: {
				type: DataTypes.UUID,
				allowNull: false,
			},
			amount: {
				type: DataTypes.DECIMAL,
				allowNull: false,
			},
		},
		{
			tableName: "bids",
			timestamps: true,
		}
	);

	Bid.associate = (models) => {
		Bid.belongsTo(models.Auction, {
			foreignKey: "auctionId",
			as: "auction",
		});
		Bid.belongsTo(models.User, { foreignKey: "bidderId", as: "bidder" });
	};

	return Bid;
};
