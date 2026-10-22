import test from 'node:test';
import assert from 'node:assert/strict';
import { createFurniturePlan, PLAN_STORAGE_KEY } from '../src/furniture-plan.js';
import { STYLE_IDS } from '../src/design-styles.js';

const base = () => ({ position: [2, 0, 3], rotation: 0, scale: [1, 1, 1] });
const moved = (x = 4) => ({ ...base(), position: [x, 0, 3] });
const defaults = () => ({ sofa: base(), chair: { ...base(), position: [6, 0, 3] } });
function memoryStorage(initial = null) {
  let value = initial;
  const writes = [];
  return {
    getItem(key) { assert.equal(key, PLAN_STORAGE_KEY); return value; },
    setItem(key, text) { assert.equal(key, PLAN_STORAGE_KEY); value = text; writes.push(text); },
    get value() { return value; },
    writes,
  };
}
function setup(storage = memoryStorage()) {
  const plan = createFurniturePlan({ storage });
  plan.registerStyle('french', defaults());
  return { plan, storage };
}
const file = (styles = {}) => JSON.stringify({ version: 1, project: 'maison-housegpt', styles });

test('旧双风格存档沿用同一存储键，现代与宋韵从默认布局开始', () => {
  const saved = file({ french: { sofa: moved(5) }, italian: { chair: moved(9) } });
  const storage = memoryStorage(saved);
  const plan = createFurniturePlan({ storage });
  for (const style of STYLE_IDS) plan.registerStyle(style, defaults());
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(5));
  assert.deepEqual(plan.getTransform('italian', 'chair'), moved(9));
  for (const style of ['modern', 'song']) {
    assert.deepEqual(plan.getTransform(style, 'sofa'), base());
    assert.equal(plan.status(style).modified, false);
  }
  assert.equal(storage.value, saved, '读取旧存档不自动重写');
  plan.setTransform('song', 'sofa', moved(7));
  const reloaded = createFurniturePlan({ storage });
  for (const style of STYLE_IDS) reloaded.registerStyle(style, defaults());
  assert.deepEqual(reloaded.getTransform('song', 'sofa'), moved(7));
  assert.deepEqual(reloaded.getTransform('french', 'sofa'), moved(5));
  assert.deepEqual(reloaded.getTransform('italian', 'chair'), moved(9));
});

test('四风格导入分别恢复变换，切换注册和撤销重做不污染其他风格', () => {
  const storage = memoryStorage();
  const plan = createFurniturePlan({ storage });
  for (const style of STYLE_IDS) plan.registerStyle(style, defaults());
  const edits = Object.fromEntries(STYLE_IDS.map((style, index) => [style, {
    sofa: { ...moved(5 + index), rotation: (index + 1) * Math.PI / 8, scale: [1 + index / 10, 1, .9] },
  }]));
  let calls = 0;
  plan.importPlan(file(edits), { validate(resolved) {
    calls++;
    assert.deepEqual(Object.keys(resolved), STYLE_IDS);
    for (const style of STYLE_IDS) assert.deepEqual(resolved[style], { ...defaults(), ...edits[style] });
  } });
  assert.equal(calls, 1);
  for (const style of [...STYLE_IDS].reverse()) {
    plan.registerStyle(style, defaults());
    assert.deepEqual(plan.getTransform(style, 'sofa'), edits[style].sofa);
    assert.equal(plan.undo(style), true);
    assert.deepEqual(plan.getTransform(style, 'sofa'), base());
    for (const other of STYLE_IDS.filter(id => id !== style)) {
      assert.deepEqual(plan.getTransform(other, 'sofa'), edits[other].sofa);
    }
    assert.equal(plan.redo(style), true);
  }
  assert.deepEqual(JSON.parse(plan.serialize()).styles, edits);
  const reloaded = createFurniturePlan({ storage });
  reloaded.registerStyle('french', defaults());
  reloaded.setTransform('french', 'chair', moved(15));
  for (const style of ['italian', 'modern', 'song']) {
    assert.deepEqual(JSON.parse(storage.value).styles[style], edits[style], '未打开的风格存档不能丢失');
  }
});

