import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

export default function ConfirmDelete({ product, onClose, onDeleted }) {
  const [error, setError] = useState('');
  async function remove() {
    try {
      await api.deleteProduct(product.id);
      onDeleted();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Modal title="Delete product?" onClose={onClose}>
      {error && <div className="err">{error}</div>}
      <p className="muted">“{product.name}” will be permanently removed. This can’t be undone.</p>
      <div className="foot">
        <button onClick={onClose}>Cancel</button>
        <button className="pri danger-fill" onClick={remove}>Delete</button>
      </div>
    </Modal>
  );
}