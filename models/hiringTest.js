const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const  Organization = require('./organization');
const Job = require('./job');
const HiringTest = sequelize.define('HiringTest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  jobId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Job,
      key: 'id'
    }
  },
  organizationId: {
    type: DataTypes.UUID,
    references: {
      model: Organization,
      key: 'id',
    },
  },
  testName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Test name cannot be empty" },
      len: { args: [3, 100], msg: "Test name must be between 5 and 100 characters" }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: { args: [0, 5000], msg: "Description must be between 0 and 5000 characters" }
    }
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [1], msg: "Duration must be at least 1 minute" }
    }
  },
  passingScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [0], msg: "Passing score must be a non-negative integer" },
      max: { args: [100], msg: "Passing score must be at most 100" }
    }
  },

  questions: {
    type: DataTypes.JSONB, // JSONB for PostgreSQL; use JSON for other DBs
    allowNull: false,
    validate: {
      notEmpty: { msg: "Questions cannot be empty" }
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'hiring_tests',
  timestamps: true,
  underscored: true
});

module.exports = HiringTest;
