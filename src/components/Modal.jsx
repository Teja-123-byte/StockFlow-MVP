import { useEffect, useRef } from 'react';

// Thin wrapper around the native <dialog> element.
export default function Modal({ title, onClose, children, closeDisabled = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onCancel={(event) => { if (closeDisabled) event.preventDefault(); }}
      onClick={(event) => event.target === ref.current && !closeDisabled && onClose()}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </dialog>
  );
}
