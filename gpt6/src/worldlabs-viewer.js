let currentViewer = null;

// This asset is World Labs' public library example, not a generation of this home.
export async function openWorldLabsComparison({ onClose } = {}) {
  if (currentViewer) return currentViewer;
  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'wl-comparison';
  dialog.setAttribute('aria-labelledby', 'wl-comparison-title');
  dialog.setAttribute('aria-describedby', 'wl-comparison-description');
  dialog.innerHTML = `<style>
    .wl-comparison{box-sizing:border-box;position:fixed;inset:0;width:min(1180px,96vw);height:min(850px,94dvh);max-width:none;max-height:none;margin:auto;padding:0;border:1px solid #72685b;border-radius:10px;background:#211e1a;color:#f1eade;font:14px/1.6 system-ui,sans-serif;overflow:hidden;box-shadow:0 24px 90px #0009}
    .wl-comparison::backdrop{background:#14120ee0;backdrop-filter:blur(5px)}
    .wl-comparison *{box-sizing:border-box}
    .wl-comparison .wl-shell{display:grid;grid-template-rows:auto minmax(0,1fr) auto;height:100%;min-height:0}
    .wl-comparison .wl-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;border-bottom:1px solid #52493d}
    .wl-comparison .wl-kicker{display:block;font-size:10px;letter-spacing:2px;color:#b6a487}
    .wl-comparison h2{margin:3px 0 0;font-size:19px;font-weight:500;color:#f1eade;letter-spacing:.3px}
    .wl-comparison button,.wl-comparison a{font:inherit}
    .wl-comparison button{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:9px 14px;border:1px solid #827363;border-radius:5px;background:#322d25;color:#f1eade;cursor:pointer}
    .wl-comparison button:hover{background:#4d4334}
    .wl-comparison button:focus-visible,.wl-comparison a:focus-visible,.wl-comparison canvas:focus-visible{outline:2px solid #ddc49a;outline-offset:-3px}
    .wl-comparison .wl-close{flex:0 0 auto;font-size:24px;padding:4px 12px}
    .wl-comparison .wl-stage{position:relative;min-height:0;overflow:hidden;background:#181511}
    .wl-comparison canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
    .wl-comparison canvas:active{cursor:grabbing}
    .wl-comparison .wl-loading{position:absolute;inset:0;display:grid;place-content:center;gap:10px;padding:26px;text-align:center;background:#211e1a;color:#d3c6b1;z-index:2}
    .wl-comparison .wl-loading[hidden]{display:none}
    .wl-comparison .wl-loading strong{font-weight:500;font-size:18px;color:#f1eade}
    .wl-comparison .wl-loading span{font-size:12px}
    .wl-comparison .wl-badge{position:absolute;left:16px;top:16px;pointer-events:none;padding:6px 10px;background:#1c1915d9;border:1px solid #99825d80;border-radius:4px;color:#f1eade;font-size:11px}
    .wl-comparison .wl-controls{position:absolute;right:14px;bottom:14px;display:flex;gap:7px}
    .wl-comparison .wl-controls button{background:#211e1ae8}
    .wl-comparison .wl-footer{padding:14px 22px 17px;border-top:1px solid #52493d;background:#27221c}
    .wl-comparison .wl-footer p{margin:0;color:#ded3c1;font:12px/1.75 system-ui,sans-serif}
    .wl-comparison .wl-footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;color:#b9ac95;font-size:11px}
    .wl-comparison a{color:#ddc49a;text-underline-offset:3px}
    @media(max-width:600px){.wl-comparison{width:100%;height:100dvh;border:0;border-radius:0}.wl-comparison .wl-header{padding:calc(10px + env(safe-area-inset-top)) 14px 10px}.wl-comparison h2{font-size:15px;line-height:1.5}.wl-comparison .wl-kicker{font-size:9px;letter-spacing:1.5px}.wl-comparison .wl-footer{padding:11px 14px calc(12px + env(safe-area-inset-bottom))}.wl-comparison .wl-footer-bottom{align-items:flex-start;flex-direction:column;gap:5px}.wl-comparison .wl-badge{left:10px;top:10px;font-size:10px}.wl-comparison .wl-controls{right:10px;bottom:10px}}
    @media(max-height:480px){.wl-comparison{width:100%;height:100dvh;border:0;border-radius:0}.wl-comparison .wl-header{padding:7px 14px}.wl-comparison .wl-kicker{display:none}.wl-comparison .wl-footer{padding:8px 14px}.wl-comparison .wl-footer-bottom{margin-top:2px;flex-direction:row}.wl-comparison .wl-footer p{font-size:11px}}
  </style><div class="wl-shell">
    <header class="wl-header"><div><span class="wl-kicker">WORLD LABS / MARBLE · SPARK</span><h2 id="wl-comparison-title">官方图书馆样例 · 非本户型</h2></div><button class="wl-close" aria-label="关闭 World Labs 对比">×</button></header>
    <div class="wl-stage"><div class="wl-loading" role="status"><strong>正在载入空间样例</strong><span>首次加载约 7.7 MB · 500,000 个高斯点</span></div><span class="wl-badge">World Labs 官方图书馆样例 · 非本户型</span><div class="wl-controls"><button data-wl="left" aria-label="左移视点观察视差">←</button><button data-wl="right" aria-label="右移视点观察视差">→</button><button data-wl="out" aria-label="缩小">−</button><button data-wl="in" aria-label="放大">＋</button><button data-wl="reset">重置视角</button></div></div>
    <footer class="wl-footer"><p id="wl-comparison-description">这是 World Labs 公开的图书馆空间，用于体验另一种渲染方式。尚未用你的户型生成，不能据此判断你的房子效果或施工尺寸。</p><div class="wl-footer-bottom"><span>拖动环顾 · 双指缩放 · ← → 微移视点观察视差</span><a href="https://docs.worldlabs.ai/marble/export/specs" target="_blank" rel="noopener noreferrer">查看官方样例来源 ↗</a></div></footer>
  </div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  const stage = dialog.querySelector('.wl-stage');
  const loading = dialog.querySelector('.wl-loading');
  const closeButton = dialog.querySelector('.wl-close');
  const aborter = new AbortController();
  let renderer, spark, mesh, camera, scene, resizeObserver;
  let closed = false, ready = false, yaw = 0, pitch = 0, fov = 68;
  let renderedFrames = 0, pinchDistance = 0, offset = 0, raf = 0, dirtyFrames = 0;
  const pointers = new Map();
  const api = {
    close,
    getState: () => ({ source: 'World Labs official library example', isUserHome: false, ready, closed, splats: mesh?.numSplats || 0, fov, yaw, pitch, offset, renderedFrames }),
  };
  currentViewer = api;
  const listen = (element, type, handler, options = {}) => element.addEventListener(type, handler, { ...options, signal: aborter.signal });
  function invalidate() {
    if (closed) return;
    dirtyFrames = 6;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame() {
    raf = 0;
    if (closed || !renderer || document.hidden) return;
    renderer.render(scene, camera);
    renderedFrames++;
    if (renderedFrames > 2) loading.hidden = true;
    if (--dirtyFrames > 0) raf = requestAnimationFrame(frame);
  }
  function disposeRendering() {
    cancelAnimationFrame(raf); raf = 0;
    renderer?.setAnimationLoop(null);
    resizeObserver?.disconnect();
    spark?.dispose();
    mesh?.dispose();
    scene?.clear();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer = spark = mesh = camera = scene = null;
  }
  function close() {
    if (closed) return;
    closed = true;
    ready = false;
    aborter.abort();
    pointers.clear();
    disposeRendering();
    dialog.close();
    dialog.remove();
    currentViewer = null;
    onClose?.();
    previousFocus?.focus();
  }
  function updateCamera() {
    if (!camera) return;
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
    fov = Math.max(34, Math.min(90, fov));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.position.x = offset;
    camera.fov = fov;
    camera.updateProjectionMatrix();
    invalidate();
  }
  function reset() { yaw = 0; pitch = 0; fov = 68; offset = 0; updateCamera(); }
  listen(closeButton, 'click', close);
  listen(dialog, 'cancel', event => { event.preventDefault(); close(); });
  listen(dialog, 'click', event => { if (event.target === dialog) close(); });
  listen(document, 'keydown', event => {
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'ArrowLeft') yaw += .06;
      if (event.key === 'ArrowRight') yaw -= .06;
      if (event.key === 'ArrowUp') pitch += .05;
      if (event.key === 'ArrowDown') pitch -= .05;
      if (event.key === '+' || event.key === '=') fov -= 4;
      if (event.key === '-') fov += 4;
      if (event.key === 'Home') reset();
      updateCamera();
    }
  }, { capture: true });
  dialog.querySelectorAll('[data-wl]').forEach(button => listen(button, 'click', () => {
    if (button.dataset.wl === 'reset') reset();
    else if (['left', 'right'].includes(button.dataset.wl)) { offset = Math.max(-.3, Math.min(.3, offset + (button.dataset.wl === 'left' ? -.15 : .15))); updateCamera(); }
    else { fov += button.dataset.wl === 'in' ? -7 : 7; updateCamera(); }
  }));
  closeButton.focus();

  try {
    const [{ SparkRenderer, SplatMesh }, THREE, response] = await Promise.all([
      import('@sparkjsdev/spark'), import('three'),
      // Keep the third-party example on its official CDN; it is not a repository asset.
      fetch('https://wlt-ai-cdn.art/example_exports/elegant_library_with_fireplace/elegant_library_with_fireplace_500k.spz', { signal: aborter.signal }),
    ]);
    if (closed) return api;
    if (!response.ok) throw new Error(`Sample request failed: ${response.status}`);
    const fileBytes = new Uint8Array(await response.arrayBuffer());
    if (closed) return api;
    loading.querySelector('span').textContent = '正在解析 500,000 个高斯点…';
    const loadedMesh = new SplatMesh({ fileBytes, fileName: 'elegant-library-500k.spz', raycastable: false, editable: false });
    try { await loadedMesh.initialized; } catch (error) { loadedMesh.dispose(); throw error; }
    if (closed) { loadedMesh.dispose(); return api; }
    mesh = loadedMesh;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#181511');
    camera = new THREE.PerspectiveCamera(fov, 1, .03, 100);
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth <= 700 ? 1.4 : 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    spark = new SparkRenderer({ renderer, onDirty: invalidate });
    scene.add(spark);
    mesh.rotation.x = Math.PI;
    scene.add(mesh);
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'World Labs 官方图书馆三维样例，可拖动环顾和双指缩放');
    stage.prepend(canvas);
    const resize = () => {
      if (!renderer) return;
      const { width, height } = stage.getBoundingClientRect();
      camera.aspect = width / Math.max(1, height);
      renderer.setSize(width, height, false);
      updateCamera();
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();
    listen(canvas, 'pointerdown', event => {
      event.preventDefault(); canvas.focus(); canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      pinchDistance = pointerDistance();
    });
    listen(canvas, 'pointermove', event => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      event.preventDefault();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        yaw += (event.clientX - previous.x) * .0035;
        pitch += (event.clientY - previous.y) * .0035;
      } else {
        const distance = pointerDistance();
        if (distance > 0 && pinchDistance > 0) fov *= pinchDistance / distance;
        pinchDistance = distance;
      }
      updateCamera();
    });
    const release = event => { pointers.delete(event.pointerId); pinchDistance = pointerDistance(); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => listen(canvas, type, release));
    listen(canvas, 'wheel', event => { event.preventDefault(); fov += event.deltaY * .035; updateCamera(); }, { passive: false });
    listen(canvas, 'contextmenu', event => event.preventDefault());
    function pointerDistance() {
      if (pointers.size < 2) return 0;
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    listen(document, 'visibilitychange', () => { if (!document.hidden) invalidate(); });
    invalidate();
    ready = true;
  } catch (error) {
    if (!closed) {
      console.error('World Labs sample viewer failed', error);
      disposeRendering();
      loading.querySelector('strong').textContent = '样例暂时无法显示';
      loading.querySelector('span').textContent = '可以关闭后重试，或通过下方链接查看官方样例。';
    }
  }
  return api;
}
