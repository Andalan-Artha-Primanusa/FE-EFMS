import React from "react";
import { RupiahInput, formatMonthInput, formatMonthLabel } from "../helpers";
import { masterRegistry } from "../masterRegistry";
import { SOW_MODEL_LABELS } from "../../VariableSOWPage";

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
              value={formData.terminDays ?? ""}
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
              value={formData.contactAR || ""}
              onChange={(e) => setFormData({ ...formData, contactAR: e.target.value })}
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

      {/* Section 4: Parameter kontrak yang dipakai perhitungan BA & Invoice */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
          <span className="text-xs font-black uppercase text-cyan-800 tracking-wider">
            4. Parameter Kontrak (dipakai BA Tracker & Invoice)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Project Site</label>
            <input className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.projectSite || ""}
              onChange={(e) => setFormData({ ...formData, projectSite: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Rekening Penerimaan</label>
            <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.bankAccountId || ""}
              onChange={(e) => setFormData({ ...formData, bankAccountId: Number(e.target.value) || 0 })}>
              <option value="">— Pilih dari Master Rekening Bank —</option>
              {masterRegistry.bankAccounts.map((b: any) => (
                <option key={b.id} value={b.id}>{b.bankName} · {b.accountNo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Skema Raise & Fall</label>
            <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.formulaScheme || ""}
              onChange={(e) => setFormData({ ...formData, formulaScheme: e.target.value })}>
              <option value="">— Tanpa eskalasi —</option>
              <option value="SINGLE_FACTOR_FUEL">Single Factor (Fuel)</option>
              <option value="TRIPLE_FACTOR_DLF">Triple Factor (Fuel, Labor, Fixed)</option>
              <option value="KURS_TRANSAKSI_USD">Kurs Transaksi USD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Model Tarif Variable SOW</label>
            <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.sowModel || ""}
              onChange={(e) => setFormData({ ...formData, sowModel: e.target.value })}>
              <option value="">Default per kode customer</option>
              {Object.entries(SOW_MODEL_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Satuan Tarif Overhaul</label>
            <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.overhaulRateUnit || ""}
              onChange={(e) => setFormData({ ...formData, overhaulRateUnit: e.target.value })}>
              <option value="PER_1000M">Per 1.000 m</option>
              <option value="PER_100M">Per 100 m</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Diskon Overdistance (%)</label>
            <input type="number" step="any" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.overDistanceDiscountPct ?? ""}
              onChange={(e) => setFormData({ ...formData, overDistanceDiscountPct: Number(e.target.value) })} />
            <span className="text-[10px] text-slate-500">0 = tidak ada diskon; berlaku untuk periode sebelum jadwal diskon di bawah</span>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Kuota Stripping Ratio (OB : Coal)</label>
            <input type="number" step="any" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.maxStrippingRatio ?? ""}
              onChange={(e) => setFormData({ ...formData, maxStrippingRatio: Number(e.target.value) })} />
            <span className="text-[10px] text-slate-500">0 = tanpa kuota; kelebihan OB menjadi pending volume</span>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Toleransi Joint Survey (%)</label>
            <input type="number" step="any" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formData.surveyTolerancePct ?? ""}
              onChange={(e) => setFormData({ ...formData, surveyTolerancePct: Number(e.target.value) })} />
            <span className="text-[10px] text-slate-500">Batas selisih volume AAP vs customer</span>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Jadwal Diskon Overdistance (per Periode Asal Volume)</label>
            {(formData.overDistanceDiscountSchedule || []).map((s: any, i: number) => {
              const setStep = (patch: any) => setFormData({ ...formData, overDistanceDiscountSchedule: formData.overDistanceDiscountSchedule.map((x: any, j: number) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="month" required className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={formatMonthInput(s.fromPeriod || "")}
                    onChange={(e) => setStep({ fromPeriod: formatMonthLabel(e.target.value) })} />
                  <input type="number" step="any" required placeholder="Diskon %" className="w-32 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:border-cyan-700 focus:bg-white outline-none" value={s.pct ?? ""}
                    onChange={(e) => setStep({ pct: Number(e.target.value) })} />
                  <button type="button" className="px-3 text-xs font-bold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50"
                    onClick={() => setFormData({ ...formData, overDistanceDiscountSchedule: formData.overDistanceDiscountSchedule.filter((_: any, j: number) => j !== i) })}>Hapus</button>
                </div>
              );
            })}
            <button type="button" className="text-xs font-bold text-cyan-800 hover:underline"
              onClick={() => setFormData({ ...formData, overDistanceDiscountSchedule: [...(formData.overDistanceDiscountSchedule || []), { fromPeriod: "", pct: 0 }] })}>+ Tambah periode diskon</button>
            <span className="block text-[10px] text-slate-500">Mulai periode tersebut berlaku % diskon ini. Pending volume tetap memakai % diskon periode asalnya (mis. pending Jan-Mar 50% walau ditagih di April).</span>
          </div>
        </div>
      </div>
    </>
  );
}
