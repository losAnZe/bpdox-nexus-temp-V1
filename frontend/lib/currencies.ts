// frontend/lib/currencies.ts

export interface Currency {
  code: string;
  name: string;
  symbol: string; // Standard symbol/code (e.g., AUD, SGD, US$, CAD, ₹, €, £, AED)
  locale: string; // For formatting numbers
}

export const AVAILABLE_CURRENCIES: Currency[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', name: 'US Dollar', symbol: 'US$', locale: 'en-US' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CAD', locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AUD', locale: 'en-AU' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'SGD', locale: 'en-SG' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', locale: 'ar-AE' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
];

export const getCurrencySymbol = (code: string) => {
  if (!code) return '₹';
  const found = AVAILABLE_CURRENCIES.find(
    (c) => c.code.toLowerCase() === code.toLowerCase() || c.symbol.toLowerCase() === code.toLowerCase()
  );
  return found ? found.symbol : code;
};

export const formatMoneyWithCurrency = (amount: number | string, currencyCodeOrSymbol: string = 'INR') => {
  const val = Number(amount) || 0;
  const numStr = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);

  const symbol = getCurrencySymbol(currencyCodeOrSymbol);
  return `${symbol} ${numStr}`;
};