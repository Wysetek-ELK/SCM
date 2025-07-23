const axios = require('axios');

/**
 * Extract Case ID from email subject using regex
 * Example subject: [Case #12345] Firewall Issue
 */
function extractCaseId(subject) {
  const match = subject.match(/\[Case\s+#(\d+)\]/);
  return match ? match[1] : null;
}

/**
 * Call API to update case with customer reply
 */
async function updateCase(caseId, replyData) {
  try {
    const response = await axios.post(
      `${process.env.CASE_API_URL}/${caseId}/reply`,
      replyData
    );
    console.log(`✅ Case #${caseId} updated successfully`);
    return response.data;
  } catch (err) {
    console.error(`❌ Failed to update case #${caseId}:`, err.message);
    throw err;
  }
}

module.exports = { extractCaseId, updateCase };
