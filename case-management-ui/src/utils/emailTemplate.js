export function generateEmailHTML(mode, data) {
  const isSMTP = mode === 'smtp';

  const headerText = isSMTP
    ? '🚨 Wysetek SOC Notification'
    : `Case ID ${data['Case ID'] ?? 'N/A'} - Severity ${data['Severity'] ?? 'N/A'} - ${data['Summary'] ?? 'No Summary'}`;

  const mainMessage = isSMTP
    ? 'This is a <strong>test email</strong> from your SMTP configuration.'
    : 'This is an <strong>automated case notification</strong> from Wysetek-CDC-SOC. Please review the details below:';

  const severity = (data['Severity'] ?? '').toLowerCase();
  const severityColors = {
    critical: '#b71c1c',
    high: '#e65100',
    medium: '#f9a825',
    low: '#2e7d32',
  };
  const severityColor = severityColors[severity] || '#1565c0';

  const tableRow = (label, value) => {
    return value
      ? `
        <tr>
          <td style="padding:8px; border:1px solid #ddd; font-weight:bold; background:#f1f3f4;">${label}</td>
          <td style="padding:8px; border:1px solid #ddd;">${value}</td>
        </tr>`
      : '';
  };

  const detailsTable = `
    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; margin-top:10px;">
      ${tableRow('Case ID', data['Case ID'])}
      ${tableRow('Summary', data['Summary'])}
      ${tableRow('Assignee', data['Assignee'])}
      ${tableRow('Organization', data['Organization'])}
      ${tableRow('Severity', `<span style="color:${severityColor}; font-weight:bold;">${data['Severity']}</span>`)}
      ${tableRow('Risk Score', data['Risk'])}
      ${tableRow('Customer Email', data['customerEmail'])}
    </table>`;

  const recommendationBlock = data['recommendations']
    ? `
      <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px; border-left:4px solid ${severityColor}; background:#f9f9f9; border-collapse:collapse;">
        <tr>
          <td style="padding:10px;">
            <strong style="color:${severityColor}; font-size:16px;">📌 Recommendations</strong><br/>
            <p style="margin:8px 0 0 0; font-size:14px;">${data['recommendations'].replace(/\n/g, '<br>')}</p>
          </td>
        </tr>
      </table>`
    : '';

  const escalationMatrix = `
    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px; border:1px solid #ddd; border-radius:6px; overflow:hidden;">
      <tr>
        <td bgcolor="#b71c1c" style="color:#ffffff; font-size:16px; font-weight:bold; padding:8px;">
          Escalation Matrix - SOC Team
        </td>
      </tr>
      <tr>
        <td>
          <table width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
            <thead>
              <tr bgcolor="#f44336" style="color:#ffffff;">
                <th align="left" style="padding:8px; border:1px solid #ddd;">Escalation Level</th>
                <th align="left" style="padding:8px; border:1px solid #ddd;">Name</th>
                <th align="left" style="padding:8px; border:1px solid #ddd;">Email</th>
                <th align="left" style="padding:8px; border:1px solid #ddd;">Contact Number</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;">Level 1</td>
                <td style="padding:8px; border:1px solid #ddd;">SOC Support</td>
                <td style="padding:8px; border:1px solid #ddd;"><a href="mailto:msoc@wysetek.com">msoc@wysetek.com</a></td>
                <td style="padding:8px; border:1px solid #ddd;">022-49185968</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;">Level 2</td>
                <td style="padding:8px; border:1px solid #ddd;">Sandeep Shetage</td>
                <td style="padding:8px; border:1px solid #ddd;"><a href="mailto:sandeep.shetage@wysetek.com">sandeep.shetage@wysetek.com</a></td>
                <td style="padding:8px; border:1px solid #ddd;">9860536951</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;">Level 3</td>
                <td style="padding:8px; border:1px solid #ddd;">Amit Sail</td>
                <td style="padding:8px; border:1px solid #ddd;"><a href="mailto:amitsail@wysetek.com">amitsail@wysetek.com</a></td>
                <td style="padding:8px; border:1px solid #ddd;">9768142694</td>
              </tr>
              <tr>
                <td style="padding:8px; border:1px solid #ddd;">Level 4</td>
                <td style="padding:8px; border:1px solid #ddd;">Peter D’Costa</td>
                <td style="padding:8px; border:1px solid #ddd;"><a href="mailto:peter.dcosta@wysetek.com">peter.dcosta@wysetek.com</a></td>
                <td style="padding:8px; border:1px solid #ddd;">9833086869</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </table>`;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headerText}</title>
  </head>
  <body style="margin:0; padding:0; background:#f4f6f8; font-family:Arial, sans-serif; color:#333;">
    <center>
      <table width="750" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff; margin:20px auto; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td bgcolor="#0d47a1" style="color:#ffffff; text-align:center; padding:20px; font-size:20px; font-weight:bold;">
            ${headerText}
          </td>
        </tr>
        <tr>
          <td style="padding:20px; font-size:14px;">
            <p>${mainMessage}</p>
            ${detailsTable}
            ${recommendationBlock}
            ${escalationMatrix}
          </td>
        </tr>
        <tr>
          <td bgcolor="#eceff1" style="color:#607d8b; text-align:center; padding:10px; font-size:12px;">
            © 2025 Wysetek-CDC-SOC | Secure Operations Center Notification
          </td>
        </tr>
      </table>
    </center>
  </body>
  </html>`;
}
