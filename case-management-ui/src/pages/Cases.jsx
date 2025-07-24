import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import fetchAPI from '../utils/api';
import dayjs from 'dayjs';

export default function Cases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [casesPerPage, setCasesPerPage] = useState(10);

  const getCasePermissionsByOrg = () => {
    const raw = localStorage.getItem('orgPermissions');
    const orgPermissions = raw ? JSON.parse(raw) : {};
    const orgAccess = {};

    for (const [org, perms] of Object.entries(orgPermissions)) {
      const access = perms?.Cases || perms?.cases;
      if (!access) continue;
      if (access === 'full') orgAccess[org] = 'full';
      else if (access === 'view' && orgAccess[org] !== 'full') orgAccess[org] = 'view';
    }
    return orgAccess;
  };

  const orgAccess = getCasePermissionsByOrg();
  const hasCaseAccess = Object.values(orgAccess).some(
    (level) => level === 'view' || level === 'full'
  );

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await fetchAPI('/cases');
      const accessibleCases = (Array.isArray(res) ? res : []).filter(c => {
        const org = getOrganization(c);
        return orgAccess[org] && orgAccess[org] !== 'hide';
      });
      setCases(accessibleCases);
    } catch (err) {
      console.error('❌ Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSeverity, filterStatus, filterOrganization]);

  useEffect(() => {
    const container = document.querySelector('.content-scroll');
    container?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, searchQuery, filterSeverity, filterStatus, filterOrganization]);

  const getField = (obj, ...keys) => {
    for (const key of keys) {
      if (obj?.[key]) return obj[key];
      if (obj?.[key.toLowerCase()]) return obj[key.toLowerCase()];
    }
    return 'Unknown';
  };

  const getOrganization = (c) => {
    const org = getField(c, 'Organization', 'organization', 'customer');
    if (org !== 'Unknown') return org;

    if (c.rawData) {
      const match = c.rawData.match(/Organization\s+([^\r\n]+)/i);
      if (match) return match[1].trim();
    }
    return 'Unknown';
  };

  const filteredCases = cases.filter(c => {
    const textMatch = searchQuery
      ? Object.values(c).some(val =>
          (val ?? '').toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      : true;

    const severityField = getField(c, 'Severity', 'severity');
    const statusField = getField(c, 'Status', 'status');
    const orgField = getOrganization(c);

    const severityMatch = filterSeverity
      ? severityField !== 'Unknown' &&
        severityField.toLowerCase() === filterSeverity.toLowerCase()
      : true;

    const statusMatch = filterStatus
      ? statusField !== 'Unknown' &&
        statusField.toLowerCase() === filterStatus.toLowerCase()
      : true;

    const orgMatch = filterOrganization
      ? orgField !== 'Unknown' &&
        orgField.toLowerCase() === filterOrganization.toLowerCase()
      : true;

    return textMatch && severityMatch && statusMatch && orgMatch;
  });

  const indexOfLastCase = currentPage * casesPerPage;
  const indexOfFirstCase = indexOfLastCase - casesPerPage;
  const currentCases = filteredCases.slice(indexOfFirstCase, indexOfLastCase);
  const totalPages = Math.ceil(filteredCases.length / casesPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
    } else {
      const container = document.querySelector('.content-scroll');
      container?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleView = (id) => {
    navigate(`/cases/${id}`);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterSeverity('');
    setFilterStatus('');
    setFilterOrganization('');
  };

  const formatDateParts = (dateStr) => {
    if (!dateStr) return { date: '-', time: '' };
    const match = dateStr.match(/\(([^)]+)\)/);
    const cleanDateStr = match ? match[1] : dateStr;

    const date = dayjs(cleanDateStr, ['MMM DD, YYYY, hh:mm A', dayjs.ISO_8601]);
    if (!date.isValid()) return { date: '-', time: '' };

    return {
      date: date.format('MMM DD, YYYY'),
      time: date.format('hh:mm A')
    };
  };

  const getBadge = (type, value) => {
    const base =
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium shadow-sm";
    const icons = {
      severity: {
        high: "🔥",
        medium: "⚡",
        low: "🌿",
        default: "❔",
      },
      status: {
        open: "🟢",
        "in progress": "🔄",
        pending: "⏸",
        closed: "✅",
        default: "❔",
      },
    };
    const styles = {
      severity: {
        high: "bg-red-100 text-red-700 border border-red-300",
        medium: "bg-yellow-100 text-yellow-800 border border-yellow-300",
        low: "bg-green-100 text-green-700 border border-green-300",
        default: "bg-gray-200 text-gray-600 border border-gray-300",
      },
      status: {
        open: "bg-green-100 text-green-700 border border-green-300",
        "in progress": "bg-purple-100 text-purple-700 border border-purple-300",
        pending: "bg-yellow-100 text-yellow-800 border border-yellow-300",
        closed: "bg-gray-200 text-gray-600 border border-gray-300",
        default: "bg-gray-200 text-gray-600 border border-gray-300",
      },
    };

    const cleanValue = value?.toLowerCase();
    const icon = icons[type][cleanValue] || icons[type].default;
    const style = styles[type][cleanValue] || styles[type].default;

    return (
      <span className={`${base} ${style}`}>
        <span className="text-lg">{icon}</span>
        {value || "Unknown"}
      </span>
    );
  };

  if (loading) return <p className="text-center text-gray-500 mt-10">Loading cases...</p>;

  if (!hasCaseAccess) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center text-red-600 text-lg font-semibold">
        🚫 You do not have access to <b>Cases</b>.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        📂 <span>Case List</span>
      </h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search any field..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">All Severities</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">All Statuses</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Pending</option>
          <option>Closed</option>
        </select>
        <select
          value={filterOrganization}
          onChange={(e) => setFilterOrganization(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg bg-white"
        >
          <option value="">All Organizations</option>
          {[...new Set(cases.map(getOrganization))].filter(org => org && org !== 'Unknown').map(org => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <button
          onClick={handleResetFilters}
          className="p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          🔄 Reset Filters
        </button>
      </div>

      {/* Page Info & Per-Page Selector */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Showing <b>{currentCases.length}</b> of <b>{filteredCases.length}</b> cases
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="casesPerPage" className="text-sm text-gray-600">
            Cases per page:
          </label>
          <select
            id="casesPerPage"
            value={casesPerPage}
            onChange={(e) => {
              setCasesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="p-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={60}>60</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {currentCases.length === 0 ? (
        <p className="text-center text-gray-600">No cases found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="w-full text-sm text-gray-800 bg-white rounded-lg">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs sticky top-0">
              <tr>
                <th className="p-3 text-left">Case ID</th>
                <th className="p-3 text-left">Summary</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Creator</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Closed</th>
                <th className="p-3 text-left">Organization</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCases.map((c) => {
                const { date, time } = formatDateParts(getField(c, 'Created', 'created', c.createdAt));
                return (
                  <tr key={c._id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3">{getField(c, 'Case ID', 'caseId')}</td>
                    <td className="p-3 max-w-xs break-words">{getField(c, 'Summary', 'summary')}</td>
                    <td className="p-3">{getBadge('severity', getField(c, 'Severity', 'severity'))}</td>
                    <td className="p-3">{getBadge('status', getField(c, 'Status', 'status'))}</td>
                    <td className="p-3">{getField(c, 'Creator', 'creatorEmail')}</td>
                    <td className="p-3">
                      {date}<br />
                      <span className="text-xs text-gray-500">{time}</span>
                    </td>
                    <td className="p-3">
                      {getField(c, 'Status')?.toLowerCase() === 'closed' && getField(c, 'ClosedTime') ? (
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 border border-gray-300"
                          title={dayjs(getField(c, 'ClosedTime')).format('MMM DD, YYYY hh:mm A')}
                        >
                          ✅ {dayjs(getField(c, 'ClosedTime')).format('MMM DD, YYYY')}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="p-3">{getOrganization(c)}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleView(c._id)}
                        className="flex items-center gap-1 px-3 py-1 border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition"
                      >
                        👁 View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentPage === i + 1
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
