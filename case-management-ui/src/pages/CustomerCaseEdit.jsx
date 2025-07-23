import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import fetchAPI from '../utils/api';
import Button from '../components/ui/Button';

export default function CustomerCaseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    summary: '',
    severity: '',
    status: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const data = await fetchAPI(`/cases/${id}`);
        setFormData({
          summary: data.summary || '',
          severity: data.severity || '',
          status: data.status || ''
        });
      } catch (err) {
        console.error('❌ Failed to fetch case:', err);
        alert('❌ Failed to fetch case.');
        navigate('/customer');
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetchAPI(`/cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      alert('✅ Case updated successfully!');
      navigate(`/customer/cases/${id}`); // Back to standalone CaseDetails
    } catch (err) {
      console.error('❌ Failed to update case:', err);
      alert('❌ Failed to update case.');
    }
  };

  if (loading) return <p className="text-center mt-10">Loading case data...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">✏️ Edit Case</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Summary</label>
          <input
            type="text"
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            className="w-full border p-12 rounded"
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Severity</label>
          <select
            name="severity"
            value={formData.severity}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Severity</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Status</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Pending</option>
            <option>Closed</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Button type="submit" variant="success" icon="💾">Save</Button>
          <Button
            type="button"
            onClick={() => navigate(`/customer/cases/${id}`)}
            variant="secondary"
            icon="←"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