test('宋韵中的未知家具使四风格导入整体失败，已有历史和存储均保留', () => {
  const storage = memoryStorage();
  const plan = createFurniturePlan({ storage });
  for (const style of STYLE_IDS) {
    plan.registerStyle(style, defaults());
    plan.setTransform(style, 'sofa', moved(6));
    plan.setTransform(style, 'sofa', moved(8));
    plan.undo(style);
  }
  const before = plan.serialize(), saved = storage.value, writes = storage.writes.length;
  assert.throws(() => plan.importPlan(file({
    french: { sofa: moved(9) }, italian: { sofa: moved(10) },
    modern: { sofa: moved(11) }, song: { ghost: moved(12) },
  })), /song.*不存在.*ghost/);
  assert.equal(plan.serialize(), before);
  assert.equal(storage.value, saved);
  assert.equal(storage.writes.length, writes);
  for (const style of STYLE_IDS) {
    assert.equal(plan.redo(style), true);
    assert.deepEqual(plan.getTransform(style, 'sofa'), moved(8));
  }
});

test('保存、重载和导出只包含实际修改，不包含默认家具和历史', () => {
  const { plan, storage } = setup();
  assert.equal(plan.setTransform('french', 'sofa', moved()), true);
  assert.equal(storage.writes.length, 1);
  assert.deepEqual(JSON.parse(plan.serialize()), {
    version: 1, project: 'maison-housegpt', styles: { french: { sofa: moved() }, italian: {}, modern: {}, song: {} },
  });
  const reloaded = createFurniturePlan({ storage });
  reloaded.registerStyle('french', defaults());
  assert.deepEqual(reloaded.getTransform('french', 'sofa'), moved());
  assert.deepEqual(reloaded.status('french'), {
    canUndo: false, canRedo: false, modified: true, saveState: 'saved',
  });
  reloaded.setTransform('french', 'sofa', base());
  assert.deepEqual(JSON.parse(reloaded.serialize()).styles.french, {});
  assert.equal(reloaded.status('french').modified, false);
});

test('未加载另一风格时，保存不会丢失另一风格存档', () => {
  const storage = memoryStorage(file({ italian: { sofa: moved(9) } }));
  const { plan } = setup(storage);
  plan.setTransform('french', 'chair', moved(5));
  assert.deepEqual(JSON.parse(storage.value).styles.italian, { sofa: moved(9) });
  plan.registerStyle('italian', defaults());
  assert.deepEqual(plan.getTransform('italian', 'sofa'), moved(9));
});

test('两种风格分别撤销重做，重新注册同一风格保留历史', () => {
  const { plan } = setup();
  plan.registerStyle('italian', defaults());
  plan.setTransform('french', 'sofa', moved(4));
  plan.setTransform('italian', 'sofa', moved(8));
  plan.registerStyle('french', defaults());
  assert.equal(plan.undo('french'), true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  assert.deepEqual(plan.getTransform('italian', 'sofa'), moved(8));
  assert.equal(plan.redo('french'), true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(4));
  assert.equal(plan.undo('italian'), true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(4));
});

test('拖动预览不改方案，结束时一次提交对应一次撤销', () => {
  const { plan, storage } = setup();
  const preview = plan.getTransform('french', 'sofa');
  for (let index = 0; index < 50; index++) preview.position[0] += 0.1;
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  assert.equal(storage.writes.length, 0);
  plan.setTransform('french', 'sofa', preview);
  assert.equal(storage.writes.length, 1);
  assert.equal(plan.undo('french'), true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  assert.equal(plan.undo('french'), false);
  assert.equal(plan.redo('french'), true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), preview);
});

test('读取值、默认值和传入变换均不会暴露内部可变引用', () => {
  const initial = defaults();
  const plan = createFurniturePlan({ storage: null });
  plan.registerStyle('french', initial);
  initial.sofa.position[0] = 20;
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  const next = moved();
  plan.setTransform('french', 'sofa', next);
  next.position[0] = 30;
  const retrieved = plan.getTransform('french', 'sofa');
  retrieved.position[0] = 35;
  retrieved.scale[0] = 2;
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved());
});

