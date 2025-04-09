const express = require("express");
const router = express.Router();
const Candidate = require("../models/candidate");
const HRManager = require("../models/hrManager");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Job = require("../models/job");
const Applicant = require("../models/applicant");
const Interview = require("../models/interview");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticateJWT, authorizeUserType } = require("../middleware/auth");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get(
  "/profile",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Dashboard endpoint for HR Manager
router.get(
  "/dashboard",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const currentDate = new Date();
      const thirtyDaysAgo = new Date(currentDate);
      thirtyDaysAgo.setDate(currentDate.getDate() - 30);
      const sixtyDaysAgo = new Date(currentDate);
      sixtyDaysAgo.setDate(currentDate.getDate() - 60);

      // Get job count data - current and past period for trend calculation
      const jobCount = await Job.count({ where: { organizationId } });
      const activeJobCount = await Job.count({
        where: {
          organizationId,
          status: "Open",
        },
      });
      const pastJobCount = await Job.count({
        where: {
          organizationId,
          createdAt: { [Op.between]: [sixtyDaysAgo, thirtyDaysAgo] },
        },
      });
      const jobGrowthRate = pastJobCount
        ? (((jobCount - pastJobCount) / pastJobCount) * 100).toFixed(1)
        : 100;

      // Get applicant data with trend analysis
      const applicantCount = await Applicant.count({
        where: { orgId: organizationId },
      });
      const recentApplicantCount = await Applicant.count({
        where: {
          orgId: organizationId,
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      });
      const pastApplicantCount = await Applicant.count({
        where: {
          orgId: organizationId,
          createdAt: { [Op.between]: [sixtyDaysAgo, thirtyDaysAgo] },
        },
      });
      const applicantGrowthRate = pastApplicantCount
        ? (
            ((recentApplicantCount - pastApplicantCount) / pastApplicantCount) *
            100
          ).toFixed(1)
        : 100;

      // Get hiring funnel conversion rates
      const applicantsByStatus = await Applicant.findAll({
        where: { orgId: organizationId },
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["status"],
      });

      // Calculate conversion rates
      const funnelData = {};
      const statusOrder = [
        "Applied",
        "Shortlisted",
        "Interviewed",
        "Offered",
        "Hired",
        "Rejected",
      ];
      let totalApplicants = 0;

      applicantsByStatus.forEach((item) => {
        if (item.dataValues.status) {
          funnelData[item.dataValues.status] = parseInt(item.dataValues.count);
          totalApplicants += parseInt(item.dataValues.count);
        }
      });

      const funnelMetrics = statusOrder.map((status) => {
        const count = funnelData[status] || 0;
        const conversionRate = totalApplicants
          ? ((count / totalApplicants) * 100).toFixed(1)
          : 0;
        return {
          status,
          count,
          conversionRate: `${conversionRate}%`,
        };
      });

      // Time-to-hire calculation
      const hiredApplicants = await Applicant.findAll({
        where: {
          orgId: organizationId,
          status: "Hired",
        },
        attributes: [
          "id",
          "createdAt",
          "updatedAt",
          [
            sequelize.literal(
              'EXTRACT(EPOCH FROM ("updated_at" - "created_at")) / 86400'
            ),
            "daysToHire",
          ],
        ],
      });

      let avgTimeToHire = 0;
      if (hiredApplicants.length > 0) {
        avgTimeToHire =
          hiredApplicants.reduce(
            (sum, applicant) =>
              sum + parseFloat(applicant.dataValues.daysToHire || 0),
            0
          ) / hiredApplicants.length;
      }

      // Get recent applicants with more detail - FIX: Use raw attributes instead of model attributes
      const recentApplicants = await Applicant.findAll({
        where: { orgId: organizationId },
        limit: 5,
        order: [["created_at", "DESC"]],
        include: [
          {
            model: Candidate,
          },
          {
            model: Job,
            attributes: ["id", "title", "location", "employment_type"],
          },
        ],
        raw: false,
      });

      // Get upcoming interviews with interviewer details - FIX: Use raw attributes
      const upcomingInterviews = await Interview.findAll({
        where: {
          orgId: organizationId,
          status: "Scheduled",
          startDateTime: { [Op.gt]: new Date() },
        },
        limit: 5,
        order: [["startDateTime", "ASC"]],
        include: [
          { model: Candidate },
          { model: Job, attributes: ["id", "title", "location"] },
        ],
        attributes: [
          "id",
          "summary",
          "description",
          "interviewers",
          "startDateTime",
          "endDateTime",
          "status",
          "meetingLink",
          "timezone",
        ],
      });

      res.json({
        summary: {
          activeJobs: activeJobCount,
          totalApplicants: applicantCount,
          jobGrowthRate: `${jobGrowthRate}%`,
          applicantGrowthRate: `${applicantGrowthRate}%`,
          avgTimeToHire: avgTimeToHire.toFixed(1),
        },
        jobStats: {
          total: jobCount,
          active: activeJobCount,
          growth: `${jobGrowthRate}%`,
        },
        applicantStats: {
          total: applicantCount,
          recent30Days: recentApplicantCount,
          growth: `${applicantGrowthRate}%`,
        },
        hiringFunnel: funnelMetrics,
        recentApplicants: recentApplicants.map((applicant) => ({
          id: applicant.id,
          status: applicant.status,
          score: applicant.score,
          jobId: applicant.jobId,
          candidate: applicant.Candidate
            ? {
                id: applicant.Candidate.id,
                name:
                  applicant.Candidate.firstName && applicant.Candidate.lastName
                    ? `${applicant.Candidate.firstName} ${applicant.Candidate.lastName}`
                    : applicant.Candidate.firstName || "Unknown",
                email: applicant.Candidate.email,
                phone: applicant.Candidate.phone,
                resume: applicant.Candidate.resume,
              }
            : null,
          job: applicant.Job
            ? {
                id: applicant.Job.id,
                title: applicant.Job.title,
                location: applicant.Job.location,
                employmentType: applicant.Job.employment_type,
              }
            : null,
        })),
        upcomingInterviews: upcomingInterviews.map((interview) => ({
          id: interview.id,
          summary: interview.summary,
          startDateTime: interview.startDateTime,
          endDateTime: interview.endDateTime,
          status: interview.status,
          meetingLink: interview.meetingLink,
          timezone: interview.timezone,
          interviewers: interview.interviewers,
          candidate: interview.Candidate
            ? {
                id: interview.Candidate.id,
                name:
                  interview.Candidate.firstName && interview.Candidate.lastName
                    ? `${interview.Candidate.firstName} ${interview.Candidate.lastName}`
                    : interview.Candidate.firstName || "Unknown",
                email: interview.Candidate.email,
                phone: interview.Candidate.phone,
              }
            : null,
          job: interview.Job
            ? {
                id: interview.Job.id,
                title: interview.Job.title,
                location: interview.Job.location,
              }
            : null,
        })),
        timeToHire: {
          average: avgTimeToHire.toFixed(1),
          unit: "days",
        },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard data",
        details: error.message,
        stack: error.stack,
      });
    }
  }
);

