import { FolderUp } from "lucide-react";
import { api } from "../lib/api";

export function UploadBox({ onDone }: { onDone: (msg: string) => void }) {
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("category", "Invoice attachment");
    await api("/api/documents", { method: "POST", body: form });
    onDone("Dokumen berhasil diupload ke folder E-Finance.");
  }
  return <label className="upload-box"><FolderUp size={28} /><strong>Upload invoice, tax document, contract, atau payment evidence</strong><span>File akan disimpan ke upload directory backend.</span><input type="file" onChange={upload} /></label>;
}
