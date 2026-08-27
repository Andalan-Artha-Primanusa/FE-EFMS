import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { schemaFor, metadataOf } from "../data/masterSchemas";
import { createMasterRecord, previewNumber, updateMasterRecord, type MasterRecord, type User } from "../lib/api";
import { companyScopeOf } from "../lib/auth";

export function MasterDataForm({
  type,
  record,
  user,
  onCancel,
  onSaved
}: {
  type: string;
  record?: MasterRecord | null;
  user?: User;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const schema = useMemo(() => schemaFor(type), [type]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [numberPreview, setNumberPreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    const metadata = metadataOf(record);
    setForm({
      ...metadata,
      type: record?.type ?? type,
      code: record?.code ?? "",
      name: record?.name ?? "",
      status: record?.status ?? "active"
    });
    if (record) {
      setNumberPreview(record.code);
      return;
    }
    loadPreview();
  }, [record, type]);

  async function loadPreview() {
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const result = await previewNumber("master_records", type);
      setNumberPreview(result.nextNumber);
    } catch (err) {
      setNumberPreview("");
      setPreviewError(err instanceof Error ? err.message : "Gagal mengambil nomor dari backend");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const metadata: Record<string, string> = {};
    schema.fields.forEach((field) => {
      if (!["type", "code", "name", "status"].includes(field.key)) {
        metadata[field.key] = form[field.key] ?? "";
      }
    });
    const scope = user ? companyScopeOf(user) : { all: true, codes: [] as string[] };
    if (!scope.all && scope.codes[0] && !metadata.companyCode) metadata.companyCode = scope.codes[0];
    const payload = {
      type,
      code: record?.code ?? "",
      name: form.name ?? "",
      status: form.status ?? "active",
      metadata: JSON.stringify(metadata)
    };
    try {
      if (record) {
        await updateMasterRecord(record.id, payload);
      } else {
        await createMasterRecord(payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Master data gagal disimpan");
    }
  }

  return <section className="entity-page">
    <div className="entity-page-head">
      <button type="button" className="ghost" onClick={onCancel}><ArrowLeft size={16} /> Back</button>
      <span className="header-meta">{record ? "Edit Mode" : "Create Mode"}</span>
    </div>
    <form onSubmit={submit}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">{schema.title}</p>
          <h3>{record ? "Update Master Data" : "Create Master Data"}</h3>
        </div>
      </div>
      <div className="master-form-grid">
        {schema.fields.map((field) => <label key={field.key}>{field.label}
          {field.key === "code" ? <div className="number-preview-field">
            <input value={previewLoading ? "Loading number..." : numberPreview} readOnly required />
            {!record && previewError && <button type="button" className="ghost" onClick={loadPreview}><RefreshCw size={15} /> Retry</button>}
            {!record && previewError && <small>{previewError}</small>}
          </div>
            : field.type === "select" ? <select value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} required={field.required}>
            <option value="">Select</option>
            {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
          </select> : <input value={form[field.key] ?? ""} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} required={field.required} />}
        </label>)}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        <button className="primary" disabled={!record && !numberPreview}>{record ? "Update" : "Create"}</button>
      </div>
    </form>
  </section>;
}