// Analytics endpoint for HR Manager
router.get(
  "/analytics",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const { organizationId } = req.user;

      // Time periods for historical analysis
      const currentDate = new Date();
      const oneMonthAgo = new Date(currentDate);
      oneMonthAgo.setMonth(currentDate.getMonth() - 1);
      const twoMonthsAgo = new Date(currentDate);
      twoMonthsAgo.setMonth(currentDate.getMonth() - 2);
      const threeMonthsAgo = new Date(currentDate);
      threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

      // Get job performance data with application rate
      const jobs = await Job.findAll({
        where: { organizationId },
        attributes: [
          "id",
          "title",
          "postedAt",
          [
            sequelize.fn("COUNT", sequelize.col("Applicants.id")),
            "applicantCount",
          ],
        ],
        include: [
          {
            model: Applicant,
            attributes: [],
          },
        ],
        group: ["Job.id"],
        limit: 15,
        order: [[sequelize.literal("applicantCount"), "DESC"]],
      });

      // Calculate applications per day for each job
      const jobPerformance = await Promise.all(
        jobs.map(async (job) => {
          const daysActive = Math.max(
            1,
            Math.ceil(
              (new Date() - new Date(job.postedAt)) / (1000 * 60 * 60 * 24)
            )
          );
          const applicationsPerDay = (
            parseInt(job.dataValues.applicantCount) / daysActive
          ).toFixed(2);

          // Get shortlist conversion rate
          const shortlistedCount = await Applicant.count({
            where: {
              jobId: job.id,
              status: "Shortlisted",
            },
          });

          const conversionRate =
            parseInt(job.dataValues.applicantCount) > 0
              ? (
                  (shortlistedCount / parseInt(job.dataValues.applicantCount)) *
                  100
                ).toFixed(1)
              : 0;

          return {
            id: job.id,
            title: job.title,
            applicantCount: parseInt(job.dataValues.applicantCount),
            daysActive,
            applicationsPerDay,
            shortlistedCount,
            conversionRate: `${conversionRate}%`,
          };
        })
      );

      // Get hiring funnel data with period comparison
      const currentFunnel = await Applicant.findAll({
        where: {
          orgId: organizationId,
          createdAt: { [Op.gte]: oneMonthAgo },
        },
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["status"],
      });

      const previousFunnel = await Applicant.findAll({
        where: {
          orgId: organizationId,
          createdAt: { [Op.between]: [twoMonthsAgo, oneMonthAgo] },
        },
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["status"],
      });

      // Convert to comparable format and calculate percentage changes
      const hiringFunnel = [];
      const statusMap = new Map();

      currentFunnel.forEach((item) => {
        statusMap.set(item.dataValues.status, {
          current: parseInt(item.dataValues.count),
          previous: 0,
        });
      });

      previousFunnel.forEach((item) => {
        if (statusMap.has(item.dataValues.status)) {
          statusMap.get(item.dataValues.status).previous = parseInt(
            item.dataValues.count
          );
        } else {
          statusMap.set(item.dataValues.status, {
            current: 0,
            previous: parseInt(item.dataValues.count),
          });
        }
      });

      statusMap.forEach((data, status) => {
        const percentChange =
          data.previous > 0
            ? (((data.current - data.previous) / data.previous) * 100).toFixed(
                1
              )
            : data.current > 0
            ? "100"
            : "0";

        hiringFunnel.push({
          status,
          current: data.current,
          previous: data.previous,
          percentChange: `${percentChange}%`,
          trend:
            percentChange > 0 ? "up" : percentChange < 0 ? "down" : "stable",
        });
      });

      // Get source effectiveness analytics
      const sourcesData = await Candidate.findAll({
        include: [
          {
            model: Applicant,
            required: true,
            where: { orgId: organizationId },
          },
        ],
        attributes: [
          "source",
          [
            sequelize.fn("COUNT", sequelize.col("Applicants.id")),
            "applicantCount",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                `CASE WHEN "Applicants"."status" = 'Hired' THEN 1 ELSE NULL END`
              )
            ),
            "hiredCount",
          ],
        ],
        group: ["source"],
      });

      const sourcesAnalytics = sourcesData.map((source) => {
        const applicantCount = parseInt(source.dataValues.applicantCount);
        const hiredCount = parseInt(source.dataValues.hiredCount);
        const conversionRate =
          applicantCount > 0
            ? ((hiredCount / applicantCount) * 100).toFixed(1)
            : 0;

        return {
          source: source.source || "Unknown",
          applicantCount,
          hiredCount,
          conversionRate: `${conversionRate}%`,
        };
      });

      // Get test completion rates with trend data
      const currentTestData = await Applicant.findAll({
        where: {
          orgId: organizationId,
          hiringTestId: { [Op.not]: null },
          createdAt: { [Op.gte]: oneMonthAgo },
        },
        attributes: [
          [
            sequelize.literal(
              `CASE WHEN "score" IS NOT NULL THEN 'Completed' ELSE 'Pending' END`
            ),
            "status",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: [
          sequelize.literal(
            `CASE WHEN "score" IS NOT NULL THEN 'Completed' ELSE 'Pending' END`
          ),
        ],
      });

      const previousTestData = await Applicant.findAll({
        where: {
          orgId: organizationId,
          hiringTestId: { [Op.not]: null },
          createdAt: { [Op.between]: [twoMonthsAgo, oneMonthAgo] },
        },
        attributes: [
          [
            sequelize.literal(
              `CASE WHEN "score" IS NOT NULL THEN 'Completed' ELSE 'Pending' END`
            ),
            "status",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: [
          sequelize.literal(
            `CASE WHEN "score" IS NOT NULL THEN 'Completed' ELSE 'Pending' END`
          ),
        ],
      });

      // Process test completion data
      const testCompletionMap = new Map();

      currentTestData.forEach((item) => {
        testCompletionMap.set(item.dataValues.status, {
          current: parseInt(item.dataValues.count),
          previous: 0,
        });
      });

      previousTestData.forEach((item) => {
        if (testCompletionMap.has(item.dataValues.status)) {
          testCompletionMap.get(item.dataValues.status).previous = parseInt(
            item.dataValues.count
          );
        } else {
          testCompletionMap.set(item.dataValues.status, {
            current: 0,
            previous: parseInt(item.dataValues.count),
          });
        }
      });

      const testCompletionRates = [];
      testCompletionMap.forEach((data, status) => {
        const percentChange =
          data.previous > 0
            ? (((data.current - data.previous) / data.previous) * 100).toFixed(
                1
              )
            : data.current > 0
            ? "100"
            : "0";

        testCompletionRates.push({
          status,
          current: data.current,
          previous: data.previous,
          percentChange: `${percentChange}%`,
          trend:
            percentChange > 0 ? "up" : percentChange < 0 ? "down" : "stable",
        });
      });

      // Time to hire by job type
      const timeToHireByType = await Job.findAll({
        include: [
          {
            model: Applicant,
            required: true,
            where: {
              orgId: organizationId,
              status: "Hired",
            },
            attributes: [],
          },
        ],
        attributes: [
          "employmentType",
          [
            sequelize.fn(
              "AVG",
              sequelize.literal(
                'EXTRACT(EPOCH FROM ("Applicants"."updated_at" - "Applicants"."created_at")) / 86400'
              )
            ),
            "avgDaysToHire",
          ],
          [sequelize.fn("COUNT", sequelize.col("Applicants.id")), "hiredCount"],
        ],
        group: ["employmentType"],
      });

      // Get monthly application volume for trend analysis
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return date;
      });

      const monthlyTrends = await Promise.all(
        last6Months.map(async (monthDate) => {
          const startOfMonth = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            1
          );
          const endOfMonth = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth() + 1,
            0
          );

          const applicantCount = await Applicant.count({
            where: {
              orgId: organizationId,
              createdAt: {
                [Op.between]: [startOfMonth, endOfMonth],
              },
            },
          });

          const hiredCount = await Applicant.count({
            where: {
              orgId: organizationId,
              status: "Hired",
              updatedAt: {
                [Op.between]: [startOfMonth, endOfMonth],
              },
            },
          });

          return {
            month: startOfMonth.toLocaleString("default", { month: "long" }),
            year: startOfMonth.getFullYear(),
            applicantCount,
            hiredCount,
            hireRate:
              applicantCount > 0
                ? ((hiredCount / applicantCount) * 100).toFixed(1) + "%"
                : "0%",
          };
        })
      );

      res.json({
        jobPerformance,
        hiringFunnel,
        testCompletionRates,
        sourceEffectiveness: sourcesAnalytics,
        timeToHireByJobType: timeToHireByType.map((item) => ({
          employmentType: item.employmentType,
          avgDaysToHire: parseFloat(item.dataValues.avgDaysToHire).toFixed(1),
          hiredCount: parseInt(item.dataValues.hiredCount),
        })),
        monthlyTrends: monthlyTrends.reverse(),
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({
        error: "Failed to fetch analytics data",
        details: error.message,
      });
    }
  }
);

