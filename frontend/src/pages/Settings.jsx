import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState({ text: '', error: false });
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError('');
    setMsg({ text: '', error: false });
    try {
      const settings = await api.settings();
      setValue(String(settings.defaultLowStockThreshold));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const threshold = Number(value);
    if (!Number.isSafeInteger(threshold) || threshold < 0) {
      setMsg({ text: 'Enter a whole number greater than or equal to zero.', error: true });
      return;
    }
    setSaving(true);
    setMsg({ text: '', error: false });
    try {
      const settings = await api.saveSettings({ defaultLowStockThreshold: threshold });
      setValue(String(settings.defaultLowStockThreshold));
      setMsg({ text: 'Saved.', error: false });
    } catch (err) {
      setMsg({ text: err.message, error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="bar"><h1>Settings</h1></div>
      <form className="card settings" onSubmit={save}>
        <div className="f">
          <label htmlFor="default-threshold">Default low-stock threshold</label>
          <input
            id="default-threshold"
            type="number"
            min="0"
            step="1"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={loading || saving}
            aria-describedby="threshold-hint"
          />
          <div id="threshold-hint" className="hint">Applied to products without a custom threshold.</div>
        </div>
        <div className="settings-actions">
          <button className="pri" disabled={loading || saving}>{saving ? 'Saving...' : 'Save changes'}</button>
          {loading && <span className="muted" role="status">Loading settings...</span>}
          {loadError && <span className="err inline" role="alert">{loadError}</span>}
          {msg.text && <span className={msg.error ? 'err inline' : 'success inline'} role={msg.error ? 'alert' : 'status'}>{msg.text}</span>}
          {!loading && loadError && <button className="sm" type="button" onClick={load}>Retry</button>}
        </div>
      </form>
    </>
  );
}
