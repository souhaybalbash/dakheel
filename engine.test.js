const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  impCap,
  shuffle,
  pickDecoy,
  chooseDecoy,
  caught,
  scheduleBlackout,
} = require('./engine.js');

test('impCap never allows an imposter majority', () => {
  assert.equal(impCap(3), 1);
  assert.equal(impCap(4), 1);
  assert.equal(impCap(5), 2);
  assert.equal(impCap(6), 2);
  assert.equal(impCap(14), 6);
  assert.equal(impCap(2), 1);
});

test('shuffle is Fisher–Yates: same members, not the same array', () => {
  const src = [0, 1, 2, 3, 4];
  const seq = [0.9, 0.1, 0.5, 0.2];
  let i = 0;
  const out = shuffle(src, () => seq[i++] ?? 0);
  assert.deepEqual(src, [0, 1, 2, 3, 4]);
  assert.equal(out.length, 5);
  assert.deepEqual([...out].sort((a, b) => a - b), src);
  assert.notDeepEqual(out, src);
});

test('pickDecoy never equals the secret word', () => {
  const pool = [{ t: 'بازين' }, { t: 'كسكسي' }, { t: 'بريك' }];
  const d = pickDecoy('بازين', pool, () => 0);
  assert.equal(d, 'كسكسي');
  assert.notEqual(d, 'بازين');
  assert.equal(pickDecoy('بازين', [{ t: 'بازين' }]), '');
});

test('chooseDecoy prefers authored decoy when it differs', () => {
  assert.equal(chooseDecoy('بازين', 'كسكسي', ['بازين', 'بريك']), 'كسكسي');
  assert.equal(chooseDecoy('بازين', 'بازين', ['بازين', 'بريك'], () => 0), 'بريك');
});

test('caught requires every vote to be an imposter and exact count', () => {
  const roles = ['citizen', 'imposter', 'citizen', 'imposter'];
  assert.equal(caught([1, 3], roles), true);
  assert.equal(caught([1], roles), false);
  assert.equal(caught([1, 0], roles), false);
  assert.equal(caught([], roles), false);
  assert.equal(caught([1], ['citizen', 'imposter', 'citizen']), true);
});

test('scheduleBlackout fires once in the second half with intensity odds', () => {
  assert.equal(scheduleBlackout({ enabled: false, discussTotal: 180 }), null);
  assert.equal(scheduleBlackout({ enabled: true, discussTotal: 1 }), null);

  const never = scheduleBlackout({
    enabled: true,
    discussTotal: 180,
    intensity: 'hadya',
    random: () => 0.99,
  });
  assert.equal(never, null);

  const fire = scheduleBlackout({
    enabled: true,
    discussTotal: 180,
    intensity: 'majnuna',
    random: () => 0,
  });
  assert.ok(fire >= 1 && fire <= 90);
});
