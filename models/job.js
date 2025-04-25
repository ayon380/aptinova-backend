const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Organization = require("./organization");
const { text } = require("express");
const HR = require("./hr");
//v0.29
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
    hrId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: HR,
        key: "id",
      },
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
      type: DataTypes.ENUM("Open", "Closed", "Paused", "Filled"),
      validate: {
        isIn: {
          args: [["Open", "Closed", "Paused", "Filled"]],
          msg: "Status must be one of 'Open', 'Closed', 'Paused' or 'Filled'",
        },
      },
      defaultValue: "Open",
      allowNull: false,
    },
    workExperience: {
      type: DataTypes.JSONB, // For PostgreSQL; use JSON for other DBs
      allowNull: true,
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
    hiringProcess: {
      type: DataTypes.TEXT, // Stores JSON-serialized array of hiring steps
      allowNull: true,
      comment: "Defines the steps in the hiring process for this job.",
      validate: {
        isValidHiringProcess(value) {
          if (value) {
            try {
              if (typeof value !== "string") {
                throw new Error("Hiring process must be a valid JSON string.");
              }

              const parsed = JSON.parse(value);
              if (!Array.isArray(parsed)) {
                throw new Error("Hiring process must be an array of steps.");
              }

              const validStepTypes = [
                "Shortlist",
                "Test",
                "Interview",
                "Onboard",
              ];

              parsed.forEach((step, index) => {
                if (typeof step !== "object" || step === null) {
                  throw new Error(`Step ${index + 1} must be an object.`);
                }

                const allowedKeys = [
                  "type",
                  "name",
                  "description",
                  "plannedDate",
                  "completedDate",
                ];
                const stepKeys = Object.keys(step);

                // Ensure no unexpected fields
                stepKeys.forEach((key) => {
                  if (!allowedKeys.includes(key)) {
                    throw new Error(
                      `Invalid field '${key}' in step ${index + 1}.`
                    );
                  }
                });

                // Validate type
                if (!step.type || !validStepTypes.includes(step.type)) {
                  throw new Error(
                    `Step ${
                      index + 1
                    } must have a valid type: ${validStepTypes.join(", ")}`
                  );
                }

                // Validate name
                if (
                  !step.name ||
                  typeof step.name !== "string" ||
                  step.name.trim() === ""
                ) {
                  throw new Error(
                    `Step ${index + 1} must have a non-empty name.`
                  );
                }

                // Validate description
                if (step.description && typeof step.description !== "string") {
                  throw new Error(
                    `Step ${index + 1}: description must be a string.`
                  );
                }

                // Validate plannedDate format
                if (
                  step.plannedDate &&
                  !/^\d{4}-\d{2}-\d{2}$/.test(step.plannedDate)
                ) {
                  throw new Error(
                    `Step ${
                      index + 1
                    }: plannedDate must be in YYYY-MM-DD format.`
                  );
                }

                // Validate completedDate format
                if (
                  step.completedDate &&
                  !/^\d{4}-\d{2}-\d{2}$/.test(step.completedDate)
                ) {
                  throw new Error(
                    `Step ${
                      index + 1
                    }: completedDate must be in YYYY-MM-DD format.`
                  );
                }

                // Ensure plannedDate is before completedDate
                if (step.plannedDate && step.completedDate) {
                  const planned = new Date(step.plannedDate);
                  const completed = new Date(step.completedDate);
                  if (planned > completed) {
                    throw new Error(
                      `Step ${
                        index + 1
                      }: plannedDate must be before completedDate.`
                    );
                  }
                }
              });
            } catch (err) {
              throw new Error(`Invalid hiring process format: ${err.message}`);
            }
          }
        },
      },
    },
  },
  {
    tableName: "jobs",
    timestamps: true,
    paranoid: true, // For soft deletes
    underscored: true,
  }
);

// Define association with Organization
Job.belongsTo(Organization, {
  foreignKey: "organizationId",
  as: "organization",
});
Job.belongsTo(HR, {
  foreignKey: "hrId",
  as: "hr",
});
module.exports = Job;
