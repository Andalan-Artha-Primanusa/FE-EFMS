import React, { useState, useEffect, useRef } from 'react';
import { TunaiPOTracking } from '../../types';
import { Button } from '../../components/ui/Button';
import { Loader2, Plus, Check, Upload, X, Eye } from 'lucide-react';
import { api, uploadDocumentFile } from '../../lib/api';

const URL_FIELD_MAP: Record<string, keyof TunaiPOTracking> = {
  hasOriginalInvoice: 'originalInvoiceUrl',
  hasTaxInvoice: 'taxInvoiceUrl',
  hasPo: 'poUrl',
  hasGr: 'grUrl'
};

export const TunaiPOView: React.FC = () => {
  const [data, setData] = useState<TunaiPOTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ voucherNo: '', site: '', vendor: '', invoiceQty: 1, totalAmount: 0, justification: '' });
  const [formLoading, setFormLoading] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadContext, setUploadContext] = useState<{id: number, docType: string} | null>(null);

  const fetchTrackings = async () => {
    try {
      const json = await api<TunaiPOTracking[]>('/api/finance/tunai-po');
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackings();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api('/api/finance/tunai-po', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ voucherNo: '', site: '', vendor: '', invoiceQty: 1, totalAmount: 0, justification: '' });
      await fetchTrackings();
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan data Tunai PO.');
    } finally {
      setFormLoading(false);
    }
  };

  const triggerUpload = (id: number, docType: string) => {
    setUploadContext({ id, docType });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadContext) return;

    const { id, docType } = uploadContext;
    const item = data.find(d => d.id === id);
    if (!item) return;

    setSavingId(id);
    try {
      // 1. Upload file
      const res = await uploadDocumentFile(file, 'Finance', 'Tunai PO');
      
      // 2. Mark document as received and save url
      const payload = {
        hasOriginalInvoice: item.hasOriginalInvoice,
        hasTaxInvoice: item.hasTaxInvoice,
        hasPo: item.hasPo,
        hasGr: item.hasGr,
        [docType]: true,
        [URL_FIELD_MAP[docType]]: res.url
      };
      await api(`/api/finance/tunai-po/${id}/documents`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      await fetchTrackings();
    } catch (err) {
      console.error(err);
      alert('Gagal mengupload dokumen.');
    } finally {
      setSavingId(null);
      setUploadContext(null);
    }
  };

  const isOldPending = (createdAt: string, status: string) => {
    if (status === 'Completed') return false;
    const days = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24);
    return days > 7;
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#A57C50] w-8 h-8" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tunai PO Tracking</h1>
          <p className="text-sm text-slate-500 mt-1">Lacak kelengkapan dokumen fisik untuk pembayaran Tunai PO</p>
        </div>
        <Button className="bg-[#1A1612] hover:bg-[#333] text-white" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Tunai PO
        </Button>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />

      <div className="bg-white rounded-[4px] border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <th className="p-3">No. Voucher</th>
              <th className="p-3">Site</th>
              <th className="p-3">Vendor</th>
              <th className="p-3 text-right">Inv Qty</th>
              <th className="p-3 text-right">Total Amount (Rp)</th>
              <th className="p-3 text-center" title="Original Invoice">Orig. Inv</th>
              <th className="p-3 text-center" title="Faktur Pajak">Faktur</th>
              <th className="p-3 text-center" title="PO Document">PO Doc</th>
              <th className="p-3 text-center" title="Goods Receipt">GR</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-400">Belum ada data Tunai PO.</td>
              </tr>
            ) : data.map((row) => (
              <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isOldPending(row.createdAt, row.status) ? 'bg-orange-50/50' : ''}`}>
                <td className="p-3 font-medium text-slate-700">{row.voucherNo}</td>
                <td className="p-3 text-slate-600">{row.site}</td>
                <td className="p-3 text-slate-600 truncate max-w-[200px]" title={row.vendor}>{row.vendor}</td>
                <td className="p-3 text-right text-slate-600">{row.invoiceQty}</td>
                <td className="p-3 text-right font-medium text-slate-800">{new Intl.NumberFormat('id-ID').format(row.totalAmount)}</td>
                
                {(['hasOriginalInvoice', 'hasTaxInvoice', 'hasPo', 'hasGr'] as const).map(docType => {
                  const url = row[URL_FIELD_MAP[docType]] as string | undefined;
                  return (
                    <td key={docType} className="p-3 text-center">
                      {row[docType] ? (
                        url ? (
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mx-auto w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-200 transition-colors"
                            title="Lihat Dokumen"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <div className="mx-auto w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-600" title="Dokumen Tersedia">
                            <Check className="w-4 h-4" />
                          </div>
                        )
                      ) : (
                        <button
                          disabled={savingId === row.id}
                          onClick={() => triggerUpload(row.id, docType)}
                          className={`mx-auto w-6 h-6 rounded border flex items-center justify-center transition-colors
                            bg-white border-slate-300 hover:border-[#A57C50] hover:text-[#A57C50]
                            ${savingId === row.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer text-slate-400'}
                          `}
                          title="Upload Dokumen"
                        >
                          {savingId === row.id && uploadContext?.docType === docType ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}

                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded-[3px] text-xs font-bold ${
                    row.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[4px] w-full max-w-md shadow-2xl flex flex-col">
            <div className="bg-[#1A1612] px-4 py-3 flex justify-between items-center rounded-t-[4px] border-b border-amber-900/30">
              <h2 className="text-white font-semibold text-lg">Tambah Data Tunai PO</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">No. Voucher</label>
                <input required autoFocus value={formData.voucherNo} onChange={e => setFormData({...formData, voucherNo: e.target.value})} className="w-full border border-slate-300 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:border-[#A57C50]" placeholder="Contoh: PV-2609-001" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Site</label>
                  <input required value={formData.site} onChange={e => setFormData({...formData, site: e.target.value})} className="w-full border border-slate-300 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:border-[#A57C50]" placeholder="Contoh: HO" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Qty</label>
                  <input required type="number" min="1" value={formData.invoiceQty} onChange={e => setFormData({...formData, invoiceQty: parseInt(e.target.value) || 0})} className="w-full border border-slate-300 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:border-[#A57C50]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Vendor</label>
                <input required value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} className="w-full border border-slate-300 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:border-[#A57C50]" placeholder="Nama Vendor" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Amount (Rp)</label>
                <input required type="number" min="0" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})} className="w-full border border-slate-300 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:border-[#A57C50]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Justifikasi (Opsional)</label>
                <textarea value={formData.justification} onChange={e => setFormData({...formData, justification: e.target.value})} className="w-full border border-slate-300 rounded-[3px] px-3 py-2 text-sm focus:outline-none focus:border-[#A57C50] resize-none" rows={2} placeholder="Alasan pembayaran cash..." />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" onClick={() => setShowAddModal(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700">Batal</Button>
                <Button type="submit" disabled={formLoading} className="bg-[#A57C50] hover:bg-[#8e6941] text-white font-extrabold flex items-center">
                  {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan Data
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TunaiPOView;
