import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ROOMS } from '../src/plan.js';
import { PANO_ROOMS, PANO_OF_ROOM, panoName } from '../src/pano.js';
import { STYLES } from '../src/styles.js';

const STYLE_IDS = Object.keys(STYLES);
const BEDROOMS = ROOMS.filter((r) => r.bedroom).map((r) => r.id).sort();
const file = (rel) => new URL(`../${rel}`, import.meta.url);

test('the plan has four bedrooms (四室两厅两卫)', () => {
  assert.deepEqual(BEDROOMS, ['bed1', 'bed2', 'bed3', 'tatami']);
});

test('every bedroom opens its own panorama', () => {
  const targets = BEDROOMS.map((id) => PANO_OF_ROOM[id]);
  assert.equal(new Set(targets).size, BEDROOMS.length, `bedrooms share a panorama: ${targets.join(', ')}`);
  for (const id of BEDROOMS) {
    assert.ok(PANO_ROOMS.some((p) => p.id === PANO_OF_ROOM[id]), `${id} → ${PANO_OF_ROOM[id]} is not a rendered room`);
  }
});

test('every plan room maps to a rendered panorama room with a name', () => {
  for (const r of ROOMS) {
    const pano = PANO_OF_ROOM[r.id];
    assert.ok(PANO_ROOMS.some((p) => p.id === pano), `${r.id} has no panorama mapping`);
    assert.ok(panoName(pano).length > 0, `${pano} has no display name`);
  }
});

test('panorama images exist for both styles (full + preview)', () => {
  for (const s of STYLE_IDS) {
    for (const p of PANO_ROOMS) {
      for (const suffix of ['', '-preview']) {
        const rel = `public/pano/${s}-${p.id}${suffix}.jpg`;
        assert.ok(existsSync(file(rel)), `missing ${rel}`);
      }
    }
  }
});

test('page copy counts four bedrooms', () => {
  const html = readFileSync(file('index.html'), 'utf8');
  assert.match(html, /四室两厅两卫/);
  assert.doesNotMatch(html, /三室|三居室/);
  for (const rel of ['src/ui.js', 'README.md', 'scripts/gen-spec.mjs', 'package.json']) {
    const text = readFileSync(file(rel), 'utf8');
    assert.doesNotMatch(text, /三室|三居室|3-bedroom/, `${rel} still says three bedrooms`);
  }
});
