const router = require('express').Router();
const axios = require('axios');
const requireAuth = require('../middleware/jwtAuth');
const HRManager = require('../models/hrManager');
const Organization = require('../models/organization');

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

// New route to check if subdomain is available
router.get('/check-availability/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    // Check if subdomain is already used by any organization
    const existingOrg = await Organization.findOne({ 
      where: { subdomain }
    });
    
    if (existingOrg) {
      return res.json({ available: false, message: 'This subdomain is already in use.' });
    }
    
    // You can also check with Vercel API if needed
    try {
      await axios.get(`${vercelApiUrl}/${projectId}/domains/${subdomain}`, {
        headers: {
          Authorization: `Bearer ${vercelToken}`
        }
      });
      // If no error, domain exists in Vercel
      return res.json({ available: false, message: 'This subdomain is registered in Vercel.' });
    } catch (error) {
      // If 404, domain doesn't exist in Vercel
      if (error.response && error.response.status === 404) {
        return res.json({ available: true, message: 'Subdomain is available!' });
      }
      // For other errors, just check against our database
      return res.json({ available: true, message: 'Subdomain appears to be available, but could not verify with Vercel.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to check domain availability', details: error.message });
  }
});

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
