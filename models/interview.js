const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Job = require("./job");
const Organization = require("./organization");
const Candidate = require("./candidate");
const Applicant = require("./applicant");

const Interview = sequelize.define(
  "Interview",
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
        model: "jobs", // Changed from "Job" to "jobs"
        key: "id",
      },
    },
    orgId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "organizations", // Changed from "organization" to "organizations"
        key: "id",
      },
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    summary: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    interviewers: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    },
    candidateId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "candidates", // Changed from "Candidate" to "candidates"
        key: "id",
      },
    },
    applicantid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "applicants", // Changed from "Applicant" to "applicants"
        key: "id",
      },
    },
    startDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
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
      type: DataTypes.ENUM("Scheduled", "Completed", "Cancelled"),
      allowNull: false,
      defaultValue: "Scheduled",
    },
    meetingLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "interviews",
    timestamps: true,
    createdAt: "created_at",
  }
);
Interview.belongsTo(Job, {
  foreignKey: "jobId",
  // as: "job",
});
Interview.belongsTo(Candidate, {
  foreignKey: "candidateId",
  // as: "candidate",
});
Interview.belongsTo(Applicant, {
  foreignKey: "applicantid",
  // as: "applicant",
});
Interview.belongsTo(Organization, {
  foreignKey: "orgId",
  // as: "organization",
});

module.exports = Interview;
