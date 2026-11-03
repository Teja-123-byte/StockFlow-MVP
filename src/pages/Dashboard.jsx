import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.dashboard().then(setD).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="err">{error}</div>;
  if (!d) return null;

  return (
    <>
      <div className="bar"><h1>Dashboard</h1></div>
      <div className="cards">
        <div className="card stat"><div className="muted">Total products</div><div className="n">{d.totalProducts}</div></div>
        <div className="card stat"><div className="muted">Units on hand</div><div className="n">{d.totalUnits.toLocaleString()}</div></div>
        <div className="card stat"><div className="muted">Low stock items</div><div className="n">{d.lowStockCount}</div></div>
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
