const router = require('express').Router();
const axios = require('axios');
const requireAuth = require('../middleware/jwtAuth');
const HRManager = require('../models/hrManager');

const vercelApiUrl = 'https://api.vercel.com/v9/projects';
const vercelToken = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;

const isHRManager = async (req, res, next) => {
  if (req.user.type !== 'hrManager') {
    return res.status(403).json({ error: 'Access denied' });
  }
  const hrManager = await HRManager.findByPk(req.user.id);
  if (!hrManager) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

router.post('/add', requireAuth, isHRManager, async (req, res) => {
  const { subdomain } = req.body;
  try {
    const response = await axios.post(`${vercelApiUrl}/${projectId}/domains`, {
      name: subdomain
    }, {
      headers: {
        Authorization: `Bearer ${vercelToken}`
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(400).json({ error: error.response.data });
  }
});

router.delete('/delete', requireAuth, isHRManager, async (req, res) => {
  const { subdomain } = req.body;
  try {
    const response = await axios.delete(`${vercelApiUrl}/${projectId}/domains/${subdomain}`, {
      headers: {
        Authorization: `Bearer ${vercelToken}`
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(400).json({ error: error.response.data });
  }
});

module.exports = router;