test('相同值和整周旋转不增加历史，不破坏已有重做', () => {
  const { plan, storage } = setup();
  assert.equal(plan.setTransform('french', 'sofa', { ...base(), rotation: Math.PI * 2 }), false);
  assert.equal(storage.writes.length, 0);
  plan.setTransform('french', 'sofa', moved());
  plan.undo('french');
  const writes = storage.writes.length;
  assert.equal(plan.setTransform('french', 'sofa', base()), false);
  assert.equal(storage.writes.length, writes);
  assert.equal(plan.status('french').canRedo, true);
  assert.equal(plan.redo('french'), true);
});

test('修改历史最多保留一百步，撤销后新编辑清空重做', () => {
  const { plan } = setup();
  for (let index = 1; index <= 105; index++) plan.setTransform('french', 'sofa', moved(index / 10));
  let count = 0;
  while (plan.undo('french')) count++;
  assert.equal(count, 100);
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(0.5));
  plan.setTransform('french', 'sofa', moved(10));
  assert.equal(plan.redo('french'), false);
  assert.equal(plan.undo('french'), true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(0.5));
});

test('导入同时更新两种风格，各风格可独立撤销和重做', () => {
  const { plan } = setup();
  plan.registerStyle('italian', defaults());
  plan.setTransform('french', 'sofa', moved(5));
  assert.equal(plan.importPlan(file({ french: { sofa: moved(8) }, italian: { chair: moved(12) } })), true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(8));
  assert.deepEqual(plan.getTransform('italian', 'chair'), moved(12));
  plan.undo('french');
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(5));
  assert.deepEqual(plan.getTransform('italian', 'chair'), moved(12));
  plan.undo('italian');
  assert.deepEqual(plan.getTransform('italian', 'chair'), defaults().chair);
  plan.redo('italian');
  assert.deepEqual(plan.getTransform('italian', 'chair'), moved(12));
});

test('缺省风格作为空方案导入，可清除已有修改并撤销', () => {
  const { plan } = setup();
  plan.setTransform('french', 'sofa', moved());
  plan.importPlan(file());
  assert.equal(plan.status('french').modified, false);
  plan.undo('french');
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved());
});

test('导入验证器收到已注册双风格的完整绝对变换，且已完成旋转归一化', () => {
  const { plan } = setup();
  const italianDefaults = { ...defaults(), sofa: moved(11) };
  plan.registerStyle('italian', italianDefaults);
  plan.setTransform('french', 'chair', moved(9));
  let calls = 0;
  plan.importPlan(file({
    french: { sofa: { ...moved(8), rotation: -Math.PI / 2 } },
    italian: { chair: moved(12) },
  }), {
    validate(resolvedStyles) {
      calls++;
      assert.deepEqual(resolvedStyles, {
        french: {
          sofa: { ...moved(8), rotation: Math.PI * 1.5 },
          chair: defaults().chair,
        },
        italian: { sofa: moved(11), chair: moved(12) },
      });
      assert.deepEqual(plan.getTransform('french', 'sofa'), base());
      assert.deepEqual(plan.getTransform('french', 'chair'), moved(9));
    },
  });
  assert.equal(calls, 1);
});

test('导入校验器抛错时存档和双风格历史保持原样', () => {
  const { plan, storage } = setup();
  plan.registerStyle('italian', defaults());
  for (const style of ['french', 'italian']) {
    plan.setTransform(style, 'sofa', moved(5));
    plan.setTransform(style, 'chair', moved(8));
    plan.undo(style);
  }
  const before = plan.serialize();
  const stored = storage.value;
  const writes = storage.writes.length;
  const statuses = Object.fromEntries(['french', 'italian'].map((style) => [style, plan.status(style)]));
  const blocked = new Error('家具与墙体相交。');
  assert.throws(() => plan.importPlan(file({
    french: { sofa: moved(10) },
    italian: { chair: moved(12) },
  }), {
    validate() { throw blocked; },
  }), (error) => error === blocked);
  assert.equal(plan.serialize(), before);
  assert.equal(storage.value, stored);
  assert.equal(storage.writes.length, writes);
  for (const style of ['french', 'italian']) {
    assert.deepEqual(plan.status(style), statuses[style]);
    assert.equal(plan.redo(style), true);
    assert.deepEqual(plan.getTransform(style, 'chair'), moved(8));
    assert.equal(plan.undo(style), true);
    assert.equal(plan.undo(style), true);
    assert.deepEqual(plan.getTransform(style, 'sofa'), base());
    assert.deepEqual(plan.getTransform(style, 'chair'), defaults().chair);
  }
});

