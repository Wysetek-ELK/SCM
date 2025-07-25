const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const authenticateCustomer = require('../middleware/authCustomer'); // Middleware for customer auth

// Get all cases for logged-in customer or admin
router.get('/', authenticateCustomer, async (req, res) => {
    try {
        console.log('📥 Incoming request to /api/cases from customer');
        console.log('🔐 Authenticated user:', JSON.stringify(req.user, null, 2));

        const { username, role, organization } = req.user;
        const normalizedRole = role?.toLowerCase();

        // 🚫 Block access unless user is admin or role=customer
        if (username !== 'admin' && normalizedRole !== 'customer') {
            console.warn('🚫 Forbidden: Only admin or customer role can access this route');
            return res.status(403).json({ message: 'Access denied' });
        }

        let filter = {};

        // ✅ Admin can access all or filter by query
        if (username === 'admin') {
            const org = req.query.org;
            if (org) {
                console.log(`✅ Admin filtering cases by org: ${org}`);
                filter.organization = org;
            } else {
                console.log('✅ Admin accessing all customer cases');
            }
        } else {
            // 🧾 Customer role must have an organization
            if (!organization) {
                console.warn('🚫 No organization found for customer');
                return res.status(403).json({ message: 'Access restricted to customers' });
            }
            filter.organization = organization;
            console.log(`📌 Customer accessing cases for organization: ${organization}`);
        }

        console.log('🔍 Final MongoDB filter:', JSON.stringify(filter));
        const customerCases = await Case.find(filter);
        console.log(`📦 Found ${customerCases.length} case(s) for filter`, filter);
        res.json(customerCases);
    } catch (err) {
        console.error('❌ Error fetching customer cases:', err.message);
        res.status(500).send('Server Error');
    }
});


// Add a comment to a case (restricted to customer’s org unless admin)
router.post('/:id/comment', authenticateCustomer, async (req, res) => {
    try {
        const caseItem = await Case.findById(req.params.id);
        if (!caseItem) {
            return res.status(404).json({ success: false, message: 'Case not found' });
        }

        // ✅ Admin skips org check
        if (req.user.role?.toLowerCase() !== 'admin') {
            // 🛡️ Validate case ownership for customer
            if (caseItem.organization !== req.user.organization) {
                console.warn('🚫 Customer tried to access case outside their org');
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        } else {
            console.log(`✅ Admin adding comment to case ${req.params.id}`);
        }

        // 📝 Initialize comments array if not present
        if (!caseItem.comments) caseItem.comments = [];

        // 📌 Add the comment
        caseItem.comments.push({
            author: req.user.name || req.user.username, // fallback to username
            text: req.body.text,
            receivedAt: new Date()
        });

        await caseItem.save();
        res.json({ success: true, case: caseItem });
    } catch (err) {
        console.error('❌ Error adding comment:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
