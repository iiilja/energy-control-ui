import { useEffect, useState } from 'react';
import { apiErrorMessage, configAPI, ConfigEntry } from '../services/api';
import './ModbusApiLive.css';

const isBoolean = (entry: ConfigEntry) => entry.key.endsWith('.enabled');

const errorText = (err: any) =>
  err?.response?.status === 403 ? 'Admin role required' : apiErrorMessage(err);

/** All system_configuration values, editable one by one (admin only). */
const Settings = () => {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    configAPI.getAll()
      .then(res => setEntries(res.data))
      .catch(err => setError(`Failed to load settings: ${errorText(err)}`));
  }, []);

  const save = async (key: string) => {
    const value = drafts[key];
    if (value === undefined || saving[key]) return;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const res = await configAPI.update(key, value);
      setEntries(prev => prev.map(e => (e.key === key ? res.data : e)));
      setDrafts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMessages(prev => ({ ...prev, [key]: { ok: true, text: 'Saved' } }));
    } catch (err: any) {
      setMessages(prev => ({ ...prev, [key]: { ok: false, text: errorText(err) } }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const shown = entries.filter(e => e.key.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="modbus-container">
      <h1>⚙️ Settings</h1>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <input
          type="search"
          placeholder="Filter, e.g. price_optimization"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: '15px', padding: '8px', borderRadius: '4px', border: '2px solid #e0e0e0' }}
        />
        <small style={{ color: '#888' }}>
          Changes are picked up by the next run of the job that reads them; price optimisation settings re-plan at once.
        </small>
      </div>

      {shown.map(entry => {
        const draft = drafts[entry.key];
        const value = draft ?? entry.value;
        const changed = draft !== undefined && draft !== entry.value;
        const message = messages[entry.key];
        return (
          <div className="card" key={entry.key} style={{ padding: '14px 20px' }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 'bold', wordBreak: 'break-all' }}>{entry.key}</div>
            {entry.description && <div style={{ color: '#666', fontSize: '13px', margin: '4px 0 8px' }}>{entry.description}</div>}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {isBoolean(entry) ? (
                <select
                  value={value}
                  onChange={e => setDrafts(prev => ({ ...prev, [entry.key]: e.target.value }))}
                  style={{ fontSize: '15px', padding: '6px' }}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  value={value}
                  onChange={e => setDrafts(prev => ({ ...prev, [entry.key]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && changed) save(entry.key); }}
                  style={{ fontSize: '15px', padding: '6px', minWidth: '200px', flex: '1 1 200px' }}
                />
              )}
              <button onClick={() => save(entry.key)} disabled={!changed || saving[entry.key]}>
                {saving[entry.key] ? 'Saving...' : 'Save'}
              </button>
              {message && (
                <span style={{ fontSize: '13px', color: message.ok ? '#2e7d32' : '#c62828' }}>{message.text}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Settings;
