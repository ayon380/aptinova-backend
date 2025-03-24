const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const Candidate = require("../models/candidate");
const HRManager = require("../models/hrManager");
const SubscriptionHistory = require("../models/subscriptionHistory");
const { v4: uuidv4 } = require('uuid');
const SUBSCRIPTION_PLANS = require('../config/subscriptionPlans');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create subscription plan
router.post("/create-plan", async (req, res) => {
  try {
    const plan = await razorpay.plans.create({
      period: req.body.period,
      interval: req.body.interval,
      item: {
        name: req.body.name,
        amount: req.body.amount * 100,
        currency: "INR",
      },
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create subscription with user type and tier
router.post("/create-subscription", async (req, res) => {
  try {
    const { userType, userId, tier, totalCount, customAmount } = req.body;
    console.log();
    
    let planConfig;
    if (userType === 'candidate') {
      planConfig = SUBSCRIPTION_PLANS.CANDIDATE[tier];
    } else if (userType === 'hrmanager') {
      planConfig = SUBSCRIPTION_PLANS.HR_MANAGER[tier];
    }

    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid subscription tier' });
    }

    // Create plan for the subscription
    const plan = await razorpay.plans.create({
      period: planConfig.period,
      interval: planConfig.interval,
      item: {
        name: planConfig.name,
        amount: tier === 'CUSTOM' ? customAmount * 100 : planConfig.amount * 100,
        currency: "INR",
      },
    });

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.id,
      customer_notify: 1,
      total_count: totalCount,
      notes: {
        user_type: userType,
        user_id: userId,
        tier: tier
      }
    });

    // Update user model based on type
    const subscriptionData = {
      subscriptionId: subscription.id,
      subscriptionStatus: 'active',
      subscriptionPlanId: plan.id,
      subscriptionTier: tier,
      subscriptionType: tier, // Add this line
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + (totalCount * 30 * 24 * 60 * 60 * 1000))
    };

    const Model = userType === 'candidate' ? Candidate : HRManager;
    await Model.update(subscriptionData, {
      where: { id: userId }
    });

    res.json({ 
      subscription,
      plan,
      features: planConfig.features,
      message: `${tier} subscription created successfully for ${userType}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post("/cancel-subscription/:subscriptionId", async (req, res) => {
  try {
    const subscription = await razorpay.subscriptions.cancel(
      req.params.subscriptionId
    );
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch subscription details
router.get("/subscription/:subscriptionId", async (req, res) => {
  try {
    const subscription = await razorpay.subscriptions.fetch(
      req.params.subscriptionId
    );
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change subscription tier
router.post("/change-tier", async (req, res) => {
  try {
    const { userId, userType, newTier, reason } = req.body;
    const Model = userType === 'candidate' ? Candidate : HRManager;
    
    // Get current subscription details
    const user = await Model.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentTier = user.subscriptionTier;
    const oldSubscriptionId = user.subscriptionId;

    // Validate tier change
    if (currentTier === newTier) {
      return res.status(400).json({ error: 'Already on this tier' });
    }

    // Cancel current subscription if exists
    if (oldSubscriptionId) {
      await razorpay.subscriptions.cancel(oldSubscriptionId);
    }

    // Create new subscription with new tier
    const planConfig = userType === 'candidate' 
      ? SUBSCRIPTION_PLANS.CANDIDATE[newTier]
      : SUBSCRIPTION_PLANS.HR_MANAGER[newTier];

    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Create new plan and subscription
    const plan = await razorpay.plans.create({
      period: planConfig.period,
      interval: planConfig.interval,
      item: {
        name: planConfig.name,
        amount: planConfig.amount * 100,
        currency: "INR",
      },
    });

    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.id,
      customer_notify: 1,
      notes: {
        user_type: userType,
        user_id: userId,
        tier: newTier,
        change_type: 'upgrade'
      }
    });

    // Update user subscription details
    await Model.update({
      subscriptionId: subscription.id,
      subscriptionTier: newTier,
      subscriptionType: newTier, // Add this line
      subscriptionPlanId: plan.id,
      subscriptionStartDate: new Date(),
    }, {
      where: { id: userId }
    });

    // Record subscription change in history
    await SubscriptionHistory.create({
      userId,
      userType,
      oldTier: currentTier,
      newTier,
      oldSubscriptionId,
      newSubscriptionId: subscription.id,
      changeType: newTier > currentTier ? 'upgrade' : 'downgrade',
      reason
    });

    res.json({
      message: 'Subscription tier changed successfully',
      subscription,
      features: planConfig.features
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscription history
router.get("/subscription-history/:userId", async (req, res) => {
  try {
    const history = await SubscriptionHistory.findAll({
      where: { userId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update webhook handler to process user-specific events
router.post("/webhook", async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest === req.headers["x-razorpay-signature"]) {
    const { event, payload } = req.body;
    const userType = payload.subscription.notes.user_type;
    const userId = payload.subscription.notes.user_id;

    switch (event) {
      case "subscription.activated":
        await updateSubscriptionStatus(userType, userId, 'active');
        break;
      case "subscription.cancelled":
        await Promise.all([
          updateSubscriptionStatus(userType, userId, 'cancelled'),
          SubscriptionHistory.create({
            userId,
            userType,
            oldTier: payload.subscription.notes.tier,
            changeType: 'cancel',
            oldSubscriptionId: payload.subscription.id,
          })
        ]);
        break;
    }
    res.json({ status: "ok" });
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

async function updateSubscriptionStatus(userType, userId, status) {
  const Model = userType === 'candidate' ? Candidate : HRManager;
  await Model.update(
    { subscriptionStatus: status },
    { where: { id: userId } }
  );
}

// Helper function to validate tier change
function validateTierChange(currentTier, newTier, userType) {
  const plans = userType === 'candidate' 
    ? SUBSCRIPTION_PLANS.CANDIDATE 
    : SUBSCRIPTION_PLANS.HR_MANAGER;
    
  if (!plans[currentTier] || !plans[newTier]) {
    throw new Error('Invalid tier');
  }
  
  return {
    isUpgrade: plans[newTier].amount > plans[currentTier].amount,
    proratedAmount: calculateProratedAmount(plans[currentTier], plans[newTier])
  };
}

module.exports = router;
