import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { getEmailSettings, saveEmailSettings, testEmailSettings, type EmailSettings } from "../lib/api";

export function EmailSettingsPanel({ notify }: { notify: (type: "success" | "error", msg: string) => void }) {
  const [form, setForm] = useState<EmailSettings>({ host: "", port: "587", user: "", password: "", appUrl: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getEmailSettings().then((s) => setForm({ ...s, password: "" })).catch((err) => notify("error", err?.message || "Gagal memuat setting email"));
  }, []);

  const run = async (call: () => Promise<any>, ok: (res: any) => string) => {
    setBusy(true);
    try {
      notify("success", ok(await call()));
    } catch (err: any) {
      notify("error", err?.message || "Gagal");
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(async () => {
    const s = await saveEmailSettings(form);
    setForm({ ...s, password: "" });
  }, () => "Setting email tersimpan.");

  const field = (label: string, key: keyof EmailSettings, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-[#6B6055]">{label}</span>
      <input
        className="w-full border border-[#E6E1D9] rounded px-2.5 py-1.5 text-sm"
        value={String(form[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...props}
      />
    </label>
  );

  return (
    <section className="max-w-xl space-y-4 bg-white p-4 rounded-lg border border-[#E6E1D9] shadow-xs">
      <h3 className="font-bold text-[#1e2b4d] text-sm flex items-center gap-1.5">
        <Mail size={15} className="text-[#a57c50]" /> Email Notifikasi (SMTP)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">{field("SMTP Host", "host", { placeholder: "smtp.hostinger.com" })}</div>
        {field("Port", "port", { placeholder: "587" })}
      </div>
      {field("Email Pengirim", "user", { type: "email", placeholder: "feast@domain-kantor.co.id" })}
      {field("Password", "password", { type: "password", autoComplete: "new-password", placeholder: form.hasPassword ? "••••••••" : "" })}
      {field("URL FEAST", "appUrl", { placeholder: "http://160.19.165.216:2021" })}
      <div className="flex gap-2">
        <button disabled={busy} onClick={save} className="px-3 py-1.5 bg-[#1e2b4d] text-white rounded font-bold text-xs hover:bg-[#16203b] disabled:opacity-60">
          Simpan
        </button>
        <button
          disabled={busy}
          onClick={() => run(testEmailSettings, (r) => `Email tes terkirim ke ${r.sentTo}.`)}
          className="px-3 py-1.5 border border-[#E6E1D9] rounded font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-60"
        >
          <Send size={13} /> Kirim Email Tes
        </button>
      </div>
    </section>
  );
}
