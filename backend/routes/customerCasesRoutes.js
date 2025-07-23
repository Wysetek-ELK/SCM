const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const authenticateCustomer = require('../middleware/authCustomer'); // Middleware for customer auth

// Get all cases for logged-in customer or admin
router.get('/', authenticateCustomer, async (req, res) => {
    try {
        let filter = {};

        // ✅ If admin, allow optional org filtering
        if (req.user.role?.toLowerCase() === 'admin') {
            const org = req.query.org;
            if (org) {
                console.log(`✅ Admin filtering cases by org: ${org}`);
                filter.organization = org;
            } else {
                console.log('✅ Admin accessing all customer cases');
            }
        } else {
            // 🔒 Customers only see their org’s cases
            if (!req.user.organization) {
                console.warn('🚫 No organization set for user');
                return res.status(403).send('Access restricted to customers');
            }
            filter.organization = req.user.organization;
        }

        const customerCases = await Case.find(filter);
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
