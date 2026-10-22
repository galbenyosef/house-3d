import { STYLE_IDS } from './design-styles.js';

export const PLAN_STORAGE_KEY = 'maison-housegpt:furniture-plan:v1';

const PROJECT = 'maison-housegpt';
const STYLES = STYLE_IDS;
const HISTORY_LIMIT = 100;
const TAU = Math.PI * 2;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const emptyEdits = () => Object.create(null);
const cloneTransform = (value) => ({
  position: [...value.position],
  rotation: value.rotation,
  scale: [...value.scale],
});
const cloneEdits = (edits) => Object.fromEntries(
  Object.entries(edits).map(([id, transform]) => [id, cloneTransform(transform)]),
);

function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function validateKeys(value, allowed, label) {
  if (!isRecord(value)) fail(`${label}必须是对象。`);
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key) || (allowed && !allowed.includes(key))) {
      fail(`${label}包含不支持的字段「${key}」。`);
    }
  }
}

function validateVector(value, ranges, label) {
  if (!Array.isArray(value) || value.length !== 3) fail(`${label}必须包含三个数值。`);
  return ranges.map(([min, max], index) => {
    const number = value[index];
    if (typeof number !== 'number' || !Number.isFinite(number) || number < min || number > max) {
      fail(`${label}第 ${index + 1} 项必须是 ${min} 到 ${max} 之间的有限数值。`);
    }
    return Object.is(number, -0) ? 0 : number;
  });
}

function validateTransform(value, label) {
  validateKeys(value, ['position', 'rotation', 'scale'], label);
  if (typeof value.rotation !== 'number' || !Number.isFinite(value.rotation)) {
    fail(`${label}的旋转角度必须是有限数值。`);
  }
  // 使用同一角度区间，避免转满一周产生多余历史记录。
  const remainder = value.rotation % TAU;
  const rotation = remainder < 0 ? remainder + TAU : remainder;
  return {
    position: validateVector(value.position, [[-20, 40], [-10, 20], [-20, 40]], `${label}的位置`),
    rotation: Object.is(rotation, -0) ? 0 : rotation,
    scale: validateVector(value.scale, [[0.05, 10], [0.05, 10], [0.05, 10]], `${label}的缩放`),
  };
}

function sameTransform(left, right) {
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  const angleDelta = Math.abs(left.rotation - right.rotation);
  return (close(angleDelta, 0) || close(angleDelta, TAU))
    && left.position.every((value, index) => close(value, right.position[index]))
    && left.scale.every((value, index) => close(value, right.scale[index]));
}

function sameEdits(left, right) {
  const ids = Object.keys(left);
  return ids.length === Object.keys(right).length
    && ids.every((id) => own(right, id) && sameTransform(left[id], right[id]));
}

function validateEdits(value, label) {
  validateKeys(value, null, label);
  const result = emptyEdits();
  for (const [id, transform] of Object.entries(value)) {
    if (!id.trim() || id.length > 200) fail(`${label}包含无效的家具编号。`);
    result[id] = validateTransform(transform, `${label}中的家具「${id}」`);
  }
  return result;
}

function parsePlan(text) {
  if (typeof text !== 'string') fail('方案文件必须是 JSON 文本。');
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    fail('方案不是有效的 JSON 文件。');
  }
  validateKeys(value, ['version', 'project', 'styles'], '方案');
  if (value.version !== 1 || value.project !== PROJECT) {
    fail('方案版本或项目不兼容，请选择 HouseGPT 导出的第 1 版方案。');
  }
  validateKeys(value.styles, STYLES, '方案风格');
  return Object.fromEntries(STYLES.map((style) => [
    style,
    own(value.styles, style) ? validateEdits(value.styles[style], `${style} 风格`) : emptyEdits(),
  ]));
}

function normalizeEdits(edits, defaults, style) {
  const normalized = emptyEdits();
  for (const [id, transform] of Object.entries(edits)) {
    if (!own(defaults, id)) fail(`${style} 风格的方案包含当前户型不存在的家具「${id}」。`);
    if (!sameTransform(transform, defaults[id])) normalized[id] = cloneTransform(transform);
  }
  return normalized;
}

/**
 * 家具方案只记录相对默认布置发生变化的绝对变换。
 * 拖动预览由场景处理，松手后调用一次 setTransform，即产生一条撤销记录。
 * onStorageError 接收 Error；save 返回保存是否成功，导入成功返回 true、失败抛错。
 * setTransform / undo / redo 返回是否实际改变了方案。
 */
