import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Konfirmasi",
  danger,
  onCancel,
  onConfirm
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return <div className="modal-backdrop">
    <section className="modal confirm-modal">
      <div className="modal-icon"><AlertTriangle size={22} /></div>
      <div className="panel-head">
        <h3>{title}</h3>
        <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
      </div>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="ghost" onClick={onCancel}>Batal</button>
        <button className={danger ? "primary danger-primary" : "primary"} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>;
}
