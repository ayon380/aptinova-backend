const SUBSCRIPTION_PLANS = {
  CANDIDATE: {
    PRO: {
      name: 'Candidate Pro',
      amount: 999,
      period: 'monthly',
      interval: 1,
      features: ['Full Profile Access', 'Job Applications', 'Priority Support']
    }
  },
  HR_MANAGER: {
    STARTUP: {
      name: 'Startup',
      amount: 9999,
      period: 'monthly',
      interval: 1,
      features: ['Basic ATS', 'Up to 10 job posts', 'Email Support']
    },
    ENTERPRISE: {
      name: 'Enterprise',
      amount: 99999,
      period: 'monthly',
      interval: 1,
      features: ['Advanced ATS', 'Unlimited job posts', '24/7 Support']
    },
    CUSTOM: {
      name: 'Custom',
      period: 'monthly',
      interval: 1,
      features: ['Custom Features', 'Custom Support Level']
    }
  }
};

module.exports = SUBSCRIPTION_PLANS;
