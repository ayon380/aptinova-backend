const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const validate = require("validator");
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
      type: DataTypes.ENUM("FREE", "PRO"),
      defaultValue: "FREE",
    },
    subscriptionTier: {
      type: DataTypes.STRING,
      allowNull: true,
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
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
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
    workExperience: {
      type: DataTypes.JSONB,
      validate: {
        isValidExperience(value) {
          if (!Array.isArray(value)) {
            throw new Error("Work experience must be an array.");
          }
          for (const entry of value) {
            if (typeof entry !== "object" || entry === null) {
              throw new Error("Each work experience entry must be an object.");
            }
            if (!entry.company || typeof entry.company !== "string") {
              throw new Error(
                "Each work experience entry must include a valid company name."
              );
            }
            if (!entry.position || typeof entry.position !== "string") {
              throw new Error(
                "Each work experience entry must include a valid position."
              );
            }
            if (!entry.description || typeof entry.description !== "string") {
              throw new Error(
                "Each work experience entry must include a valid description."
              );
            }
            if (
              !entry.startDate ||
              isNaN(new Date(entry.startDate).getTime())
            ) {
              throw new Error(
                "Each work experience entry must include a valid start date."
              );
            }
            if (entry.endDate && isNaN(new Date(entry.endDate).getTime())) {
              throw new Error(
                "Each work experience entry must include a valid end date."
              );
            }
            if (
              entry.endDate &&
              new Date(entry.startDate) > new Date(entry.endDate)
            ) {
              throw new Error(
                "End date must be after start date for each work experience entry."
              );
            }
            if (entry.isPresent && new Date(entry.startDate) > new Date()) {
              throw new Error(
                "Start date cannot be in the future if isPresent is true."
              );
            }
            if (entry.endDate && new Date(entry.startDate) > new Date()) {
              throw new Error(
                "Start date cannot be in the future if end date is provided."
              );
            }
            if (entry.isPresent && entry.endDate) {
              throw new Error("If isPresent is true, endDate must be null.");
            }
          }
        },
      },
    },
    projects: {
      type: DataTypes.JSONB,
      validate: {
        isValidProjects(value) {
          if (!Array.isArray(value)) {
            throw new Error("Projects must be an array.");
          }
          for (const entry of value) {
            if (typeof entry !== "object" || entry === null) {
              throw new Error("Each project entry must be an object.");
            }
            if (!entry.title || typeof entry.title !== "string") {
              throw new Error("Each project entry must include a valid title.");
            }
            if (!entry.description || typeof entry.description !== "string") {
              throw new Error(
                "Each project entry must include a valid description."
              );
            }
            if (!entry.technologies || !Array.isArray(entry.technologies)) {
              throw new Error(
                "Each project entry must include a valid technologies array."
              );
            }
            if (!entry.link || typeof entry.link !== "string") {
              throw new Error("Each project entry must include a valid link.");
            }
            if (
              !entry.startDate ||
              isNaN(new Date(entry.startDate).getTime())
            ) {
              throw new Error(
                "Each project entry must include a valid start date."
              );
            }
            if (entry.endDate && isNaN(new Date(entry.endDate).getTime())) {
              throw new Error(
                "Each project entry must include a valid end date."
              );
            }
            if (
              entry.endDate &&
              new Date(entry.startDate) > new Date(entry.endDate)
            ) {
              throw new Error(
                "End date must be after start date for each project entry."
              );
            }
          }
        },
      },
    },
    certifications: {
      type: DataTypes.JSONB,
      validate: {
        isValidCertifications(value) {
          if (!Array.isArray(value)) {
            throw new Error("Certifications must be an array.");
          }
          for (const entry of value) {
            if (typeof entry !== "object" || entry === null) {
              throw new Error("Each certification entry must be an object.");
            }
            if (!entry.title || typeof entry.title !== "string") {
              throw new Error(
                "Each certification entry must include a valid title."
              );
            }
            if (!entry.issuer || typeof entry.issuer !== "string") {
              throw new Error(
                "Each certification entry must include a valid issuer."
              );
            }
            if (
              !entry.issueDate ||
              isNaN(new Date(entry.issueDate).getTime())
            ) {
              throw new Error(
                "Each certification entry must include a valid issue date."
              );
            }
          }
        },
      },
    },
    publications: {
      type: DataTypes.JSONB,
      validate: {
        isValidPublications(value) {
          if (!Array.isArray(value)) {
            throw new Error("Publications must be an array.");
          }
          for (const entry of value) {
            if (typeof entry !== "object" || entry === null) {
              throw new Error("Each publication entry must be an object.");
            }
            if (!entry.title || typeof entry.title !== "string") {
              throw new Error(
                "Each publication entry must include a valid title."
              );
            }
            if (!entry.description || typeof entry.description !== "string") {
              throw new Error(
                "Each publication entry must include a valid description."
              );
            }
            if (!entry.link || typeof entry.link !== "string") {
              throw new Error(
                "Each publication entry must include a valid link."
              );
            }
          }
        },
      },
    },
    awards: {
      type: DataTypes.JSONB,
      validate: {
        isValidAwards(value) {
          if (!Array.isArray(value)) {
            throw new Error("Awards must be an array.");
          }
          for (const entry of value) {
            if (typeof entry !== "object" || entry === null) {
              throw new Error("Each award entry must be an object.");
            }
            if (!entry.title || typeof entry.title !== "string") {
              throw new Error("Each award entry must include a valid title.");
            }
            if (!entry.issuer || typeof entry.issuer !== "string") {
              throw new Error("Each award entry must include a valid issuer.");
            }
          }
        },
      },
    },
    achievements: {
      type: DataTypes.JSONB,
      validate: {
        isValidAchievements(value) {
          if (!Array.isArray(value)) {
            throw new Error("Achievements must be an array.");
          }
          for (const entry of value) {
            if (typeof entry !== "object" || entry === null) {
              throw new Error("Each achievement entry must be an object.");
            }
            if (!entry.title || typeof entry.title !== "string") {
              throw new Error(
                "Each achievement entry must include a valid title."
              );
            }
            if (!entry.description || typeof entry.description !== "string") {
              throw new Error(
                "Each achievement entry must include a valid description."
              );
            }
            if (!entry.date || isNaN(new Date(entry.date).getTime())) {
              throw new Error(
                "Each achievement entry must include a valid date."
              );
            }
          }
        },
      },
    },
    education: {
      type: DataTypes.JSONB,
      validate: {
        isValidEducation(value) {
          if (!Array.isArray(value)) {
            throw new Error("Education must be an array.");
          }
          for (const entry of value) {
            if (typeof entry !== "object" || entry === null) {
              throw new Error("Each education entry must be an object.");
            }
            if (!entry.institution || typeof entry.institution !== "string") {
              throw new Error(
                "Each education entry must include a valid institution."
              );
            }
            if (!entry.degree || typeof entry.degree !== "string") {
              throw new Error(
                "Each education entry must include a valid degree."
              );
            }
            if (!entry.fieldOfStudy || typeof entry.fieldOfStudy !== "string") {
              throw new Error(
                "Each education entry must include a valid field of study."
              );
            }
            if (
              !entry.startDate ||
              isNaN(new Date(entry.startDate).getTime())
            ) {
              throw new Error(
                "Each education entry must include a valid start date."
              );
            }
            if (!entry.currentlyStudying && !entry.endDate) {
              throw new Error(
                "If currentlyStudying is false, endDate must be provided."
              );
            }
            if (entry.endDate && isNaN(new Date(entry.endDate).getTime())) {
              throw new Error(
                "Each education entry must include a valid end date."
              );
            }
          }
        },
      },
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
    tableName: "candidates",
    freezeTableName: true,
  }
);

module.exports = Candidate;
