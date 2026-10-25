import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDiscount, calculateInvoiceTotal, validateDiscountCode } from '../src/pricing.ts';

describe('Pricing Service - Standard Suite', () => {
  test('calculates 20% discount on $100 correctly', () => {
    const result = calculateDiscount(100, 20);
    assert.equal(result.discountAmount, 20);
    assert.equal(result.finalPrice, 80);
  });

  test('calculates 0% discount correctly', () => {
    const result = calculateDiscount(50, 0);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.finalPrice, 50);
  });

  test('calculates 100% full discount correctly', () => {
    const result = calculateDiscount(200, 100);
    assert.equal(result.discountAmount, 200);
    assert.equal(result.finalPrice, 0);
  });

  test('calculates invoice total across multiple cart items', () => {
    const items = [
      { name: 'Mechanical Keyboard', price: 120, quantity: 1 },
      { name: 'Keycap Set', price: 40, quantity: 2 }
    ];
    // Subtotal: 120 + 80 = 200. Discount 10%: 20. Total: 180.
    const result = calculateInvoiceTotal(items, 10);
    assert.equal(result.subtotal, 200);
    assert.equal(result.discountTotal, 20);
    assert.equal(result.grandTotal, 180);
  });

  test('validates promotional discount codes', () => {
    assert.equal(validateDiscountCode('SUMMER20', 'standard'), 20);
    assert.equal(validateDiscountCode('VIP50', 'VIP'), 50);
    assert.equal(validateDiscountCode('VIP50', 'standard'), 0);
    assert.equal(validateDiscountCode('INVALID_CODE', 'standard'), 0);
  });

  // BASELINE DEFECT REPRODUCTION TEST:
  // In the baseline defective code, this test FAILS because calculateDiscount does not validate negative percentages!
  test('reproduce defect #104: negative discount must be rejected with RangeError', () => {
    assert.throws(
      () => calculateDiscount(100, -15),
      {
        name: 'RangeError',
        message: /Discount percentage must be between 0 and 100/
      },
      'Expected RangeError when negative discount percentage is provided'
    );
  });
});
