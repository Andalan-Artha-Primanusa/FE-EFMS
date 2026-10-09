import type { Supplier, VoucherGroup } from '../types';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'feastkop_suppliers';

export function normalize(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function stripVendorPrefix(s: string): string {
  return normalize(s).replace(/^(PT\.?\s*|CV\.?\s*|UD\.?\s*|TOKO\s+|PD\.?\s*)/i, '').trim();
}

export function getSuppliers(): Supplier[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveSuppliers(suppliers: Supplier[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
}

export function findSupplier(vendorName: string, suppliers: Supplier[]): Supplier | undefined {
  if (!vendorName) return undefined;
  const norm = normalize(vendorName);
  const foundExact = suppliers.find(s => normalize(s.nama) === norm);
  if (foundExact) return foundExact;

  const stripped = stripVendorPrefix(norm);
  if (!stripped) return undefined;
  return suppliers.find(s => stripVendorPrefix(s.nama) === stripped);
}

export function findEmail(vendorName: string, suppliers: Supplier[]): string {
  const s = findSupplier(vendorName, suppliers);
  return s?.email || '';
}

export function parseSupplierExcel(data: ArrayBuffer): Supplier[] {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  let headerIdx = -1;
  let namaCol = -1;
  let emailCol = -1;
  let bankCol = -1;
  let noRekCol = -1;
  let namaRekCol = -1;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const val = String(row[j]).trim().toLowerCase();
      if (/^(nama|nama pemasok|vendor|supplier|pemasok)$/i.test(val)) namaCol = j;
      if (/^(email|e-mail|surel)$/i.test(val)) emailCol = j;
      if (/^(bank|nama bank|bank name)$/i.test(val)) bankCol = j;
      if (/^(no rekening|no\. rekening|no rek|no\. rek|nomor rekening|account no|no_rek|rekening)$/i.test(val)) noRekCol = j;
      if (/^(nama rekening|pemilik rekening|atas nama|a\/n|a\.n|account name|beneficiary name)$/i.test(val)) namaRekCol = j;
    }
    if (namaCol >= 0 && (emailCol >= 0 || bankCol >= 0 || noRekCol >= 0)) {
      headerIdx = i;
      break;
    }
  }

  // Fallback defaults
  if (headerIdx < 0) {
    headerIdx = 0;
    if (namaCol < 0) namaCol = 3; // col D in standard format
    if (emailCol < 0) emailCol = 7; // col H
  }

  const suppliers: Supplier[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const nama = String(row[namaCol] ?? '').trim();
    if (!nama) continue;

    const email = emailCol >= 0 ? String(row[emailCol] ?? '').trim() : '';
    const namaBank = bankCol >= 0 ? String(row[bankCol] ?? '').trim() : '';
    const noRekening = noRekCol >= 0 ? String(row[noRekCol] ?? '').trim() : '';
    const namaRekening = namaRekCol >= 0 ? String(row[namaRekCol] ?? '').trim() : '';

    suppliers.push({
      nama,
      email,
      namaBank: namaBank || undefined,
      noRekening: noRekening || undefined,
      namaRekening: namaRekening || undefined,
    });
  }

  return suppliers;
}

export function mergeSuppliers(existing: Supplier[], incoming: Supplier[]): Supplier[] {
  const map = new Map<string, Supplier>();

  // Add existing
  for (const s of existing) {
    map.set(normalize(s.nama), { ...s });
  }

  // Merge incoming
  for (const s of incoming) {
    const key = normalize(s.nama);
    const prev = map.get(key);

    if (prev) {
      map.set(key, {
        nama: s.nama || prev.nama,
        email: s.email || prev.email || '',
        namaBank: s.namaBank || prev.namaBank,
        noRekening: s.noRekening || prev.noRekening,
        namaRekening: s.namaRekening || prev.namaRekening,
      });
    } else {
      map.set(key, s);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
}

export function syncBankFromVouchers(existing: Supplier[], vouchers: VoucherGroup[]): {
  merged: Supplier[];
  updatedCount: number;
} {
  const map = new Map<string, Supplier>();
  for (const s of existing) {
    map.set(normalize(s.nama), { ...s });
  }

  let updatedCount = 0;

  for (const v of vouchers) {
    if (!v.vendor) continue;
    const norm = normalize(v.vendor);
    let target = map.get(norm);

    if (!target) {
      // Try stripped
      const stripped = stripVendorPrefix(norm);
      for (const [k, val] of map.entries()) {
        if (stripVendorPrefix(k) === stripped) {
          target = val;
          break;
        }
      }
    }

    if (target) {
      let changed = false;
      if (v.bank && (!target.namaBank || target.namaBank !== v.bank)) {
        target.namaBank = v.bank;
        changed = true;
      }
      if (v.noRekening && (!target.noRekening || target.noRekening !== v.noRekening)) {
        target.noRekening = v.noRekening;
        changed = true;
      }
      if (v.namaRekening && (!target.namaRekening || target.namaRekening !== v.namaRekening)) {
        target.namaRekening = v.namaRekening;
        changed = true;
      }
      if (changed) updatedCount++;
    } else {
      // Add new vendor from voucher
      map.set(norm, {
        nama: v.vendor,
        email: v.email || '',
        namaBank: v.bank || undefined,
        noRekening: v.noRekening || undefined,
        namaRekening: v.namaRekening || undefined,
      });
      updatedCount++;
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  return { merged, updatedCount };
}
