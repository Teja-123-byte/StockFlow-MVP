import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

export default function AdjustDialog({ product, onClose, onSaved }) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await api.adjustProduct(product.id, { delta: Number(delta), note });
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      <p className="muted" style={{ marginTop: -8 }}>{product.name} · currently {product.quantity} units</p>
      <form onSubmit={submit}>
        {error && <div className="err">{error}</div>}
        <div className="f"><label>Change (+/− units)</label><input type="number" step="1" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 10 or -3" autoFocus /></div>
        <div className="f"><label>Note (optional)</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="foot">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="pri">Apply</button>
        </div>
      </form>
    </Modal>
  );
}
