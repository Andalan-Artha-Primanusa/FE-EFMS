import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { MasterDataForm } from "../components/MasterDataForm";
import { viewMap, titleFromSlug } from "../data/navigation";
import { api, type MasterRecord } from "../lib/api";

export function MasterDataFormRoute() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [record, setRecord] = useState<MasterRecord | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState("");

  const title = titleFromSlug(slug) || "Unknown";
  const config = viewMap[title];
  const masterType = config?.masterType || "";

  useEffect(() => {
    if (id && masterType) {
      // Fetch the specific record for editing
      setLoading(true);
      api<any>(config.endpoint)
        .then((data) => {
          const rows = Array.isArray(data) ? data : (data?.reports || data?.kpis || []);
          const found = rows.find((r: any) => r.id === Number(id));
          if (found) {
            setRecord(found as MasterRecord);
          } else {
            setError("Record tidak ditemukan");
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setRecord(null);
      setLoading(false);
    }
  }, [id, config, masterType]);

  if (!masterType) {
    return <div className="p-8 text-center text-red-500">Invalid master type configuration for {slug}</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Memuat form data...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <MasterDataForm
        type={masterType}
        record={record}
        onCancel={() => navigate(`/${slug}`)}
        onSaved={() => navigate(`/${slug}`, { state: { notice: "Data berhasil disimpan" } })}
      />
    </div>
  );
}
