import React from "react";
import { RupiahInput } from "../helpers";

interface CustomerModalProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function CustomerModal({ formData, setFormData }: CustomerModalProps) {
  return (
    <>
      {/* Section 1: Identitas Customer */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">
            1. Profil Perusahaan & Credit Terms
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Kode Customer <span className="text-rose-600">*</span>
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold uppercase focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="BGG"
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Termin Hari (Credit Terms) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
              value={formData.terminDays || 30}
              onChange={(e) =>
                setFormData({ ...formData, terminDays: Number(e.target.value) })
              }
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Nama Lengkap Perusahaan <span className="text-rose-600">*</span>
          </label>
          <input
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:border-cyan-700 focus:bg-white outline-none"
            placeholder="PT Budi Gema Gempita"
            value={formData.fullName || ""}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Induk Perusahaan (Group Parent)
          </label>
          <input
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
            placeholder="Petrindo Jaya Kreasi Tbk / PTBA"
            value={formData.groupParent || ""}
            onChange={(e) => setFormData({ ...formData, groupParent: e.target.value })}
          />
        </div>
      </div>

      {/* Section 2: Kontak AR */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">
            2. Contact Person & Penagihan AR
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              PIC AR
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="Bpk. Hendra"
              value={formData.contactPerson || ""}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Email AR
            </label>
            <input
              type="email"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="ar@bgg.co.id"
              value={formData.emailAR || ""}
              onChange={(e) => setFormData({ ...formData, emailAR: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Telepon
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="+62 21 555 0192"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Kontrak & Nilai Kerjasama */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">
            3. Kontrak & Nilai Kerjasama
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              No. Kontrak
            </label>
            <input
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
              placeholder="09/BGG-AAP/VIII/2018"
              value={formData.contractNo || ""}
              onChange={(e) => setFormData({ ...formData, contractNo: e.target.value })}
            />
          </div>
          <RupiahInput
            label="Nilai Kontrak (Rp)"
            value={formData.contractValue || 0}
            onChange={(val: number) => setFormData({ ...formData, contractValue: val })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Catatan Kontrak / Syarat
          </label>
          <textarea
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none"
            rows={2}
            placeholder="Termin per pekerjaan, 7 tahun..."
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
