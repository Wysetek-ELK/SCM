import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import fetchAPI from '../utils/api';
import Button from '../components/ui/Button';
import dayjs from 'dayjs'; // ✅ Added for formatting

export default function CaseDetails({ standalone = false }) {
  const orgPermissions = JSON.parse(localStorage.getItem('orgPermissions') || '{}');
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchCase = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI(`/cases/${id}`);

      const caseOrg = res?.Organization || res?.organization;

      const raw = localStorage.getItem('orgPermissions');
      const orgPermissions = raw ? JSON.parse(raw) : {};
      const permission = orgPermissions[caseOrg]?.['Case Details'] || 'hide';

      if (permission === 'hide') {
        setPermissionDenied(true);
        return;
      }

      setCaseData(res);
    } catch (err) {
      console.error('❌ Failed to load case:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [id]);

  useEffect(() => {
    if (location.state?.refresh) {
      console.log('🔄 Refreshing case details after update');
      fetchCase();
    }
  }, [location.state]);

  const getField = (obj, oldKey, newKey, fallback = 'Unknown') => {
    const value = obj?.[newKey] ?? obj?.[oldKey];
    if (value === undefined || value === null) {
      console.warn(`⚠️ Missing field: '${newKey}' / '${oldKey}' in`, obj);
      return fallback;
    }
    return value;
  };

  const handleEdit = () => {
    if (standalone) {
      navigate(`/customer/cases/${id}/edit`);
    } else {
      navigate(`/cases/${id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this case?')) {
      try {
        await fetchAPI(`/cases/${id}`, { method: 'DELETE' });
        alert('✅ Case deleted successfully.');
        navigate('/cases', { state: { refresh: true } });
      } catch (err) {
        console.error('❌ Failed to delete case:', err);
        alert('❌ Failed to delete case.');
      }
    }
  };

  const handleSendEmail = async () => {
    try {
      const result = await fetchAPI("/smtp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: getField(caseData, 'customerEmail', 'customerEmail', '-'),
          subject: `Case Update: ${getField(caseData, 'Summary', 'summary', '-')}`,
          html: `<h3>Case Summary</h3><p>${getField(caseData, 'Risk Explanation', 'riskExplanation', '-')}</p>`
        })
      });
      alert(result.success ? "✅ Email sent successfully!" : result.message);
    } catch (err) {
      console.error("❌ Failed to send email:", err);
      alert("❌ Failed to send email.");
    }
  };

  const handleBack = () => {
    if (standalone) {
      navigate('/customer');
    } else {
      navigate('/cases', { state: { refresh: true } });
    }
  };

  if (loading) return <p className="text-center mt-10">Loading case details...</p>;
  if (permissionDenied) return <p className="text-center mt-10 text-red-600">❌ Access denied.</p>;
  if (!caseData) return <p className="text-center mt-10 text-red-500">❌ Case not found.</p>;

  const caseOrg = getField(caseData, 'Organization', 'organization', '-');
  const permission = orgPermissions[caseOrg]?.['Case Details'] || 'hide';

  return (
    <div className={`p-6 max-w-5xl mx-auto ${standalone ? '' : 'bg-gray-50 min-h-screen'}`}>
      <h2 className="text-3xl font-bold mb-3 flex items-center gap-3">
        📄 Case Details
        <span className="px-2 py-1 rounded text-sm font-medium bg-gray-200 text-gray-800">
          ID: {getField(caseData, 'Case ID', 'caseId', '-')}
        </span>
      </h2>

      <div className="flex gap-3 mb-6">
        {permission === 'full' && (
          <>
            <Button onClick={handleEdit} variant="success" icon="✏️">Edit</Button>
            <Button onClick={handleDelete} variant="danger" icon="🗑️">Delete</Button>
          </>
        )}
        <Button onClick={handleSendEmail} variant="primary" icon="📧">Send Email</Button>
        <Button onClick={fetchCase} variant="secondary" icon="🔄">Refresh</Button>
        <Button onClick={handleBack} variant="secondary" icon="←">Back</Button>
      </div>

      {/* Summary Card */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Summary</h3>
        <p><strong>Case Summary:</strong> {getField(caseData, 'Summary', 'summary', '-')}</p>
        <p><strong>Severity:</strong>
          <span className={`ml-1 px-2 py-1 rounded text-white ${
            getField(caseData, 'Severity', 'severity') === 'High' ? 'bg-red-600' :
            getField(caseData, 'Severity', 'severity') === 'Medium' ? 'bg-yellow-500' :
            'bg-green-500'
          }`}>
            {getField(caseData, 'Severity', 'severity', '-')}
          </span>
        </p>
        <p><strong>Risk:</strong> {getField(caseData, 'Risk', 'risk', '-')}</p>
        <p><strong>Status:</strong> {getField(caseData, 'Status', 'status', '-')}</p>
        <p><strong>Stage:</strong> {getField(caseData, 'Stage', 'stage', '-')}</p>
      </div>

      {/* Customer Info & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white shadow rounded p-4">
          <h3 className="text-lg font-semibold mb-2">Customer Info</h3>
          <p><strong>Customer:</strong> {getField(caseData, 'customer', 'customer', '-')}</p>
          <p><strong>Email:</strong> {getField(caseData, 'customerEmail', 'customerEmail', '-')}</p>
          <p><strong>Organization:</strong> {caseOrg}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <h3 className="text-lg font-semibold mb-2">Metadata</h3>
          <p><strong>Created By:</strong> {getField(caseData, 'Creator', 'creatorEmail', '-')}</p>
          <p><strong>Created On:</strong> {getField(caseData, 'Created', 'created', '-')}</p>
          <p><strong>Due Date:</strong> {getField(caseData, 'Due', 'due', '-')}</p>
          <p><strong>Elapsed:</strong> {getField(caseData, 'Elapsed', 'elapsed', '-')}</p>
          <p><strong>Assignee:</strong> {getField(caseData, 'Assignee', 'assignee', '-')}</p>
          <p><strong>Closed On:</strong> {
            caseData.ClosedTime
              ? dayjs(caseData.ClosedTime).format('MMM DD, YYYY hh:mm A')
              : '-'
          }</p>
        </div>
      </div>

      {/* Assets */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Assets</h3>
        <ul className="list-disc list-inside">
          {getField(caseData, 'Assets', 'assets', []).map((asset, idx) => (
            <li key={idx}>{asset}</li>
          ))}
        </ul>
      </div>

      {/* Incidents */}
      <div className="bg-white shadow rounded p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Incidents</h3>
        {getField(caseData, 'Incidents', 'incidents', []).map((incident, idx) => (
          <div key={idx} className="border-b py-2">
            <p><strong>ID:</strong> {incident.ID}</p>
            <p><strong>Description:</strong> {incident.Description}</p>
            <p><strong>Timestamp:</strong> {incident.Timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