test('导入验证器修改或持有完整方案副本不改变候选、默认值或最终存档', () => {
  const { plan, storage } = setup();
  let retained;
  plan.importPlan(file({ french: { sofa: moved(8) }, italian: { sofa: moved(12) } }), {
    validate(resolvedStyles) {
      retained = resolvedStyles;
      assert.deepEqual(Object.keys(resolvedStyles), ['french']);
      resolvedStyles.french.sofa.position[0] = 39;
      resolvedStyles.french.sofa.scale[0] = 9;
      resolvedStyles.french.chair.position[0] = 38;
      resolvedStyles.french.chair.rotation = 3;
      resolvedStyles.french.ghost = moved(15);
    },
  });
  retained.french.sofa.rotation = 2;
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved(8));
  assert.deepEqual(plan.getTransform('french', 'chair'), defaults().chair);
  assert.deepEqual(JSON.parse(storage.value).styles, {
    french: { sofa: moved(8) },
    italian: { sofa: moved(12) },
    modern: {},
    song: {},
  });
  plan.undo('french');
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  assert.deepEqual(plan.getTransform('french', 'chair'), defaults().chair);
});

test('导入格式与已注册家具编号校验失败时不调用额外验证器', () => {
  const { plan } = setup();
  plan.registerStyle('italian', defaults());
  let calls = 0;
  const validate = () => { calls++; };
  assert.throws(() => plan.importPlan('{', { validate }));
  assert.throws(() => plan.importPlan(file({
    french: { sofa: moved(8) }, italian: { ghost: moved(12) },
  }), { validate }));
  assert.equal(calls, 0);
});

test('有效但无变化的导入返回成功，不增加历史、写入或清除重做', () => {
  const { plan, storage } = setup();
  plan.setTransform('french', 'sofa', moved());
  plan.undo('french');
  const count = storage.writes.length;
  assert.equal(plan.importPlan(file()), true);
  assert.equal(storage.writes.length, count);
  assert.equal(plan.status('french').canUndo, false);
  assert.equal(plan.status('french').canRedo, true);
});

test('不兼容、非法数值、未知家具和危险键导入全部拒绝，状态与历史保持不变', () => {
  const { plan, storage } = setup();
  plan.registerStyle('italian', defaults());
  plan.setTransform('french', 'sofa', moved(5));
  plan.setTransform('french', 'chair', moved(6.5));
  plan.undo('french');
  const before = plan.serialize();
  const status = plan.status('french');
  const writes = storage.writes.length;
  const invalid = [
    '{',
    'null',
    JSON.stringify({ version: 2, project: 'maison-housegpt', styles: {} }),
    JSON.stringify({ version: 1, project: 'another-project', styles: {} }),
    file({ french: { ghost: moved() } }),
    file({ french: { sofa: moved(9) }, italian: { ghost: moved() } }),
    file({ french: { sofa: { ...base(), position: [1, '0', 3] } } }),
    file({ french: { sofa: { ...base(), position: [1, null, 3] } } }),
    file({ french: { sofa: { ...base(), position: [41, 0, 3] } } }),
    file({ french: { sofa: { ...base(), scale: [0, 1, 1] } } }),
    file({ french: { sofa: { ...base(), scale: [1, 11, 1] } } }),
    file({ french: { sofa: { ...base(), rotation: '1' } } }),
    file({ french: { sofa: { ...base(), other: 3 } } }),
    file({ unsupported: {} }),
    '{"version":1,"project":"maison-housegpt","styles":{"french":{"__proto__":{"polluted":true}}}}',
    '{"version":1,"project":"maison-housegpt","styles":{"constructor":{}}}',
    '{"version":1,"project":"maison-housegpt","styles":{"french":{"sofa":{"position":[2,0,3],"rotation":1e999,"scale":[1,1,1]}}}}',
  ];
  for (const text of invalid) {
    assert.throws(() => plan.importPlan(text), /方案|风格|家具|数值|字段|JSON/);
    assert.equal(plan.serialize(), before, text);
    assert.deepEqual(plan.status('french'), status, text);
    assert.equal(storage.writes.length, writes, text);
  }
  assert.equal({}.polluted, undefined);
  assert.equal(plan.redo('french'), true);
  assert.deepEqual(plan.getTransform('french', 'chair'), moved(6.5));
});

