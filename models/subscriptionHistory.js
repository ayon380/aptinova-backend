const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class SubscriptionHistory extends Model {}

SubscriptionHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    oldTier: {
      type: DataTypes.STRING,
    },
    newTier: {
      type: DataTypes.STRING,
    },
    oldSubscriptionId: {
      type: DataTypes.STRING,
    },
    newSubscriptionId: {
      type: DataTypes.STRING,
    },
    changeType: {
      type: DataTypes.ENUM('upgrade', 'downgrade', 'initial', 'cancel'),
    },
    reason: {
      type: DataTypes.STRING,
    }
  },
  {
    sequelize,
    modelName: "SubscriptionHistory",
  }
);

module.exports = SubscriptionHistory;