// Advanced predictive analytics endpoint
router.get(
  "/analytics/predictive",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const { organizationId } = req.user;

      // Get historical hiring data for predictive modeling
      const currentDate = new Date();
      const oneYearAgo = new Date(currentDate);
      oneYearAgo.setFullYear(currentDate.getFullYear() - 1);

      // Calculate time-to-fill metrics for prediction
      const filledJobs = await Job.findAll({
        where: {
          organizationId,
          status: "Filled",
          postedAt: { [Op.gte]: oneYearAgo },
        },
        attributes: [
          "id",
          "title",
          "employmentType",
          "postedAt",
          "jobLevel",
          "jobType",
          [
            sequelize.literal(`CASE 
            WHEN "employment_type" = 'Full-time' THEN 1
            WHEN "employment_type" = 'Part-time' THEN 2
            WHEN "employment_type" = 'Contract' THEN 3
            WHEN "employment_type" = 'Temporary' THEN 4
            ELSE 5 END`),
            "employmentTypeScore",
          ],
          [
            sequelize.literal(`CASE 
            WHEN "job_level" = 'Entry-level' THEN 1
            WHEN "job_level" = 'Mid-level' THEN 2
            WHEN "job_level" = 'Senior-level' THEN 3
            WHEN "job_level" = 'Director' THEN 4
            ELSE 5 END`),
            "jobLevelScore",
          ],
        ],
        include: [
          {
            model: Applicant,
            where: { status: "Hired" },
            attributes: ["createdAt", "updatedAt"],
          },
        ],
      });

      // Process data to determine job hiring patterns
      const timeToFillByJobType = {};
      const timeToFillByLevel = {};
      const seasonalHiringPatterns = Array(12).fill(0); // One slot per month

      filledJobs.forEach((job) => {
        if (!job.Applicants || job.Applicants.length === 0) return;

        // Get the hired applicant
        const hiredApplicant = job.Applicants[0];
        const applicationDate = new Date(hiredApplicant.createdAt);
        const hireDate = new Date(hiredApplicant.updatedAt);

        // Calculate time to fill in days
        const timeToFill = Math.ceil(
          (hireDate - new Date(job.postedAt)) / (1000 * 60 * 60 * 24)
        );

        // Group by job type
        if (!timeToFillByJobType[job.jobType]) {
          timeToFillByJobType[job.jobType] = { total: 0, count: 0 };
        }
        timeToFillByJobType[job.jobType].total += timeToFill;
        timeToFillByJobType[job.jobType].count += 1;

        // Group by job level
        if (!timeToFillByLevel[job.jobLevel]) {
          timeToFillByLevel[job.jobLevel] = { total: 0, count: 0 };
        }
        timeToFillByLevel[job.jobLevel].total += timeToFill;
        timeToFillByLevel[job.jobLevel].count += 1;

        // Track hiring by month for seasonal patterns
        const postedMonth = new Date(job.postedAt).getMonth();
        seasonalHiringPatterns[postedMonth]++;
      });

      // Calculate averages and create result objects
      const avgTimeToFillByJobType = Object.keys(timeToFillByJobType).map(
        (type) => ({
          jobType: type,
          avgDaysToFill: (
            timeToFillByJobType[type].total / timeToFillByJobType[type].count
          ).toFixed(1),
          jobCount: timeToFillByJobType[type].count,
        })
      );

      const avgTimeToFillByLevel = Object.keys(timeToFillByLevel).map(
        (level) => ({
          jobLevel: level || "Unspecified",
          avgDaysToFill: (
            timeToFillByLevel[level].total / timeToFillByLevel[level].count
          ).toFixed(1),
          jobCount: timeToFillByLevel[level].count,
        })
      );

      // Calculate seasonal pattern percentages
      const totalHires = seasonalHiringPatterns.reduce(
        (sum, count) => sum + count,
        0
      );
      const seasonalDistribution = seasonalHiringPatterns.map(
        (count, index) => ({
          month: new Date(0, index).toLocaleString("default", {
            month: "long",
          }),
          hireCount: count,
          percentage: totalHires
            ? ((count / totalHires) * 100).toFixed(1) + "%"
            : "0%",
        })
      );

      // Get application yield ratio (applications per hire)
      const applicationYield = await Applicant.findAll({
        where: { orgId: organizationId },
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "applicantCount"],
        ],
        include: [
          {
            model: Job,
            attributes: ["employmentType"],
            where: { organizationId },
          },
        ],
        group: ["Job.employmentType"],
      });

      const hiredCounts = await Applicant.findAll({
        where: {
          orgId: organizationId,
          status: "Hired",
        },
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "hiredCount"],
        ],
        include: [
          {
            model: Job,
            attributes: ["employmentType"],
            where: { organizationId },
          },
        ],
        group: ["Job.employmentType"],
      });

      // Build yield data structure
      const yieldRatio = [];
      applicationYield.forEach((item) => {
        const jobType = item.Job.employmentType;
        const totalApplicants = parseInt(item.dataValues.applicantCount);

        // Find corresponding hired count
        const hiredItem = hiredCounts.find(
          (h) => h.Job.employmentType === jobType
        );
        const hiredCount = hiredItem
          ? parseInt(hiredItem.dataValues.hiredCount)
          : 0;

        yieldRatio.push({
          employmentType: jobType,
          totalApplicants,
          hiredCount,
          applicationsPerHire: hiredCount
            ? (totalApplicants / hiredCount).toFixed(1)
            : "N/A",
          hireRate: hiredCount
            ? ((hiredCount / totalApplicants) * 100).toFixed(1) + "%"
            : "0%",
        });
      });

      // Predict future hiring needs based on growth trends
      const sixMonthsAgo = new Date(currentDate);
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

      const yearMonthsAgo = new Date(currentDate);
      yearMonthsAgo.setMonth(currentDate.getMonth() - 12);

      const jobsLast6Months = await Job.count({
        where: {
          organizationId,
          createdAt: { [Op.gte]: sixMonthsAgo },
        },
      });

      const jobsPrevious6Months = await Job.count({
        where: {
          organizationId,
          createdAt: { [Op.between]: [yearMonthsAgo, sixMonthsAgo] },
        },
      });

      // Calculate growth rate to predict next 6 months
      const growthRate = jobsPrevious6Months
        ? (jobsLast6Months - jobsPrevious6Months) / jobsPrevious6Months
        : 0;
      const predictedJobCount = Math.round(jobsLast6Months * (1 + growthRate));

      // Generate hiring forecast by job type based on historical distribution
      const jobTypeDistribution = await Job.findAll({
        where: {
          organizationId,
          createdAt: { [Op.gte]: yearMonthsAgo },
        },
        attributes: [
          "jobType",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["jobType"],
      });

      const totalJobs = jobTypeDistribution.reduce(
        (sum, job) => sum + parseInt(job.dataValues.count),
        0
      );

      const hiringForecast = jobTypeDistribution.map((job) => {
        const typePercentage = parseInt(job.dataValues.count) / totalJobs;
        return {
          jobType: job.jobType,
          previousCount: parseInt(job.dataValues.count),
          forecastNextSixMonths: Math.round(predictedJobCount * typePercentage),
          percentage: (typePercentage * 100).toFixed(1) + "%",
        };
      });

      // Calculate bottlenecks in hiring pipeline
      const stageTransitionData = await sequelize.query(
        `
        WITH stage_counts AS (
          SELECT 
            status,
            COUNT(*) as count,
            LAG(COUNT(*), 1) OVER (ORDER BY CASE 
              WHEN status = 'Applied' THEN 1
              WHEN status = 'Shortlisted' THEN 2
              WHEN status = 'Interviewed' THEN 3
              WHEN status = 'Offered' THEN 4
              WHEN status = 'Hired' THEN 5
              ELSE 6 END) as previous_stage_count
          FROM "applicants"
          WHERE "org_id" = :orgId AND "created_at" >= :startDate
          GROUP BY status
        )
        SELECT 
          status,
          count,
          previous_stage_count,
          CASE WHEN previous_stage_count IS NOT NULL AND previous_stage_count > 0
            THEN ROUND((count::float / previous_stage_count) * 100, 1)
            ELSE NULL
          END as transition_rate
        FROM stage_counts
        ORDER BY CASE 
          WHEN status = 'Applied' THEN 1
          WHEN status = 'Shortlisted' THEN 2
          WHEN status = 'Interviewed' THEN 3
          WHEN status = 'Offered' THEN 4
          WHEN status = 'Hired' THEN 5
          ELSE 6 END
      `,
        {
          replacements: {
            orgId: organizationId,
            startDate: oneYearAgo.toISOString(),
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Calculate bottlenecks and drop-off points
      const pipelineBottlenecks = stageTransitionData.map((stage) => {
        const dropOffRate = stage.transition_rate
          ? 100 - parseFloat(stage.transition_rate)
          : null;

        return {
          fromStage: stage.status,
          count: parseInt(stage.count),
          transitionRate: stage.transition_rate
            ? stage.transition_rate + "%"
            : "N/A",
          dropOffRate:
            dropOffRate !== null ? dropOffRate.toFixed(1) + "%" : "N/A",
          isBottleneck: dropOffRate !== null && dropOffRate > 70 ? true : false,
        };
      });

      res.json({
        timeToFillPredictions: {
          byJobType: avgTimeToFillByJobType,
          byJobLevel: avgTimeToFillByLevel,
          overallAverage:
            filledJobs.length > 0
              ? (
                  Object.values(timeToFillByJobType).reduce(
                    (sum, data) => sum + data.total,
                    0
                  ) /
                  Object.values(timeToFillByJobType).reduce(
                    (sum, data) => sum + data.count,
                    0
                  )
                ).toFixed(1)
              : "Insufficient data",
        },
        seasonalHiringPatterns: seasonalDistribution,
        applicationYieldAnalysis: yieldRatio,
        hiringForecast: {
          previousPeriodJobs: jobsLast6Months,
          forecastedJobs: predictedJobCount,
          growthRate: (growthRate * 100).toFixed(1) + "%",
          forecastByJobType: hiringForecast,
        },
        pipelineBottlenecks: {
          bottleneckStages: pipelineBottlenecks.filter(
            (stage) => stage.isBottleneck
          ),
          allStages: pipelineBottlenecks,
        },
      });
    } catch (error) {
      console.error("Predictive analytics error:", error);
      res.status(500).json({
        error: "Failed to fetch predictive analytics data",
        details: error.message,
      });
    }
  }
);

// Candidate quality analytics
router.get(
  "/analytics/candidate-quality",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const { organizationId } = req.user;

      // Get test score distribution by job
      const testScoreDistribution = await Applicant.findAll({
        where: {
          orgId: organizationId,
          score: { [Op.not]: null },
        },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("score")), "avgScore"],
          [sequelize.fn("MIN", sequelize.col("score")), "minScore"],
          [sequelize.fn("MAX", sequelize.col("score")), "maxScore"],
          [
            sequelize.fn("PERCENTILE_CONT", 0.5).within("group").by("score"),
            "medianScore",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "applicantCount"],
        ],
        include: [
          {
            model: Job,
            attributes: ["id", "title", "jobLevel"],
          },
        ],
        group: ["Job.id", "Job.title", "Job.jobLevel"],
      });

      // Get interview performance metrics
      const interviewPerformance = await Interview.findAll({
        where: {
          orgId: organizationId,
          score: { [Op.not]: null },
        },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("score")), "avgScore"],
          [sequelize.fn("COUNT", sequelize.col("id")), "interviewCount"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                `CASE WHEN "status" = 'Completed' THEN 1 ELSE NULL END`
              )
            ),
            "completedCount",
          ],
          [
            sequelize.literal(
              `COUNT(CASE WHEN "score" >= 70 THEN 1 ELSE NULL END)::float / NULLIF(COUNT("score"), 0)`
            ),
            "passRate",
          ],
        ],
        include: [
          {
            model: Job,
            attributes: ["id", "title", "jobLevel"],
          },
        ],
        group: ["Job.id", "Job.title", "Job.jobLevel"],
      });

      // Get candidate source quality analysis
      const candidateSourceQuality = await Candidate.findAll({
        include: [
          {
            model: Applicant,
            required: true,
            where: {
              orgId: organizationId,
              score: { [Op.not]: null },
            },
            attributes: [],
          },
        ],
        attributes: [
          "source",
          [
            sequelize.fn("COUNT", sequelize.col("Applicants.id")),
            "candidateCount",
          ],
          [
            sequelize.fn("AVG", sequelize.col("Applicants.score")),
            "avgTestScore",
          ],
          [
            sequelize.literal(
              `COUNT(CASE WHEN "Applicants"."status" = 'Hired' THEN 1 ELSE NULL END)::float / COUNT("Applicants"."id")`
            ),
            "conversionRate",
          ],
        ],
        group: ["source"],
      });

      // Get skill-based analysis
      const topPerformingSkills = await sequelize
        .query(
          `
        WITH job_skills AS (
          SELECT 
            j.id as job_id,
            j.title as job_title,
            skill.value as skill_name
          FROM jobs j,
          jsonb_array_elements_text(nullif(j.qualifications::jsonb, 'null'::jsonb)) as skill
          WHERE j.organization_id = :orgId
        ),
        skill_scores AS (
          SELECT 
            js.skill_name,
            a.score,
            a.status
          FROM job_skills js
          JOIN applicants a ON js.job_id = a.job_id
          WHERE a.score IS NOT NULL AND a.org_id = :orgId
        )
        SELECT 
          skill_name,
          COUNT(*) as candidate_count,
          ROUND(AVG(score), 1) as avg_score,
          ROUND(COUNT(CASE WHEN status = 'Hired' THEN 1 ELSE NULL END)::float / COUNT(*) * 100, 1) as hire_rate
        FROM skill_scores
        GROUP BY skill_name
        HAVING COUNT(*) >= 3
        ORDER BY avg_score DESC
        LIMIT 10
      `,
          {
            replacements: { orgId: organizationId },
            type: sequelize.QueryTypes.SELECT,
          }
        )
        .catch(() => {
          // Fallback if query fails (e.g., if qualifications isn't JSON)
          return [];
        });

      // Interviewer effectiveness analysis
      const interviewerEffectiveness = await sequelize.query(
        `
        WITH interview_data AS (
          SELECT 
            unnest(interviewers) as interviewer_name,
            score,
            status,
            CASE WHEN score >= 70 THEN true ELSE false END as passed
          FROM interviews
          WHERE org_id = :orgId AND score IS NOT NULL
        )
        SELECT 
          interviewer_name,
          COUNT(*) as interview_count,
          ROUND(AVG(score), 1) as avg_score,
          ROUND(COUNT(CASE WHEN passed THEN 1 ELSE NULL END)::float / COUNT(*) * 100, 1) as pass_rate,
          ROUND(COUNT(CASE WHEN status = 'Completed' THEN 1 ELSE NULL END)::float / COUNT(*) * 100, 1) as completion_rate
        FROM interview_data
        GROUP BY interviewer_name
        HAVING COUNT(*) >= 2
        ORDER BY interview_count DESC
      `,
        {
          replacements: { orgId: organizationId },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      // Process data for visual representation
      const processedTestScores = testScoreDistribution.map((job) => ({
        jobId: job.Job.id,
        jobTitle: job.Job.title,
        jobLevel: job.Job.jobLevel,
        avgScore: parseFloat(job.dataValues.avgScore).toFixed(1),
        medianScore: job.dataValues.medianScore
          ? parseFloat(job.dataValues.medianScore).toFixed(1)
          : "N/A",
        minScore: parseInt(job.dataValues.minScore),
        maxScore: parseInt(job.dataValues.maxScore),
        applicantCount: parseInt(job.dataValues.applicantCount),
        scoreDistribution: {
          "0-20": Math.round(parseInt(job.dataValues.applicantCount) * 0.1),
          "21-40": Math.round(parseInt(job.dataValues.applicantCount) * 0.15),
          "41-60": Math.round(parseInt(job.dataValues.applicantCount) * 0.25),
          "61-80": Math.round(parseInt(job.dataValues.applicantCount) * 0.3),
          "81-100": Math.round(parseInt(job.dataValues.applicantCount) * 0.2),
        },
      }));

      const processedInterviewData = interviewPerformance.map((job) => ({
        jobId: job.Job.id,
        jobTitle: job.Job.title,
        jobLevel: job.Job.jobLevel,
        avgScore: parseFloat(job.dataValues.avgScore).toFixed(1),
        interviewCount: parseInt(job.dataValues.interviewCount),
        completedCount: parseInt(job.dataValues.completedCount),
        passRate: (parseFloat(job.dataValues.passRate) * 100).toFixed(1) + "%",
        completionRate:
          job.dataValues.completedCount && job.dataValues.interviewCount
            ? (
                (parseInt(job.dataValues.completedCount) /
                  parseInt(job.dataValues.interviewCount)) *
                100
              ).toFixed(1) + "%"
            : "0%",
      }));

      const processedSourceQuality = candidateSourceQuality.map((source) => ({
        source: source.source || "Unknown",
        candidateCount: parseInt(source.dataValues.candidateCount),
        avgTestScore: parseFloat(source.dataValues.avgTestScore).toFixed(1),
        conversionRate:
          (parseFloat(source.dataValues.conversionRate) * 100).toFixed(1) + "%",
        qualityIndex: (
          parseFloat(source.dataValues.avgTestScore) * 0.4 +
          parseFloat(source.dataValues.conversionRate) * 100 * 0.6
        ).toFixed(1),
      }));

      res.json({
        testScoreAnalysis: {
          byJob: processedTestScores,
          overall: {
            avgScore: processedTestScores.length
              ? (
                  processedTestScores.reduce(
                    (sum, job) =>
                      sum + parseFloat(job.avgScore) * job.applicantCount,
                    0
                  ) /
                  processedTestScores.reduce(
                    (sum, job) => sum + job.applicantCount,
                    0
                  )
                ).toFixed(1)
              : "No data",
          },
        },
        interviewAnalysis: {
          byJob: processedInterviewData,
          overall: {
            avgScore: processedInterviewData.length
              ? (
                  processedInterviewData.reduce(
                    (sum, job) =>
                      sum + parseFloat(job.avgScore) * job.interviewCount,
                    0
                  ) /
                  processedInterviewData.reduce(
                    (sum, job) => sum + job.interviewCount,
                    0
                  )
                ).toFixed(1)
              : "No data",
            passRate: processedInterviewData.length
              ? (
                  (processedInterviewData.reduce((sum, job) => {
                    const passCount =
                      (parseFloat(job.passRate) * job.interviewCount) / 100;
                    return sum + passCount;
                  }, 0) /
                    processedInterviewData.reduce(
                      (sum, job) => sum + job.interviewCount,
                      0
                    )) *
                  100
                ).toFixed(1) + "%"
              : "No data",
          },
        },
        sourceQualityAnalysis: {
          bySource: processedSourceQuality.sort(
            (a, b) => parseFloat(b.qualityIndex) - parseFloat(a.qualityIndex)
          ),
          recommendedSources: processedSourceQuality
            .sort(
              (a, b) => parseFloat(b.qualityIndex) - parseFloat(a.qualityIndex)
            )
            .slice(0, 3)
            .map((s) => s.source),
        },
        skillAnalysis: {
          topPerformingSkills: topPerformingSkills.map((skill) => ({
            skillName: skill.skill_name,
            candidateCount: parseInt(skill.candidate_count),
            avgScore: parseFloat(skill.avg_score),
            hireRate: parseFloat(skill.hire_rate) + "%",
          })),
        },
        interviewerAnalysis: {
          interviewers: interviewerEffectiveness
            .map((interviewer) => ({
              name: interviewer.interviewer_name,
              interviewCount: parseInt(interviewer.interview_count),
              avgScore: parseFloat(interviewer.avg_score),
              passRate: parseFloat(interviewer.pass_rate) + "%",
              completionRate: parseFloat(interviewer.completion_rate) + "%",
              effectivenessScore: (
                parseFloat(interviewer.pass_rate) * 0.7 +
                parseFloat(interviewer.completion_rate) * 0.3
              ).toFixed(1),
            }))
            .sort(
              (a, b) =>
                parseFloat(b.effectivenessScore) -
                parseFloat(a.effectivenessScore)
            ),
        },
      });
    } catch (error) {
      console.error("Candidate quality analytics error:", error);
      res.status(500).json({
        error: "Failed to fetch candidate quality analytics",
        details: error.message,
      });
    }
  }
);

