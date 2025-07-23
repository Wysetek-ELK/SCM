import { useState, useEffect } from 'react';
import fetchAPI from '../../utils/api';

export default function AuthSettings() {
  const [step, setStep] = useState(1);
  const [ldapConfig, setLdapConfig] = useState({
    url: '',
    port: 389,
    useTLS: false,
    bindDN: '',
    bindCredentials: '',
    searchBase: '',
    searchFilter: 'cn={{username}}',
  });
  const [status, setStatus] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [testUsername, setTestUsername] = useState('');
  const [testPassword, setTestPassword] = useState('');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetchAPI('/ldap/load-config');
        if (res.success && res.config) {
          setLdapConfig(res.config);
          setIsLocked(true);
          console.log('🔒 LDAP config loaded and locked');
        }
      } catch (err) {
        console.warn('No existing LDAP config found');
      }
    };
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLdapConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleTestConnection = async () => {
    setStatus('🔄 Testing service bind...');
    try {
      const result = await fetchAPI('/ldap/test-connection', {
        method: 'POST',
        body: JSON.stringify({
          url: ldapConfig.url,
          port: ldapConfig.port,
          useTLS: ldapConfig.useTLS,
          bindDN: ldapConfig.bindDN,
          bindCredentials: ldapConfig.bindCredentials,
        }),
      });
      setStatus(result.success ? '✅ Service bind successful!' : '❌ Service bind failed');
    } catch (err) {
      setStatus('❌ Service bind failed: ' + (err.response?.message || err.message));
    }
  };

  const handleTestFullLogin = async () => {
    if (!testUsername || !testPassword) {
      setStatus('⚠️ Please enter test username and password');
      return;
    }
    setStatus('🔄 Testing full LDAP login...');
    try {
      const result = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: testUsername,
          password: testPassword,
          authType: 'domain',
        }),
      });
      setStatus(result.success ? '✅ Full LDAP login successful!' : '❌ Full LDAP login failed');
    } catch (err) {
      setStatus('❌ Full LDAP login failed: ' + (err.response?.message || err.message));
    }
  };

  const handleSave = async () => {
    setStatus('💾 Saving configuration...');
    try {
      const result = await fetchAPI('/ldap/save-config', {
        method: 'POST',
        body: JSON.stringify(ldapConfig),
      });
      if (result.success) {
        setStatus('✅ Configuration saved!');
        const res = await fetchAPI('/ldap/load-config');
        if (res.success && res.config) {
          setLdapConfig(res.config);
          setIsLocked(true);
        }
      } else {
        setStatus('❌ Save failed');
      }
    } catch (err) {
      setStatus('❌ Save failed: ' + (err.response?.message || err.message));
    }
  };

  const handleEdit = () => {
    setIsLocked(false);
    setStep(1);
    setStatus('');
  };

  const renderStep = () => {
    const inputClass = `w-full p-2 border rounded mb-4 ${isLocked ? 'bg-gray-100 text-gray-500' : ''}`;
    const isDisabled = isLocked;

    switch (step) {
      case 1:
        return (
          <>
            <label className="block mb-2">LDAP URL</label>
            <input type="text" name="url" value={ldapConfig.url} onChange={handleChange} className={inputClass} disabled={isDisabled} />
            <label className="block mb-2">Port</label>
            <input type="number" name="port" value={ldapConfig.port} onChange={handleChange} className={inputClass} disabled={isDisabled} />
            <label className="flex items-center space-x-2 mb-4">
              <input type="checkbox" name="useTLS" checked={ldapConfig.useTLS} onChange={handleChange} disabled={isDisabled} />
              <span>Use TLS (SSL)</span>
            </label>
          </>
        );
      case 2:
        return (
          <>
            <label className="block mb-2">Bind DN</label>
            <input type="text" name="bindDN" value={ldapConfig.bindDN} onChange={handleChange} className={inputClass} disabled={isDisabled} />
            <label className="block mb-2">Bind Password</label>
            <input type="password" name="bindCredentials" value={ldapConfig.bindCredentials} onChange={handleChange} className={inputClass} disabled={isDisabled} />
          </>
        );
      case 3:
        return (
          <>
            <label className="block mb-2">Search Base DN</label>
            <input type="text" name="searchBase" value={ldapConfig.searchBase} onChange={handleChange} className={inputClass} disabled={isDisabled} />
            <label className="block mb-2">Search Filter</label>
            <input type="text" name="searchFilter" value={ldapConfig.searchFilter} onChange={handleChange} className={inputClass} disabled={isDisabled} />
          </>
        );
      case 4:
        return (
          <>
            <p className="mb-4">Review your settings:</p>
            <pre className="p-2 bg-gray-100 rounded text-sm mb-4">{JSON.stringify(ldapConfig, null, 2)}</pre>
            {!isLocked && (
              <>
                <button type="button" onClick={handleTestConnection} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 mr-2">
                  Test Connection
                </button>
                <div className="mt-4">
                  <label className="block mb-2">Test Username</label>
                  <input type="text" value={testUsername} onChange={(e) => setTestUsername(e.target.value)} className="w-full p-2 border rounded mb-2" />
                  <label className="block mb-2">Test Password</label>
                  <input type="password" value={testPassword} onChange={(e) => setTestPassword(e.target.value)} className="w-full p-2 border rounded mb-2" />
                  <button type="button" onClick={handleTestFullLogin} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-2">
                    Test Full Login
                  </button>
                </div>
                <button type="button" onClick={handleSave} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mt-4">
                  Save Configuration
                </button>
              </>
            )}
            {status && <p className="mt-3 text-sm">{status}</p>}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">🔒 LDAP Authentication Setup</h3>
      <div className="p-4 border rounded bg-white shadow">
        {isLocked && (
          <div className="flex justify-between items-center mb-4">
            <span className="text-green-600">✅ LDAP configuration locked</span>
            <button type="button" onClick={handleEdit} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
              Edit
            </button>
          </div>
        )}
        {!isLocked && <p className="mb-4">Step {step} of 4</p>}
        {renderStep()}
        {!isLocked && (
          <div className="mt-4 flex justify-between">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">
                Back
              </button>
            )}
            {step < 4 && (
              <button type="button" onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-auto">
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
