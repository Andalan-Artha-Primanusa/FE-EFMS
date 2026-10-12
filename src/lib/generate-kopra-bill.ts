import type { VoucherGroup, ExportSettings } from '../types';
import { isMandiriVA } from './bank-codes';

function buildReference(group: VoucherGroup): string {
  const v = group.noVoucher;
  if (group.poNumbers.length === 0) return v;
  const all = `${v}/${group.poNumbers.join(',')}`;
  if (all.length <= 19) return all;
  if (group.poNumbers.length >= 2) {
    const first = group.poNumbers[0];
    const last = group.poNumbers[group.poNumbers.length - 1];
    const abbr = `${v}/${first},...,${last}`;
    if (abbr.length <= 19) return abbr;
    return `${v}/${first}`.substring(0, 19);
  }
  return all.substring(0, 19);
}

function buildRemark(group: VoucherGroup): string {
  const coas = group.coaCategories.join(', ');
  const remark = `Byr ${coas} - ${group.site}`;
  return remark.substring(0, 140);
}

function csvEscape(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function generateKopraBill(
  groups: VoucherGroup[],
  settings: ExportSettings
): Promise<void> {
  const fromNum = parseInt(settings.voucherFrom, 10);
  const toNum = parseInt(settings.voucherTo, 10);
  
  const filtered = groups.filter(g => {
    if (!isMandiriVA(g.bank, g.noRekening)) return false;
    const n = parseInt(g.noVoucher, 10);
    if (!isNaN(fromNum) && !isNaN(toNum) && !isNaN(n)) {
      return n >= fromNum && n <= toNum;
    }
    return g.noVoucher >= settings.voucherFrom && g.noVoucher <= settings.voucherTo;
  });

  if (filtered.length === 0) {
    throw new Error('Tidak ada voucher Mandiri VA dalam rentang yang dipilih');
  }

  const lines: string[] = [];
  const cleanAccount = settings.debitAccountNo.trim().replace(/\D/g, '');

  // P,Debit Account No.,Total Records,Instruction Mode,Instruction Date (yyyyMMdd),Session,Recurring Type,Recurring Interval,Recurring End Date
  lines.push([
    'P',
    cleanAccount,
    String(filtered.length),
    '1', // Instruction Mode = Immediate
    settings.transferDate,
    '', // Session
    '', // Recurring Type
    '', // Recurring Interval
    '', // Recurring End Date
    '', // Reserved
    '', // Reserved
    '', // Reserved
    '', // Reserved
    ''  // Reserved
  ].map(csvEscape).join(','));

  // Content Rows
  for (const group of filtered) {
    const va = group.noRekening.replace(/\D/g, '');
    let billerCode = va.substring(0, 5); // Assumption: first 5 digits is biller code
    
    // Trakindo specific rule if known
    if (group.vendor.toUpperCase().includes('TRAKINDO') && va.startsWith('8813')) {
       billerCode = '88137'; // 88137 is usually Trakindo
    }
    
    const amount = Math.round(group.totalNominal);
    const ref = buildReference(group);
    const remark = buildRemark(group);
    let email = group.email ? group.email.replace(/\s+/g, '').replace(/;/g, ',') : '';
    if (email === '-') email = '';

    // Biller Code ,Biller Name,Bill Key 1,Bill Key 2,Bill Key 3,Transfer Currency,Transaction Reference,FT Services (UBP),Remark,E-mail Notification,Reserved 1,Reserved 2,Extended Payment Detaill,E
    const fields = [
      billerCode,
      group.vendor.trim().substring(0, 50),
      va,
      String(amount),
      '',
      'IDR',
      ref,
      'UBP',
      remark,
      email,
      '',
      '',
      '',
      'E'
    ];

    lines.push(fields.map(csvEscape).join(','));
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KOPRA_VA_${settings.transferDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