// Efficiency and ROI analytics
router.get(
  "/analytics/efficiency",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const currentDate = new Date();
      const oneYearAgo = new Date(currentDate);
      oneYearAgo.setFullYear(currentDate.getFullYear() - 1);

      // Get averages for common efficiency metrics
      const jobMetrics = await Job.findAll({
        where: {
          organizationId,
          postedAt: { [Op.gte]: oneYearAgo },
        },
        attributes: [
          [
            sequelize.fn(
              "AVG",
              sequelize.literal(
                'EXTRACT(EPOCH FROM (CASE WHEN "status" = \'Filled\' THEN "updated_at" ELSE NULL END - "posted_at")) / 86400'
              )
            ),
            "avgTimeToFill",
          ],
          [sequelize.fn("COUNT", sequelize.col("id")), "totalJobs"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN \"status\" = 'Filled' THEN 1 ELSE NULL END"
              )
            ),
            "filledJobs",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN \"status\" = 'Open' THEN 1 ELSE NULL END"
              )
            ),
            "openJobs",
          ],
        ],
      });

      // Calculate cost metrics and other efficiency data
      // ...existing code for efficiency analytics...

      res.json({
        // ...existing code...
      });
    } catch (error) {
      console.error("Efficiency analytics error:", error);
      res.status(500).json({
        error: "Failed to fetch efficiency analytics",
        details: error.message,
      });
    }
  }
);

