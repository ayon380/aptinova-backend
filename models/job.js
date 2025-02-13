const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Job title cannot be empty" },
      len: { args: [5, 100], msg: "Job title must be between 5 and 100 characters" }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Job description cannot be empty" },
      len: { args: [20, 5000], msg: "Job description must be between 20 and 5000 characters" }
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: { args: [2, 100], msg: "Location must be between 2 and 100 characters" }
    }
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      isDecimal: { msg: "Salary must be a valid decimal number" },
      min: { args: [0], msg: "Salary must be a positive number" }
    }
  },
  salaryCurrency: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isAlpha: { msg: "Salary currency must be a valid currency code" },
      len: { args: [3, 3], msg: "Currency code must be exactly 3 characters (e.g., USD, EUR)" }
    }
  },
  benefits: {
    type: DataTypes.ARRAY(DataTypes.STRING), // For PostgreSQL; use JSONB for other DBs
    allowNull: true,
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error("Benefits must be an array of strings");
        }
      }
    }
  },
  perks: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error("Perks must be an array of strings");
        }
      }
    }
  },
  employmentType: {
    type: DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship']],
        msg: "Employment type must be one of 'Full-time', 'Part-time', 'Contract', 'Temporary', or 'Internship'"
      }
    }
  },
  postedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isAfter: {
        args: new Date().toISOString(),
        msg: "Deadline must be a future date"
      }
    }
  },
  experienceRequired: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: { args: [2, 100], msg: "Experience details must be between 2 and 100 characters" }
    }
  },
  qualifications: {
    type: DataTypes.ARRAY(DataTypes.STRING), // For PostgreSQL; use JSONB for other DBs
    allowNull: true,
    validate: {
      isArray(value) {
        if (!Array.isArray(value)) {
          throw new Error("Qualifications must be an array of strings");
        }
      }
    }
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Company name cannot be empty" },
      len: { args: [2, 100], msg: "Company name must be between 2 and 100 characters" }
    }
  },
  status: {
    type: DataTypes.ENUM('Open', 'Closed', 'Paused'),
    defaultValue: 'Open',
    allowNull: false
  },
  jobType: {
    type: DataTypes.ENUM('On-site', 'Remote', 'Hybrid'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['On-site', 'Remote', 'Hybrid']],
        msg: "Job type must be one of 'On-site', 'Remote', or 'Hybrid'"
      }
    }
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: { args: [2, 50], msg: "Industry must be between 2 and 50 characters" }
    }
  },
  applicationLink: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: { msg: "Application link must be a valid URL" }
    }
  },
  remoteEligibility: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  jobLevel: {
    type: DataTypes.ENUM('Entry-level', 'Mid-level', 'Senior-level', 'Director', 'Executive'),
    allowNull: true
  },
  languageRequirements: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true
  },
  visaSponsorshipAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  additionalDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'jobs',
  timestamps: true,
  paranoid: true, // For soft deletes
  underscored: true
});

module.exports = Job;
