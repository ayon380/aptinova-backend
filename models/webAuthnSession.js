const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const WebAuthnSession = sequelize.define("WebAuthnSession", {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
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
