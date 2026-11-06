import assert from 'node:assert/strict';
import test from 'node:test';
import { formatNumber, formatDate, calculateAge, dedupeCrew } from '../src/utils/formatters.js';

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

test('dedupeCrew deduplicates crew members by id or trimmed lowercase name', () => {
    const list = [
        { id: 1, name: 'Alice' },
        { id: 1, name: 'Alice Duplicate ID' },
        { id: 2, name: 'Bob' },
        { name: 'Charlie' },
        { name: '  charlie  ' },
        { name: '' },
        null
    ];
    const deduped = dedupeCrew(list);
    assert.deepEqual(deduped, [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { name: 'Charlie' }
    ]);
    assert.deepEqual(dedupeCrew(null), []);
    assert.deepEqual(dedupeCrew(undefined), []);
});

test('calendar strings preserve their date across time zones and year-only strings remain years', () => {
  assert.equal(formatDate('2000-01-01','en-US'),'January 1, 2000');
  assert.equal(formatDate('2000','en-US'),'2000');
  assert.equal(formatDate('not-a-date','en-US'),'not-a-date');
  assert.equal(formatDate(null),'—');
});

test('dates accept Date objects and timestamps, including the Unix epoch', () => {
  const options={timeZone:'UTC'};
  assert.equal(formatDate(new Date('2000-01-01T00:00:00Z'),'en-US',options),'January 1, 2000');
  assert.equal(formatDate(0,'en-US',options),'January 1, 1970');
  assert.equal(formatDate(2000,'en-US',options),'January 1, 1970');
});

test('age accepts string, Date and timestamp inputs and handles birthday boundaries', () => {
  for (const birth of ['2000-06-15',new Date('2000-06-15T00:00:00Z'),Date.parse('2000-06-15T00:00:00Z')]) {
    assert.equal(calculateAge(birth,'2020-06-14'),19);
    assert.equal(calculateAge(birth,new Date('2020-06-15T00:00:00Z')),20);
    assert.equal(calculateAge(birth,Date.parse('2020-06-16T00:00:00Z')),20);
  }
  assert.equal(calculateAge(0,'2020-01-01'),50);
  assert.equal(calculateAge('1960-01-01',0),10);
  assert.equal(calculateAge('2030-01-01','2020-01-01'),null);
  assert.equal(calculateAge('invalid','2020-01-01'),null);
  assert.equal(calculateAge(null),null);
});
