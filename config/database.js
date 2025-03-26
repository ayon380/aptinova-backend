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
  pool: {
    max: 5, // maximum number of connections in pool
    min: 0, // minimum number of connections in pool
    acquire: 30000, // maximum time, in milliseconds, that pool will try to get connection before throwing error
    idle: 10000, // maximum time, in milliseconds, that a connection can be idle before being released
  }
});

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 5000;

const connectWithRetry = async (retryCount = 0) => {
  try {
    const connection = await sequelize.authenticate();
    console.log("Database connection established successfully.");
    
    // Once connected, sync the database
    await sequelize.sync({ alter: true });
    console.log("Database synchronized with alter.");
    return true;
  } catch (err) {
    console.error("Connection error:", err.message);
    
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Failed to connect. Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(retryCount + 1);
    } else {
      console.error("Max retry attempts reached. Unable to connect to the database.");
      return false;
    }
  }
};

// Start the connection process without immediately exiting on failure
connectWithRetry().then(success => {
  if (!success) {
    console.log("Database connection attempts exhausted. Application may not function correctly.");
  }
});

module.exports = sequelize;
