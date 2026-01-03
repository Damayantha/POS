export const PLAN_LIMITS = {
    free: {
        products: 100,
        employees: 2, // 1 Admin + 1 Cashier
        name: 'Starter'
    },
    starter: {
        products: 100,
        employees: 2,
        name: 'Starter'
    },
    pro: {
        products: Infinity,
        employees: 10,
        name: 'Pro'
    },
    enterprise: {
        products: Infinity,
        employees: Infinity,
        name: 'Enterprise'
    }
};

export const getPlanLimits = (planStr) => {
    const plan = planStr?.toLowerCase() || 'free';
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
};

export const checkLimit = (planStr, type, currentCount) => {
    const limits = getPlanLimits(planStr);
    const limit = limits[type];

    if (limit === Infinity) return { allowed: true };

    if (currentCount >= limit) {
        return {
            allowed: false,
            limit: limit,
            upgradeRequired: true,
            message: `Upgrade to ${planStr === 'free' ? 'Pro' : 'Enterprise'} to add more ${type}.`
        };
    }

    return { allowed: true };
};
