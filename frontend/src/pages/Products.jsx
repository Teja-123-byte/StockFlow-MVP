import { useCallback, useEffect, useRef, useState } from 'react';
import { api, money } from '../api.js';
import ProductForm from '../components/ProductForm.jsx';
import AdjustDialog from '../components/AdjustDialog.jsx';
import ConfirmDelete from '../components/ConfirmDelete.jsx';

export default function Products() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [defaultThreshold, setDefaultThreshold] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  const [dialog, setDialog] = useState(null); // { type: 'form' | 'adjust' | 'delete', product? }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async (query = search) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const products = await api.products(query);
      if (currentRequest === requestId.current) setRows(products);
    } catch (e) {
      if (currentRequest === requestId.current) setError(e.message);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [search]);

  // Debounced server-side search (name or SKU)
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    let active = true;
    api.settings()
      .then((settings) => { if (active) setDefaultThreshold(settings.defaultLowStockThreshold); })
      .catch((e) => { if (active) setSettingsError(e.message); });
    return () => { active = false; };
  }, []);

  const done = () => { setDialog(null); load(search); };

  return (
    <>
      <div className="bar">
        <h1>Products</h1>
        <div className="tools">
          <input className="search" placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="pri" onClick={() => setDialog({ type: 'form' })}>Add product</button>
        </div>
      </div>
      {settingsError && <div className="notice" role="status">Could not load the organization default threshold. Products will still use the saved setting. <button className="sm" onClick={() => api.settings().then((settings) => { setDefaultThreshold(settings.defaultLowStockThreshold); setSettingsError(''); }).catch((e) => setSettingsError(e.message))}>Retry</button></div>}
      {error && <div className="err" role="alert">{error} <button className="sm" onClick={() => load(search)}>Retry</button></div>}
      <div className="card">
        {loading ? (
          <div className="empty" role="status">Loading products...</div>
        ) : error ? (
          <div className="empty">Unable to load products.</div>
        ) : rows?.length ? (
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Name</th><th>SKU</th><th className="num">Quantity</th><th>Stock</th><th className="num">Price</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="muted">{p.sku}</td>
                    <td className="num">{p.quantity}</td>
                    <td>{p.isLowStock ? <span className="badge">Low stock</span> : <span className="badge ok">In stock</span>}</td>
                    <td className="num">{money(p.sellingPrice)}</td>
                    <td>
                      <div className="acts">
                        <button className="sm" onClick={() => setDialog({ type: 'adjust', product: p })}>Adjust</button>
                        <button className="sm" onClick={() => setDialog({ type: 'form', product: p })}>Edit</button>
                        <button className="sm danger" onClick={() => setDialog({ type: 'delete', product: p })}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">{search ? 'No products match your search.' : 'No products yet. Add your first product to get started.'}</div>
        )}
      </div>

      {dialog?.type === 'form' && <ProductForm product={dialog.product} defaultThreshold={defaultThreshold} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.type === 'adjust' && <AdjustDialog product={dialog.product} onClose={() => setDialog(null)} onSaved={done} />}
      {dialog?.type === 'delete' && <ConfirmDelete product={dialog.product} onClose={() => setDialog(null)} onDeleted={done} />}
    </>
  );
}
