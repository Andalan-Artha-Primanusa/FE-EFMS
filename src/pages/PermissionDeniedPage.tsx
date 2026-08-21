import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { PageHeader } from "../components/PageHeader";

export function PermissionDeniedPage({ requiredView }: { requiredView?: string }) {
  const navigate = useNavigate();
  return (
    <section className="module-view">
      <PageHeader title="403 - Akses Ditolak" description="Anda tidak memiliki izin untuk membuka halaman ini." />
      <div className="panel p-8 flex flex-col items-center gap-4 text-center">
        <ShieldX size={44} className="text-red-400" />
        <p className="text-sm text-slate-600 max-w-md">
          {requiredView
            ? `Halaman "${requiredView}" membutuhkan permission khusus yang tidak dimiliki role Anda.`
            : "Role Anda tidak memiliki permission untuk halaman ini."}{" "}
          Hubungi administrator jika Anda merasa ini keliru.
        </p>
        <div className="flex gap-2">
          <button className="primary compact" onClick={() => navigate("/")}>Kembali ke Dashboard</button>
          <button className="ghost compact" onClick={() => navigate(-1)}>Kembali</button>
        </div>
      </div>
    </section>
  );
}
