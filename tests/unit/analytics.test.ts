import assert from 'node:assert/strict';
import { test } from 'node:test';
import { track } from '../../lib/analytics';

test('track is a no-op when gtag is not available', () => {
  assert.equal(typeof window, 'undefined');
  assert.doesNotThrow(() => track('route_open', { route_id: 'sample-route' }));
});
