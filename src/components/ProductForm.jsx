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
    if (!f.name.trim() || !f.sku.trim()) {
      setError('Name and SKU are required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = { ...f, name: f.name.trim(), sku: f.sku.trim(), description: f.description.trim() };
      if (editing) await api.updateProduct(product.id, payload);
      else await api.createProduct(payload);
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
          <div className="f"><label htmlFor="product-name">Name *</label><input id="product-name" value={f.name} onChange={set('name')} maxLength="120" required autoFocus /></div>
          <div className="f"><label htmlFor="product-sku">SKU *</label><input id="product-sku" value={f.sku} onChange={set('sku')} maxLength="64" required /></div>
        </div>
        <div className="f"><label htmlFor="product-description">Description</label><textarea id="product-description" rows="2" value={f.description} onChange={set('description')} maxLength="2000" /></div>
        <div className="grid2">
          <div className="f"><label htmlFor="product-quantity">Quantity on hand</label><input id="product-quantity" type="number" min="0" step="1" value={f.quantity} onChange={set('quantity')} required /></div>
          <div className="f"><label htmlFor="product-threshold">Low-stock threshold</label><input id="product-threshold" type="number" min="0" step="1" value={f.lowStockThreshold} onChange={set('lowStockThreshold')} placeholder={`Default: ${defaultThreshold}`} /></div>
          <div className="f"><label htmlFor="product-cost">Cost price</label><input id="product-cost" type="number" min="0" step="0.01" value={f.costPrice} onChange={set('costPrice')} required /></div>
          <div className="f"><label htmlFor="product-selling">Selling price</label><input id="product-selling" type="number" min="0" step="0.01" value={f.sellingPrice} onChange={set('sellingPrice')} required /></div>
        </div>
        <div className="foot">
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="pri" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create product'}</button>
        </div>
      </form>
    </Modal>
  );
}
