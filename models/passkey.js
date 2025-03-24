  const { DataTypes } = require("sequelize");
  const sequelize = require("../config/database");

  const Passkey = sequelize.define("Passkey", {
    cred_id: {
      type: DataTypes.TEXT,
      primaryKey: true,
    },
    cred_public_key: {
      type: DataTypes.TEXT, // Matches `cred_public_key` as blob
      allowNull: false,
    },
    deviceType: {
      type: DataTypes.STRING, // Matches `device_type` as string
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING, // Matches `webauthn_user_id` as string
      allowNull: false,
    },
    backedup: {
      type: DataTypes.BOOLEAN, // Matches `backedup` as boolean
      defaultValue: false,
    },
    userType: {
      type: DataTypes.STRING, // Matches `user_type` as string
      allowNull: false,
    },
    counter: {
      type: DataTypes.INTEGER, // Matches `counter` as integer
      defaultValue: 0,
    },

    transports: {
      type: DataTypes.STRING, // Matches `transports` as string
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE, // Matches `created_at` as timestamp
      defaultValue: DataTypes.NOW,
    },
    last_used: {
      type: DataTypes.DATE, // Matches `last_used` as timestamp
      allowNull: true,
    },
    // Additional device fields
    deviceName: {
      type: DataTypes.STRING, // Device name
      allowNull: true,
    },
    deviceOS: {
      type: DataTypes.STRING, // Device operating system
      allowNull: true,
    },
    platform: {
      type: DataTypes.STRING, // Platform information
      allowNull: true,
    },
    browser: {
      type: DataTypes.STRING, // Browser information
      allowNull: true,
    },
  });

  module.exports = Passkey;
