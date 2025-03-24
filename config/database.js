const { Sequelize } = require("sequelize");
require("dotenv").config();
const pg = require("pg");
// Fallback to local database if DATABASE_URL is not set
const dbUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/aptinova_db";

const sequelize = new Sequelize(dbUrl, {
  dialect: "postgres",
  dialectModule: pg,
  // logging: process.env.NODE_ENV === "development" ? logging : console.log,
  logging: false,
  ssl: process.env.NODE_ENV === "production",
  dialectOptions:
    process.env.NODE_ENV === "production"
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
});

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

// Instead of sequelize.sync(), force an alter update for development:
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database synchronized with alter.");
  })
  .catch((err) => {
    console.error("Database sync error:", err);
  });

module.exports = sequelize;
