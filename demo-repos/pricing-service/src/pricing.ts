/**
 * Checkout Pricing & Discount Calculation Engine
 * 
 * OpenGuard Demo Repository: Contains intentional boundary and validation defects
 * to demonstrate the Trust Collapse Engine and Adversarial Counterexample Loop.
 */

export interface DiscountResult {
  discountAmount: number;
  finalPrice: number;
}

export interface InvoiceItem {
  name: string;
  price: number;
  quantity: number;
}

export interface InvoiceTotal {
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
}

/**
 * Calculates discount for a given price and percentage.
 * 
 * DEFECT NOTE: In the baseline state, this function lacks validation:
 * - Does not check for negative discount percentages (e.g. -20% gives a negative discount, increasing the price!)
 * - Does not check for discounts > 100% (e.g. 150% discount gives negative final price, paying the customer!)
 * - Does not validate that price is non-negative
 * - Does not check for NaN or Infinity
 */
export function calculateDiscount(price: number, discountPercent: number): DiscountResult {
  // DELIBERATE DEFECTIVE BASELINE:
  const discountAmount = price * (discountPercent / 100);
  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    finalPrice: Math.round((price - discountAmount) * 100) / 100
  };
}

/**
 * Calculates invoice total across multiple cart items.
 */
export function calculateInvoiceTotal(items: InvoiceItem[], discountPercent: number): InvoiceTotal {
  if (!Array.isArray(items)) {
    throw new TypeError('Items must be an array');
  }

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = calculateDiscount(subtotal, discountPercent);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: discount.discountAmount,
    grandTotal: discount.finalPrice
  };
}

/**
 * Validates promotional discount code and returns tier discount rate.
 */
export function validateDiscountCode(code: string, userTier: string): number {
  if (typeof code !== 'string') {
    throw new TypeError('Discount code must be a string');
  }

  const cleanCode = code.trim().toUpperCase();
  if (cleanCode === 'SUMMER20') return 20;
  if (cleanCode === 'VIP50' && userTier === 'VIP') return 50;
  if (cleanCode === 'WELCOME10') return 10;
  if (cleanCode === 'CLEARANCE100') return 100;

  return 0;
}
