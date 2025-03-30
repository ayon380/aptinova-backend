const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");
const HR = sequelize.define("HR", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetTokenExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "dormant",
  },
  googleAccessToken: {
    type: DataTypes.STRING,
  },
  googleRefreshToken: {
    type: DataTypes.STRING,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  onboardingToken: {
    type: DataTypes.STRING,
  },
  onboardingTokenExpiry: {
    type: DataTypes.DATE,
  },
  organizationId: {
    type: DataTypes.UUID,
    references: {
      model: Organization,
      key: "id",
    },
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});
HR.belongsTo(Organization, { foreignKey: "organizationId" });

module.exports = HR;
