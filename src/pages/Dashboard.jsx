import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setD(await api.dashboard());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="empty" role="status">Loading inventory dashboard...</div>;
  if (error) return <div className="err" role="alert">{error} <button className="sm" onClick={load}>Retry</button></div>;
  if (!d) return null;

  return (
    <>
      <div className="bar"><h1>Dashboard</h1></div>
      <div className="cards">
        <div className="card stat"><div className="muted">Total products</div><div className="n">{d.totalProducts.toLocaleString()}</div></div>
        <div className="card stat"><div className="muted">Units on hand</div><div className="n">{d.totalUnits.toLocaleString()}</div></div>
        <div className="card stat"><div className="muted">Low stock items</div><div className="n">{d.lowStockCount.toLocaleString()}</div></div>
      </div>
      <div className="card">
        <div className="hd"><h2>Low stock items</h2></div>
        {d.lowStock.length ? (
          <div className="scroll">
            <table>
              <thead><tr><th>Name</th><th>SKU</th><th className="num">On hand</th><th className="num">Threshold</th></tr></thead>
              <tbody>
                {d.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td className="muted">{p.sku}</td>
                    <td className="num">{p.quantity}</td><td className="num">{p.effectiveThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">{d.totalProducts ? 'Everything is well stocked.' : 'No products yet. Add your first product to get started.'}</div>
        )}
      </div>
    </>
  );
}
