const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");

class HRManager extends Model {}

HRManager.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.TEXT,
      defaultValue: "hrManager",
    },
    subscriptionId: {
      type: DataTypes.STRING,
    },
    subscriptionStatus: {
      type: DataTypes.ENUM("active", "inactive", "cancelled"),
      defaultValue: "inactive",
    },
    subscriptionPlanId: {
      type: DataTypes.STRING,
    },
    subscriptionStartDate: {
      type: DataTypes.DATE,
    },
    subscriptionEndDate: {
      type: DataTypes.DATE,
    },
    subscriptionType: {
      type: DataTypes.ENUM("FREE", "STARTUP", "ENTERPRISE", "CUSTOM"),
      defaultValue: "FREE",
    },
    subscriptionTier: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "dormant",
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    googleAccessToken: {
      type: DataTypes.STRING,
    },
    googleRefreshToken: {
      type: DataTypes.STRING,
    },
    organizationId: {
      type: DataTypes.UUID,
      references: {
        model: Organization,
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "HRManager",
  }
);

HRManager.belongsTo(Organization, { foreignKey: "organizationId" });

module.exports = HRManager;
