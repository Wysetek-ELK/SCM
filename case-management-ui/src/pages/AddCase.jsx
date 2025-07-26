import { useState, useEffect, useMemo } from 'react';
import fetchAPI from '../utils/api';
import parseCaseData from '../utils/parseCaseData';
import { generateEmailHTML } from '../utils/emailTemplate';
import { useNavigate } from 'react-router-dom';

export default function AddCase() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [customerLocked, setCustomerLocked] = useState(false);
  const [caseIdError, setCaseIdError] = useState('');

  const [caseData, setCaseData] = useState({
    'Case ID': '',
    'Severity': '',
    'Organization': '',
    'Risk': '',
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
    'Interested': '',
    rawData: '',
    customer: '',
    customerEmail: '',
    recommendations: '',
    riskExplanation: '',
    formattedIncidents: ''
  });

  const orderedFields = [
    'Case ID', 'Severity', 'Organization', 'Risk', 'Summary', 'Assets', 'Incidents', 'Status',
    'Stage', 'Assignee', 'Created', 'Creator', 'Assigned', 'Due', 'Elapsed',
    'Closed', 'Close Code', 'Close Code Description', 'Close Note',
    'Resolution Time', 'Case Management Policy', 'Interested'
  ];

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const res = await fetchAPI('/customers');
        setCustomers(res);
      } catch (err) {
        console.error('❌ Failed to load customers:', err);
      }
    };
    loadCustomers();
  }, []);

  const normalize = (str) => (str || "").replace(/[_\s]+/g, ' ').trim().toLowerCase();

  useEffect(() => {
    if (customers.length > 0 && caseData['Organization'] && !customerLocked) {
      const matchedCustomer = customers.find(c =>
        normalize(c.name) === normalize(caseData['Organization'])
      );

      if (matchedCustomer) {
        setCaseData(prev => ({
          ...prev,
          customer: matchedCustomer.name,
          customerEmail: matchedCustomer.emails ? matchedCustomer.emails.join(',') : ''
        }));
        setCustomerLocked(true);
      }
    }
  }, [customers, caseData['Organization'], customerLocked]);

  const hasFullAddPermission = useMemo(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const org = caseData.customer || caseData['Organization'];
    if (!org || !currentUser?.orgPermissions?.[org]) return false;
    return currentUser.orgPermissions[org]['Add Case'] === 'full';
  }, [caseData.customer, caseData['Organization']]);

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const parsed = parseCaseData(pastedText) || {};

    setCaseData(prev => ({
      ...prev,
      rawData: pastedText,
      ...parsed,
      riskExplanation: [
        `Assets: ${(parsed['Assets'] || []).join(', ')}`,
        `Incidents:\n${(parsed['Incidents'] || []).map(i =>
          `ID: ${i.ID} - ${i.Description} (${i.Timestamp})`
        ).join('\n')}`
      ].join('\n\n'),
      formattedIncidents: (parsed['Incidents'] || []).map(i =>
        `ID: ${i.ID} - ${i.Description} (${i.Timestamp})`
      ).join('\n')
    }));
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setCaseData(prev => ({ ...prev, [name]: value.trim() }));

    if (name === 'Case ID') {
      if (!value.trim()) {
        setCaseIdError('⚠️ Case ID is required');
        return;
      }
      try {
        const existing = await fetchAPI(`/cases/by-caseid/${encodeURIComponent(value.trim())}`);
        if (existing && existing['Case ID']) {
          setCaseIdError(`⚠️ Case ID "${value.trim()}" already exists`);
        } else {
          setCaseIdError('');
        }
      } catch (err) {
        if (err.status === 404) {
          setCaseIdError('');
        } else {
          console.error('❌ Error validating Case ID:', err);
          setCaseIdError('⚠️ Error validating Case ID');
        }
      }
    }
  };

  const handleCustomerChange = (e) => {
    const selectedCustomer = customers.find(c => c.name === e.target.value);
    setCaseData(prev => ({
      ...prev,
      customer: selectedCustomer ? selectedCustomer.name : '',
      customerEmail: selectedCustomer?.emails?.join(',') || ''
    }));
    setCustomerLocked(!!selectedCustomer);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...caseData };

    if (!payload['Case ID']) {
      setCaseIdError('⚠️ Case ID is required');
      alert('⚠️ Please enter a Case ID before saving.');
      return;
    }

    if (!payload.Summary || !payload.Severity || !payload.Creator) {
      alert('⚠️ Summary, Severity, and Creator are required.');
      return;
    }

    if (caseIdError) {
      alert(caseIdError);
      return;
    }

    try {
      const response = await fetchAPI('/cases', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.success) {
        alert('✅ Case saved successfully to MongoDB!');
        navigate('/cases');
      } else {
        throw new Error(response.message || 'Unknown error');
      }
    } catch (err) {
      console.error('❌ Failed to save case:', err);
      if (err.message.includes('E11000') && err.message.includes('Case ID')) {
        setCaseIdError(`⚠️ Duplicate Case ID "${payload['Case ID']}" detected.`);
        alert(caseIdError);
      } else {
        alert('❌ Failed to save case to MongoDB.\nError: ' + err.message);
      }
    }
  };

  const handlePreviewEmail = () => {
    const emailHTML = generateEmailHTML('case', caseData);
    const newWindow = window.open('', '_blank', 'width=700,height=700');
    newWindow.document.write(emailHTML);
    newWindow.document.title = `📧 WyseHawk SOC - Case ${caseData['Case ID'] || ''} Preview`;
  };

  const handleSendEmail = async () => {
    const emailHTML = generateEmailHTML('case', caseData);
    const replyTo = "mssp@wysetek.com,notification@wysetek.com,wysetekcdc@gmail.com";

    if (!caseData['Case ID']) {
      alert('⚠️ Case ID is required for sending email.');
      return;
    }

    try {
      const existing = await fetchAPI(`/cases/by-caseid/${encodeURIComponent(caseData['Case ID'])}`);
      if (existing && existing['Case ID']) {
        alert(`❌ Case ID "${caseData['Case ID']}" already exists. Cannot send email.`);
        return;
      }
    } catch (checkErr) {
      if (checkErr.status !== 404) {
        console.error("❌ Failed to check existing case:", checkErr);
        alert("❌ Error checking case before sending email.");
        return;
      }
      // Continue if 404 (not found)
    }

    try {
      const emailResult = await fetchAPI("/smtp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: caseData.customerEmail,
          subject: `Case Update: ${caseData['Case ID'] || 'No Case ID'}`,
          html: emailHTML,
          replyTo
        })
      });

      if (!emailResult.success) {
        alert(emailResult.message || "❌ Failed to send email.");
        return;
      }

      alert("✅ Email sent successfully!");

      const saveResult = await fetchAPI('/cases', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...caseData,
          emailSent: true,
          emailSentAt: new Date().toISOString()
        })
      });

      if (saveResult.success) {
        alert("✅ Case saved successfully after sending email.");
        navigate('/cases');
      } else {
        alert("❌ Email sent but case save failed.");
      }

    } catch (err) {
      console.error("❌ Failed in send+save flow:", err);
      alert("❌ Error while sending email or saving case.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Add New Case</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Paste Incident Data</label>
          <textarea onPaste={handlePaste} placeholder="Paste incident data here..." className="w-full p-2 border rounded h-40" />
        </div>

        {orderedFields.map((field) => (
          field === 'Assets' && caseData.Assets.length > 0 ? (
            <div key={field}>
              <label className="block mb-1 font-medium">Assets</label>
              <ul className="border p-2 rounded bg-gray-50 max-h-40 overflow-y-auto">
                {caseData.Assets.map((asset, idx) => <li key={idx}>{asset}</li>)}
              </ul>
            </div>
          ) : field === 'Incidents' && caseData.Incidents.length > 0 ? (
            <div key={field}>
              <label className="block mb-1 font-medium">Incidents</label>
              <ul className="border p-2 rounded bg-gray-50 max-h-60 overflow-y-auto">
                {caseData.Incidents.map((incident, idx) => (
                  <li key={idx} className="mb-2">
                    <strong>ID:</strong> {incident.ID}<br />
                    <strong>Description:</strong> {incident.Description}<br />
                    <strong>Timestamp:</strong> {incident.Timestamp}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div key={field}>
              <label className="block mb-1 font-medium">{field}</label>
              <input
                type="text"
                name={field}
                value={caseData[field] || ''}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${field === 'Case ID' && caseIdError ? 'border-red-500' : ''}`}
              />
              {field === 'Case ID' && caseIdError && (
                <p className="text-red-500 text-sm mt-1">{caseIdError}</p>
              )}
            </div>
          )
        ))}

        <div>
          <label className="block mb-1 font-medium">Customer</label>
          <select name="customer" value={caseData.customer} onChange={handleCustomerChange} className="w-full p-2 border rounded" disabled={customerLocked}>
            <option value="">Select Customer</option>
            {customers.map(c => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Customer Emails</label>
          <input type="text" name="customerEmail" value={caseData.customerEmail} readOnly className="w-full p-2 border rounded bg-gray-100" />
        </div>

        <div>
          <label className="block mb-1 font-medium">Recommendations</label>
          <textarea name="recommendations" value={caseData.recommendations} onChange={handleChange} className="w-full p-2 border rounded h-24" placeholder="Add recommendations for customer..." />
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={!hasFullAddPermission} className={`px-4 py-2 rounded text-black ${hasFullAddPermission ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
            Save Case
          </button>
          <button type="button" onClick={handlePreviewEmail} className="px-4 py-2 bg-yellow-600 text-black rounded hover:bg-yellow-700">
            Preview Email
          </button>
          <button type="button" onClick={handleSendEmail} disabled={!hasFullAddPermission} className={`px-4 py-2 rounded text-black ${hasFullAddPermission ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>
            Send Email
          </button>
        </div>
      </form>
    </div>
  );
}