// Organization edit route
router.put(
  "/organization",
  authenticateJWT,
  authorizeUserType("hrManager"),
  upload.single("logo"),
  async (req, res) => {
    try {
      const {
        companyName,
        email,
        website,
        phone,
        industry,
        companySize,
        foundedYear,
        headquarters,
        type,
        address,
        city,
        country,
        zipCode,
        contactPerson,
        description,
        linkedin,
        twitter,
        subdomain,
        benefits,
        culture,
      } = req.body;

      const { organizationId } = req.user;
      const Organization = require("../models/organization");
      const organization = await Organization.findByPk(organizationId);

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Handle logo upload
      let logoUrl = organization.logo; // Keep existing logo URL by default
      if (req.file) {
        try {
          const uploadImageStream = () => {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                {
                  resource_type: "image",
                  public_id: `org_logo_${organizationId}_${Date.now()}`,
                },
                (error, result) => {
                  if (error) {
                    console.error("Cloudinary upload error:", error);
                    reject(error);
                  }
                  console.log("Cloudinary result:", result);
                  resolve(result.secure_url);
                }
              );
              stream.end(req.file.buffer);
            });
          };
          console.log("Starting logo upload...");
          logoUrl = await uploadImageStream();
          console.log("Upload complete. Logo URL:", logoUrl);

          if (!logoUrl) {
            throw new Error("Failed to get URL from Cloudinary");
          }
        } catch (uploadError) {
          console.error("Logo upload error:", uploadError);
          throw uploadError;
        }
      }

      // Parse JSON strings if they're provided as strings
      const parsedContactPerson =
        typeof contactPerson === "string"
          ? JSON.parse(contactPerson)
          : contactPerson;
      const parsedBenefits =
        typeof benefits === "string" ? JSON.parse(benefits) : benefits;
      const parsedCulture =
        typeof culture === "string" ? JSON.parse(culture) : culture;

      const [rowsUpdated, [updatedOrganization]] = await Organization.update(
        {
          companyName,
          email,
          website,
          phone,
          industry,
          companySize,
          foundedYear,
          headquarters,
          type,
          address,
          city,
          country,
          zipCode,
          contactPerson: parsedContactPerson,
          description,
          logo: logoUrl,
          linkedin,
          twitter,
          subdomain,
          benefits: parsedBenefits,
          culture: parsedCulture,
        },
        { where: { id: organizationId }, returning: true }
      );

      console.log("Rows updated:", rowsUpdated);
      console.log("After update - Logo URL:", updatedOrganization.logo);

      res.json(updatedOrganization);
    } catch (error) {
      console.error("Organization update error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  "/organization",
  authenticateJWT,
  authorizeUserType("hrManager"),
  async (req, res) => {
    try {
      const { organizationId } = req.user;
      const Organization = require("../models/organization");
      const organization = await Organization.findByPk(organizationId, {
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  }
);

module.exports = router;
