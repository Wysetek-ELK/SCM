const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { extractCaseId, updateCase } = require('./mailUtils');
require('dotenv').config();

const imap = new Imap({
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASS,
  host: process.env.IMAP_HOST,
  port: process.env.IMAP_PORT,
  tls: true
});

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', () => {
  console.log('📬 Mail listener connected to IMAP');
  openInbox((err, box) => {
    if (err) throw err;

    imap.on('mail', () => {
      console.log('📩 New email detected...');
      const fetch = imap.seq.fetch(`${box.messages.total}:*`, {
        bodies: '',
        struct: true
      });

      fetch.on('message', (msg, seqno) => {
        console.log(`📨 Fetching message #${seqno}`);
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, mail) => {
            if (err) {
              console.error('❌ Error parsing email:', err);
              return;
            }

            const subject = mail.subject || '';
            const from = mail.from.text;
            const body = mail.text || '';

            console.log(`🔖 Subject: ${subject}`);
            const caseId = extractCaseId(subject);

            if (caseId) {
              console.log(`🔗 Found Case ID: ${caseId}`);

              const replyData = {
                from,
                message: body,
                receivedAt: new Date()
              };

              try {
                await updateCase(caseId, replyData);
              } catch (apiErr) {
                console.error('❌ API call failed:', apiErr.message);
              }
            } else {
              console.log('⚠️ No Case ID found in email subject.');
            }
          });
        });
      });

      fetch.once('error', (err) => {
        console.error('❌ Fetch error:', err);
      });

      fetch.once('end', () => {
        console.log('✅ Finished fetching new emails.');
      });
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP error:', err);
});

imap.once('end', () => {
  console.log('📪 IMAP connection closed');
});

imap.connect();
