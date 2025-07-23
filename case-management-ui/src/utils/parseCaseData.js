export default function parseCaseData(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  const result = {
    'Case ID': '',
    'Severity': '',
    'Organization': '',
    'Risk': '',
    'Risk Explanation': '',
    'Summary': '',
    'Assets': [],
    'Incidents': [],
    'Status': '',
    'Stage': '',
    'Assignee': '',
    'Creator': '',
    'Created': '',
    'Assigned': '',
    'Due': '',
    'Elapsed': '',
    'Closed': '',
    'Close Code': '',
    'Close Code Description': '',
    'Close Note': '',
    'Resolution Time': '',
    'Case Management Policy': '',
    'Interested': ''
  };

  const fieldAliases = {
    'case id': 'Case ID',
    'severity': 'Severity',
    'organization': 'Organization',
    'organisation': 'Organization', // British spelling
    'org': 'Organization',
    'risk': 'Risk',
    'risk explanation': 'Risk Explanation',
    'summary': 'Summary',
    'assets': 'Assets',
    'incidents': 'Incidents',
    'status': 'Status',
    'stage': 'Stage',
    'assignee': 'Assignee',
    'creator': 'Creator',
    'created': 'Created',
    'assigned': 'Assigned',
    'due': 'Due',
    'elapsed': 'Elapsed',
    'closed': 'Closed',
    'close code': 'Close Code',
    'close code description': 'Close Code Description',
    'close note': 'Close Note',
    'resolution time': 'Resolution Time',
    'case management policy': 'Case Management Policy',
    'interested': 'Interested'
  };

  let currentField = null;
  let buffer = [];

  const commitBuffer = () => {
    if (!currentField) return;

    const fieldName = fieldAliases[currentField];
    if (!fieldName) {
      buffer = [];
      currentField = null;
      return;
    }

    const content = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (content) {
      if (fieldName === 'Assets') {
        const assets = content.split(/[,;]/).map(a => a.trim()).filter(Boolean);
        result[fieldName] = Array.from(new Set([...result[fieldName], ...assets]));
      } else if (fieldName === 'Incidents') {
        const incidents = parseIncidents(buffer);
        result[fieldName] = [...result[fieldName], ...incidents];
      } else if (!result[fieldName]) {
        result[fieldName] = content;
      }
    }

    buffer = [];
    currentField = null;
  };

  const parseIncidents = (incidentLines) => {
    const incidents = [];
    let currentIncident = null;
    for (const line of incidentLines) {
      const idMatch = line.match(/\(ID:\s*(\d+)\)\s*(.*)/i);
      const dateMatch = line.match(/\((\w{3} \d{2}, \d{4}, [\d:APM ]+)\)/);
      if (idMatch) {
        if (currentIncident) incidents.push(currentIncident);
        currentIncident = {
          ID: idMatch[1],
          Description: idMatch[2].trim(),
          Timestamp: ''
        };
      } else if (currentIncident && dateMatch) {
        currentIncident.Timestamp = dateMatch[1].trim();
      } else if (currentIncident) {
        currentIncident.Description += ' ' + line.trim();
      }
    }
    if (currentIncident) incidents.push(currentIncident);
    return incidents;
  };

  for (let line of lines) {
    const lower = line.toLowerCase();
    if (fieldAliases[lower]) {
      commitBuffer();
      currentField = lower;
    } else if (currentField) {
      buffer.push(line);
    }
  }
  commitBuffer();

  return result;
}
