const router = require('express').Router();
const { Op } = require('sequelize');
const Job = require('../models/job');

// Route to get a paginated list of jobs with specific fields and optional filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      location,
      employmentType,
      jobType,
      minSalary,
      maxSalary,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {};

    // Add filters if provided
    if (location) {
      where.location = { [Op.iLike]: `%${location}%` };
    }
    if (employmentType) {
      where.employmentType = employmentType;
    }
    if (jobType) {
      where.jobType = jobType;
    }
    if (minSalary || maxSalary) {
      where.salary = {
        ...(minSalary && { [Op.gte]: minSalary }),
        ...(maxSalary && { [Op.lte]: maxSalary })
      };
    }
    if (search) {
      where.title = { [Op.iLike]: `%${search}%` };
    }

    const { rows: jobs, count } = await Job.findAndCountAll({
      where,
      attributes: ['id', 'title', 'location', 'salary', 'employmentType', 'jobType'], // Only fetch necessary fields
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['postedAt', 'DESC']] // Order by most recent
    });

    res.json({
      data: jobs,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get full details of a job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findByPk(req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to create a new job
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      salary,
      salaryCurrency,
      employmentType,
      jobType,
      benefits,
      perks,
      qualifications,
      company,
      deadline,
      experienceRequired,
      industry,
      languageRequirements,
      visaSponsorshipAvailable,
      additionalDetails
    } = req.body;

    const newJob = await Job.create({
      title,
      description,
      location,
      salary,
      salaryCurrency,
      employmentType,
      jobType,
      benefits,
      perks,
      qualifications,
      company,
      deadline,
      experienceRequired,
      industry,
      languageRequirements,
      visaSponsorshipAvailable,
      additionalDetails
    });

    res.status(201).json(newJob);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
