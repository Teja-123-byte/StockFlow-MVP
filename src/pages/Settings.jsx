import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState({ text: '', error: false });

  useEffect(() => { api.settings().then((s) => setValue(s.defaultLowStockThreshold)); }, []);

  async function save(e) {
    e.preventDefault();
    try {
      await api.saveSettings({ defaultLowStockThreshold: value });
      setMsg({ text: 'Saved.', error: false });
    } catch (err) {
      setMsg({ text: err.message, error: true });
    }
  }

  return (
    <>
      <div className="bar"><h1>Settings</h1></div>
      <form className="card settings" onSubmit={save}>
        <div className="f">
          <label>Default low stock threshold</label>
          <input type="number" min="0" step="1" value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="hint">Used for any product without its own threshold.</div>
        </div>
        <button className="pri">Save</button>
        {msg.text && <span className={msg.error ? 'err inline' : 'muted inline'}>{msg.text}</span>}
      </form>
    </>
  );
}
