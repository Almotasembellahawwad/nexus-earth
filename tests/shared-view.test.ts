import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeView, encodeView, type SharedView } from '../src/lib/shared-view';
import { DEFAULT_FILTERS } from '../src/lib/filters';
test('shared views preserve filters, camera, country and replay time', () => {
  const view: SharedView = {
    filters: {
      ...DEFAULT_FILTERS,
      types: ['earthquake'],
      hours: 168,
      region: 'Asia',
      query: 'Japan',
    },
    cursor: 45,
    anchor: Date.now(),
    camera: [0, 0, 3],
    country: 'JP',
    grid: false,
  };
  assert.deepEqual(decodeView(encodeView(view)), view);
});
test('malformed and unsupported shared views do not override workspace defaults', () => {
  for (const raw of [
    '{',
    'null',
    '{}',
    JSON.stringify({ v: 2, filters: DEFAULT_FILTERS }),
    JSON.stringify({ v: 1, filters: { ...DEFAULT_FILTERS, types: ['invalid'] }, cursor: 100 }),
    JSON.stringify({ v: 1, filters: { ...DEFAULT_FILTERS, hours: -1 }, cursor: 100 }),
  ])
    assert.equal(decodeView(raw), null);
});
test('unsafe camera positions and future anchors are discarded', () => {
  const view = decodeView(
    JSON.stringify({
      v: 1,
      filters: DEFAULT_FILTERS,
      cursor: 50,
      camera: [0, 0, 0],
      anchor: Date.now() + 100000,
      country: 'invalid',
    }),
  );
  assert.ok(view);
  assert.equal(view.camera, undefined);
  assert.equal(view.anchor, undefined);
  assert.equal(view.country, undefined);
});