test('setTransform 严格校验有限数、向量长度和边界，负角度归一化', () => {
  const { plan, storage } = setup();
  const invalid = [
    { ...base(), rotation: Infinity },
    { ...base(), rotation: NaN },
    { ...base(), position: [-21, 0, 3] },
    { ...base(), position: [2, -11, 3] },
    { ...base(), position: [2, 21, 3] },
    { ...base(), position: [2, 0, -21] },
    { ...base(), position: [2, 0] },
    { ...base(), position: new Array(3) },
    { ...base(), scale: [0.01, 1, 1] },
    { ...base(), scale: [1, 1, Infinity] },
  ];
  for (const transform of invalid) assert.throws(() => plan.setTransform('french', 'sofa', transform));
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  plan.setTransform('french', 'sofa', {
    position: [-20, -10, 40], rotation: -Math.PI / 2, scale: [0.05, 10, 1],
  });
  assert.equal(plan.getTransform('french', 'sofa').rotation, Math.PI * 1.5);
});

test('坏存档不会被编辑自动覆盖，显式保存才允许覆盖', () => {
  const errors = [];
  const storage = memoryStorage('{invalid');
  const plan = createFurniturePlan({ storage, onStorageError: (error) => errors.push(error) });
  plan.registerStyle('french', defaults());
  assert.equal(plan.status('french').saveState, 'error');
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /原存档已保留/);
  plan.setTransform('french', 'sofa', moved());
  plan.undo('french');
  plan.redo('french');
  assert.equal(storage.value, '{invalid');
  assert.equal(storage.writes.length, 0);
  assert.equal(plan.save(), true);
  assert.equal(plan.status('french').saveState, 'saved');
  assert.deepEqual(JSON.parse(storage.value).styles.french.sofa, moved());
});

test('读取存储失败时保留本次编辑，允许显式保存重试', () => {
  const writes = [];
  const errors = [];
  const plan = createFurniturePlan({
    storage: {
      getItem() { throw new Error('SecurityError'); },
      setItem(key, text) { writes.push(text); },
    },
    onStorageError: (error) => errors.push(error),
  });
  plan.registerStyle('french', defaults());
  plan.setTransform('french', 'sofa', moved());
  assert.equal(writes.length, 0);
  assert.equal(errors.length, 1);
  assert.equal(plan.save(), true);
  assert.deepEqual(JSON.parse(writes[0]).styles.french.sofa, moved());
});

test('写入失败不会丢失编辑或历史，显式保存可恢复', () => {
  let shouldFail = true;
  const errors = [];
  const plan = createFurniturePlan({
    storage: {
      getItem() { return null; },
      setItem() { if (shouldFail) throw new Error('QuotaExceededError'); },
    },
    onStorageError: (error) => errors.push(error),
  });
  plan.registerStyle('french', defaults());
  plan.setTransform('french', 'sofa', moved());
  assert.equal(plan.status('french').saveState, 'error');
  assert.equal(plan.status('french').canUndo, true);
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved());
  assert.equal(errors.length, 1);
  shouldFail = false;
  assert.equal(plan.save(), true);
  assert.equal(plan.status('french').saveState, 'saved');
  plan.undo('french');
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
});

