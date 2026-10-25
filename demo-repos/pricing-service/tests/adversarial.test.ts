import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDiscount, calculateInvoiceTotal, validateDiscountCode } from '../src/pricing.ts';

describe('Adversarial Counterexample Hunter - Challenge Suite', () => {
  test('boundary vector: discount percentage exceeding 100% must throw RangeError', () => {
    assert.throws(
      () => calculateDiscount(100, 150),
      {
        name: 'RangeError',
        message: /Discount percentage must be between 0 and 100/
      },
      'Counterexample: Discount of 150% results in negative customer total (-$50) without validation!'
    );
  });

  test('boundary vector: negative price must throw RangeError', () => {
    assert.throws(
      () => calculateDiscount(-50, 10),
      {
        name: 'RangeError',
        message: /Price must be a non-negative number/
      },
      'Counterexample: Negative price (-$50) allows anomalous accounting totals!'
    );
  });

  test('malformed vector: NaN discount percentage must throw TypeError', () => {
    assert.throws(
      () => calculateDiscount(100, NaN),
      {
        name: 'TypeError',
        message: /Discount percentage must be a finite number/
      },
      'Counterexample: NaN propagates to invoice calculation!'
    );
  });

  test('malformed vector: Infinity discount percentage must throw TypeError', () => {
    assert.throws(
      () => calculateDiscount(100, Infinity),
      {
        name: 'TypeError',
        message: /Discount percentage must be a finite number/
      },
      'Counterexample: Infinity causes unbounded calculation!'
    );
  });

  test('malformed vector: NaN price must throw TypeError', () => {
    assert.throws(
      () => calculateDiscount(NaN, 20),
      {
        name: 'TypeError',
        message: /Price must be a finite number/
      },
      'Counterexample: NaN price corrupts accounting!'
    );
  });

  test('precision vector: fractional percentage calculates rounded cents correctly', () => {
    const result = calculateDiscount(99.99, 12.5);
    // 99.99 * 0.125 = 12.49875 -> 12.50 discount -> 87.49 final
    assert.equal(result.discountAmount, 12.5);
    assert.equal(result.finalPrice, 87.49);
  });

  test('security vector: malicious injection string in discount code does not crash', () => {
    const maliciousCodes = [
      "SUMMER'; DROP TABLE vouchers;--",
      '<script>alert(1)</script>',
      '../../etc/passwd',
      '__proto__'
    ];
    for (const code of maliciousCodes) {
      assert.equal(validateDiscountCode(code, 'standard'), 0);
    }
  });
});
