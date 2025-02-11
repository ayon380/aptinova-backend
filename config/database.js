const { Sequelize } = require('sequelize');
require('dotenv').config();

// Fallback to local database if DATABASE_URL is not set
const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aptinova_db';

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  ssl: process.env.NODE_ENV === 'production',
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = sequelize;
