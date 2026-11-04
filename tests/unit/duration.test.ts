import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from '../../lib/i18n';

test('durations retain seconds so rounded legs do not conflict with the total', () => {
  assert.equal(formatDuration(120, 'ko'), '2분');
  assert.equal(formatDuration(135, 'ko'), '2분 15초');
  assert.equal(formatDuration(649, 'ko'), '10분 49초');
  assert.equal(formatDuration(904, 'ko'), '15분 4초');
});
test('English durations support seconds minutes and hours', () => {
  assert.equal(formatDuration(135, 'en'), '2 min 15 s');
  assert.equal(formatDuration(3661, 'en'), '1 h 1 min 1 s');
});
test('missing or invalid duration is never converted to a zero time', () => {
  for (const seconds of [null, undefined, NaN, Infinity, -1]) {
    assert.equal(formatDuration(seconds, 'ko'), '계산 불가');
    assert.equal(formatDuration(seconds, 'en'), 'Unavailable');
  }
  assert.equal(formatDuration(0, 'ko'), '0초');
});
