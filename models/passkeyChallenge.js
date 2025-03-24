const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class PasskeyChallenge extends Model {}
PasskeyChallenge.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      unique: true,
      type: DataTypes.UUID,
      allowNull: false,
    },
    challenge: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "passkeyChallenge",
  }
);

module.exports = PasskeyChallenge;
