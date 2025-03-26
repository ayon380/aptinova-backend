const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");

const Job = sequelize.define(
  "Job",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orgLogo: {
      type: DataTypes.STRING,
    },
    OrgName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: { msg: "Organization name cannot be empty" },
        len: {
          args: [2, 100],
          msg: "Organization name must be between 2 and 100 characters",
        },
      },
    },
    subdomain: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: { msg: "Subdomain cannot be empty" },
        len: {
          args: [2, 100],
          msg: "Subdomain must be between 2 and 100 characters",
        },
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Job title cannot be empty" },
        len: {
          args: [2, 100],
          msg: "Job title must be between 5 and 100 characters",
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Job description cannot be empty" },
        len: {
          args: [20, 5000],
          msg: "Job description must be between 20 and 5000 characters",
        },
      },
    },
    organizationId: {
      type: DataTypes.UUID,
      references: {
        model: Organization,
        key: "id",
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [2, 100],
          msg: "Location must be between 2 and 100 characters",
        },
      },
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        isDecimal: { msg: "Salary must be a valid decimal number" },
        min: { args: [0], msg: "Salary must be a positive number" },
      },
    },
    salaryCurrency: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isAlpha: { msg: "Salary currency must be a valid currency code" },
        len: {
          args: [3, 3],
          msg: "Currency code must be exactly 3 characters (e.g., USD, EUR)",
        },
      },
    },
    benefits: {
      type: DataTypes.TEXT, // For PostgreSQL; use JSONB for other DBs
      allowNull: true,
    },
    employmentType: {
      type: DataTypes.ENUM(
        "Full-time",
        "Part-time",
        "Contract",
        "Temporary",
        "Internship"
      ),
      allowNull: false,
      validate: {
        isIn: {
          args: [
            ["Full-time", "Part-time", "Contract", "Temporary", "Internship"],
          ],
          msg: "Employment type must be one of 'Full-time', 'Part-time', 'Contract', 'Temporary', or 'Internship'",
        },
      },
    },
    postedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isAfter: {
          args: new Date().toISOString(),
          msg: "Deadline must be a future date",
        },
      },
    },
    experienceRequired: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: "Experience required must be a non-negative integer",
        },
      },
    },
    qualifications: {
      type: DataTypes.TEXT, // For PostgreSQL; use JSONB for other DBs
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Open", "Closed", "Paused"),
      defaultValue: "Open",
      allowNull: false,
    },
    jobType: {
      type: DataTypes.ENUM("On-site", "Remote", "Hybrid"),
      allowNull: false,
      validate: {
        isIn: {
          args: [["On-site", "Remote", "Hybrid"]],
          msg: "Job type must be one of 'On-site', 'Remote', or 'Hybrid'",
        },
      },
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    applicationLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remoteEligibility: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    jobLevel: {
      type: DataTypes.ENUM(
        "Entry-level",
        "Mid-level",
        "Senior-level",
        "Director",
        "Executive"
      ),
      allowNull: true,
    },
    languageRequirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    visaSponsorshipAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    additionalDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "jobs",
    timestamps: true,
    paranoid: true, // For soft deletes
    underscored: true,
  }
);

module.exports = Job;
