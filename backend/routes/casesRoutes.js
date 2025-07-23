const express = require('express');
const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer'); // ✅ Added for sending emails
const router = express.Router();

module.exports = (db, ensureDb) => {
  router.use(ensureDb);

  // ✅ Utility: Clean payload (remove undefined/null and _id)
  const cleanPayload = (obj) => {
    const cleanObj = {};
    for (const key in obj) {
      if (
        obj[key] !== undefined &&
        obj[key] !== null &&
        obj[key] !== '' &&
        key !== '_id' // 🚨 Strip _id
      ) {
        cleanObj[key] = obj[key];
      }
    }
    return cleanObj;
  };

  // ✅ Get all cases
  router.get('/', async (req, res) => {
    try {
      const cases = await db.collection('cases').find().toArray();
      res.json(cases);
    } catch (err) {
      console.error('❌ Failed to fetch cases:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch cases' });
    }
  });

  // ✅ Add new case (with validation and duplicate Case ID handling)
  router.post('/', async (req, res) => {
    const cleanedCase = cleanPayload(req.body);

    // 🛑 Validate Case ID (must not be missing or empty)
    const caseId = cleanedCase['Case ID'];
    if (!caseId || typeof caseId !== 'string' || caseId.trim() === '') {
      console.warn('⚠️ Missing or invalid Case ID in request payload');
      return res.status(400).json({
        success: false,
        message: 'Case ID is required and must not be empty'
      });
    }

    // 🔥 Auto-fill organization from customer if missing
    if (!cleanedCase.organization && cleanedCase.customer) {
      cleanedCase.organization = cleanedCase.customer;
      console.log(`📌 Auto-filled organization from customer: ${cleanedCase.organization}`);
    }

    console.log('📥 Incoming case payload (after auto-fill):', JSON.stringify(cleanedCase, null, 2));

    try {
      // 🔍 Check if Case ID already exists
      const existing = await db.collection('cases').findOne({ 'Case ID': caseId });
      if (existing) {
        console.error('❌ Duplicate Case ID detected:', caseId);
        return res.status(409).json({
          success: false,
          message: `Duplicate Case ID "${caseId}" already exists`
        });
      }

      const result = await db.collection('cases').insertOne(cleanedCase);
      console.log('✅ Case inserted with ID:', result.insertedId);
      res.json({ success: true, id: result.insertedId });
    } catch (err) {
      console.error('❌ Failed to add case:', err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to add case'
      });
    }
  });

  // ✅ Get case by custom Case ID (field "Case ID" in DB)
  router.get('/by-caseid/:caseId', async (req, res) => {
    try {
      const caseIdParam = req.params.caseId;
      console.log(`🔎 Fetching case with Case ID: ${caseIdParam}`);

      const caseItem = await db.collection('cases').findOne({ 'Case ID': caseIdParam });

      if (!caseItem) {
        console.warn(`⚠️ Case not found for Case ID: ${caseIdParam}`);
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      res.json(caseItem);
    } catch (err) {
      console.error('❌ Error fetching case by Case ID:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ✅ Update case (PUT and PATCH supported) with safe PATCH fix
  const updateCase = async (req, res) => {
    const cleanedCase = cleanPayload(req.body);
    const caseId = req.params.id;

    console.log('📥 Incoming PATCH payload:', cleanedCase);

    // 🔥 Try both ObjectId and string _id
    const filter = ObjectId.isValid(caseId)
      ? { _id: new ObjectId(caseId) }
      : { _id: caseId };

    // ✅ Auto-map "status" to "Status" if DB uses capital S
    if (cleanedCase.status && !cleanedCase.Status) {
      cleanedCase.Status = cleanedCase.status;
      delete cleanedCase.status;
    }

    try {
      const result = await db.collection('cases').updateOne(
        filter,
        { $set: cleanedCase }
      );

      if (result.matchedCount === 0) {
        console.warn(`⚠️ No case found for update with ID: ${caseId}`);
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      console.log(`✅ Case updated (ID: ${caseId}), Modified: ${result.modifiedCount}`);
      res.json({ success: true, modified: result.modifiedCount });
    } catch (err) {
      console.error('❌ Failed to update case:', err.message);
      res.status(500).json({ success: false, message: 'Failed to update case', error: err.message });
    }
  };

  router.put('/:id', updateCase);
  router.patch('/:id', updateCase);

  // ✅ Delete case
  router.delete('/:id', async (req, res) => {
    try {
      const result = await db.collection('cases').deleteOne({ _id: new ObjectId(req.params.id) });
      res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
      console.error('❌ Failed to delete case:', err.message);
      res.status(500).json({ success: false, message: 'Failed to delete case' });
    }
  });

  // ✅ Get case by MongoDB _id
  router.get('/:id', async (req, res) => {
    try {
      const caseId = req.params.id;
      console.log(`🔎 Fetching case with ID: ${caseId}`);

      const filter = ObjectId.isValid(caseId)
        ? { _id: new ObjectId(caseId) }
        : { _id: caseId };

      const caseItem = await db.collection('cases').findOne(filter);
      if (!caseItem) {
        console.warn(`⚠️ Case not found for ID: ${caseId}`);
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      res.json(caseItem);
    } catch (err) {
      console.error('❌ Error fetching case by ID:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch case', error: err.message });
    }
  });

  // ✅ Send Mail API
  router.post('/:id/send-mail', async (req, res) => {
    const caseId = req.params.id;

    if (!ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid Case ID' });
    }

    try {
      const caseData = await db.collection('cases').findOne({ _id: new ObjectId(caseId) });
      if (!caseData) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      const analystReply = req.body.analystReply || 'No reply provided.';

      const transporter = nodemailer.createTransport({
        host: 'smtp.yourdomain.com',
        port: 587,
        secure: false,
        auth: {
          user: 'your-email@yourdomain.com',
          pass: 'your-password'
        }
      });

      const mailOptions = {
        from: '"SOC Analyst" <your-email@yourdomain.com>',
        to: caseData['Creator Email'] || 'recipient@domain.com',
        subject: `Case Update: ${caseData['Case ID']}`,
        html: `
          <h3>Case Update</h3>
          <p><strong>Case ID:</strong> ${caseData['Case ID']}</p>
          <p><strong>Summary:</strong> ${caseData['Summary']}</p>
          <p><strong>Analyst Reply:</strong></p>
          <p>${analystReply}</p>
        `
      };

      await transporter.sendMail(mailOptions);

      console.log(`📧 Email sent for Case ID: ${caseData['Case ID']}`);
      res.json({ success: true, message: 'Email sent successfully' });
    } catch (err) {
      console.error('❌ Failed to send email:', err.message);
      res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
    }
  });

  return router;
};
