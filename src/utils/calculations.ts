/**
 * Pure monetary calculations with safe rounding for Indian Rupees (paise precision)
 */

export function roundPaise(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function roundQuantity(qty: number): number {
  return Math.round((qty + Number.EPSILON) * 10000) / 10000;
}

export function calculateFee(grossAmount: number, feePercent: number): number {
  return roundPaise(grossAmount * (feePercent / 100));
}

export function calculateExecutionPrice(
  quotedPrice: number,
  side: 'BUY' | 'SELL',
  slippagePercent: number
): number {
  if (slippagePercent <= 0) return quotedPrice;
  // Buyers pay slightly more, sellers receive slightly less
  const factor = side === 'BUY' ? 1 + slippagePercent / 100 : 1 - slippagePercent / 100;
  return roundPaise(quotedPrice * factor);
}

export function calculateRealizedPnL(
  sellQuantity: number,
  executionPrice: number,
  averageCostBasis: number,
  fee: number
): number {
  const grossProceeds = sellQuantity * executionPrice;
  const netProceeds = grossProceeds - fee;
  const allocatedCost = sellQuantity * averageCostBasis;
  return roundPaise(netProceeds - allocatedCost);
}

export function calculateUnrealizedPnL(
  holdingsQuantity: number,
  currentPrice: number,
  averageCostBasis: number
): number {
  if (holdingsQuantity <= 0) return 0;
  return roundPaise(holdingsQuantity * (currentPrice - averageCostBasis));
}

export function calculateMovingAverage(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const slice = prices.slice(-period);
  const sum = slice.reduce((acc, p) => acc + p, 0);
  return roundPaise(sum / slice.length);
}
