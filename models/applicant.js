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
