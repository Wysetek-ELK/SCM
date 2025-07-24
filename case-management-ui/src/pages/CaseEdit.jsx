// CaseEdit.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import fetchAPI from '../utils/api';
import Button from '../components/ui/Button';

export default function CaseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [permission, setPermission] = useState(null);
  const [org, setOrg] = useState(null);
  const [resolutionValid, setResolutionValid] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const res = await fetchAPI(`/cases/${id}`);
        const { _id, ...cleanData } = res;

        if (typeof cleanData.Risk === 'string') {
          const riskMatch = cleanData.Risk.match(/\d+/);
          cleanData.Risk = riskMatch ? parseInt(riskMatch[0], 10) : '';
        }

        setFormData(cleanData);

        const rawPermissions = localStorage.getItem('orgPermissions');
        const orgPermissions = rawPermissions ? JSON.parse(rawPermissions) : {};

        const caseOrg =
          cleanData.Organization?.trim?.() ||
          cleanData.organization?.trim?.() ||
          cleanData.Customer?.trim?.() ||
          cleanData.customer?.trim?.() ||
          'default';

        setOrg(caseOrg);

        const caseDetailsPermission = orgPermissions[caseOrg]?.['Case Details'];
        setPermission(caseDetailsPermission === 'full' ? 'full' : 'hide');

      } catch (err) {
        console.error('❌ Failed to load case:', err);
        alert('❌ Failed to load case for editing.');
        navigate('/cases');
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const countWords = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const navigateBackToDetails = () => {
    navigate(`/cases/${id}`, { state: { refresh: true } });
  };

  const handleClose = async () => {
    const resolutionWordCount = countWords(formData['ResolutionNote']);
    if (resolutionWordCount >= 15) {
      try {
        const currentTime = new Date().toISOString();

        const updatedData = {
          ...formData,
          Status: 'Closed',
          ClosedTime: currentTime
        };

        console.log("🔄 Saving updated data:", updatedData);

        await fetchAPI(`/cases/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updatedData)
        });

        alert('✅ Case closed successfully.');
        navigateBackToDetails();
      } catch (err) {
        console.error('❌ Failed to close case:', err);
        alert('❌ Failed to close case.');
      }
    } else {
      setResolutionValid(false);
      alert('❌ "Resolution Note" must contain at least 15 words.');
    }
  };

  const handleSave = async () => {
    try {
      await fetchAPI(`/cases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });
      alert('✅ Case updated successfully.');
      navigateBackToDetails();
    } catch (err) {
      console.error('❌ Failed to update case:', err);
      alert('❌ Failed to update case.');
    }
  };

  const handleSendMail = async () => {
    setSending(true);
    try {
      await fetchAPI(`/cases/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });

      const caseData = await fetchAPI(`/cases/${id}`);

      const formatList = (items) => {
        if (!items || items.length === 0) return '<em>None</em>';
        let list = [];

        if (Array.isArray(items)) {
          list = items;
        } else if (typeof items === 'string') {
          list = items.split(',').map(i => i.trim());
        } else {
          return '<em>Invalid Data</em>';
        }

        return `<ul>${list.map(i => `<li>${i}</li>`).join('')}</ul>`;
      };

      await fetchAPI("/smtp/send", {
        method: "POST",
        body: JSON.stringify({
          to: formData.customerEmail,
          subject: `Case Updated: ${formData.Summary}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #2c7be5;">📌 Case Updated: ${formData.Summary}</h2>
              <p><strong>Resolution Note by Analyst:</strong> ${formData['ResolutionNote']}</p>
              <hr style="border: 1px solid #ccc; margin: 20px 0;" />
              <h3 style="color: #2c7be5;">🔹 Latest Case Details</h3>
              <p><strong>Severity:</strong> ${formData.Severity}</p>
              <p><strong>Risk:</strong> ${formData.Risk}</p>
              <p><strong>Risk Explanation:</strong><br>${formData['Risk Explanation']}</p>
              <p><strong>Assets:</strong>${formatList(formData.Assets)}</p>
              <p><strong>Incidents:</strong>${formatList(formData.Incidents)}</p>
            </div>
          `
        })
      });

      alert('📧 Email sent and case saved successfully.');
      navigateBackToDetails();
    } catch (err) {
      console.error('❌ Failed to send email:', err);
      alert('❌ Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    navigateBackToDetails();
  };

  if (permission !== 'full') {
    return (
      <div className="text-center mt-10 text-red-600 font-semibold">
        ❌ Case not found.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-4">✏️ Edit Case</h2>
      <div className="space-y-4">

        {/* Summary */}
        <div>
          <label className="block font-medium mb-1">Summary</label>
          <input
            type="text"
            name="Summary"
            value={formData.Summary || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="Enter case summary"
          />
        </div>

        {/* Severity */}
        <div>
          <label className="block font-medium mb-1">Severity</label>
          <select
            name="Severity"
            value={formData.Severity || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Severity</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Risk */}
        <div>
          <label className="block font-medium mb-1">Risk</label>
          <input
            type="number"
            name="Risk"
            value={formData.Risk || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="Enter numeric risk score"
          />
        </div>

        {/* Risk Explanation */}
        <div>
          <label className="block font-medium mb-1">Risk Explanation</label>
          <textarea
            name="Risk Explanation"
            value={formData['Risk Explanation'] || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded h-32 resize-y"
            placeholder="Enter risk explanation..."
          ></textarea>
        </div>

        {/* Resolution Note */}
        <div>
          <label className="block font-medium mb-1">Resolution Note</label>
          <textarea
            name="ResolutionNote"
            value={formData['ResolutionNote'] || ''}
            onChange={handleChange}
            className="w-full p-2 border rounded h-32 resize-y"
            placeholder="Enter resolution note (min. 15 words)..."
          ></textarea>
          {!resolutionValid && (
            <p className="text-red-500 mt-1">
              Resolution Note must contain at least 15 words.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <Button onClick={handleSave} variant="success" icon="💾">Save</Button>
          <Button onClick={handleClose} variant="danger" icon="🚪">Close</Button>
          <Button onClick={handleSendMail} variant="primary" icon="📧" disabled={sending}>
            {sending ? 'Sending...' : 'Send Mail'}
          </Button>
          <Button onClick={handleCancel} variant="secondary" icon="←">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
