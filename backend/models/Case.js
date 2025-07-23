const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  ID: String,
  Description: String,
  Timestamp: String
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  author: String,
  text: String,
  receivedAt: { type: Date, default: Date.now }
}, { _id: false });

const EmailReplySchema = new mongoose.Schema({
  from: String,
  fullMessage: String,
  receivedAt: { type: Date, default: Date.now }
}, { _id: false });

const CaseSchema = new mongoose.Schema({
  caseId: String,
  summary: String,
  severity: String,
  organization: String,
  risk: String,
  riskExplanation: String,
  status: String,
  stage: String,
  assignee: String,
  creator: String,
  creatorEmail: String,
  created: String,
  assigned: String,
  due: String,
  elapsed: String,
  closed: String,
  closeCode: String,
  closeCodeDescription: String,
  closeNote: String,
  resolutionTime: String,
  caseManagementPolicy: String,
  interested: String,
  assets: [String],
  incidents: [IncidentSchema],
  rawData: String,
  comments: [CommentSchema],
  emailReplies: [EmailReplySchema]
}, { timestamps: true });

module.exports = mongoose.model('Case', CaseSchema);