test('无可用存储仍可编辑、撤销并导出', () => {
  const { plan } = setup(null);
  plan.setTransform('french', 'sofa', moved());
  assert.equal(plan.status('french').saveState, 'unavailable');
  assert.equal(plan.save(), false);
  assert.deepEqual(JSON.parse(plan.serialize()).styles.french.sofa, moved());
  assert.equal(plan.undo('french'), true);
});

test('首次注册发现未知家具时只恢复该风格默认值，并保护原存档', () => {
  const original = file({ french: { ghost: moved(), sofa: moved(8) }, italian: { sofa: moved(7) } });
  const storage = memoryStorage(original);
  const errors = [];
  const plan = createFurniturePlan({ storage, onStorageError: (error) => errors.push(error) });
  plan.registerStyle('french', defaults());
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /不兼容/);
  plan.registerStyle('italian', defaults());
  assert.deepEqual(plan.getTransform('italian', 'sofa'), moved(7));
  plan.setTransform('french', 'chair', moved(10));
  assert.equal(storage.value, original);
  assert.equal(plan.save(), true);
  assert.deepEqual(JSON.parse(storage.value).styles.italian, { sofa: moved(7) });
  assert.deepEqual(JSON.parse(storage.value).styles.french, { chair: moved(10) });
});

test('另一风格未注册时可暂存导入，注册后验证家具编号', () => {
  const { plan } = setup();
  plan.importPlan(file({ italian: { sofa: moved(8) } }));
  plan.registerStyle('italian', defaults());
  assert.deepEqual(plan.getTransform('italian', 'sofa'), moved(8));
  assert.equal(plan.status('italian').canUndo, false);
});

test('另一风格存档的非法数值在初始读取时整体拒绝，不被后续编辑自动覆盖', () => {
  const original = file({
    french: { sofa: moved(8) },
    italian: { sofa: { ...base(), scale: [0, 1, 1] } },
  });
  const storage = memoryStorage(original);
  const errors = [];
  const plan = createFurniturePlan({ storage, onStorageError: (error) => errors.push(error) });
  plan.registerStyle('french', defaults());
  assert.deepEqual(plan.getTransform('french', 'sofa'), base());
  plan.setTransform('french', 'chair', moved(10));
  assert.equal(errors.length, 1);
  assert.equal(storage.value, original);
  assert.equal(plan.status('french').saveState, 'error');
});

test('非法默认值、风格和家具编号不会修改已有方案', () => {
  const { plan } = setup();
  plan.setTransform('french', 'sofa', moved());
  const before = plan.serialize();
  assert.throws(() => plan.registerStyle('french', { sofa: { ...base(), scale: [0, 1, 1] } }));
  assert.throws(() => plan.registerStyle('unsupported', defaults()));
  assert.throws(() => plan.setTransform('french', '__proto__', base()));
  assert.throws(() => plan.getTransform('french', 'ghost'));
  assert.equal(plan.serialize(), before);
  assert.deepEqual(plan.getTransform('french', 'sofa'), moved());
});

test('存储错误回调自身失败也不会阻断编辑', () => {
  const plan = createFurniturePlan({
    storage: memoryStorage('{broken'),
    onStorageError() { throw new Error('UI callback failed'); },
  });
  plan.registerStyle('french', defaults());
  assert.equal(plan.setTransform('french', 'sofa', moved()), true);
  assert.equal(plan.status('french').saveState, 'error');
});

test('localStorage getter 被禁用时安全降级，恢复权限后可显式重试', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = memoryStorage();
  let unavailable = true;
  const errors = [];
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      if (unavailable) throw new Error('SecurityError');
      return storage;
    },
  });
  try {
    const plan = createFurniturePlan({ onStorageError: (error) => errors.push(error) });
    plan.registerStyle('french', defaults());
    plan.setTransform('french', 'sofa', moved());
    assert.equal(errors.length, 1);
    assert.equal(plan.status('french').saveState, 'error');
    assert.equal(storage.writes.length, 0);
    unavailable = false;
    assert.equal(plan.save(), true);
    assert.deepEqual(JSON.parse(storage.value).styles.french.sofa, moved());
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
