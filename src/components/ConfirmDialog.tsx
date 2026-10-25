import { useEffect, useState } from "react";
import { AlertTriangle, KeyRound, X } from "lucide-react";
import { setPinPrompt } from "../lib/api";

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

// Dipanggil api() saat BE meminta PIN approval untuk aksi verifikasi/approval.
export function ApprovalPinPrompt() {
  const [request, setRequest] = useState<{ error: string; resolve: (pin: string | null) => void } | null>(null);
  const [pin, setPin] = useState("");
  useEffect(() => {
    setPinPrompt((error) => new Promise((resolve) => { setPin(""); setRequest({ error, resolve }); }));
    return () => setPinPrompt(null);
  }, []);
  if (!request) return null;
  const close = (value: string | null) => { request.resolve(value); setRequest(null); };
  return <div className="modal-backdrop !z-[100000]">
    <form
      className="modal confirm-modal !w-[min(360px,95vw)]"
      onSubmit={(e) => { e.preventDefault(); if (pin.length === 6) close(pin); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.nativeEvent.stopPropagation(); close(null); } }}
    >
      <div className="modal-icon"><KeyRound size={22} /></div>
      <div className="panel-head">
        <h3>PIN Approval</h3>
        <button type="button" className="icon-btn" onClick={() => close(null)}><X size={18} /></button>
      </div>
      <input
        autoFocus
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        className="w-full text-center text-lg tracking-[0.5em]"
      />
      {request.error && <p className="!text-rose-500">{request.error}</p>}
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={() => close(null)}>Batal</button>
        <button type="submit" className="primary" disabled={pin.length !== 6}>Konfirmasi</button>
      </div>
    </form>
  </div>;
}
