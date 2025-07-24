const express = require('express');
const { ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const router = express.Router();

module.exports = (db, ensureDb) => {
  router.use(ensureDb);

  // ✅ Utility: Clean payload (remove undefined/null and _id) and normalize "Update" → "ResolutionNote"
  const cleanPayload = (obj) => {
    const cleanObj = {};
    for (const key in obj) {
      if (
        obj[key] !== undefined &&
        obj[key] !== null &&
        obj[key] !== '' &&
        key !== '_id'
      ) {
        if (key === 'Update') {
          cleanObj['ResolutionNote'] = obj[key]; // ✅ Rename old field
        } else {
          cleanObj[key] = obj[key];
        }
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

  // ✅ Add new case
  router.post('/', async (req, res) => {
    const cleanedCase = cleanPayload(req.body);

    const caseId = cleanedCase['Case ID'];
    if (!caseId || typeof caseId !== 'string' || caseId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Case ID is required' });
    }

    if (!cleanedCase.organization && cleanedCase.customer) {
      cleanedCase.organization = cleanedCase.customer;
    }

    try {
      const existing = await db.collection('cases').findOne({ 'Case ID': caseId });
      if (existing) {
        return res.status(409).json({ success: false, message: `Duplicate Case ID "${caseId}"` });
      }

      const result = await db.collection('cases').insertOne(cleanedCase);
      res.json({ success: true, id: result.insertedId });
    } catch (err) {
      console.error('❌ Failed to add case:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to add case' });
    }
  });

  // ✅ Get case by "Case ID"
  router.get('/by-caseid/:caseId', async (req, res) => {
    try {
      const caseIdParam = req.params.caseId;
      const caseItem = await db.collection('cases').findOne({ 'Case ID': caseIdParam });

      if (!caseItem) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      // 👇 Normalize old field if needed
      if (caseItem.Update && !caseItem.ResolutionNote) {
        caseItem.ResolutionNote = caseItem.Update;
        delete caseItem.Update;
      }

      res.json(caseItem);
    } catch (err) {
      console.error('❌ Error fetching case by Case ID:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ✅ Update case
  const updateCase = async (req, res) => {
    const cleanedCase = cleanPayload(req.body);
    const caseId = req.params.id;

    const filter = ObjectId.isValid(caseId)
      ? { _id: new ObjectId(caseId) }
      : { _id: caseId };

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
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      res.json({ success: true, modified: result.modifiedCount });
    } catch (err) {
      console.error('❌ Failed to update case:', err.message);
      res.status(500).json({ success: false, message: 'Failed to update case' });
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

  // ✅ Get case by _id
  router.get('/:id', async (req, res) => {
    try {
      const caseId = req.params.id;
      const filter = ObjectId.isValid(caseId)
        ? { _id: new ObjectId(caseId) }
        : { _id: caseId };

      const caseItem = await db.collection('cases').findOne(filter);
      if (!caseItem) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      // 👇 Normalize old field if needed
      if (caseItem.Update && !caseItem.ResolutionNote) {
        caseItem.ResolutionNote = caseItem.Update;
        delete caseItem.Update;
      }

      res.json(caseItem);
    } catch (err) {
      console.error('❌ Error fetching case by ID:', err.message);
      res.status(500).json({ success: false, message: 'Failed to fetch case' });
    }
  });

  // ✅ Send mail API
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
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  });

  return router;
};
