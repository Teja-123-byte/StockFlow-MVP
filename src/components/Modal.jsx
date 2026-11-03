import { useEffect, useRef } from 'react';

// Thin wrapper around the native <dialog> element.
export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
