import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNumber, calculateAge } from '../src/utils/formatters.js';

test('compact counts use localized suffixes and omit trailing zeroes', () => {
    for (const [value, english, italian] of [
        [0, '0', '0'],
        [999, '999', '999'],
        [1000, '1K', '1 mila'],
        [1100, '1.1K', '1,1 mila'],
        [12500, '12.5K', '12,5 mila'],
        [1000000, '1M', '1 mln'],
        [1100000, '1.1M', '1,1 mln'],
        [12500000, '12.5M', '12,5 mln'],
        [1000000000, '1000M', '1000 mln'],
        [-1100, '-1.1K', '-1,1 mila'],
        [-1100000, '-1.1M', '-1,1 mln']
    ]) {
        assert.equal(formatNumber(value, 'en-US'), english);
        assert.equal(formatNumber(value, 'it-IT'), italian);
        assert.equal(formatNumber(value), italian);
    }
});

test('counts only advance after a complete step and do not promote units prematurely', () => {
    for (const [value, expected] of [
        [1099, '1K'],
        [1199, '1.1K'],
        [999999, '999.9K'],
        [1001000, '1M'],
        [1099999, '1M'],
        [1199999, '1.1M'],
        [-1099, '-1K']
    ]) assert.equal(formatNumber(value, 'en'), expected);
});

test('language aliases, decimals and invalid inputs remain predictable', () => {
    assert.equal(formatNumber(1100, 'IT-it'), '1,1 mila');
    assert.equal(formatNumber(1100, 'en'), '1.1K');
    assert.equal(formatNumber(1100, null), '1,1 mila');
    assert.equal(formatNumber(12.5, 'it'), '12,5');
    assert.equal(formatNumber(12.5, 'en'), '12.5');
    for (const value of [NaN, Infinity, -Infinity, null, undefined, '1000', {}, 1000n]) {
        assert.equal(formatNumber(value), '—');
    }
});

test('calculateAge computes correct age and handles edge cases', () => {
    assert.equal(calculateAge('1922-12-28', '2018-11-12'), 95);
    assert.equal(calculateAge('2000-01-01', '2026-01-01'), 26);
    assert.equal(calculateAge('2000-12-31', '2026-01-01'), 25);
    assert.equal(calculateAge(null), null);
    assert.equal(calculateAge(''), null);
    assert.equal(calculateAge('invalid-date'), null);
});
