const { verify } = require('../utils/jwtHelper'); // ✅ Use centralized helper

console.log('🟡 Loaded authCustomer.js - FULL BYPASS MODE');

module.exports = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        console.warn('⚠️ No Authorization header found');
        return res.status(401).send('Access Denied');
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
        const decoded = verify(token); // ✅ Centralized verify
        console.log('✅ Decoded JWT:', decoded);

        const role = decoded.role?.toLowerCase();

        if (role === 'admin') {
            console.log('✅ FULL BYPASS: Admin access granted');
            req.user = decoded;
            return next();
        }

        if (!decoded.organization) {
            console.warn('🚫 Customer has no organization assigned');
            return res.status(403).send('Access restricted to customers with an organization');
        }

        console.log(`✅ Customer access granted for user: ${decoded.username}, org: ${decoded.organization}`);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('❌ Token verification failed:', err.message);
        res.status(400).send('Invalid Token');
    }
};
