import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

export default function ConfirmDelete({ product, onClose, onDeleted }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await api.deleteProduct(product.id);
      onDeleted();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal title="Delete product?" onClose={onClose}>
      {error && <div className="err">{error}</div>}
      <p className="muted">“{product.name}” will be permanently removed. This can’t be undone.</p>
      <div className="foot">
        <button onClick={onClose} disabled={busy}>Cancel</button>
        <button className="pri danger-fill" onClick={remove} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</button>
      </div>
    </Modal>
  );
}