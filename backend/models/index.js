const fs = require("fs");
const path = require("path");
const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

// Initialize Sequelize
const sequelize = new Sequelize(process.env.SUPABASE_DB_URL, {
	dialect: "postgres",
	dialectOptions: {
		ssl: {
			require: true,
			rejectUnauthorized: false,
		},
	},
	logging: false,
});

const db = {}; // This object will hold the initialized models
const basename = path.basename(__filename);

// Load all model files and define them using the function export pattern
fs.readdirSync(__dirname)
	.filter(
		(file) =>
			file.indexOf(".") !== 0 && file !== basename && file.endsWith(".js")
	)
	.forEach((file) => {
		const modelDefinition = require(path.join(__dirname, file));
		if (typeof modelDefinition === "function") {
			const model = modelDefinition(sequelize, DataTypes);
			db[model.name] = model; // Models are added to the db object by their name (e.g., db.User, db.Auction)
		} else {
			console.warn(
				`Skipping file ${file} as it does not export a function for model definition.`
			);
		}
	});

// Run all associate functions after all models are loaded
Object.keys(db).forEach((modelName) => {
	if (typeof db[modelName].associate === "function") {
		db[modelName].associate(db); // Pass the `db` object for cross-model associations
	}
});

db.sequelize = sequelize; // Make the sequelize instance directly accessible via db.sequelize
db.Sequelize = Sequelize; // Make the Sequelize class (containing DataTypes) accessible via db.Sequelize
db.DataTypes = DataTypes; // Make DataTypes directly accessible

module.exports = db; // Export the central db object
