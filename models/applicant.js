const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Job = require("./job");
const Organization = require("./organization");
const HiringTest = require("./hiringTest");
const Candidate = require("./candidate");

const Applicant = sequelize.define(
  "Applicant",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Job,
        key: "id",
      },
    },
    orgId: {
      type: DataTypes.UUID, // Changed from UUID to INTEGER
      allowNull: false,
      references: {
        model: Organization,
        key: "id",
      },
    },
    hiringTestId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: HiringTest,
        key: "id",
      },
    },
    candidateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Candidate,
        key: "id",
      },
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: { args: [0], msg: "Score must be a non-negative integer" },
        max: { args: [100], msg: "Score must be at most 100" },
      },
    },
    status: {
      type: DataTypes.ENUM(
        "Applied",
        "In Progress",
        "Assessment",
        "Completed",
        "Rejected",
        "Accepted"
      ),
      defaultValue: "Applied",
      allowNull: false,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
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
                  "status",
                  "score",
                  "id",
                  "comments",
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
    tableName: "applicants",
    timestamps: true,
    underscored: true,
  }
);

Applicant.belongsTo(Job, { foreignKey: "jobId" });
Applicant.belongsTo(Organization, { foreignKey: "orgId" });
Applicant.belongsTo(HiringTest, { foreignKey: "hiringTestId" });
module.exports = Applicant;