export function createFurniturePlan({ storage, onStorageError } = {}) {
  const states = Object.fromEntries(STYLES.map((style) => [
    style, { defaults: null, edits: emptyEdits(), undo: [], redo: [] },
  ]));
  let storageTarget;
  let saveState = 'unavailable';
  let blockAutosave = false;

  function reportStorageError(message, cause) {
    saveState = 'error';
    const error = new Error(message, { cause });
    // 通知组件失败不应阻断家具操作，也不应破坏已完成的历史记录。
    try { onStorageError?.(error); } catch { /* 保留当前方案，继续本地编辑。 */ }
  }

  function stateFor(style, requireDefaults = false) {
    if (!STYLES.includes(style)) fail('不支持的装修风格。');
    const state = states[style];
    if (requireDefaults && !state.defaults) fail('请先载入该风格的默认家具。');
    return state;
  }

  function serialize() {
    return JSON.stringify({
      version: 1,
      project: PROJECT,
      styles: Object.fromEntries(STYLES.map((style) => [style, cloneEdits(states[style].edits)])),
    }, null, 2);
  }

  function persist(explicit = false) {
    if (!storageTarget && explicit && storage === undefined) {
      try {
        storageTarget = globalThis.localStorage;
      } catch (cause) {
        reportStorageError('此浏览器暂时无法访问方案存储，请导出方案备份后重试保存。', cause);
        return false;
      }
    }
    if (!storageTarget) {
      if (saveState !== 'error') saveState = 'unavailable';
      return false;
    }
    if (blockAutosave && !explicit) return false;
    try {
      storageTarget.setItem(PLAN_STORAGE_KEY, serialize());
      blockAutosave = false;
      saveState = 'saved';
      return true;
    } catch (cause) {
      reportStorageError('方案未能保存到此浏览器，请导出方案备份后重试保存。', cause);
      return false;
    }
  }

  function pushHistory(state) {
    state.undo.push(cloneEdits(state.edits));
    if (state.undo.length > HISTORY_LIMIT) state.undo.shift();
    state.redo = [];
  }

  try {
    storageTarget = storage === undefined ? globalThis.localStorage : storage;
    if (storageTarget) {
      if (typeof storageTarget.getItem !== 'function' || typeof storageTarget.setItem !== 'function') {
        fail('浏览器存储接口不可用。');
      }
      const saved = storageTarget.getItem(PLAN_STORAGE_KEY);
      if (saved !== null && saved !== undefined) {
        const loaded = parsePlan(saved);
        for (const style of STYLES) states[style].edits = loaded[style];
      }
      saveState = 'saved';
    }
  } catch (cause) {
    blockAutosave = true;
    reportStorageError('无法读取已保存的方案。原存档已保留；如需覆盖，请点击保存方案。', cause);
  }

  return {
    registerStyle(style, defaults) {
      const state = stateFor(style);
      const nextDefaults = validateEdits(defaults, `${style} 风格的默认家具`);
      // 先校验后注册，避免错误参数破坏已加载的风格。
      state.defaults = nextDefaults;
      try {
        state.edits = normalizeEdits(state.edits, nextDefaults, style);
        state.undo = state.undo.map((edits) => normalizeEdits(edits, nextDefaults, style));
        state.redo = state.redo.map((edits) => normalizeEdits(edits, nextDefaults, style));
      } catch (cause) {
        state.edits = emptyEdits();
        state.undo = [];
        state.redo = [];
        blockAutosave = true;
        reportStorageError(
          `${style} 风格存档与当前家具不兼容，已显示默认布置。原存档已保留；点击保存方案后才会覆盖。`,
          cause,
        );
      }
    },
    getTransform(style, id) {
      const state = stateFor(style, true);
      if (!own(state.defaults, id)) fail(`当前风格不存在家具「${id}」。`);
      return cloneTransform(own(state.edits, id) ? state.edits[id] : state.defaults[id]);
    },
    setTransform(style, id, transform) {
      const state = stateFor(style, true);
      if (!own(state.defaults, id)) fail(`当前风格不存在家具「${id}」。`);
      const next = validateTransform(transform, `家具「${id}」`);
      const current = own(state.edits, id) ? state.edits[id] : state.defaults[id];
      if (sameTransform(current, next)) return false;
      pushHistory(state);
      if (sameTransform(next, state.defaults[id])) delete state.edits[id];
      else state.edits[id] = next;
      persist();
      return true;
    },
    undo(style) {
      const state = stateFor(style, true);
      if (!state.undo.length) return false;
      state.redo.push(cloneEdits(state.edits));
      state.edits = state.undo.pop();
      persist();
      return true;
    },
    redo(style) {
      const state = stateFor(style, true);
      if (!state.redo.length) return false;
      state.undo.push(cloneEdits(state.edits));
      state.edits = state.redo.pop();
      persist();
      return true;
    },
    status(style) {
      const state = stateFor(style);
      return {
        canUndo: state.undo.length > 0,
        canRedo: state.redo.length > 0,
        modified: Object.keys(state.edits).length > 0,
        saveState,
      };
    },
    save() {
      return persist(true);
    },
    serialize,
    importPlan(text, { validate } = {}) {
      const parsed = parsePlan(text);
      const next = {};
      // 所有已加载风格完成校验后才更新，导入失败时不触碰任何历史或存储。
      for (const style of STYLES) {
        const state = states[style];
        next[style] = state.defaults ? normalizeEdits(parsed[style], state.defaults, style) : parsed[style];
      }
      if (validate !== undefined) {
        if (typeof validate !== 'function') fail('方案验证器必须是函数。');
        const resolvedStyles = Object.fromEntries(STYLES
          .filter((style) => states[style].defaults)
          .map((style) => [style, cloneEdits({ ...states[style].defaults, ...next[style] })]));
        // 校验器接收完整绝对变换的副本；抛错或修改副本均不能影响候选方案。
        validate(resolvedStyles);
      }
      let changed = false;
      for (const style of STYLES) {
        const state = states[style];
        if (sameEdits(state.edits, next[style])) continue;
        if (state.defaults) pushHistory(state);
        state.edits = next[style];
        changed = true;
      }
      if (changed) persist();
      return true;
    },
  };
}
