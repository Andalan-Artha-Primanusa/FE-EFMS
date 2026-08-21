import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { PageHeader } from "../components/PageHeader";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <section className="module-view">
      <PageHeader title="404 - Halaman Tidak Ditemukan" description="Alamat yang Anda tuju tidak tersedia di FEAST." />
      <div className="panel p-8 flex flex-col items-center gap-4 text-center">
        <Compass size={44} className="text-slate-400" />
        <p className="text-sm text-slate-600 max-w-md">
          Halaman mungkin telah dipindahkan, dihapus, atau Anda salah mengetik alamat.
        </p>
        <div className="flex gap-2">
          <button className="primary compact" onClick={() => navigate("/")}>Kembali ke Dashboard</button>
          <button className="ghost compact" onClick={() => navigate(-1)}>Halaman Sebelumnya</button>
        </div>
      </div>
    </section>
  );
}
