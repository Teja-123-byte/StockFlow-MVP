import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

export default function AdjustDialog({ product, onClose, onSaved }) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const adjustment = Number(delta);
    if (!Number.isSafeInteger(adjustment) || adjustment === 0) {
      setError('Enter a non-zero whole number of units.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.adjustProduct(product.id, { delta: adjustment, note: note.trim() });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Adjust stock" onClose={onClose} closeDisabled={busy}>
      <p className="muted">{product.name} · currently {product.quantity} units</p>
      <form onSubmit={submit}>
        {error && <div className="err" role="alert">{error}</div>}
        <div className="f"><label htmlFor="stock-adjustment">Change in units</label><input id="stock-adjustment" type="number" step="1" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 10 or -3" required autoFocus /></div>
        <div className="f"><label htmlFor="stock-adjustment-note">Note <span className="muted">(optional)</span></label><input id="stock-adjustment-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength="500" /></div>
        <div className="foot">
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="pri" disabled={busy}>{busy ? 'Applying...' : 'Apply adjustment'}</button>
        </div>
      </form>
    </Modal>
  );
}
