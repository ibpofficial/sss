export function formatRupees(amount: number, showSign: boolean = false): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const isNegative = rounded < 0;
  const absVal = Math.abs(rounded);
  
  // Format with Indian Numbering system (Lakhs, Thousands) or standard 2 decimals
  const parts = absVal.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Indian formatting: last 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  const formattedNum = `${formattedInteger}.${decimalPart}`;

  if (isNegative) {
    return `-₹${formattedNum}`;
  }
  if (showSign && rounded > 0) {
    return `+₹${formattedNum}`;
  }
  return `₹${formattedNum}`;
}

export function formatPercent(value: number, showSign: boolean = true): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  const sign = showSign && rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(2)}%`;
}

export function formatSeconds(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatUnits(qty: number): string {
  return `${(Math.round((qty + Number.EPSILON) * 100) / 100).toFixed(2)}`;
}
