const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WebAuthnSession = sequelize.define("WebAuthnSession", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  userType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  challenge: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});

module.exports = WebAuthnSession;
