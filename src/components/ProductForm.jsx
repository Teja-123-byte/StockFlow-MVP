import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

export default function ProductForm({ product, defaultThreshold, onClose, onSaved }) {
  const editing = !!product;
  const [f, setF] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    quantity: product?.quantity ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? '',
    costPrice: product?.costPrice ?? '',
    sellingPrice: product?.sellingPrice ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) await api.updateProduct(product.id, f);
      else await api.createProduct(f);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <div className="err">{error}</div>}
        <div className="grid2">
          <div className="f"><label>Name *</label><input value={f.name} onChange={set('name')} autoFocus /></div>
          <div className="f"><label>SKU *</label><input value={f.sku} onChange={set('sku')} /></div>
        </div>
        <div className="f"><label>Description</label><textarea rows="2" value={f.description} onChange={set('description')} /></div>
        <div className="grid2">
          <div className="f"><label>Quantity on hand</label><input type="number" min="0" step="1" value={f.quantity} onChange={set('quantity')} /></div>
          <div className="f"><label>Low stock threshold</label><input type="number" min="0" step="1" value={f.lowStockThreshold} onChange={set('lowStockThreshold')} placeholder={`Default: ${defaultThreshold}`} /></div>
          <div className="f"><label>Cost price</label><input type="number" min="0" step="0.01" value={f.costPrice} onChange={set('costPrice')} /></div>
          <div className="f"><label>Selling price</label><input type="number" min="0" step="0.01" value={f.sellingPrice} onChange={set('sellingPrice')} /></div>
        </div>
        <div className="foot">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="pri" disabled={busy}>{editing ? 'Save changes' : 'Create product'}</button>
        </div>
      </form>
    </Modal>
  );
}
