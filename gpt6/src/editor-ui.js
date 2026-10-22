import './editor.css';
import { icon } from './icons.js';
import { getDesignStyle, STYLE_IDS } from './design-styles.js';

const STYLE_NAMES = Object.fromEntries(STYLE_IDS.map(id => [id, getDesignStyle(id).name]));
const radiansToDegrees = value => Math.round((value * 180 / Math.PI) * 10) / 10;
const isTextInput = target => target instanceof Element && !!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
const dialogIsOpen = () => [...document.querySelectorAll('dialog[open],.modal-backdrop:not([hidden]),[role="dialog"][aria-modal="true"]')].some(element => element.getClientRects().length > 0);

/**
 * Keep editor controls outside the canvas gesture surface. Scene owns changes,
 * history and persistence; this module renders its state and submits complete edits.
 */
export function mountFurnitureEditor({ house, toast = () => {}, onModeChange = () => {}, onChange = () => {} }) {
  const shell = document.querySelector('.app-shell');
  const inspector = document.querySelector('.inspector');
  if (!shell || !inspector) throw new Error('家具编辑界面未能找到场景容器。');

  const toolbar = document.createElement('section');
  toolbar.className = 'furniture-editor-toolbar';
  toolbar.setAttribute('aria-label', '家具编辑与方案保存');
  toolbar.innerHTML = `
    <div class="editor-toolbar-main">
        <button type="button" class="editor-toggle" data-editor-action="toggle" aria-pressed="false">
          <span class="editor-toggle-mark">${icon('edit')}${icon('check')}</span><span data-editor-toggle-label>布置家具</span>
        </button>
        <div class="editor-history" role="group" aria-label="家具编辑历史" hidden>
          <button type="button" data-editor-action="undo" title="撤销（Ctrl / ⌘ Z）" aria-label="撤销家具调整">${icon('undo')}</button>
          <button type="button" data-editor-action="redo" title="重做（Ctrl / ⌘ Shift Z）" aria-label="重做家具调整">${icon('redo')}</button>
        </div>
        <span class="editor-save-status" role="status" aria-live="polite">${icon('check')}<span class="editor-save-text"></span></span>
        <button type="button" class="editor-more" data-editor-action="menu" aria-label="方案选项" title="方案选项：保存、导入、导出" aria-expanded="false" aria-controls="editor-plan-menu"><span>方案</span>${icon('chevron','editor-menu-chevron')}</button>
    </div>
    <div class="editor-plan-menu" id="editor-plan-menu" aria-label="方案选项" hidden>
      <div class="editor-menu-header"><strong class="editor-menu-title"></strong><p class="editor-menu-status"></p></div>
      <div class="editor-storage-actions" role="group" aria-label="保存和导入方案">
        <button type="button" data-editor-action="save">${icon('save')}<span>保存方案</span></button>
        <button type="button" data-editor-action="export">${icon('download')}<span>导出方案</span><small>JSON</small></button>
        <button type="button" data-editor-action="import">${icon('upload')}<span>导入方案</span><small>JSON</small></button>
      </div>
      <p class="editor-storage-note">各风格独立保存至此浏览器</p>
      <p class="editor-help">高清全景展示原始布置</p>
    </div>
    <p class="editor-collision" role="status" aria-live="polite" hidden></p>
    <input class="editor-file-input" type="file" accept=".json,application/json" aria-label="选择家具方案 JSON 文件" hidden>
  `;
  document.querySelector('.panorama-entry').before(toolbar);
  shell.classList.add('has-furniture-editor');

  const form = document.createElement('form');
  form.className = 'furniture-editor-form';
  form.hidden = true;
  form.setAttribute('aria-label', '调整所选家具');
  form.innerHTML = `
    <fieldset>
      <legend>调整家具</legend>
      <div class="editor-dimensions">
        <label>宽度 <small>mm</small><input name="width" type="number" inputmode="decimal" min="5" max="15000" step="any" required></label>
        <label>进深 <small>mm</small><input name="depth" type="number" inputmode="decimal" min="5" max="15000" step="any" required></label>
        <label>高度 <small>mm</small><input name="height" type="number" inputmode="decimal" min="5" max="15000" step="any" required></label>
      </div>
      <div class="editor-rotation-row">
        <label>旋转角度 <small>°</small><input name="rotation" type="number" inputmode="decimal" min="-3600" max="3600" step="any" required></label>
        <div class="editor-rotation-buttons" role="group" aria-label="快速旋转家具">
          <button type="button" data-editor-action="rotate-left" aria-label="家具旋转负 15 度">−15°</button>
          <button type="button" data-editor-action="rotate-right" aria-label="家具旋转正 15 度">＋15°</button>
        </div>
      </div>
      <button class="editor-apply" type="submit">应用尺寸与角度</button>
      <p class="editor-form-note">尺寸按当前模型外包计算；修改后按“应用”生效。R 旋转 15°，Esc 取消选择。</p>
    </fieldset>
  `;
  inspector.querySelector('.inspector-dimension').insertAdjacentElement('afterend', form);
  inspector.classList.add('has-furniture-editor');

  const buttons = [...toolbar.querySelectorAll('button'), ...form.querySelectorAll('button')];
  const inputs = Object.fromEntries([...form.querySelectorAll('input')].map(input => [input.name, input]));
  const fileInput = toolbar.querySelector('.editor-file-input');
  const planMenu = toolbar.querySelector('.editor-plan-menu');
  const menuButton = toolbar.querySelector('[data-editor-action="menu"]');
  let current = house.getEditorState();
  let working = false;
  let destroyed = false;
  let previousSelection = null;

  function setMenuOpen(open, restoreFocus = false) {
    planMenu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    toolbar.dataset.menuOpen = String(open);
    if (!open && restoreFocus) menuButton.focus();
  }
  function closeOnOutside(event) {
    if (!toolbar.contains(event.target)) setMenuOpen(false);
  }
  function closeOnFocusOut(event) {
    if (!toolbar.contains(event.relatedTarget)) setMenuOpen(false);
  }

  function sync(state = house.getEditorState(), forceFields = false) {
    if (destroyed) return;
    current = state;
    const busy = working || !!state.busy;
    const editable = !!state.enabled;
    const selectionKey = state.selected ? `${state.style}:${state.selected.id}` : null;
    toolbar.dataset.editing = String(editable);
    toolbar.dataset.saveState = state.saveState;
    shell.classList.toggle('furniture-editing', editable);
    toolbar.querySelector('[data-editor-action="toggle"]').setAttribute('aria-pressed', String(editable));
    toolbar.querySelector('[data-editor-toggle-label]').textContent = editable ? '完成布置' : '布置家具';
    toolbar.querySelector('.editor-history').hidden = !editable;
    if (busy) setMenuOpen(false);
    const collisionNotice=toolbar.querySelector('.editor-collision');
    collisionNotice.hidden=!editable||!state.collision;
    collisionNotice.textContent=state.collision||'';
    const saveText = state.saveState === 'saved' ? '已保存到本机' : state.saveState === 'unavailable' ? '本机保存不可用，请导出 JSON' : state.saveState === 'error' ? '保存失败，请重试或导出 JSON' : '等待保存';
    const status=toolbar.querySelector('.editor-save-status');
    const fullStatus=`${STYLE_NAMES[state.style] || '当前风格'} · ${busy ? '正在处理…' : saveText}`;
    status.querySelector('.editor-save-text').textContent=busy?'处理中':state.saveState==='saved'?'已保存':state.saveState==='error'?'保存失败':'请备份';
    status.title=fullStatus;
    status.setAttribute('aria-label',fullStatus);
    toolbar.querySelector('.editor-menu-title').textContent=STYLE_NAMES[state.style] || '当前方案';
    toolbar.querySelector('.editor-menu-status').textContent=busy?'正在处理…':saveText;
    menuButton.dataset.needsAttention=String(state.saveState==='unavailable'||state.saveState==='error');
    toolbar.querySelector('.editor-storage-note').textContent = state.saveState === 'unavailable' || state.saveState === 'error'
      ? '请导出 JSON 备份当前方案'
      : '各风格独立保存至此浏览器';
    buttons.forEach(button => {
      const action = button.dataset.editorAction;
      button.disabled = busy || (action === 'undo' && (!editable || !state.canUndo)) || (action === 'redo' && (!editable || !state.canRedo));
    });
    form.hidden = !editable || !state.selected;
    form.querySelector('fieldset').disabled = busy || !editable || !state.selected;
    if (state.selected && (forceFields || selectionKey !== previousSelection || !form.contains(document.activeElement))) {
      const [width, height, depth] = state.selected.dimensions;
      inputs.width.value = String(Math.round(width * 1000));
      inputs.height.value = String(Math.round(height * 1000));
      inputs.depth.value = String(Math.round(depth * 1000));
      inputs.rotation.value = String(radiansToDegrees(state.selected.rotation));
    }
    previousSelection = selectionKey;
  }

  async function run(operation, successMessage, { modeChange = false, forceFields = false } = {}) {
    if (working || current.busy) return;
    working = true;
    sync();
    try {
      const result = await operation();
      if (result?.ok === false) {
        toast(result.message || result.error || '家具调整未能完成，请重试。');
        return;
      }
      const state = house.getEditorState();
      if (modeChange) onModeChange(state.enabled, state);
      onChange(state);
      if (successMessage && result !== false) toast(successMessage);
    } catch (error) {
      console.error('家具编辑失败', error);
      toast(error instanceof Error ? error.message : '家具调整未能完成，请重试。');
    } finally {
      working = false;
      sync(undefined, forceFields);
    }
  }

  function rotate(direction) {
    if (!current.enabled || !current.selected) return;
    return run(() => house.updateSelectedFurniture({ rotation: current.selected.rotation + direction * Math.PI / 12 }), null, { forceFields: true });
  }

  async function exportPlan() {
    const text = await house.exportPlan();
    if (typeof text !== 'string') throw new Error('方案文件暂未生成，请重试。');
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `MAISON-家具方案-${new Date().toLocaleDateString('sv-SE')}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function handleClick(event) {
    const button = event.target.closest('[data-editor-action]');
    if (!button || button.disabled) return;
    if (button.dataset.editorAction === 'menu') {
      setMenuOpen(planMenu.hidden);
      return;
    }
    if (planMenu.contains(button)) setMenuOpen(false, true);
    else setMenuOpen(false);
    switch (button.dataset.editorAction) {
      case 'toggle':
        run(() => house.setEditing(!current.enabled), null, { modeChange: true });
        break;
      case 'undo': run(() => house.undoFurniture(), null, { forceFields: true }); break;
      case 'redo': run(() => house.redoFurniture(), null, { forceFields: true }); break;
      case 'save': run(() => house.savePlan(), '方案已保存到本机浏览器'); break;
      case 'export': run(exportPlan, '方案 JSON 已导出'); break;
      case 'import': fileInput.click(); break;
      case 'rotate-left': rotate(-1); break;
      case 'rotate-right': rotate(1); break;
    }
  }
  function handleSubmit(event) {
    event.preventDefault();
    if (!current.enabled || !current.selected || !form.reportValidity()) return;
    // Display whole millimetres without silently rounding unchanged geometry
    // when the user only edits an angle or one of the three dimensions.
    const entered = [Number(inputs.width.value), Number(inputs.height.value), Number(inputs.depth.value)];
    const dimensions = entered.map((value, index) => value === Math.round(current.selected.dimensions[index] * 1000)
      ? current.selected.dimensions[index] : value / 1000);
    const enteredAngle = Number(inputs.rotation.value);
    const rotation = enteredAngle === radiansToDegrees(current.selected.rotation)
      ? current.selected.rotation : enteredAngle * Math.PI / 180;
    run(() => house.updateSelectedFurniture({ dimensions, rotation }), null, { forceFields: true });
  }
  function handleFileChange() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    run(async () => {
      if (file.size > 5 * 1024 * 1024) throw new Error('方案文件超过 5 MB，请选择导出的家具方案 JSON。');
      return house.importPlan(await file.text());
    }, '方案已导入，各风格的家具布置已恢复', { forceFields: true });
  }
  function handleKeyDown(event) {
    if (event.key === 'Escape' && !planMenu.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenuOpen(false, true);
      return;
    }
    if (event.defaultPrevented || event.isComposing || working || current.busy || !current.enabled || isTextInput(event.target) || dialogIsOpen() || shell.inert) return;
    const key = event.key.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;
    let action;
    if (modifier && !event.altKey && key === 'z') action = event.shiftKey ? 'redo' : 'undo';
    else if (modifier && !event.altKey && key === 'y') action = 'redo';
    else if (!modifier && !event.altKey && key === 'r' && current.selected) action = 'rotate';
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action === 'undo' && current.canUndo) run(() => house.undoFurniture(), null, { forceFields: true });
    if (action === 'redo' && current.canRedo) run(() => house.redoFurniture(), null, { forceFields: true });
    if (action === 'rotate' && !event.repeat) rotate(1);
  }

  toolbar.addEventListener('click', handleClick);
  form.addEventListener('click', handleClick);
  form.addEventListener('submit', handleSubmit);
  fileInput.addEventListener('change', handleFileChange);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('pointerdown', closeOnOutside, true);
  toolbar.addEventListener('focusout', closeOnFocusOut);
  sync();
  return {
    sync,
    destroy() {
      destroyed = true;
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('pointerdown', closeOnOutside, true);
      toolbar.removeEventListener('focusout', closeOnFocusOut);
      toolbar.remove();
      form.remove();
      inspector.classList.remove('has-furniture-editor');
      shell.classList.remove('has-furniture-editor', 'furniture-editing');
    },
  };
}
