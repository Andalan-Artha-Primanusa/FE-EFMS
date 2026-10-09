import type { VoucherGroup } from '../types';

const fmt = new Intl.NumberFormat('id-ID');

export function printVouchers(groups: VoucherGroup[], transferDate: string, debitAccount: string) {
  if (!groups || groups.length === 0) return;

  const formattedDate = transferDate && transferDate.length === 8
    ? `${transferDate.slice(6, 8)}/${transferDate.slice(4, 6)}/${transferDate.slice(0, 4)}`
    : transferDate;

  const totalNominal = groups.reduce((sum, g) => sum + g.totalNominal, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Approval Pembayaran</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }
        h2 { text-align: center; margin: 0 0 15px 0; font-size: 16px; text-transform: uppercase; }
        .header-info { margin-bottom: 15px; display: flex; justify-content: space-between; }
        .header-info div { line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .signatures { display: table; width: 100%; margin-top: 40px; }
        .sig-col { display: table-cell; width: 50%; text-align: center; }
        .sig-space { height: 80px; }
        .sig-name { font-weight: bold; text-decoration: underline; }
        .sig-title { margin-top: 5px; }
      </style>
    </head>
    <body>
      <h2>DAFTAR PERSETUJUAN PEMBAYARAN</h2>
      <div class="header-info">
        <div>
          <strong>Tanggal Transfer:</strong> ${formattedDate || '-'}<br/>
          <strong>Rekening Sumber:</strong> ${debitAccount || '-'}
        </div>
        <div class="text-right">
          <strong>Total Transaksi:</strong> ${groups.length} Voucher<br/>
          <strong>Total Nominal:</strong> Rp ${fmt.format(Math.round(totalNominal))}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 5%">No</th>
            <th style="width: 15%">No. Voucher</th>
            <th style="width: 30%">Pemasok / Vendor</th>
            <th style="width: 25%">Bank & Rekening</th>
            <th class="text-right" style="width: 25%">Nominal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${groups.map((g, i) => `
            <tr>
              <td class="text-center">${i + 1}</td>
              <td>${g.noVoucher}</td>
              <td>${g.vendor}</td>
              <td>${g.bank}<br/>${g.noRekening}</td>
              <td class="text-right">${fmt.format(Math.round(g.totalNominal))}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="text-right font-bold">TOTAL KESELURUHAN</td>
            <td class="text-right font-bold">Rp ${fmt.format(Math.round(totalNominal))}</td>
          </tr>
        </tfoot>
      </table>

      <div class="signatures">
        <div class="sig-col">
          <div>Disiapkan oleh,</div>
          <div class="sig-space"></div>
          <div class="sig-name">_______________________</div>
          <div class="sig-title">Foreman Finance</div>
        </div>
        <div class="sig-col">
          <div>Diverifikasi oleh,</div>
          <div class="sig-space"></div>
          <div class="sig-name">_______________________</div>
          <div class="sig-title">Finance SPV</div>
        </div>
      </div>
      <script>
        window.onload = () => {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    alert('Gagal membuka halaman cetak. Harap izinkan pop-up pada browser Anda.');
  }
}
