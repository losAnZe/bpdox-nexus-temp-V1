import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

let _fontBase64Cache: string | null = null;
const getRedHatDisplayBase64 = (): string => {
  if (_fontBase64Cache) return _fontBase64Cache;

  const candidatePaths = [
    path.resolve(__dirname, '../../fonts/RedHatDisplay-Variable.ttf'),
    path.resolve(__dirname, '../../../fonts/RedHatDisplay-Variable.ttf'),
    path.resolve(process.cwd(), 'fonts/RedHatDisplay-Variable.ttf'),
    path.resolve(process.cwd(), 'dist/fonts/RedHatDisplay-Variable.ttf')
  ];

  for (const fontPath of candidatePaths) {
    if (fs.existsSync(fontPath)) {
      try {
        const fontBuffer = fs.readFileSync(fontPath);
        _fontBase64Cache = fontBuffer.toString('base64');
        return _fontBase64Cache;
      } catch (e) {
        // continue trying next path
      }
    }
  }

  console.warn('[LedgerTemplate] Could not locate RedHatDisplay-Variable.ttf font file.');
  return '';
};

export const generateLedgerHTML = (transactions: any[], dateRange: string, ownerProfile: any) => {
  const profile = ownerProfile?.json_value || {};
  
  // Totals
  const totalIncome = transactions.filter(t => t.credit > 0).reduce((sum, t) => sum + t.credit, 0);
  const totalExpense = transactions.filter(t => t.debit > 0).reduce((sum, t) => sum + t.debit, 0);
  const netBalance = totalIncome - totalExpense;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const fontBase64 = getRedHatDisplayBase64();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @font-face {
          font-family: 'Red Hat Display';
          src: url('data:font/truetype;base64,${fontBase64}') format('truetype');
          font-weight: 100 900;
          font-style: normal;
        }
        body { font-family: 'Red Hat Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.02em; }
        .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
        .meta { text-align: right; font-size: 12px; line-height: 1.5; color: #475569; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th { background: #f8fafc; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; font-weight: 700; color: #334155; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
        .text-right { text-align: right; }
        .text-green { color: #16a34a; font-weight: 600; }
        .text-red { color: #dc2626; font-weight: 600; }
        
        .summary-box { display: flex; gap: 15px; margin-bottom: 30px; justify-content: flex-end; }
        .box { background: #f8fafc; padding: 14px 18px; border-radius: 8px; width: 150px; border: 1px solid #e2e8f0; }
        .box-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; }
        .box-value { font-size: 15px; font-weight: 800; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">Financial Ledger</div>
          <div class="subtitle">Report Range: ${dateRange}</div>
        </div>
        <div class="meta">
          <strong>${profile.company_name || 'Company Name'}</strong><br>
          Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}
        </div>
      </div>

      <div class="summary-box">
        <div class="box">
            <div class="box-label">Total Income</div>
            <div class="box-value text-green">${formatCurrency(totalIncome)}</div>
        </div>
        <div class="box">
            <div class="box-label">Total Expenses</div>
            <div class="box-value text-red">${formatCurrency(totalExpense)}</div>
        </div>
        <div class="box" style="background: #eff6ff;">
            <div class="box-label">Net Balance</div>
            <div class="box-value">${formatCurrency(netBalance)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Ref #</th>
            <th class="text-right">Credit (In)</th>
            <th class="text-right">Debit (Out)</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td>${format(new Date(t.date), "dd MMM yyyy")}</td>
              <td>
                <div style="font-weight:500;">${t.description}</div>
                <div style="font-size:10px; color:#888;">${t.type}</div>
              </td>
              <td>${t.ref}</td>
              <td class="text-right text-green">${t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
              <td class="text-right text-red">${t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
};