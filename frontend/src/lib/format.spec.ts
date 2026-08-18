import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format';

describe('formatDate', () => {
  it('formats an ISO date as "DD Mon YYYY"', () => {
    expect(formatDate('2026-06-03')).toBe('03 Jun 2026');
  });
});

describe('formatMoney', () => {
  it('prefixes the currency symbol and fixes two decimal places', () => {
    expect(formatMoney(2180, 'AU$')).toBe('AU$2,180.00');
  });

  it('adds thousands separators', () => {
    expect(formatMoney(1234567.5, 'US$')).toBe('US$1,234,567.50');
  });
});
