import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSignificantWords,
  isSimilarTitle,
  titleSimilarityScore,
} from '../lib/title-dedup';

test('extractSignificantWords ignores stop words and short tokens', () => {
  const words = extractSignificantWords('Presiden Prabowo dan Menteri Keuangan Rapat');
  assert.deepEqual(words, ['presiden', 'prabowo', 'menteri', 'keuangan', 'rapat']);
});

test('titleSimilarityScore detects near-duplicate headlines', () => {
  const score = titleSimilarityScore(
    'Prabowo Gelar Rapat dengan Menteri Keuangan',
    'Presiden Prabowo Rapat Bersama Menteri Keuangan'
  );
  assert.ok(score >= 0.6);
});

test('titleSimilarityScore ignores unrelated headlines', () => {
  const score = titleSimilarityScore(
    'Timnas Indonesia Menang 3-0',
    'Harga Emas Naik Signifikan Hari Ini'
  );
  assert.ok(score < 0.6);
});

test('isSimilarTitle matches against a batch of saved titles', () => {
  const batch = [
    'Prabowo Gelar Rapat dengan Menteri Keuangan',
    'Harga Emas Naik Signifikan Hari Ini',
  ];

  assert.equal(
    isSimilarTitle('Presiden Prabowo Rapat Bersama Menteri Keuangan', batch),
    true
  );
  assert.equal(
    isSimilarTitle('Timnas Indonesia Menang 3-0', batch),
    false
  );
});
