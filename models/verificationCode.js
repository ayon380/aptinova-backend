const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VerificationCode = sequelize.define(
  "VerificationCode",
  {
    userId: {
      type: DataTypes.UUID, // Ensure userId is UUID
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = VerificationCode;
