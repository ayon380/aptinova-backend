const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Candidate = sequelize.define(
  "Candidate",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    subscriptionId: {
      type: DataTypes.STRING,
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('active', 'inactive', 'cancelled'),
      defaultValue: 'inactive'
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
      type: DataTypes.ENUM('FREE', 'PRO'),
      defaultValue: 'FREE'
    },
    subscriptionTier: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password: {
      type: DataTypes.STRING,
    },
    profilePicture: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    firstName: {
      type: DataTypes.STRING,
    },
    googleAccessToken: {
      type: DataTypes.STRING,
    },
    googleRefreshToken: {
      type: DataTypes.STRING,
    },
    lastName: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM("dormant", "complete"),
      defaultValue: "dormant",
    },
    phone: {
      type: DataTypes.STRING,
    },
    title: {
      type: DataTypes.STRING,
    },
    experience: {
      type: DataTypes.STRING,
    },
    industry: {
      type: DataTypes.STRING,
    },
    location: {
      type: DataTypes.STRING,
    },
    desiredSalary: {
      type: DataTypes.STRING,
    },
    workPreference: {
      type: DataTypes.ENUM("remote", "hybrid", "onsite"),
    },
    country: {
      type: DataTypes.STRING,
    },
    currency: {
      type: DataTypes.STRING,
    },
    skills: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    languages: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    certifications: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    education: {
      type: DataTypes.JSONB,
    },
    linkedin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    github: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    portfolio: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
    },
    resume: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    colours: {
      type: DataTypes.JSONB,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Candidate;
