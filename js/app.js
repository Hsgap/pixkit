/**
 * PixKit - Production Application Controller with Magic UI Animated Theme Toggler
 */

document.addEventListener('DOMContentLoaded', () => {
  const engine = window.pixkitEngine;
  let currentView = 'home';
  let activeTool = null;
  let hasUserAddedImage = false;

  // Initialize theme from localStorage or system preference
  const savedTheme = localStorage.getItem('pixkit-theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  // Initialize Magic UI Kinetic Text & Aceternity 3D Card
  initKineticText();
  init3DCardEffect();

  // ==============================================================
  // MAGIC UI KINETIC TEXT ANIMATION (Official Magic UI Component Engine)
  // ==============================================================
  function initKineticText() {
    const title = document.getElementById('hero-kinetic-title');
    if (!title) return;

    const lines = title.querySelectorAll('.kinetic-line');
    if (!lines.length) return;

    lines.forEach(line => {
      const text = line.textContent.trim();
      line.innerHTML = '';

      // Direct sibling characters as in Magic UI registry component
      text.split('').forEach(letter => {
        const span = document.createElement('span');
        span.className = 'kinetic-char';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = letter === ' ' ? '\u00A0' : letter;
        line.appendChild(span);
      });
    });
  }

  // ==============================================================
  // ACETERNITY UI 3D CARD EFFECT (Interactive 3D Perspective Tilt)
  // ==============================================================
  function init3DCardEffect() {
    const container = document.getElementById('hero-3d-card-container');
    const cardBody = document.getElementById('hero-3d-card-body');
    const glare = document.getElementById('hero-card-glare');
    if (!container || !cardBody) return;

    let bounds = null;

    function onPointerEnter() {
      bounds = container.getBoundingClientRect();
      cardBody.style.transition = 'transform 0.12s ease-out';
      if (glare) glare.style.opacity = '1';
    }

    function onPointerMove(e) {
      if (!bounds) bounds = container.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;

      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;

      // Realistic 3D rotational tilt angle
      const rotateX = ((y - centerY) / centerY) * -18;
      const rotateY = ((x - centerX) / centerX) * 18;

      cardBody.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;

      if (glare) {
        const glareX = (x / bounds.width) * 100;
        const glareY = (y / bounds.height) * 100;
        glare.style.background = `radial-gradient(circle 280px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.35), transparent 70%)`;
      }
    }

    function onPointerLeave() {
      bounds = null;
      cardBody.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      cardBody.style.transform = 'rotateX(0deg) rotateY(0deg)';
      if (glare) glare.style.opacity = '0';
    }

    container.addEventListener('pointerenter', onPointerEnter);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);
  }

  window.updateHeroPreview = function() {
    const imgEl = document.getElementById('hero-preview-img');
    const artworkEl = document.getElementById('hero-sample-artwork');
    if (!imgEl || !artworkEl || !engine.activeCanvas) return;

    try {
      imgEl.src = engine.activeCanvas.toDataURL('image/jpeg', 0.92);
      imgEl.style.display = 'block';
      artworkEl.style.display = 'none';
    } catch (e) {
      console.warn('Hero preview update warning:', e);
    }
  };

  // ==============================================================
  // MAGIC UI ANIMATED THEME TOGGLER (View Transitions Circular Ripple)
  // ==============================================================
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#121310');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#FBFBF8');
    }
    localStorage.setItem('pixkit-theme', theme);
  }

  window.toggleThemeAnimated = function(event) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';

    // Get origin coordinates from the toggle button
    const btn = document.getElementById('theme-toggle-btn');
    const rect = btn?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : (event?.clientX ?? window.innerWidth / 2);
    const y = rect ? rect.top + rect.height / 2 : (event?.clientY ?? window.innerHeight / 2);

    // Fallback for browsers without View Transitions API
    if (!document.startViewTransition) {
      applyTheme(nextTheme);
      return;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      applyTheme(nextTheme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];

      document.documentElement.animate(
        {
          clipPath: clipPath
        },
        {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    });
  };

  // ==============================================================
  // PERSISTENT STORAGE ENGINE (IndexedDB High-Performance Blob Storage)
  // ==============================================================
  const PixKitStorage = {
    dbName: 'pixkit_blob_storage_v4',
    dbVersion: 1,
    storeName: 'session_store',

    openDB() {
      return new Promise((resolve) => {
        if (!window.indexedDB) return resolve(null);
        try {
          const req = indexedDB.open(this.dbName, this.dbVersion);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(this.storeName)) {
              db.createObjectStore(this.storeName, { keyPath: 'id' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (_) {
          resolve(null);
        }
      });
    },

    async saveSession(record) {
      try {
        const db = await this.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.put({ id: 'active_session', ...record, savedAt: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        console.warn('Storage save failed:', e);
        return false;
      }
    },

    async loadSession() {
      try {
        const db = await this.openDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get('active_session');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        console.warn('Storage load failed:', e);
        return null;
      }
    },

    async clearSession() {
      try {
        localStorage.removeItem('pixkit_saved_session');
        const db = await this.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.delete('active_session');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    }
  };

  let persistTimer = null;
  function persistCurrentSession() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
      if (!hasUserAddedImage || !engine.activeCanvas || engine.activeCanvas.width === 0) return;
      try {
        const activeBlobPromise = new Promise(resolve => engine.activeCanvas.toBlob(resolve, 'image/png'));
        const sourceBlobPromise = new Promise(resolve => engine.sourceCanvas.toBlob(resolve, 'image/png'));
        const [activeBlob, sourceBlob] = await Promise.all([activeBlobPromise, sourceBlobPromise]);

        if (!activeBlob) return;

        const sessionPayload = {
          filename: engine.filename,
          fileType: engine.fileType,
          fileSize: engine.fileSize,
          activeBlob,
          sourceBlob,
          hasUserAddedImage: true,
          currentView,
          activeTool,
          currentHash: location.hash || (activeTool ? `#/tool/${activeTool}` : `#/edit`),
          savedAt: Date.now()
        };

        await PixKitStorage.saveSession(sessionPayload);

        // Fast metadata in localStorage
        localStorage.setItem('pixkit_saved_session', JSON.stringify({
          filename: engine.filename,
          fileType: engine.fileType,
          fileSize: engine.fileSize,
          hasUserAddedImage: true,
          currentHash: sessionPayload.currentHash,
          savedAt: sessionPayload.savedAt
        }));
      } catch (e) {
        console.warn('Session auto-save error:', e);
      }
    }, 100);
  }

  // Listen to engine history changes for automatic real-time session persistence
  engine.onChange(() => {
    if (hasUserAddedImage) {
      persistCurrentSession();
    }
  });

  async function restoreSavedSession() {
    try {
      const session = await PixKitStorage.loadSession();
      if (session && session.hasUserAddedImage && (session.activeBlob || session.activeDataUrl)) {
        return new Promise((resolve) => {
          const img = new Image();
          const objectUrl = session.activeBlob ? URL.createObjectURL(session.activeBlob) : session.activeDataUrl;

          img.onload = () => {
            if (session.activeBlob) {
              try { URL.revokeObjectURL(objectUrl); } catch (_) {}
            }

            engine.filename = session.filename || 'saved-image.png';
            engine.fileType = session.fileType || 'image/png';
            engine.fileSize = session.fileSize || 1200000;

            // Load onto active canvas
            engine.activeCanvas.width = img.naturalWidth;
            engine.activeCanvas.height = img.naturalHeight;
            engine.activeCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
            engine.activeCtx.drawImage(img, 0, 0);

            // Load onto source canvas
            if (session.sourceBlob) {
              const srcImg = new Image();
              const srcUrl = URL.createObjectURL(session.sourceBlob);
              srcImg.onload = () => {
                try { URL.revokeObjectURL(srcUrl); } catch (_) {}
                engine.sourceCanvas.width = srcImg.naturalWidth;
                engine.sourceCanvas.height = srcImg.naturalHeight;
                engine.sourceCtx.clearRect(0, 0, srcImg.naturalWidth, srcImg.naturalHeight);
                engine.sourceCtx.drawImage(srcImg, 0, 0);
              };
              srcImg.src = srcUrl;
            } else {
              engine.sourceCanvas.width = img.naturalWidth;
              engine.sourceCanvas.height = img.naturalHeight;
              engine.sourceCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
              engine.sourceCtx.drawImage(img, 0, 0);
            }

            engine.historyStack = [];
            engine.pushHistory('Restored Image');

            hasUserAddedImage = true;
            syncMetadata();
            updateHeroPreview();
            updateHistoryUI();

            const targetRoute = location.hash || session.currentHash || '#/edit';
            handleRoute(targetRoute);
            showToast(`Restored ${engine.filename} ⚡`);
            resolve(true);
          };
          img.onerror = () => resolve(false);
          img.src = objectUrl;
        });
      }
    } catch (e) {
      console.warn('Session restoration notice:', e);
    }
    return false;
  }

  // ==============================================================
  // SPA HASH ROUTING & BROWSER NAVIGATION HISTORY
  // ==============================================================
  function navigateTo(route, push = true) {
    if (push && location.hash !== route) {
      history.pushState({ route }, '', route);
    } else if (!push) {
      history.replaceState({ route }, '', route);
    }
    handleRoute(route);
  }

  function handleRoute(hashString) {
    const raw = hashString || location.hash || '#/home';
    const clean = raw.replace(/^#\/?/, '');
    const parts = clean.split('/');

    if (!parts[0] || parts[0] === 'home') {
      renderViewDirect('home');
    } else if (parts[0] === 'edit') {
      renderViewDirect('edit');
    } else if (parts[0] === 'convert') {
      renderViewDirect('convert');
    } else if (parts[0] === 'tool' && parts[1]) {
      renderToolWorkspaceDirect(parts[1]);
    } else {
      renderViewDirect('home');
    }
    persistCurrentSession();
  }

  function renderViewDirect(viewId) {
    currentView = viewId;
    activeTool = null;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const target = document.getElementById(`${viewId}-view`);
    if (target) target.classList.add('active');

    // Topbar active tab indicator
    document.getElementById('nav-home')?.classList.toggle('active', viewId === 'home');
    document.getElementById('nav-edit')?.classList.toggle('active', viewId === 'edit');
    document.getElementById('nav-convert')?.classList.toggle('active', viewId === 'convert');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHistoryUI();
  }

  function renderToolWorkspaceDirect(toolId) {
    activeTool = toolId;
    currentView = `tool-${toolId}`;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const workspaceView = document.getElementById(`tool-${toolId}-view`) || document.getElementById(`${toolId}-view`);
    if (workspaceView) {
      workspaceView.classList.add('active');
    }

    document.getElementById('nav-home')?.classList.remove('active');
    document.getElementById('nav-edit')?.classList.toggle('active', !toolId.startsWith('convert-'));
    document.getElementById('nav-convert')?.classList.toggle('active', toolId.startsWith('convert-'));

    window.scrollTo({ top: 0, behavior: 'smooth' });
    initToolStage(toolId);
    updateHistoryUI();
  }

  window.showView = function(viewId) {
    navigateTo(`#/${viewId}`, true);
  };

  window.openToolWorkspace = function(toolId) {
    hasUserAddedImage = true;
    navigateTo(`#/tool/${toolId}`, true);
  };

  // Browser Navigation Listener (Back / Forward buttons)
  window.addEventListener('popstate', () => {
    // If Shortcuts modal is open, close it first without navigating away
    const modal = document.getElementById('shortcuts-modal');
    if (modal && modal.classList.contains('active')) {
      toggleShortcutsModal(false);
      return;
    }
    handleRoute(location.hash);
  });

  // --- Global File Upload Handling ---
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP, etc.)');
      return;
    }

    engine.loadFromFile(file).then(meta => {
      hasUserAddedImage = true;
      showToast(`Loaded ${meta.name} (${meta.width} × ${meta.height} px)`);
      syncMetadata();
      updateHeroPreview();
      persistCurrentSession();

      if (activeTool) {
        initToolStage(activeTool);
      } else if (currentView === 'home') {
        window.showView('edit');
      }
      updateHistoryUI();
    }).catch(err => {
      console.error(err);
      showToast('Failed to load image');
    });
  }

  // File Inputs
  document.querySelectorAll('.global-file-picker').forEach(input => {
    input.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImageFile(e.target.files[0]);
        e.target.value = '';
      }
    });
  });

  // Drag & Drop
  const dropZones = document.querySelectorAll('.upload-zone');
  dropZones.forEach(zone => {
    ['dragenter', 'dragover'].forEach(name => {
      zone.addEventListener(name, (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      zone.addEventListener(name, (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
      });
    });
    zone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });
  });

  // Global Clipboard Paste (Cmd+V / Ctrl+V)
  window.addEventListener('paste', (e) => {
    if (e.clipboardData && e.clipboardData.items) {
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          handleImageFile(file);
          break;
        }
      }
    }
  });

  function syncMetadata() {
    const w = engine.activeCanvas.width;
    const h = engine.activeCanvas.height;
    document.querySelectorAll('.img-meta-name').forEach(el => el.textContent = engine.filename);
    document.querySelectorAll('.img-meta-dims').forEach(el => el.textContent = `${w} × ${h} px`);

    const metaIds = [
      'meta-resize', 'meta-crop', 'meta-rotate', 'meta-compress', 'meta-adjust',
      'meta-filters', 'meta-text', 'meta-draw', 'meta-blur'
    ];
    metaIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = `${engine.filename} (${w} × ${h} px)`;
    });
    
    const resizeW = document.getElementById('resize-w');
    const resizeH = document.getElementById('resize-h');
    if (resizeW && resizeH) {
      resizeW.value = w;
      resizeH.value = h;
    }

    if (hasUserAddedImage) {
      updateHeroPreview();
    }

    persistCurrentSession();
  }

  function renderToCanvas(targetCanvasId) {
    const target = document.getElementById(targetCanvasId);
    if (!target) return;
    target.width = engine.activeCanvas.width;
    target.height = engine.activeCanvas.height;
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(engine.activeCanvas, 0, 0);
  }

  function initToolStage(toolId) {
    syncMetadata();

    if (toolId === 'resize') {
      renderToCanvas('canvas-resize');
    } else if (toolId === 'crop') {
      renderToCanvas('canvas-crop');
      initCropOverlay();
    } else if (toolId === 'rotate') {
      renderToCanvas('canvas-rotate');
    } else if (toolId === 'compress') {
      const inputW = document.getElementById('compress-px-width');
      const inputH = document.getElementById('compress-px-height');
      if (inputW) inputW.value = engine.activeCanvas.width;
      if (inputH) inputH.value = engine.activeCanvas.height;
      recalculateCompression();
    } else if (toolId === 'adjust') {
      renderToCanvas('canvas-adjust');
      updateAdjustPreview();
    } else if (toolId === 'filters') {
      renderToCanvas('canvas-filters');
    } else if (toolId === 'text') {
      initTextCanvas();
    } else if (toolId === 'draw') {
      initDrawingCanvas();
    } else if (toolId === 'blur') {
      initBlurCanvas();
    } else if (toolId === 'convert-format') {
      initConvertFormatStage();
    } else if (toolId === 'convert-heic') {
      initConvertHeicStage();
    } else if (toolId === 'convert-svg') {
      initConvertSvgStage();
    } else if (toolId === 'convert-ico') {
      initConvertIcoStage();
    } else if (toolId === 'convert-base64') {
      initConvertBase64Stage();
    } else if (toolId === 'convert-pdf') {
      initConvertPdfStage();
    }

    updateHistoryUI();
  }

  // --- Global History UI & Keybindings ---
  function updateHistoryUI() {
    const historyBar = document.getElementById('floating-history-bar');
    if (historyBar) {
      if (hasUserAddedImage && currentView !== 'home') {
        historyBar.classList.add('visible');
      } else {
        historyBar.classList.remove('visible');
      }
    }

    const undoBtn = document.getElementById('btn-global-undo');
    const redoBtn = document.getElementById('btn-global-redo');
    const badge = document.getElementById('history-status-badge');

    if (undoBtn) undoBtn.disabled = !engine.canUndo();
    if (redoBtn) redoBtn.disabled = !engine.canRedo();

    if (badge && engine.historyStack[engine.historyIndex]) {
      badge.textContent = engine.historyStack[engine.historyIndex].label;
    }
  }

  window.handleGlobalUndo = function() {
    if (engine.undo()) {
      showToast('Undone edit');
      syncMetadata();
      if (activeTool) initToolStage(activeTool);
      updateHistoryUI();
      persistCurrentSession();
    }
  };

  window.handleGlobalRedo = function() {
    if (engine.redo()) {
      showToast('Redone edit');
      syncMetadata();
      if (activeTool) initToolStage(activeTool);
      updateHistoryUI();
      persistCurrentSession();
    }
  };

  // --- Keyboard Shortcuts Modal Management ---
  window.toggleShortcutsModal = function(open) {
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    if (open) {
      modal.classList.add('active');
    } else {
      modal.classList.remove('active');
    }
  };

  window.handleShortcutsBackdropClick = function(e) {
    if (e.target.id === 'shortcuts-modal') {
      window.toggleShortcutsModal(false);
    }
  };

  // --- Comprehensive Global Keyboard Shortcuts Suite ---
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isTyping = activeEl && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable);

    // 1. Escape: Close modal, return from tool to edit, or return to home
    if (e.key === 'Escape') {
      const modal = document.getElementById('shortcuts-modal');
      if (modal && modal.classList.contains('active')) {
        e.preventDefault();
        window.toggleShortcutsModal(false);
        return;
      }
      if (activeTool) {
        e.preventDefault();
        window.showView('edit');
        return;
      }
      if (currentView === 'edit') {
        e.preventDefault();
        window.showView('home');
        return;
      }
    }

    // 2. Question mark '?' or Shift+'/' -> Toggle Shortcuts Dialog
    if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !isTyping) {
      e.preventDefault();
      const modal = document.getElementById('shortcuts-modal');
      const isCurrentlyActive = modal && modal.classList.contains('active');
      window.toggleShortcutsModal(!isCurrentlyActive);
      return;
    }

    // 3. Cmd+O / Ctrl+O: Open File Picker
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      const picker = document.querySelector('.global-file-picker');
      if (picker) picker.click();
      return;
    }

    // 4. Cmd+S / Ctrl+S: Quick Export / Download Image
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      engine.download('jpg', 0.92);
      showToast('Quick downloaded image ⚡');
      return;
    }

    // 5. Cmd+Z / Ctrl+Z (Undo) and Cmd+Shift+Z / Cmd+Y / Ctrl+Y (Redo)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (!isTyping) {
        e.preventDefault();
        if (e.shiftKey) {
          window.handleGlobalRedo();
        } else {
          window.handleGlobalUndo();
        }
      }
      return;
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      if (!isTyping) {
        e.preventDefault();
        window.handleGlobalRedo();
      }
      return;
    }

    // 6. Number Keys 1-9: Quick Tool Switcher (when not typing in form inputs)
    if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey && e.key >= '1' && e.key <= '9') {
      const toolMap = {
        '1': 'resize',
        '2': 'crop',
        '3': 'rotate',
        '4': 'compress',
        '5': 'adjust',
        '6': 'filters',
        '7': 'text',
        '8': 'draw',
        '9': 'blur'
      };
      const selectedTool = toolMap[e.key];
      if (selectedTool) {
        e.preventDefault();
        window.openToolWorkspace(selectedTool);
        showToast(`Opened ${selectedTool.toUpperCase()} tool`);
      }
    }
  });

  // --- Global Undo & Reset ---
  window.undoEdit = function() {
    if (engine.undo()) {
      showToast('Undone edit');
      syncMetadata();
      if (activeTool) initToolStage(activeTool);
      persistCurrentSession();
    }
  };

  window.resetEdit = function() {
    engine.resetToOriginal();
    showToast('Reset to original');
    syncMetadata();
    if (activeTool) initToolStage(activeTool);
    persistCurrentSession();
  };

  // ==============================================================
  // 1. RESIZE HANDLERS
  // ==============================================================
  let keepAspect = true;
  window.toggleAspect = function() {
    keepAspect = !keepAspect;
    document.getElementById('aspect-btn')?.classList.toggle('active', keepAspect);
  };

  const rw = document.getElementById('resize-w');
  const rh = document.getElementById('resize-h');
  if (rw && rh) {
    rw.addEventListener('input', () => {
      document.querySelectorAll('#tool-resize-view .preset-card').forEach(p => p.classList.remove('active'));
      if (keepAspect) {
        const val = parseFloat(rw.value) || 1;
        const ratio = engine.activeCanvas.width / engine.activeCanvas.height;
        rh.value = Math.round(val / ratio);
      }
    });
    rh.addEventListener('input', () => {
      document.querySelectorAll('#tool-resize-view .preset-card').forEach(p => p.classList.remove('active'));
      if (keepAspect) {
        const val = parseFloat(rh.value) || 1;
        const ratio = engine.activeCanvas.width / engine.activeCanvas.height;
        rw.value = Math.round(val * ratio);
      }
    });
  }

  window.setPresetSize = function(w, h, btn) {
    document.querySelectorAll('#tool-resize-view .preset-card').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (rw && rh) {
      rw.value = w;
      rh.value = h;
    }
  };

  window.applyResizeAction = async function(download = false) {
    const w = parseInt(rw.value, 10);
    const h = parseInt(rh.value, 10);
    if (!w || !h || w <= 0 || h <= 0) {
      showToast('Please enter valid dimensions');
      return;
    }

    engine.resize(w, h);
    showToast(`Resized to ${w} × ${h} px`);
    syncMetadata();
    renderToCanvas('canvas-resize');

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded resized image');
    }
  };

  // ==============================================================
  // 2. CROP HANDLERS (Full Freeform Mouse & Touch Drag Controls)
  // ==============================================================
  let cropBoxState = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
  let currentCropRatio = 'free';
  let cropInteractionState = null;
  let cropEventsBound = false;

  function initCropOverlay() {
    const box = document.getElementById('crop-box');
    if (!box) return;

    // Constrain within 0..1 boundaries
    cropBoxState.w = Math.max(0.02, Math.min(1, cropBoxState.w));
    cropBoxState.h = Math.max(0.02, Math.min(1, cropBoxState.h));
    cropBoxState.x = Math.max(0, Math.min(1 - cropBoxState.w, cropBoxState.x));
    cropBoxState.y = Math.max(0, Math.min(1 - cropBoxState.h, cropBoxState.y));

    box.style.left = `${(cropBoxState.x * 100).toFixed(2)}%`;
    box.style.top = `${(cropBoxState.y * 100).toFixed(2)}%`;
    box.style.width = `${(cropBoxState.w * 100).toFixed(2)}%`;
    box.style.height = `${(cropBoxState.h * 100).toFixed(2)}%`;

    const realW = Math.max(1, Math.round(cropBoxState.w * engine.activeCanvas.width));
    const realH = Math.max(1, Math.round(cropBoxState.h * engine.activeCanvas.height));

    const cropDim = document.getElementById('crop-status-label');
    if (cropDim) {
      cropDim.textContent = `${realW} × ${realH} px`;
    }

    const badge = document.getElementById('crop-dim-badge');
    if (badge) {
      badge.textContent = `${realW} × ${realH} px`;
    }

    bindCropEvents();
  }

  function bindCropEvents() {
    if (cropEventsBound) return;
    const wrapper = document.querySelector('.crop-canvas-wrapper');
    const box = document.getElementById('crop-box');
    if (!wrapper || !box) return;

    cropEventsBound = true;

    // Pointer down on wrapper / box / handles
    wrapper.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const rect = wrapper.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const handleElem = e.target.closest('.crop-handle');
      if (handleElem) {
        // Handle Resize with mouse
        const handleType = handleElem.dataset.handle;
        cropInteractionState = {
          mode: 'resize',
          handle: handleType,
          startX: e.clientX,
          startY: e.clientY,
          rect: rect,
          origBox: { ...cropBoxState },
          pointerId: e.pointerId
        };
        handleElem.classList.add('active');
        try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
        return;
      }

      const isInsideBox = e.target.closest('#crop-box');
      if (isInsideBox) {
        // Box Move Drag with mouse
        cropInteractionState = {
          mode: 'move',
          startX: e.clientX,
          startY: e.clientY,
          rect: rect,
          origBox: { ...cropBoxState },
          pointerId: e.pointerId
        };
        try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
        return;
      }

      // Freeform Drawing on Canvas with mouse
      cropInteractionState = {
        mode: 'draw',
        startNormX: normX,
        startNormY: normY,
        rect: rect,
        origBox: { ...cropBoxState },
        pointerId: e.pointerId
      };
      cropBoxState = {
        x: normX,
        y: normY,
        w: 0.01,
        h: 0.01
      };
      initCropOverlay();
      try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    wrapper.addEventListener('pointermove', (e) => {
      if (!cropInteractionState) return;

      const rect = cropInteractionState.rect || wrapper.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const currentNormX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const currentNormY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const deltaNormX = (e.clientX - cropInteractionState.startX) / rect.width;
      const deltaNormY = (e.clientY - cropInteractionState.startY) / rect.height;

      const imgAspect = engine.activeCanvas.width / engine.activeCanvas.height;

      if (cropInteractionState.mode === 'move') {
        let newX = cropInteractionState.origBox.x + deltaNormX;
        let newY = cropInteractionState.origBox.y + deltaNormY;
        newX = Math.max(0, Math.min(1 - cropInteractionState.origBox.w, newX));
        newY = Math.max(0, Math.min(1 - cropInteractionState.origBox.h, newY));
        cropBoxState.x = newX;
        cropBoxState.y = newY;
        initCropOverlay();
      } else if (cropInteractionState.mode === 'resize') {
        const h = cropInteractionState.handle;
        const orig = cropInteractionState.origBox;
        let x1 = orig.x;
        let y1 = orig.y;
        let x2 = orig.x + orig.w;
        let y2 = orig.y + orig.h;

        if (h.includes('l')) x1 = Math.min(x2 - 0.02, Math.max(0, orig.x + deltaNormX));
        if (h.includes('r')) x2 = Math.max(x1 + 0.02, Math.min(1, orig.x + orig.w + deltaNormX));
        if (h.includes('t')) y1 = Math.min(y2 - 0.02, Math.max(0, orig.y + deltaNormY));
        if (h.includes('b')) y2 = Math.max(y1 + 0.02, Math.min(1, orig.y + orig.h + deltaNormY));

        // If locked aspect ratio
        if (currentCropRatio !== 'free') {
          const [rW, rH] = currentCropRatio.split(':').map(Number);
          const targetAspect = rW / rH;
          const normAspect = targetAspect / imgAspect;

          let w = x2 - x1;
          let hVal = y2 - y1;

          if (h === 'tc' || h === 'bc') {
            w = hVal * normAspect;
            if (w > 1) { w = 1; hVal = w / normAspect; }
            const centerX = (x1 + x2) / 2;
            x1 = Math.max(0, centerX - w / 2);
            x2 = Math.min(1, x1 + w);
            if (x2 === 1) x1 = Math.max(0, 1 - w);
          } else if (h === 'ml' || h === 'mr') {
            hVal = w / normAspect;
            if (hVal > 1) { hVal = 1; w = hVal * normAspect; }
            const centerY = (y1 + y2) / 2;
            y1 = Math.max(0, centerY - hVal / 2);
            y2 = Math.min(1, y1 + hVal);
            if (y2 === 1) y1 = Math.max(0, 1 - hVal);
          } else {
            if (w / normAspect > hVal) {
              hVal = w / normAspect;
              if (h.includes('t')) y1 = Math.max(0, y2 - hVal);
              else y2 = Math.min(1, y1 + hVal);
            } else {
              w = hVal * normAspect;
              if (h.includes('l')) x1 = Math.max(0, x2 - w);
              else x2 = Math.min(1, x1 + w);
            }
          }
        }

        cropBoxState.x = Math.max(0, x1);
        cropBoxState.y = Math.max(0, y1);
        cropBoxState.w = Math.max(0.02, Math.min(1 - cropBoxState.x, x2 - x1));
        cropBoxState.h = Math.max(0.02, Math.min(1 - cropBoxState.y, y2 - y1));
        initCropOverlay();
      } else if (cropInteractionState.mode === 'draw') {
        const sx = cropInteractionState.startNormX;
        const sy = cropInteractionState.startNormY;

        let x1 = Math.min(sx, currentNormX);
        let y1 = Math.min(sy, currentNormY);
        let x2 = Math.max(sx, currentNormX);
        let y2 = Math.max(sy, currentNormY);

        if (currentCropRatio !== 'free') {
          const [rW, rH] = currentCropRatio.split(':').map(Number);
          const targetAspect = rW / rH;
          const normAspect = targetAspect / imgAspect;

          let w = Math.max(0.02, x2 - x1);
          let hVal = w / normAspect;
          if (currentNormY < sy) {
            y1 = Math.max(0, sy - hVal);
            y2 = sy;
          } else {
            y1 = sy;
            y2 = Math.min(1, sy + hVal);
          }
        }

        cropBoxState.x = Math.max(0, x1);
        cropBoxState.y = Math.max(0, y1);
        cropBoxState.w = Math.max(0.02, Math.min(1 - cropBoxState.x, x2 - x1));
        cropBoxState.h = Math.max(0.02, Math.min(1 - cropBoxState.y, y2 - y1));
        initCropOverlay();
      }
    });

    const finishInteraction = () => {
      if (!cropInteractionState) return;
      document.querySelectorAll('.crop-handle').forEach(h => h.classList.remove('active'));

      if (cropInteractionState.mode === 'draw' && (cropBoxState.w < 0.03 || cropBoxState.h < 0.03)) {
        cropBoxState = cropInteractionState.origBox || { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
        initCropOverlay();
      }

      try {
        if (cropInteractionState.pointerId !== undefined) {
          wrapper.releasePointerCapture(cropInteractionState.pointerId);
        }
      } catch (_) {}

      cropInteractionState = null;
    };

    wrapper.addEventListener('pointerup', finishInteraction);
    wrapper.addEventListener('pointercancel', finishInteraction);
    window.addEventListener('pointerup', finishInteraction);
  }

  window.setCropRatio = function(ratio, btn) {
    document.querySelectorAll('#tool-crop-view .preset-card').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    currentCropRatio = ratio;

    if (ratio === 'free') {
      // Keep existing custom box or reset to 90%
      if (!cropBoxState || cropBoxState.w < 0.1) {
        cropBoxState = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
      }
    } else {
      const [rW, rH] = ratio.split(':').map(Number);
      const aspect = rW / rH;
      const imgRatio = engine.activeCanvas.width / engine.activeCanvas.height;
      if (aspect > imgRatio) {
        cropBoxState.w = 0.9;
        cropBoxState.h = (cropBoxState.w * imgRatio) / aspect;
        cropBoxState.x = 0.05;
        cropBoxState.y = (1 - cropBoxState.h) / 2;
      } else {
        cropBoxState.h = 0.9;
        cropBoxState.w = (cropBoxState.h * aspect) / imgRatio;
        cropBoxState.y = 0.05;
        cropBoxState.x = (1 - cropBoxState.w) / 2;
      }
    }
    initCropOverlay();
  };

  window.applyCropAction = async function(download = false) {
    const realX = Math.round(cropBoxState.x * engine.activeCanvas.width);
    const realY = Math.round(cropBoxState.y * engine.activeCanvas.height);
    const realW = Math.max(1, Math.round(cropBoxState.w * engine.activeCanvas.width));
    const realH = Math.max(1, Math.round(cropBoxState.h * engine.activeCanvas.height));

    engine.crop(realX, realY, realW, realH);
    showToast(`Cropped to ${realW} × ${realH} px`);
    syncMetadata();
    renderToCanvas('canvas-crop');
    cropBoxState = { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
    initCropOverlay();

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded cropped image');
    }
  };

  // ==============================================================
  // 3. ROTATE & FLIP
  // ==============================================================
  let rotDeg = 0;
  let fH = false;
  let fV = false;

  window.stepRotate = function(deg) {
    rotDeg = (rotDeg + deg) % 360;
    renderRotatePreview();
  };

  window.flipAxis = function(axis) {
    if (axis === 'h') fH = !fH;
    if (axis === 'v') fV = !fV;
    renderRotatePreview();
  };

  function renderRotatePreview() {
    const canvas = document.getElementById('canvas-rotate');
    if (!canvas) return;

    const rad = (rotDeg * Math.PI) / 180;
    const origW = engine.activeCanvas.width;
    const origH = engine.activeCanvas.height;
    const newW = Math.round(origW * Math.abs(Math.cos(rad)) + origH * Math.abs(Math.sin(rad)));
    const newH = Math.round(origW * Math.abs(Math.sin(rad)) + origH * Math.abs(Math.cos(rad)));

    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, newW, newH);

    ctx.save();
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.scale(fH ? -1 : 1, fV ? -1 : 1);
    ctx.drawImage(engine.activeCanvas, -origW / 2, -origH / 2);
    ctx.restore();

    document.getElementById('rotate-angle-info').textContent = `Angle: ${rotDeg}°`;
  }

  window.applyRotateAction = async function(download = false) {
    engine.rotateAndFlip(rotDeg, fH, fV);
    showToast(`Applied ${rotDeg}° rotation`);
    rotDeg = 0; fH = false; fV = false;
    syncMetadata();
    renderToCanvas('canvas-rotate');

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded rotated image');
    }
  };

  // ==============================================================
  // 4. COMPRESS (Target Size Auto-Calibration, Pixel Resampling & Manual Quality)
  // ==============================================================
  let compressMode = 'target'; // 'target' | 'pixels' | 'manual'
  let compressLockAspect = true;
  let compressCalibratedResult = null;

  function getCompressFormat() {
    const selected = document.querySelector('input[name="compress-format"]:checked');
    return selected ? selected.value : 'image/jpeg';
  }

  window.setCompressMode = function(mode) {
    compressMode = mode;
    document.getElementById('compress-tab-target')?.classList.toggle('active', mode === 'target');
    document.getElementById('compress-tab-pixels')?.classList.toggle('active', mode === 'pixels');
    document.getElementById('compress-tab-manual')?.classList.toggle('active', mode === 'manual');

    const targetPanel = document.getElementById('compress-mode-target-panel');
    const pixelsPanel = document.getElementById('compress-mode-pixels-panel');
    const manualPanel = document.getElementById('compress-mode-manual-panel');

    if (targetPanel) targetPanel.style.display = mode === 'target' ? 'block' : 'none';
    if (pixelsPanel) pixelsPanel.style.display = mode === 'pixels' ? 'block' : 'none';
    if (manualPanel) manualPanel.style.display = mode === 'manual' ? 'block' : 'none';

    recalculateCompression();
  };

  window.setQuickTargetSize = function(val, unit) {
    const input = document.getElementById('compress-target-val');
    const select = document.getElementById('compress-target-unit');
    if (input) input.value = val;
    if (select) select.value = unit;

    document.querySelectorAll('#compress-mode-target-panel .chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === `${val} ${unit}`);
    });

    calibrateCompressTarget();
  };

  window.calibrateCompressTarget = async function() {
    const input = document.getElementById('compress-target-val');
    const select = document.getElementById('compress-target-unit');
    let val = parseFloat(input?.value || 200);
    const unit = select?.value || 'KB';

    if (isNaN(val) || val <= 0) val = 200;
    const targetBytes = unit === 'MB' ? val * 1024 * 1024 : val * 1024;
    const format = getCompressFormat();

    const result = await engine.autoCalibrateCompression(targetBytes, format);
    compressCalibratedResult = result;

    renderCompressedCanvas(result.canvas);

    const qualText = document.getElementById('calibrated-quality-text');
    const dimsText = document.getElementById('calibrated-dims-text');
    const sizeText = document.getElementById('calibrated-size-text');

    if (qualText) qualText.textContent = `${result.quality}%`;
    if (dimsText) dimsText.textContent = `${result.width} × ${result.height} px (${Math.round(result.scale * 100)}% res)`;
    if (sizeText) sizeText.textContent = PixKitEngine.formatBytes(result.blob.size);

    updateCompressSummaryStats(result.blob.size, result.width, result.height);
  };

  window.toggleCompressAspectLock = function() {
    compressLockAspect = !compressLockAspect;
    const btn = document.getElementById('compress-px-lock-btn');
    if (btn) {
      btn.classList.toggle('active', compressLockAspect);
      btn.title = compressLockAspect ? 'Lock aspect ratio' : 'Unlock aspect ratio';
    }
  };

  window.setCompressPxPreset = function(w, h) {
    const srcW = engine.activeCanvas.width;
    const srcH = engine.activeCanvas.height;
    const aspect = srcW / srcH;

    let targetW = w;
    let targetH = h;
    if (compressLockAspect) {
      if (srcW >= srcH) {
        targetW = w;
        targetH = Math.round(w / aspect);
      } else {
        targetH = h;
        targetW = Math.round(h * aspect);
      }
    }

    const inputW = document.getElementById('compress-px-width');
    const inputH = document.getElementById('compress-px-height');
    if (inputW) inputW.value = targetW;
    if (inputH) inputH.value = targetH;

    updateCompressPxLive();
  };

  window.onCompressPxChange = function(changedField) {
    const inputW = document.getElementById('compress-px-width');
    const inputH = document.getElementById('compress-px-height');
    if (!inputW || !inputH) return;

    const srcW = engine.activeCanvas.width;
    const srcH = engine.activeCanvas.height;
    const aspect = srcW / srcH;

    if (compressLockAspect) {
      if (changedField === 'width') {
        const w = parseInt(inputW.value, 10) || srcW;
        inputH.value = Math.max(1, Math.round(w / aspect));
      } else {
        const h = parseInt(inputH.value, 10) || srcH;
        inputW.value = Math.max(1, Math.round(h * aspect));
      }
    }

    updateCompressPxLive();
  };

  window.updateCompressPxLive = async function() {
    const inputW = document.getElementById('compress-px-width');
    const inputH = document.getElementById('compress-px-height');
    const slider = document.getElementById('compress-px-slider');
    
    const w = parseInt(inputW?.value, 10) || engine.activeCanvas.width;
    const h = parseInt(inputH?.value, 10) || engine.activeCanvas.height;
    const qVal = parseInt(slider?.value || 82, 10);
    const qualValEl = document.getElementById('compress-px-quality-val');
    if (qualValEl) qualValEl.textContent = `${qVal}%`;

    const format = getCompressFormat();
    const result = await engine.resampleToPixels(w, h, qVal / 100, format);
    compressCalibratedResult = result;

    renderCompressedCanvas(result.canvas);
    updateCompressSummaryStats(result.blob.size, result.width, result.height);
  };

  window.updateCompressManualLive = async function() {
    const slider = document.getElementById('compress-slider');
    const val = slider ? parseInt(slider.value, 10) : 80;
    const qualEl = document.getElementById('compress-quality-val');
    if (qualEl) qualEl.textContent = `${val}%`;

    const format = getCompressFormat();
    const blob = await engine.exportBlob(format, val / 100);
    compressCalibratedResult = {
      canvas: engine.activeCanvas,
      quality: val,
      blob: blob,
      width: engine.activeCanvas.width,
      height: engine.activeCanvas.height
    };

    renderCompressedCanvas(engine.activeCanvas);
    updateCompressSummaryStats(blob.size, engine.activeCanvas.width, engine.activeCanvas.height);
  };

  window.recalculateCompression = function() {
    if (compressMode === 'target') {
      calibrateCompressTarget();
    } else if (compressMode === 'pixels') {
      updateCompressPxLive();
    } else {
      updateCompressManualLive();
    }
  };

  function renderCompressedCanvas(srcCanvas) {
    const target = document.getElementById('canvas-compress');
    if (!target || !srcCanvas) return;
    target.width = srcCanvas.width;
    target.height = srcCanvas.height;
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(srcCanvas, 0, 0);
  }

  function updateCompressSummaryStats(finalBytes, finalW, finalH) {
    const origBytes = engine.fileSize || 2400000;
    const savings = Math.max(0, Math.round(((origBytes - finalBytes) / origBytes) * 100));

    const origEl = document.getElementById('compress-orig-size');
    const finalEl = document.getElementById('compress-final-size');
    const badge = document.getElementById('compress-savings-badge');
    const stat = document.getElementById('compress-stat');

    if (origEl) origEl.textContent = PixKitEngine.formatBytes(origBytes);
    if (finalEl) finalEl.textContent = `${PixKitEngine.formatBytes(finalBytes)} (${finalW} × ${finalH} px)`;
    
    if (badge) {
      badge.textContent = `↓ ${savings}% Savings`;
      badge.style.display = savings > 0 ? 'inline-block' : 'none';
    }

    if (stat) {
      stat.textContent = `${PixKitEngine.formatBytes(finalBytes)} · ${finalW} × ${finalH} px (${savings}% smaller)`;
    }
  }

  let isComparingOriginal = false;
  window.showCompressOriginal = function(showOriginal) {
    isComparingOriginal = showOriginal;
    const title = document.getElementById('compress-stage-title');
    if (showOriginal) {
      renderToCanvas('canvas-compress');
      if (title) title.textContent = 'Original Uncompressed (Viewing)';
    } else {
      if (compressCalibratedResult && compressCalibratedResult.canvas) {
        renderCompressedCanvas(compressCalibratedResult.canvas);
      }
      if (title) title.textContent = 'Compressed Live Preview';
    }
  };

  window.downloadCompressedAction = async function() {
    if (!compressCalibratedResult) {
      await recalculateCompression();
    }
    const format = getCompressFormat();
    const ext = format === 'image/webp' ? 'webp' : 'jpg';
    const blob = compressCalibratedResult?.blob || await engine.exportBlob(format, 0.82);

    const baseName = engine.filename.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_compressed.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Downloaded compressed file (${PixKitEngine.formatBytes(blob.size)})`);
  };

  window.applyCompressedToStudio = async function() {
    if (!compressCalibratedResult || !compressCalibratedResult.canvas) {
      await recalculateCompression();
    }
    const res = compressCalibratedResult;
    if (!res) return;

    engine.activeCanvas.width = res.width;
    engine.activeCanvas.height = res.height;
    engine.activeCtx.clearRect(0, 0, res.width, res.height);
    engine.activeCtx.drawImage(res.canvas, 0, 0);

    engine.fileSize = res.blob.size;
    engine.pushHistory(`Compressed (${PixKitEngine.formatBytes(res.blob.size)})`);
    showToast(`Applied compressed image (${PixKitEngine.formatBytes(res.blob.size)}) to Studio`);
    syncMetadata();
    updateHistoryUI();
  };

  // ==============================================================
  // 5. ADJUST
  // ==============================================================
  window.updateAdjustPreview = function() {
    const bright = parseFloat(document.getElementById('adj-bright')?.value || 100);
    const contrast = parseFloat(document.getElementById('adj-contrast')?.value || 100);
    const sat = parseFloat(document.getElementById('adj-sat')?.value || 100);
    const warmth = parseFloat(document.getElementById('adj-warmth')?.value || 0);

    document.getElementById('lbl-bright').textContent = `${bright}%`;
    document.getElementById('lbl-contrast').textContent = `${contrast}%`;
    document.getElementById('lbl-sat').textContent = `${sat}%`;
    document.getElementById('lbl-warmth').textContent = `${warmth > 0 ? '+' : ''}${warmth}`;

    const canvas = document.getElementById('canvas-adjust');
    if (!canvas) return;

    const rendered = engine.applyFilters({ brightness: bright, contrast, saturation: sat, warmth });
    canvas.width = rendered.width;
    canvas.height = rendered.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(rendered, 0, 0);
  };

  window.applyAdjustAction = async function(download = false) {
    const bright = parseFloat(document.getElementById('adj-bright')?.value || 100);
    const contrast = parseFloat(document.getElementById('adj-contrast')?.value || 100);
    const sat = parseFloat(document.getElementById('adj-sat')?.value || 100);
    const warmth = parseFloat(document.getElementById('adj-warmth')?.value || 0);

    engine.commitFilters({ brightness: bright, contrast, saturation: sat, warmth });
    showToast('Applied adjustments');
    syncMetadata();
    renderToCanvas('canvas-adjust');

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded adjusted image');
    }
  };

  // ==============================================================
  // 6. FILTERS
  // ==============================================================
  let activeFilterParams = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, grayscale: 0, sepia: 0 };

  window.applyFilterPreset = function(type, btn) {
    document.querySelectorAll('#tool-filters-view .preset-card').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    activeFilterParams = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, grayscale: 0, sepia: 0 };
    if (type === 'bw') {
      activeFilterParams.grayscale = 100; activeFilterParams.contrast = 120;
    } else if (type === 'vintage') {
      activeFilterParams.sepia = 45; activeFilterParams.warmth = 20; activeFilterParams.contrast = 105;
    } else if (type === 'warm') {
      activeFilterParams.warmth = 35; activeFilterParams.brightness = 104;
    } else if (type === 'cool') {
      activeFilterParams.warmth = -30; activeFilterParams.contrast = 110;
    } else if (type === 'crisp') {
      activeFilterParams.contrast = 125; activeFilterParams.saturation = 120;
    }

    const canvas = document.getElementById('canvas-filters');
    if (canvas) {
      const rendered = engine.applyFilters(activeFilterParams);
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(rendered, 0, 0);
    }
  };

  window.commitFilterAction = async function(download = false) {
    engine.commitFilters(activeFilterParams);
    showToast('Applied preset filter');
    syncMetadata();
    renderToCanvas('canvas-filters');

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded filtered image');
    }
  };

  // ==============================================================
  // 7. ADD TEXT (Interactive Cursor Drag & Move Anywhere)
  // ==============================================================
  let textPosX = 0.8;
  let textPosY = 0.85;
  let isDraggingText = false;
  let textCanvas, textCtx;

  window.setQuickTextPos = function(preset) {
    document.querySelectorAll('#tool-text-view .preset-card').forEach(p => p.classList.remove('active'));
    event?.currentTarget?.classList?.add('active');

    if (preset === 'center') { textPosX = 0.5; textPosY = 0.5; }
    else if (preset === 'bottom-right') { textPosX = 0.85; textPosY = 0.88; }
    else if (preset === 'bottom-left') { textPosX = 0.15; textPosY = 0.88; }
    else if (preset === 'top-right') { textPosX = 0.85; textPosY = 0.12; }
    else if (preset === 'top-left') { textPosX = 0.15; textPosY = 0.12; }

    updateTextLive();
  };

  function initTextCanvas() {
    textCanvas = document.getElementById('canvas-text');
    if (!textCanvas) return;

    renderToCanvas('canvas-text');
    textCtx = textCanvas.getContext('2d');

    const handleTextPointerStart = (clientX, clientY) => {
      isDraggingText = true;
      textCanvas.style.cursor = 'grabbing';
      moveTextToPoint(clientX, clientY);
    };

    const handleTextPointerMove = (clientX, clientY) => {
      if (isDraggingText) {
        moveTextToPoint(clientX, clientY);
      }
    };

    const handleTextPointerEnd = () => {
      if (isDraggingText) {
        isDraggingText = false;
        textCanvas.style.cursor = 'grab';
        updateTextLive(false);
      }
    };

    function moveTextToPoint(clientX, clientY) {
      const rect = textCanvas.getBoundingClientRect();
      const scaleX = textCanvas.width / rect.width;
      const scaleY = textCanvas.height / rect.height;
      const pixelX = (clientX - rect.left) * scaleX;
      const pixelY = (clientY - rect.top) * scaleY;

      textPosX = Math.max(0.05, Math.min(0.95, pixelX / textCanvas.width));
      textPosY = Math.max(0.05, Math.min(0.95, pixelY / textCanvas.height));

      updateTextLive(true);
    }

    textCanvas.onmousedown = (e) => handleTextPointerStart(e.clientX, e.clientY);
    window.addEventListener('mousemove', (e) => handleTextPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleTextPointerEnd);

    // Touch
    textCanvas.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleTextPointerStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    textCanvas.ontouchmove = (e) => {
      if (e.touches.length === 1 && isDraggingText) {
        e.preventDefault();
        handleTextPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    textCanvas.ontouchend = handleTextPointerEnd;

    updateTextLive();
  }

  window.updateTextLive = function(showDragGuide = false) {
    if (!textCanvas) textCanvas = document.getElementById('canvas-text');
    if (!textCanvas) return;
    textCtx = textCanvas.getContext('2d');

    // Redraw base image
    textCanvas.width = engine.activeCanvas.width;
    textCanvas.height = engine.activeCanvas.height;
    textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    textCtx.drawImage(engine.activeCanvas, 0, 0);

    const text = document.getElementById('txt-content')?.value || 'PixKit Studio';
    const size = parseFloat(document.getElementById('txt-size')?.value || 52);
    const color = document.getElementById('txt-color')?.value || '#FFFFFF';

    document.getElementById('lbl-txt-size').textContent = `${size}px`;

    const realX = textPosX * textCanvas.width;
    const realY = textPosY * textCanvas.height;

    textCtx.save();
    textCtx.font = `700 ${size}px 'Manrope', sans-serif`;
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';

    // Shadow
    textCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    textCtx.shadowBlur = 12;
    textCtx.shadowOffsetX = 2;
    textCtx.shadowOffsetY = 2;

    textCtx.fillStyle = color;
    textCtx.fillText(text, realX, realY);

    if (showDragGuide || isDraggingText) {
      textCtx.shadowColor = 'transparent';
      const metrics = textCtx.measureText(text);
      const boxW = metrics.width + 24;
      const boxH = size + 16;
      textCtx.strokeStyle = '#D7F36A';
      textCtx.lineWidth = 2;
      textCtx.setLineDash([6, 4]);
      textCtx.strokeRect(realX - boxW / 2, realY - boxH / 2, boxW, boxH);
    }

    textCtx.restore();

    const readout = document.getElementById('text-pos-readout');
    if (readout) {
      readout.textContent = `Position: ${Math.round(textPosX * 100)}%, ${Math.round(textPosY * 100)}%`;
    }
  };

  window.commitTextAction = async function(download = false) {
    const text = document.getElementById('txt-content')?.value || 'PixKit Studio';
    const size = parseFloat(document.getElementById('txt-size')?.value || 52);
    const color = document.getElementById('txt-color')?.value || '#FFFFFF';

    const outCanvas = document.createElement('canvas');
    outCanvas.width = engine.activeCanvas.width;
    outCanvas.height = engine.activeCanvas.height;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(engine.activeCanvas, 0, 0);

    ctx.save();
    ctx.font = `700 ${size}px 'Manrope', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, textPosX * outCanvas.width, textPosY * outCanvas.height);
    ctx.restore();

    engine.activeCanvas.width = outCanvas.width;
    engine.activeCanvas.height = outCanvas.height;
    engine.activeCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
    engine.activeCtx.drawImage(outCanvas, 0, 0);
    engine.pushHistory(`Add Text "${text}"`);

    showToast(`Added text "${text}"`);
    syncMetadata();
    initTextCanvas();

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded image with text');
    }
  };

  // ==============================================================
  // 8. DRAW & SHAPES (With Interactive Cursor Move & Reposition)
  // ==============================================================
  let drawMode = 'pen';
  let strokeW = 5;
  let isActionActive = false;
  let drawCanvas, drawCtx;
  let drawnShapes = [];
  let selectedShapeIndex = -1;
  let currentShapeBeingDrawn = null;

  window.setDrawMode = function(mode) {
    drawMode = mode;
    selectedShapeIndex = -1;

    ['pen', 'rect', 'circle', 'arrow', 'move'].forEach(m => {
      const btn = document.getElementById(`tool-${m === 'arrow' ? 'arrow-btn' : m}`);
      if (btn) {
        const isSel = m === mode;
        btn.style.background = isSel ? 'var(--lime-tint)' : 'var(--white)';
        btn.style.borderColor = isSel ? 'var(--accent-lime-border)' : 'var(--line)';
        btn.style.fontWeight = isSel ? '700' : '500';
      }
    });

    const hint = document.getElementById('draw-mode-hint');
    const moveTip = document.getElementById('move-tip-box');

    if (mode === 'move') {
      if (hint) hint.innerHTML = '✋ <b>Move mode</b>: Click & drag any shape to reposition';
      if (moveTip) moveTip.style.display = 'flex';
      if (drawCanvas) drawCanvas.style.cursor = 'move';
    } else {
      if (hint) hint.innerHTML = `✎ <b>${mode.toUpperCase()} mode</b>: Drag on canvas to draw`;
      if (moveTip) moveTip.style.display = 'none';
      if (drawCanvas) drawCanvas.style.cursor = 'crosshair';
    }

    redrawDrawCanvas();
  };

  window.updateDrawStroke = function(val) {
    strokeW = parseInt(val, 10);
    document.getElementById('lbl-draw-stroke').textContent = `${strokeW}px`;
  };

  window.clearDrawings = function() {
    drawnShapes = [];
    selectedShapeIndex = -1;
    redrawDrawCanvas();
    showToast('Cleared all shapes');
  };

  function redrawDrawCanvas() {
    if (!drawCanvas) return;
    drawCanvas.width = engine.activeCanvas.width;
    drawCanvas.height = engine.activeCanvas.height;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawCtx.drawImage(engine.activeCanvas, 0, 0);

    drawnShapes.forEach((shape, index) => {
      drawSingleShape(drawCtx, shape, index === selectedShapeIndex);
    });

    if (currentShapeBeingDrawn) {
      drawSingleShape(drawCtx, currentShapeBeingDrawn, false);
    }

    const countLabel = document.getElementById('shapes-count-label');
    if (countLabel) {
      countLabel.textContent = `${drawnShapes.length} shape${drawnShapes.length === 1 ? '' : 's'} on canvas`;
    }
  }

  function drawSingleShape(ctx, shape, isSelected = false) {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.strokeW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (shape.type === 'pen') {
      if (shape.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
      }
    } else if (shape.type === 'rect') {
      ctx.beginPath();
      ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
    } else if (shape.type === 'circle') {
      ctx.beginPath();
      const rx = Math.abs(shape.w) / 2;
      const ry = Math.abs(shape.h) / 2;
      ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape.type === 'arrow') {
      drawArrowGraphic(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.strokeW);
    }

    if (isSelected && drawMode === 'move') {
      const bounds = getShapeBounds(shape);
      ctx.strokeStyle = '#D7F36A';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(bounds.x - 8, bounds.y - 8, bounds.w + 16, bounds.h + 16);
    }

    ctx.restore();
  }

  function getShapeBounds(shape) {
    if (shape.type === 'rect' || shape.type === 'circle') {
      return {
        x: Math.min(shape.x, shape.x + shape.w),
        y: Math.min(shape.y, shape.y + shape.h),
        w: Math.abs(shape.w),
        h: Math.abs(shape.h)
      };
    } else if (shape.type === 'arrow') {
      const minX = Math.min(shape.x1, shape.x2);
      const minY = Math.min(shape.y1, shape.y2);
      return { x: minX, y: minY, w: Math.abs(shape.x2 - shape.x1), h: Math.abs(shape.y2 - shape.y1) };
    } else if (shape.type === 'pen') {
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { x: minX, y: minY, w: Math.max(20, maxX - minX), h: Math.max(20, maxY - minY) };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  function hitTestShape(shape, px, py) {
    const bounds = getShapeBounds(shape);
    const pad = 16;
    return (
      px >= bounds.x - pad &&
      px <= bounds.x + bounds.w + pad &&
      py >= bounds.y - pad &&
      py <= bounds.y + bounds.h + pad
    );
  }

  function initDrawingCanvas() {
    drawCanvas = document.getElementById('canvas-draw');
    if (!drawCanvas) return;
    drawCtx = drawCanvas.getContext('2d');

    redrawDrawCanvas();

    let startX = 0, startY = 0;

    const handlePointerDown = (clientX, clientY) => {
      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;
      startX = (clientX - rect.left) * scaleX;
      startY = (clientY - rect.top) * scaleY;

      isActionActive = true;
      const curColor = document.getElementById('draw-color')?.value || '#D7F36A';

      if (drawMode === 'move') {
        selectedShapeIndex = -1;
        for (let i = drawnShapes.length - 1; i >= 0; i--) {
          if (hitTestShape(drawnShapes[i], startX, startY)) {
            selectedShapeIndex = i;
            break;
          }
        }
        redrawDrawCanvas();
      } else if (drawMode === 'pen') {
        currentShapeBeingDrawn = {
          type: 'pen',
          points: [{ x: startX, y: startY }],
          color: curColor,
          strokeW
        };
      } else if (drawMode === 'rect') {
        currentShapeBeingDrawn = { type: 'rect', x: startX, y: startY, w: 0, h: 0, color: curColor, strokeW };
      } else if (drawMode === 'circle') {
        currentShapeBeingDrawn = { type: 'circle', x: startX, y: startY, w: 0, h: 0, color: curColor, strokeW };
      } else if (drawMode === 'arrow') {
        currentShapeBeingDrawn = { type: 'arrow', x1: startX, y1: startY, x2: startX, y2: startY, color: curColor, strokeW };
      }
    };

    const handlePointerMove = (clientX, clientY) => {
      if (!isActionActive) return;
      const rect = drawCanvas.getBoundingClientRect();
      const scaleX = drawCanvas.width / rect.width;
      const scaleY = drawCanvas.height / rect.height;
      const curX = (clientX - rect.left) * scaleX;
      const curY = (clientY - rect.top) * scaleY;

      if (drawMode === 'move' && selectedShapeIndex !== -1) {
        const shape = drawnShapes[selectedShapeIndex];
        const dx = curX - startX;
        const dy = curY - startY;
        startX = curX;
        startY = curY;

        if (shape.type === 'rect' || shape.type === 'circle') {
          shape.x += dx;
          shape.y += dy;
        } else if (shape.type === 'arrow') {
          shape.x1 += dx; shape.y1 += dy;
          shape.x2 += dx; shape.y2 += dy;
        } else if (shape.type === 'pen') {
          shape.points.forEach(p => { p.x += dx; p.y += dy; });
        }
        redrawDrawCanvas();
      } else if (currentShapeBeingDrawn) {
        if (drawMode === 'pen') {
          currentShapeBeingDrawn.points.push({ x: curX, y: curY });
        } else if (drawMode === 'rect' || drawMode === 'circle') {
          currentShapeBeingDrawn.w = curX - startX;
          currentShapeBeingDrawn.h = curY - startY;
        } else if (drawMode === 'arrow') {
          currentShapeBeingDrawn.x2 = curX;
          currentShapeBeingDrawn.y2 = curY;
        }
        redrawDrawCanvas();
      }
    };

    const handlePointerUp = () => {
      if (!isActionActive) return;
      isActionActive = false;

      if (currentShapeBeingDrawn) {
        drawnShapes.push(currentShapeBeingDrawn);
        currentShapeBeingDrawn = null;
        redrawDrawCanvas();
      }
    };

    drawCanvas.onmousedown = (e) => handlePointerDown(e.clientX, e.clientY);
    window.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handlePointerUp);

    drawCanvas.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    drawCanvas.ontouchmove = (e) => {
      if (e.touches.length === 1 && isActionActive) {
        e.preventDefault();
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    drawCanvas.ontouchend = handlePointerUp;
  }

  function drawArrowGraphic(ctx, fromX, fromY, toX, toY, width) {
    const headlen = width * 3 + 12;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  window.commitDrawAction = async function(download = false) {
    if (drawCanvas) {
      engine.commitDrawing(drawCanvas);
      showToast('Committed drawings & shapes');
      drawnShapes = [];
      syncMetadata();
    }
    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded annotated image');
    }
  };



  // ==============================================================
  // 09. BLUR & FOCUS HANDLERS (Guidelines & Brush & 5 Styles)
  // ==============================================================
  let blurOptions = {
    mode: 'radial',
    blurType: 'gaussian', // 'gaussian', 'pixelate', 'motion', 'zoom', 'frosted'
    blurRadius: 18,
    focusX: 0.5,
    focusY: 0.5,
    focusRadius: 0.35,
    bandCenterY: 0.5,
    bandHeight: 0.25,
    brushSize: 45
  };

  let blurBrushMaskCanvas = null;
  let isDraggingBlurFocus = false;
  let isPaintingBlur = false;
  let lastBlurBrushPos = null;
  let blurHoverPos = null;

  function initBlurCanvas() {
    if (!blurBrushMaskCanvas || blurBrushMaskCanvas.width !== engine.activeCanvas.width || blurBrushMaskCanvas.height !== engine.activeCanvas.height) {
      blurBrushMaskCanvas = document.createElement('canvas');
      blurBrushMaskCanvas.width = engine.activeCanvas.width;
      blurBrushMaskCanvas.height = engine.activeCanvas.height;
    }

    const overlay = document.getElementById('canvas-blur-overlay');
    if (overlay) {
      overlay.width = engine.activeCanvas.width;
      overlay.height = engine.activeCanvas.height;
    }

    setupBlurOverlayEvents();
    updateBlurLive();
  }

  function getBlurPointerPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      normX: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      normY: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    };
  }

  function setupBlurOverlayEvents() {
    const overlay = document.getElementById('canvas-blur-overlay');
    if (!overlay) return;

    overlay.onmousedown = (e) => {
      const pos = getBlurPointerPos(e, overlay);
      if (blurOptions.mode === 'brush') {
        isPaintingBlur = true;
        lastBlurBrushPos = { x: pos.x, y: pos.y };
        paintBlurStroke(pos.x, pos.y, pos.x, pos.y);
      } else if (blurOptions.mode === 'radial' || blurOptions.mode === 'tiltshift') {
        isDraggingBlurFocus = true;
        blurOptions.focusX = pos.normX;
        blurOptions.focusY = pos.normY;
        blurOptions.bandCenterY = pos.normY;
        updateBlurLive();
      }
    };

    overlay.onmousemove = (e) => {
      const pos = getBlurPointerPos(e, overlay);
      blurHoverPos = { x: pos.x, y: pos.y };

      if (blurOptions.mode === 'brush') {
        if (isPaintingBlur) {
          paintBlurStroke(lastBlurBrushPos.x, lastBlurBrushPos.y, pos.x, pos.y);
          lastBlurBrushPos = { x: pos.x, y: pos.y };
        } else {
          drawBlurOverlayGuides(); // Refresh brush cursor ring
        }
      } else if (isDraggingBlurFocus) {
        blurOptions.focusX = pos.normX;
        blurOptions.focusY = pos.normY;
        blurOptions.bandCenterY = pos.normY;
        updateBlurLive();
      }
    };

    window.addEventListener('mouseup', () => {
      if (isPaintingBlur) isPaintingBlur = false;
      if (isDraggingBlurFocus) isDraggingBlurFocus = false;
    });

    overlay.onmouseleave = () => {
      blurHoverPos = null;
      if (blurOptions.mode === 'brush' && !isPaintingBlur) {
        drawBlurOverlayGuides();
      }
    };

    // Touch Support
    overlay.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const pos = getBlurPointerPos(e, overlay);
        if (blurOptions.mode === 'brush') {
          isPaintingBlur = true;
          lastBlurBrushPos = { x: pos.x, y: pos.y };
          paintBlurStroke(pos.x, pos.y, pos.x, pos.y);
        } else if (blurOptions.mode === 'radial' || blurOptions.mode === 'tiltshift') {
          isDraggingBlurFocus = true;
          blurOptions.focusX = pos.normX;
          blurOptions.focusY = pos.normY;
          blurOptions.bandCenterY = pos.normY;
          updateBlurLive();
        }
      }
    };

    overlay.ontouchmove = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const pos = getBlurPointerPos(e, overlay);
        blurHoverPos = { x: pos.x, y: pos.y };
        if (blurOptions.mode === 'brush' && isPaintingBlur) {
          paintBlurStroke(lastBlurBrushPos.x, lastBlurBrushPos.y, pos.x, pos.y);
          lastBlurBrushPos = { x: pos.x, y: pos.y };
        } else if (isDraggingBlurFocus) {
          blurOptions.focusX = pos.normX;
          blurOptions.focusY = pos.normY;
          blurOptions.bandCenterY = pos.normY;
          updateBlurLive();
        }
      }
    };

    overlay.ontouchend = () => {
      isPaintingBlur = false;
      isDraggingBlurFocus = false;
      blurHoverPos = null;
    };
  }

  function paintBlurStroke(x1, y1, x2, y2) {
    if (!blurBrushMaskCanvas) return;
    const ctx = blurBrushMaskCanvas.getContext('2d');
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = blurOptions.brushSize;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Circle at endpoints for single-click paint
    ctx.beginPath();
    ctx.arc(x2, y2, blurOptions.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    updateBlurLive();
  }

  window.clearBlurBrush = function() {
    if (blurBrushMaskCanvas) {
      const ctx = blurBrushMaskCanvas.getContext('2d');
      ctx.clearRect(0, 0, blurBrushMaskCanvas.width, blurBrushMaskCanvas.height);
    }
    updateBlurLive();
    showToast('Cleared painted blur brush');
  };

  window.updateBlurBrushSize = function(val) {
    blurOptions.brushSize = parseInt(val, 10);
    document.getElementById('lbl-blur-brush-size').textContent = `${val}px`;
    drawBlurOverlayGuides();
  };

  window.setBlurMode = function(mode) {
    blurOptions.mode = mode;
    document.querySelectorAll('#blur-mode-radial, #blur-mode-tilt, #blur-mode-brush, #blur-mode-full').forEach(btn => btn.classList.remove('active'));
    
    let btnId = `blur-mode-${mode}`;
    if (mode === 'tiltshift') btnId = 'blur-mode-tilt';
    document.getElementById(btnId)?.classList.add('active');

    const isFull = mode === 'full';
    const isBrush = mode === 'brush';
    const isGuideMode = mode === 'radial' || mode === 'tiltshift';

    document.getElementById('group-focus-radius').style.display = isGuideMode ? 'block' : 'none';
    document.getElementById('group-blur-brush-size').style.display = isBrush ? 'block' : 'none';
    document.getElementById('group-blur-brush-tools').style.display = isBrush ? 'block' : 'none';
    document.getElementById('group-blur-guides').style.display = isGuideMode ? 'block' : 'none';

    const lblTitle = document.getElementById('lbl-focus-title');
    if (lblTitle) {
      lblTitle.textContent = mode === 'radial' ? 'Bokeh Focus Radius' : 'Sharp Band Height';
    }

    const tip = document.getElementById('blur-mode-tip');
    if (tip) {
      if (mode === 'radial') {
        tip.innerHTML = '<span>Tip: Drag the green bullseye to move focus. Dashed rings indicate sharp core and blur edge.</span>';
      } else if (mode === 'tiltshift') {
        tip.innerHTML = '<span>Tip: Drag up or down on the canvas to move the miniature focus line.</span>';
      } else if (mode === 'brush') {
        tip.innerHTML = '<span>Tip: Paint directly with your cursor or touch over any image area to blur it.</span>';
      } else {
        tip.innerHTML = '<span>Tip: Full frame blur applies uniform Gaussian blur across the entire image.</span>';
      }
    }

    const overlay = document.getElementById('canvas-blur-overlay');
    if (overlay) {
      overlay.style.cursor = isBrush ? 'none' : 'crosshair';
    }

    updateBlurLive();
  };

  window.setBlurType = function(type) {
    blurOptions.blurType = type;
    document.querySelectorAll('#blur-type-gaussian, #blur-type-pixelate, #blur-type-motion, #blur-type-zoom, #blur-type-frosted').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`blur-type-${type}`)?.classList.add('active');

    const lblTitle = document.getElementById('lbl-blur-strength-title');
    if (lblTitle) {
      if (type === 'pixelate') lblTitle.textContent = 'Pixel Block Size';
      else if (type === 'motion') lblTitle.textContent = 'Motion Streak Distance';
      else if (type === 'zoom') lblTitle.textContent = 'Radial Zoom Intensity';
      else if (type === 'frosted') lblTitle.textContent = 'Frosted Diffusion Radius';
      else lblTitle.textContent = 'Blur Intensity';
    }

    updateBlurLive();
  };

  window.updateBlurLive = function() {
    blurOptions.blurRadius = parseInt(document.getElementById('blur-radius')?.value || 18, 10);
    const focusPct = parseInt(document.getElementById('blur-focus-size')?.value || 35, 10);
    blurOptions.focusRadius = focusPct / 100;
    blurOptions.bandHeight = focusPct / 100;

    document.getElementById('lbl-blur-radius').textContent = `${blurOptions.blurRadius}px`;
    const lblFocus = document.getElementById('lbl-focus-size');
    if (lblFocus) lblFocus.textContent = `${focusPct}%`;

    const out = engine.applySelectiveBlur({
      ...blurOptions,
      brushCanvas: blurBrushMaskCanvas
    });

    const canvas = document.getElementById('canvas-blur');
    if (canvas) {
      canvas.width = out.width;
      canvas.height = out.height;
      canvas.getContext('2d').clearRect(0, 0, out.width, out.height);
      canvas.getContext('2d').drawImage(out, 0, 0);
    }

    drawBlurOverlayGuides();
  };

  window.drawBlurOverlayGuides = function() {
    const overlay = document.getElementById('canvas-blur-overlay');
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    const w = overlay.width;
    const h = overlay.height;
    ctx.clearRect(0, 0, w, h);

    const showGuides = document.getElementById('blur-show-guides')?.checked ?? true;

    // 1. Radial Bokeh Guide Rings
    if (blurOptions.mode === 'radial' && showGuides) {
      const fx = blurOptions.focusX * w;
      const fy = blurOptions.focusY * h;
      const fr = blurOptions.focusRadius * Math.min(w, h);
      const innerR = fr * 0.4;

      // Outer blur boundary ring
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.stroke();

      // Outer label badge
      ctx.font = '600 12px "DM Sans", -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(34, 36, 31, 0.85)';
      ctx.fillRect(fx - 65, fy - fr - 22, 130, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Blur Outer Boundary', fx, fy - fr - 12);

      // Inner 100% sharp core ring
      ctx.strokeStyle = '#D7F36A';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(fx, fy, innerR, 0, Math.PI * 2);
      ctx.stroke();

      // Center Focal Bullseye
      ctx.setLineDash([]);
      ctx.fillStyle = '#D7F36A';
      ctx.beginPath();
      ctx.arc(fx, fy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22241F';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshair tick marks
      ctx.strokeStyle = '#D7F36A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx - 16, fy); ctx.lineTo(fx + 16, fy);
      ctx.moveTo(fx, fy - 16); ctx.lineTo(fx, fy + 16);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Tilt-Shift Guide Lines
    else if (blurOptions.mode === 'tiltshift' && showGuides) {
      const cy = blurOptions.bandCenterY * h;
      const bh = blurOptions.bandHeight * h;
      const topFocusY = cy - bh / 2;
      const bottomFocusY = cy + bh / 2;
      const topTransY = cy - bh / 2 - bh * 0.4;
      const bottomTransY = cy + bh / 2 + bh * 0.4;

      ctx.save();

      // Sharp Band Fill highlight
      ctx.fillStyle = 'rgba(215, 243, 106, 0.08)';
      ctx.fillRect(0, Math.max(0, topFocusY), w, Math.max(0, bottomFocusY - topFocusY));

      // Center Line
      ctx.strokeStyle = '#D7F36A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cy); ctx.lineTo(w, cy);
      ctx.stroke();

      // Center Bullseye Marker
      ctx.fillStyle = '#D7F36A';
      ctx.beginPath();
      ctx.arc(w / 2, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22241F';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Top Sharp Boundary Line
      ctx.strokeStyle = '#D7F36A';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, topFocusY); ctx.lineTo(w, topFocusY);
      ctx.stroke();

      // Bottom Sharp Boundary Line
      ctx.beginPath();
      ctx.moveTo(0, bottomFocusY); ctx.lineTo(w, bottomFocusY);
      ctx.stroke();

      // Boundary Labels
      ctx.setLineDash([]);
      ctx.font = '600 11px "DM Sans", -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(34, 36, 31, 0.85)';
      ctx.fillRect(16, topFocusY - 18, 140, 18);
      ctx.fillStyle = '#D7F36A';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲ Sharp Boundary (Top)', 22, topFocusY - 9);

      ctx.fillStyle = 'rgba(34, 36, 31, 0.85)';
      ctx.fillRect(16, bottomFocusY + 2, 160, 18);
      ctx.fillStyle = '#D7F36A';
      ctx.fillText('▼ Sharp Boundary (Bottom)', 22, bottomFocusY + 11);

      // Outer Transition Dashed Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, topTransY); ctx.lineTo(w, topTransY);
      ctx.moveTo(0, bottomTransY); ctx.lineTo(w, bottomTransY);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Brush Mode Cursor Circle
    else if (blurOptions.mode === 'brush' && blurHoverPos) {
      ctx.save();
      const r = blurOptions.brushSize / 2;
      ctx.strokeStyle = '#D7F36A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(blurHoverPos.x, blurHoverPos.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(215, 243, 106, 0.2)';
      ctx.fill();

      // Center dot
      ctx.fillStyle = '#22241F';
      ctx.beginPath();
      ctx.arc(blurHoverPos.x, blurHoverPos.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  window.commitBlurAction = async function(download = false) {
    engine.commitSelectiveBlur({
      ...blurOptions,
      brushCanvas: blurBrushMaskCanvas
    });
    showToast('Applied selective blur');
    if (blurBrushMaskCanvas) {
      const ctx = blurBrushMaskCanvas.getContext('2d');
      ctx.clearRect(0, 0, blurBrushMaskCanvas.width, blurBrushMaskCanvas.height);
    }
    syncMetadata();
    initBlurCanvas();
    updateHistoryUI();

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded blurred image');
    }
  };

  // ==============================================================
  // TOOL 10: FORMAT CONVERTER CONTROLLER
  // ==============================================================
  let convertState = {
    targetFormat: 'jpeg', // 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp'
    quality: 90,
    bgColor: '#ffffff'
  };

  let convertCalcTimeout = null;

  function initConvertFormatStage() {
    renderToCanvas('canvas-convert-format');
    
    // Auto-select smart target format if current source matches default
    const origFmt = engine.getFormatLabel();
    if (origFmt === 'JPG' && convertState.targetFormat === 'jpeg') {
      convertState.targetFormat = 'webp';
    } else if (origFmt === 'PNG' && convertState.targetFormat === 'png') {
      convertState.targetFormat = 'webp';
    }

    ['jpeg', 'png', 'webp', 'avif', 'heic', 'svg', 'ico', 'bmp'].forEach(f => {
      document.getElementById(`fmt-opt-${f}`)?.classList.toggle('active', f === convertState.targetFormat);
    });

    updateConvertUIState();
    recalculateConvertEstimates();
  }

  window.setConvertTargetFormat = function(format) {
    convertState.targetFormat = format;
    ['jpeg', 'png', 'webp', 'avif', 'heic', 'svg', 'ico', 'bmp'].forEach(f => {
      document.getElementById(`fmt-opt-${f}`)?.classList.toggle('active', f === format);
    });
    updateConvertUIState();
    recalculateConvertEstimates();
  };

  function updateConvertUIState() {
    const fmt = convertState.targetFormat;
    const qGroup = document.getElementById('convert-quality-group');
    const bgGroup = document.getElementById('convert-bg-fill-group');
    const dlBtn = document.getElementById('btn-convert-download');

    // Quality slider applies to lossy/configurable formats (JPG, WEBP, AVIF, HEIC)
    const supportsQuality = (fmt === 'jpeg' || fmt === 'webp' || fmt === 'avif' || fmt === 'heic');
    if (qGroup) qGroup.style.display = supportsQuality ? 'block' : 'none';

    // Background fill option applies to non-alpha formats (JPG, BMP)
    const needsBgFill = (fmt === 'jpeg' || fmt === 'bmp');
    if (bgGroup) bgGroup.style.display = needsBgFill ? 'block' : 'none';

    // Update download button label
    const fmtLabel = fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase();
    if (dlBtn) dlBtn.textContent = `Convert & Download ${fmtLabel}`;

    const targetNameSpan = document.getElementById('convert-target-name');
    if (targetNameSpan) targetNameSpan.textContent = fmtLabel;
  }

  window.updateConvertQuality = function(val) {
    convertState.quality = parseInt(val, 10);
    const lbl = document.getElementById('lbl-convert-quality');
    if (lbl) lbl.textContent = `${convertState.quality}%`;

    // Update chip active states
    [100, 90, 75, 50].forEach(q => {
      document.getElementById(`chip-q-${q}`)?.classList.toggle('active', q === convertState.quality);
    });

    debouncedRecalculateConvert();
  };

  window.setConvertQualityPreset = function(q) {
    const slider = document.getElementById('convert-quality');
    if (slider) slider.value = q;
    window.updateConvertQuality(q);
  };

  window.updateConvertBgPreview = function(color) {
    convertState.bgColor = color;
    document.getElementById('btn-bg-white')?.classList.toggle('active', color.toLowerCase() === '#ffffff');
    document.getElementById('btn-bg-black')?.classList.toggle('active', color.toLowerCase() === '#000000');
    debouncedRecalculateConvert();
  };

  window.setConvertBgColor = function(color) {
    convertState.bgColor = color;
    const picker = document.getElementById('convert-bg-color');
    if (picker) picker.value = color;
    window.updateConvertBgPreview(color);
  };

  function debouncedRecalculateConvert() {
    clearTimeout(convertCalcTimeout);
    convertCalcTimeout = setTimeout(recalculateConvertEstimates, 180);
  }

  async function recalculateConvertEstimates() {
    const origFormatSpan = document.getElementById('convert-orig-format');
    const origSizeSpan = document.getElementById('convert-orig-size');
    const estSizeSpan = document.getElementById('convert-est-size');
    const savingsBadge = document.getElementById('convert-savings-badge');
    const metaSpan = document.getElementById('meta-convert-format');
    const targetNameSpan = document.getElementById('convert-target-name');

    const origExt = engine.getFormatLabel();
    const origBytes = engine.fileSize || 0;
    const fmt = convertState.targetFormat;
    const fmtLabel = fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase();

    if (targetNameSpan) targetNameSpan.textContent = fmtLabel;
    if (origFormatSpan) origFormatSpan.textContent = origExt;
    if (origSizeSpan) origSizeSpan.textContent = origBytes > 0 ? PixKitEngine.formatBytes(origBytes) : `${engine.activeCanvas.width} × ${engine.activeCanvas.height} px`;

    try {
      const qFraction = convertState.quality / 100;
      const res = await engine.convertFormat(convertState.targetFormat, qFraction, convertState.bgColor);
      
      const formattedSize = PixKitEngine.formatBytes(res.size);
      if (estSizeSpan) estSizeSpan.textContent = formattedSize;
      if (metaSpan) metaSpan.textContent = `${engine.filename || 'image'} (${res.width} × ${res.height} px) · ${res.extension.toUpperCase()} · ${formattedSize}`;

      if (savingsBadge) {
        if (origBytes > 0 && res.size > 0) {
          const delta = res.size - origBytes;
          const pct = Math.round((Math.abs(delta) / origBytes) * 100);
          if (delta < -1000) {
            savingsBadge.textContent = `-${pct}% Smaller (${formattedSize})`;
            savingsBadge.style.background = 'var(--lime-tint)';
            savingsBadge.style.color = '#2d6a4f';
            savingsBadge.style.borderColor = 'var(--accent-lime-border)';
          } else if (delta > 1000) {
            savingsBadge.textContent = `+${pct}% (${formattedSize})`;
            savingsBadge.style.background = 'var(--soft)';
            savingsBadge.style.color = 'var(--ink)';
            savingsBadge.style.borderColor = 'var(--line)';
          } else {
            savingsBadge.textContent = `~${formattedSize} (Similar)`;
            savingsBadge.style.background = 'var(--soft)';
            savingsBadge.style.color = 'var(--ink)';
            savingsBadge.style.borderColor = 'var(--line)';
          }
        } else {
          savingsBadge.textContent = `Est: ${formattedSize}`;
          savingsBadge.style.background = 'var(--lime-tint)';
          savingsBadge.style.color = '#2d6a4f';
          savingsBadge.style.borderColor = 'var(--accent-lime-border)';
        }
      }
    } catch (err) {
      console.warn('Conversion estimate error:', err);
      // Fallback estimate calculation based on dimensions and quality
      const pixels = (engine.activeCanvas.width || 800) * (engine.activeCanvas.height || 600);
      let approxBytes = pixels * 0.25 * (convertState.quality / 100);
      if (convertState.targetFormat === 'png' || convertState.targetFormat === 'bmp') approxBytes = pixels * 2.2;
      const fallbackFormatted = PixKitEngine.formatBytes(approxBytes);
      if (estSizeSpan) estSizeSpan.textContent = `~${fallbackFormatted}`;
      if (savingsBadge) {
        savingsBadge.textContent = `~${fallbackFormatted}`;
        savingsBadge.style.background = 'var(--soft)';
        savingsBadge.style.color = 'var(--ink)';
      }
    }
  }

  window.commitConvertAction = async function(download = true) {
    const qFraction = convertState.quality / 100;
    const res = await engine.convertFormat(convertState.targetFormat, qFraction, convertState.bgColor);

    if (download) {
      const baseName = engine.filename ? engine.filename.replace(/\.[^/.]+$/, "") : 'image';
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_converted.${res.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Converted to ${res.extension.toUpperCase()} (${PixKitEngine.formatBytes(res.size)})`);
    } else {
      const img = new Image();
      const url = URL.createObjectURL(res.blob);
      img.onload = () => {
        engine.activeCanvas.width = img.naturalWidth;
        engine.activeCanvas.height = img.naturalHeight;
        engine.activeCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
        engine.activeCtx.drawImage(img, 0, 0);
        engine.fileType = res.mimeType;
        engine.fileSize = res.size;
        engine.filename = `${(engine.filename || 'image').replace(/\.[^/.]+$/, "")}.${res.extension}`;
        engine.pushHistory(`Convert to ${res.extension.toUpperCase()}`);
        syncMetadata();
        initConvertFormatStage();
        updateHistoryUI();
        persistCurrentSession();
        URL.revokeObjectURL(url);
        showToast(`Converted workspace to ${res.extension.toUpperCase()}`);
      };
      img.src = url;
    }
  };

  // ==============================================================
  // TOOL 11: HEIC TO JPG CONTROLLER
  // ==============================================================
  // ==========================================================================
  // TOOL 11: HEIC TO JPG / PNG CONVERTER
  // ==========================================================================
  let heicState = {
    targetFormat: 'jpeg', // 'jpeg' | 'png'
    quality: 92,
    rawHeicBlob: null,
    rawHeicName: '',
    rawHeicSize: 0,
    isHeicValid: false
  };

  let heicCalcTimeout = null;

  function isCurrentFileHeic() {
    const fn = (engine.filename || '').toLowerCase();
    return fn.endsWith('.heic') || fn.endsWith('.heif') || heicState.isHeicValid === true;
  }

  function initConvertHeicStage() {
    renderToCanvas('canvas-convert-heic');
    updateHeicUIState();
    recalculateHeicEstimates();
  }

  window.handleHeicFileSelect = async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const fn = file.name.toLowerCase();
    const isHeicExt = fn.endsWith('.heic') || fn.endsWith('.heif') || (file.type && (file.type.includes('heic') || file.type.includes('heif')));

    if (!isHeicExt) {
      heicState.isHeicValid = false;
      showToast(`⚠️ Incorrect format: "${file.name}" is not a .heic/.heif photo`);
      
      const alertBox = document.getElementById('heic-format-alert');
      const warningText = document.getElementById('heic-warning-text');
      const successBox = document.getElementById('heic-format-success');
      
      if (alertBox) alertBox.style.display = 'flex';
      if (successBox) successBox.style.display = 'none';
      if (warningText) {
        warningText.innerHTML = `You selected <strong>${file.name}</strong>, which is not an Apple HEIC/HEIF photo. Please choose a file with <strong>.heic</strong> or <strong>.heif</strong> extension.`;
      }
      updateHeicButtonStates(false);
      return;
    }

    showToast('Decoding HEIC photo in browser...');
    heicState.rawHeicBlob = file;
    heicState.rawHeicName = file.name;
    heicState.rawHeicSize = file.size;
    heicState.isHeicValid = true;

    try {
      await engine.loadFromFile(file);
      hasUserAddedImage = true;
      syncMetadata();
      initConvertHeicStage();
      updateHistoryUI();
      persistCurrentSession();
      showToast(`Decoded ${file.name} (${engine.activeCanvas.width} × ${engine.activeCanvas.height} px)`);
    } catch (err) {
      console.error(err);
      heicState.isHeicValid = false;
      showToast('Failed to decode HEIC file. Please verify the file.');
      updateHeicButtonStates(false);
    }
  };

  window.setHeicTargetFormat = function(format) {
    heicState.targetFormat = format;
    ['jpg', 'png'].forEach(f => {
      const isMatch = (f === 'jpg' && format === 'jpeg') || (f === format);
      document.getElementById(`heic-fmt-${f}`)?.classList.toggle('active', isMatch);
    });

    const qGroup = document.getElementById('heic-quality-group');
    if (qGroup) qGroup.style.display = format === 'jpeg' ? 'block' : 'none';

    const fmtLabel = format === 'jpeg' ? 'JPG' : 'PNG';
    const dlBtn = document.getElementById('btn-heic-download');
    if (dlBtn) dlBtn.textContent = `Convert & Download ${fmtLabel}`;

    const targetNameSpan = document.getElementById('heic-target-name');
    if (targetNameSpan) targetNameSpan.textContent = fmtLabel;

    recalculateHeicEstimates();
  };

  function updateHeicButtonStates(isValid) {
    const dlBtn = document.getElementById('btn-heic-download');
    const studioBtn = document.querySelector('#tool-convert-heic-view .btn-secondary');
    
    if (dlBtn) {
      dlBtn.disabled = !isValid;
      dlBtn.style.opacity = isValid ? '1' : '0.45';
      dlBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
      dlBtn.title = isValid ? '' : 'Please select a valid .HEIC photo first';
    }

    if (studioBtn) {
      studioBtn.disabled = !isValid;
      studioBtn.style.opacity = isValid ? '1' : '0.45';
      studioBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
  }

  function updateHeicUIState() {
    const isHeic = isCurrentFileHeic();
    heicState.isHeicValid = isHeic;

    const alertBox = document.getElementById('heic-format-alert');
    const warningText = document.getElementById('heic-warning-text');
    const successBox = document.getElementById('heic-format-success');
    const successText = document.getElementById('heic-success-text');

    if (isHeic) {
      if (alertBox) alertBox.style.display = 'none';
      if (successBox) {
        successBox.style.display = 'flex';
        if (successText) successText.textContent = `Apple HEIC photo loaded: ${engine.filename || 'photo.heic'} (${engine.activeCanvas.width} × ${engine.activeCanvas.height} px)`;
      }
      updateHeicButtonStates(true);
    } else {
      if (alertBox) alertBox.style.display = 'flex';
      if (successBox) successBox.style.display = 'none';
      if (warningText) {
        const curFormat = engine.getFormatLabel() || 'Unknown';
        const curFile = engine.filename || 'sample image';
        warningText.innerHTML = `The currently loaded file is <strong>${curFormat}</strong> (<em>${curFile}</em>). This tool is specifically built to convert Apple iPhone <strong>.HEIC / .HEIF</strong> photos. Please choose or upload a valid <strong>.HEIC</strong> photo to use this converter.`;
      }
      updateHeicButtonStates(false);
    }

    const fmt = heicState.targetFormat;
    const qGroup = document.getElementById('heic-quality-group');
    if (qGroup) qGroup.style.display = fmt === 'jpeg' ? 'block' : 'none';

    const fmtLabel = fmt === 'jpeg' ? 'JPG' : 'PNG';
    const dlBtn = document.getElementById('btn-heic-download');
    if (dlBtn) dlBtn.textContent = `Convert & Download ${fmtLabel}`;

    const targetNameSpan = document.getElementById('heic-target-name');
    if (targetNameSpan) targetNameSpan.textContent = fmtLabel;
  }

  window.updateHeicQuality = function(val) {
    heicState.quality = parseInt(val, 10);
    const lbl = document.getElementById('lbl-heic-quality');
    if (lbl) lbl.textContent = `${heicState.quality}%`;

    [100, 92, 80, 65].forEach(q => {
      document.getElementById(`chip-heic-${q}`)?.classList.toggle('active', q === heicState.quality);
    });

    clearTimeout(heicCalcTimeout);
    heicCalcTimeout = setTimeout(recalculateHeicEstimates, 180);
  };

  window.setHeicQualityPreset = function(q) {
    const slider = document.getElementById('heic-quality');
    if (slider) slider.value = q;
    window.updateHeicQuality(q);
  };

  async function recalculateHeicEstimates() {
    const origFormatSpan = document.getElementById('heic-orig-format');
    const origSizeSpan = document.getElementById('heic-orig-size');
    const estSizeSpan = document.getElementById('heic-est-size');
    const savingsBadge = document.getElementById('heic-savings-badge');
    const metaSpan = document.getElementById('meta-convert-heic');

    const origBytes = heicState.rawHeicSize || engine.fileSize || 0;
    const isHeic = isCurrentFileHeic();
    const origLabel = isHeic ? 'HEIC' : engine.getFormatLabel();

    if (origFormatSpan) origFormatSpan.textContent = origLabel;
    if (origSizeSpan) origSizeSpan.textContent = origBytes > 0 ? PixKitEngine.formatBytes(origBytes) : `${engine.activeCanvas.width} × ${engine.activeCanvas.height} px`;

    if (!isHeic) {
      if (metaSpan) metaSpan.textContent = `⚠️ Non-HEIC file (${origLabel}) · Please select a .heic photo`;
      if (savingsBadge) {
        savingsBadge.textContent = 'HEIC required';
        savingsBadge.style.background = '#fef2f2';
        savingsBadge.style.color = '#b91c1c';
        savingsBadge.style.borderColor = '#f87171';
      }
      if (estSizeSpan) estSizeSpan.textContent = '--';
      return;
    }

    try {
      const qFraction = heicState.quality / 100;
      const res = await engine.convertFormat(heicState.targetFormat, qFraction, '#ffffff');
      const formattedSize = PixKitEngine.formatBytes(res.size);
      
      if (estSizeSpan) estSizeSpan.textContent = formattedSize;
      if (metaSpan) metaSpan.textContent = `${engine.filename || 'photo.heic'} (${res.width} × ${res.height} px) · ${res.extension.toUpperCase()} · ${formattedSize}`;

      if (savingsBadge) {
        if (origBytes > 0 && res.size > 0) {
          const delta = res.size - origBytes;
          const pct = Math.round((Math.abs(delta) / origBytes) * 100);
          if (delta < -1000) {
            savingsBadge.textContent = `-${pct}% Smaller (${formattedSize})`;
            savingsBadge.style.background = 'var(--lime-tint)';
            savingsBadge.style.color = '#2d6a4f';
            savingsBadge.style.borderColor = 'var(--accent-lime-border)';
          } else if (delta > 1000) {
            savingsBadge.textContent = `+${pct}% (${formattedSize})`;
            savingsBadge.style.background = 'var(--soft)';
            savingsBadge.style.color = 'var(--ink)';
            savingsBadge.style.borderColor = 'var(--line)';
          } else {
            savingsBadge.textContent = `~${formattedSize}`;
            savingsBadge.style.background = 'var(--soft)';
            savingsBadge.style.color = 'var(--ink)';
            savingsBadge.style.borderColor = 'var(--line)';
          }
        } else {
          savingsBadge.textContent = `Est: ${formattedSize}`;
          savingsBadge.style.background = 'var(--lime-tint)';
          savingsBadge.style.color = '#2d6a4f';
          savingsBadge.style.borderColor = 'var(--accent-lime-border)';
        }
      }
    } catch (err) {
      console.warn('HEIC estimate calculation error:', err);
    }
  }

  window.commitHeicAction = async function(download = true) {
    if (!heicState.isHeicValid && !isCurrentFileHeic()) {
      showToast('⚠️ Please choose a valid .HEIC photo first');
      return;
    }

    const qFraction = heicState.quality / 100;
    const res = await engine.convertFormat(heicState.targetFormat, qFraction, '#ffffff');

    if (download) {
      const baseName = (engine.filename || 'photo').replace(/\.[^/.]+$/, "");
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.${res.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Downloaded ${baseName}.${res.extension} (${PixKitEngine.formatBytes(res.size)})`);
    } else {
      showToast('Opened in PixKit Studio');
      window.showView('edit');
    }
  };

  // ==========================================================================
  // TOOL 12: SVG TO PNG RASTERIZER CONTROLLER
  // ==========================================================================
  let svgState = {
    svgText: '',
    svgName: 'vector.svg',
    svgSize: 0,
    intrinsicWidth: 800,
    intrinsicHeight: 800,
    scale: 2,
    customWidth: 1024,
    customHeight: 1024,
    aspectRatioLocked: true,
    bgFill: 'transparent',
    targetFormat: 'png',
    isSvgValid: false,
    rasterizedResult: null
  };

  let svgRenderTimeout = null;

  function isCurrentFileSvg() {
    const fn = (engine.filename || '').toLowerCase();
    const mime = (engine.fileType || '').toLowerCase();
    return fn.endsWith('.svg') || mime.includes('svg') || svgState.isSvgValid === true;
  }

  function updateSvgButtonStates(isValid) {
    const dlBtn = document.getElementById('btn-svg-download');
    const studioBtn = document.querySelector('#tool-convert-svg-view .btn-secondary');
    
    if (dlBtn) {
      dlBtn.disabled = !isValid;
      dlBtn.style.opacity = isValid ? '1' : '0.45';
      dlBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
      dlBtn.title = isValid ? '' : 'Please select a valid .SVG vector file first';
    }

    if (studioBtn) {
      studioBtn.disabled = !isValid;
      studioBtn.style.opacity = isValid ? '1' : '0.45';
      studioBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
  }

  async function initConvertSvgStage() {
    const isSvg = isCurrentFileSvg();
    const alertBox = document.getElementById('svg-format-alert');
    const warningText = document.getElementById('svg-warning-text');
    const successBox = document.getElementById('svg-format-success');
    const successText = document.getElementById('svg-success-text');

    if (!isSvg) {
      svgState.isSvgValid = false;
      if (alertBox) alertBox.style.display = 'flex';
      if (successBox) successBox.style.display = 'none';
      if (warningText) {
        const curFormat = engine.getFormatLabel() || 'Raster Image';
        const curFile = engine.filename || 'sample photo';
        warningText.innerHTML = `The currently loaded file is <strong>${curFormat}</strong> (<em>${curFile}</em>). This tool requires a scalable vector <strong>.SVG</strong> file to rasterize. Please select a valid SVG file or use the demo vector to proceed.`;
      }
      updateSvgButtonStates(false);

      const metaSpan = document.getElementById('meta-convert-svg');
      const badge = document.getElementById('svg-render-badge');
      const origSizeSpan = document.getElementById('svg-orig-size');
      const estSizeSpan = document.getElementById('svg-est-size');
      const origFormatSpan = document.getElementById('svg-orig-format');

      if (metaSpan) metaSpan.textContent = `⚠️ Non-SVG file loaded (${curFormat}) · SVG vector required`;
      if (badge) {
        badge.textContent = 'SVG Required';
        badge.style.background = '#fef2f2';
        badge.style.color = '#b91c1c';
        badge.style.borderColor = '#f87171';
      }
      if (origFormatSpan) origFormatSpan.textContent = curFormat;
      if (origSizeSpan) origSizeSpan.textContent = engine.fileSize ? PixKitEngine.formatBytes(engine.fileSize) : '--';
      if (estSizeSpan) estSizeSpan.textContent = '--';

      // Render existing canvas as background stage
      renderToCanvas('canvas-convert-svg');
      return;
    }

    svgState.isSvgValid = true;
    if (alertBox) alertBox.style.display = 'none';
    if (successBox) {
      successBox.style.display = 'flex';
      if (successText) successText.textContent = `Vector SVG ready: ${svgState.svgName} (${svgState.intrinsicWidth} × ${svgState.intrinsicHeight} viewBox)`;
    }
    updateSvgButtonStates(true);

    // If SVG text is missing, load demo SVG vector as fallback
    if (!svgState.svgText) {
      svgState.svgText = engine.getSampleSvg();
      svgState.svgName = 'sample-vector.svg';
      const dims = engine.parseSvgDimensions(svgState.svgText);
      svgState.intrinsicWidth = dims.width;
      svgState.intrinsicHeight = dims.height;
      svgState.customWidth = Math.round(dims.width * svgState.scale);
      svgState.customHeight = Math.round(dims.height * svgState.scale);
    }

    updateSvgDimensionsUI();
    recalculateSvgRasterization();
  }

  window.loadSampleSvgVector = function() {
    svgState.svgText = engine.getSampleSvg();
    svgState.svgName = 'pixkit-badge.svg';
    svgState.svgSize = new Blob([svgState.svgText]).size;
    svgState.isSvgValid = true;
    
    const dims = engine.parseSvgDimensions(svgState.svgText);
    svgState.intrinsicWidth = dims.width;
    svgState.intrinsicHeight = dims.height;
    svgState.customWidth = Math.round(dims.width * svgState.scale);
    svgState.customHeight = Math.round(dims.height * svgState.scale);

    showToast('Loaded demo SVG vector');
    initConvertSvgStage();
  };

  window.handleSvgFileSelect = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const fn = file.name.toLowerCase();
    const isSvg = fn.endsWith('.svg') || (file.type && file.type.includes('svg'));

    if (!isSvg) {
      svgState.isSvgValid = false;
      showToast(`⚠️ Incorrect format: "${file.name}" is not a .svg file`);
      
      const alertBox = document.getElementById('svg-format-alert');
      const warningText = document.getElementById('svg-warning-text');
      const successBox = document.getElementById('svg-format-success');
      
      if (alertBox) alertBox.style.display = 'flex';
      if (successBox) successBox.style.display = 'none';
      if (warningText) {
        warningText.innerHTML = `You selected <strong>${file.name}</strong>, which is not an SVG vector file. Please choose a file ending in <strong>.svg</strong>.`;
      }
      updateSvgButtonStates(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      svgState.svgText = text;
      svgState.svgName = file.name;
      svgState.svgSize = file.size;
      svgState.isSvgValid = true;

      const dims = engine.parseSvgDimensions(text);
      svgState.intrinsicWidth = dims.width;
      svgState.intrinsicHeight = dims.height;
      svgState.customWidth = Math.round(dims.width * svgState.scale);
      svgState.customHeight = Math.round(dims.height * svgState.scale);

      showToast(`Loaded vector ${file.name} (${dims.width} × ${dims.height} viewBox)`);
      initConvertSvgStage();
    };
    reader.onerror = () => {
      showToast('Failed to read SVG file');
    };
    reader.readAsText(file);
  };

  window.setSvgScale = function(scale) {
    svgState.scale = scale;
    [1, 2, 3, 4].forEach(s => {
      document.getElementById(`svg-scale-${s}`)?.classList.toggle('active', s === scale);
    });

    svgState.customWidth = Math.round(svgState.intrinsicWidth * scale);
    svgState.customHeight = Math.round(svgState.intrinsicHeight * scale);
    updateSvgDimensionsUI();
    recalculateSvgRasterization();
  };

  window.handleSvgCustomDimension = function(type, val) {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 16) return;

    // Remove fixed scale buttons highlight
    [1, 2, 3, 4].forEach(s => {
      document.getElementById(`svg-scale-${s}`)?.classList.remove('active');
    });

    if (type === 'width') {
      svgState.customWidth = num;
      if (svgState.aspectRatioLocked && svgState.intrinsicWidth > 0) {
        const ratio = svgState.intrinsicHeight / svgState.intrinsicWidth;
        svgState.customHeight = Math.round(num * ratio);
        const inputH = document.getElementById('svg-custom-h');
        if (inputH) inputH.value = svgState.customHeight;
      }
    } else {
      svgState.customHeight = num;
      if (svgState.aspectRatioLocked && svgState.intrinsicHeight > 0) {
        const ratio = svgState.intrinsicWidth / svgState.intrinsicHeight;
        svgState.customWidth = Math.round(num * ratio);
        const inputW = document.getElementById('svg-custom-w');
        if (inputW) inputW.value = svgState.customWidth;
      }
    }

    const lbl = document.getElementById('lbl-svg-dimensions');
    if (lbl) lbl.textContent = `${svgState.customWidth} × ${svgState.customHeight} px`;

    clearTimeout(svgRenderTimeout);
    svgRenderTimeout = setTimeout(recalculateSvgRasterization, 200);
  };

  window.toggleSvgAspectLock = function() {
    svgState.aspectRatioLocked = !svgState.aspectRatioLocked;
    const btn = document.getElementById('svg-aspect-lock');
    if (btn) {
      btn.classList.toggle('active', svgState.aspectRatioLocked);
      btn.textContent = svgState.aspectRatioLocked ? '🔒' : '🔓';
    }
  };

  window.setSvgBackground = function(color) {
    svgState.bgFill = color;
    document.getElementById('svg-bg-transparent')?.classList.toggle('active', color === 'transparent');
    document.getElementById('svg-bg-white')?.classList.toggle('active', color.toLowerCase() === '#ffffff');
    document.getElementById('svg-bg-black')?.classList.toggle('active', color.toLowerCase() === '#000000');
    
    const colorPicker = document.getElementById('svg-bg-custom');
    if (colorPicker && color !== 'transparent') colorPicker.value = color;

    recalculateSvgRasterization();
  };

  window.setSvgTargetFormat = function(format) {
    svgState.targetFormat = format;
    ['png', 'webp', 'jpeg'].forEach(f => {
      document.getElementById(`svg-fmt-${f}`)?.classList.toggle('active', f === format);
    });

    const fmtLabel = format === 'jpeg' ? 'JPG' : format.toUpperCase();
    const dlBtn = document.getElementById('btn-svg-download');
    if (dlBtn) dlBtn.textContent = `Rasterize & Download ${fmtLabel}`;

    const targetNameSpan = document.getElementById('svg-target-name');
    if (targetNameSpan) targetNameSpan.textContent = fmtLabel;

    recalculateSvgRasterization();
  };

  function updateSvgDimensionsUI() {
    const inputW = document.getElementById('svg-custom-w');
    const inputH = document.getElementById('svg-custom-h');
    const lbl = document.getElementById('lbl-svg-dimensions');

    if (inputW) inputW.value = svgState.customWidth;
    if (inputH) inputH.value = svgState.customHeight;
    if (lbl) lbl.textContent = `${svgState.customWidth} × ${svgState.customHeight} px`;
  }

  async function recalculateSvgRasterization() {
    if (!svgState.svgText) return;

    try {
      const res = await engine.rasterizeSvg(
        svgState.svgText,
        svgState.customWidth,
        svgState.customHeight,
        svgState.bgFill,
        svgState.targetFormat,
        0.95
      );

      svgState.rasterizedResult = res;

      // Draw onto stage canvas
      const stageCanvas = document.getElementById('canvas-convert-svg');
      if (stageCanvas) {
        stageCanvas.width = res.width;
        stageCanvas.height = res.height;
        const ctx = stageCanvas.getContext('2d');
        ctx.clearRect(0, 0, res.width, res.height);
        ctx.drawImage(res.canvas, 0, 0);
      }

      // Update statistics
      const origFormatSpan = document.getElementById('svg-orig-format');
      const origSizeSpan = document.getElementById('svg-orig-size');
      const estSizeSpan = document.getElementById('svg-est-size');
      const targetNameSpan = document.getElementById('svg-target-name');
      const metaSpan = document.getElementById('meta-convert-svg');
      const badge = document.getElementById('svg-render-badge');

      const origBytes = svgState.svgSize || (new Blob([svgState.svgText]).size);
      const formattedOutputSize = PixKitEngine.formatBytes(res.size);

      if (origFormatSpan) origFormatSpan.textContent = 'SVG';
      if (origSizeSpan) origSizeSpan.textContent = PixKitEngine.formatBytes(origBytes);
      if (targetNameSpan) targetNameSpan.textContent = res.extension.toUpperCase();
      if (estSizeSpan) estSizeSpan.textContent = formattedOutputSize;
      if (metaSpan) metaSpan.textContent = `${svgState.svgName} · ${res.width} × ${res.height} px · ${res.extension.toUpperCase()} · ${formattedOutputSize}`;
      
      if (badge) {
        badge.textContent = `Raster: ${res.width}×${res.height}`;
        badge.style.background = 'var(--lime-tint)';
        badge.style.color = '#2d6a4f';
        badge.style.borderColor = 'var(--accent-lime-border)';
      }
    } catch (err) {
      console.warn('SVG rasterization error:', err);
    }
  }

  window.commitSvgAction = async function(download = true) {
    if (!svgState.isSvgValid || !svgState.svgText) {
      showToast('⚠️ Please choose a valid .SVG vector file first');
      return;
    }

    if (!svgState.rasterizedResult) {
      await recalculateSvgRasterization();
    }

    const res = svgState.rasterizedResult;
    if (!res) {
      showToast('Failed to rasterize SVG vector');
      return;
    }

    if (download) {
      const baseName = (svgState.svgName || 'vector').replace(/\.[^/.]+$/, "");
      const scaleTag = svgState.scale > 1 ? `@${svgState.scale}x` : '';
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}${scaleTag}.${res.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Downloaded ${baseName}${scaleTag}.${res.extension} (${PixKitEngine.formatBytes(res.size)})`);
    } else {
      // Open in PixKit Studio: set engine active image from rasterized canvas
      const img = new Image();
      img.onload = () => {
        engine.setSourceImage(img);
        engine.filename = `${(svgState.svgName || 'vector').replace(/\.[^/.]+$/, "")}.png`;
        engine.fileSize = res.size;
        engine.fileType = res.mimeType;
        hasUserAddedImage = true;
        syncMetadata();
        updateHistoryUI();
        persistCurrentSession();
        showToast(`Opened rasterized ${res.width} × ${res.height} px image in Studio`);
        window.showView('edit');
      };
      img.src = res.canvas.toDataURL();
    }
  };

  // ==========================================================================
  // TOOL 13: IMAGE TO ICO (FAVICON GENERATOR) CONTROLLER
  // ==========================================================================
  let icoState = {
    selectedSizes: [16, 32, 48],
    fitMode: 'cover', // 'cover' | 'contain' | 'stretch'
    icoResult: null
  };

  let icoCalcTimeout = null;

  function initConvertIcoStage() {
    updateIcoSizesUI();
    recalculateIcoPackage();
  }

  window.toggleIcoSize = function(size) {
    const idx = icoState.selectedSizes.indexOf(size);
    if (idx >= 0) {
      if (icoState.selectedSizes.length <= 1) {
        showToast('At least one icon resolution must be selected');
        return;
      }
      icoState.selectedSizes.splice(idx, 1);
    } else {
      icoState.selectedSizes.push(size);
      icoState.selectedSizes.sort((a, b) => a - b);
    }

    updateIcoSizesUI();
    debouncedRecalculateIco();
  };

  window.setIcoBundlePreset = function(preset) {
    if (preset === 'standard') {
      icoState.selectedSizes = [16, 32, 48];
    } else if (preset === 'all') {
      icoState.selectedSizes = [16, 32, 48, 64, 128, 256];
    } else if (preset === 'single') {
      icoState.selectedSizes = [32];
    }

    document.getElementById('ico-bundle-standard')?.classList.toggle('active', preset === 'standard');
    document.getElementById('ico-bundle-all')?.classList.toggle('active', preset === 'all');
    document.getElementById('ico-bundle-single')?.classList.toggle('active', preset === 'single');

    updateIcoSizesUI();
    debouncedRecalculateIco();
  };

  window.setIcoFitMode = function(mode) {
    icoState.fitMode = mode;
    ['cover', 'contain', 'stretch'].forEach(m => {
      document.getElementById(`ico-fit-${m}`)?.classList.toggle('active', m === mode);
    });

    debouncedRecalculateIco();
  };

  function updateIcoSizesUI() {
    [16, 32, 48, 64, 128, 256].forEach(s => {
      document.getElementById(`ico-size-${s}`)?.classList.toggle('active', icoState.selectedSizes.includes(s));
    });

    const countBadge = document.getElementById('ico-sizes-count-badge');
    if (countBadge) {
      countBadge.textContent = `${icoState.selectedSizes.length} Size${icoState.selectedSizes.length > 1 ? 's' : ''} Selected`;
    }
  }

  window.copyIcoHtmlCode = function() {
    const code = '<link rel="icon" type="image/x-icon" href="/favicon.ico">';
    navigator.clipboard.writeText(code).then(() => {
      showToast('Copied HTML <link> tag to clipboard!');
    }).catch(() => {
      showToast('HTML Tag: <link rel="icon" type="image/x-icon" href="/favicon.ico">');
    });
  };

  function debouncedRecalculateIco() {
    clearTimeout(icoCalcTimeout);
    icoCalcTimeout = setTimeout(recalculateIcoPackage, 150);
  }

  async function recalculateIcoPackage() {
    try {
      const res = await engine.canvasToIcoBlob(engine.activeCanvas, icoState.selectedSizes, icoState.fitMode);
      icoState.icoResult = res;

      // Draw largest generated PNG to preview canvas
      const largestBuffer = res.pngBuffers[res.pngBuffers.length - 1];
      const stageCanvas = document.getElementById('canvas-convert-ico');
      if (stageCanvas && largestBuffer) {
        stageCanvas.width = largestBuffer.canvas.width;
        stageCanvas.height = largestBuffer.canvas.height;
        const ctx = stageCanvas.getContext('2d');
        ctx.clearRect(0, 0, stageCanvas.width, stageCanvas.height);
        ctx.drawImage(largestBuffer.canvas, 0, 0);
      }

      // Update mockup simulation images
      const tabBuf = res.pngBuffers.find(b => b.size === 16) || res.pngBuffers[0];
      const retBuf = res.pngBuffers.find(b => b.size === 32) || res.pngBuffers[0];
      const dskBuf = res.pngBuffers.find(b => b.size === 48) || res.pngBuffers[0];

      if (tabBuf) {
        const url16 = tabBuf.canvas.toDataURL();
        const tabImg = document.getElementById('ico-preview-tab-img');
        const p16Img = document.getElementById('ico-preview-16-img');
        if (tabImg) tabImg.src = url16;
        if (p16Img) p16Img.src = url16;
      }

      if (retBuf) {
        const url32 = retBuf.canvas.toDataURL();
        const p32Img = document.getElementById('ico-preview-32-img');
        if (p32Img) p32Img.src = url32;
      }

      if (dskBuf) {
        const url48 = dskBuf.canvas.toDataURL();
        const p48Img = document.getElementById('ico-preview-48-img');
        if (p48Img) p48Img.src = url48;
      }

      // Update statistics
      const origDimsSpan = document.getElementById('ico-orig-dims');
      const estSizeSpan = document.getElementById('ico-est-size');
      const metaSpan = document.getElementById('meta-convert-ico');
      const badge = document.getElementById('ico-badge');

      const formattedBytes = PixKitEngine.formatBytes(res.blob.size);
      if (origDimsSpan) origDimsSpan.textContent = `${engine.activeCanvas.width} × ${engine.activeCanvas.height} px`;
      if (estSizeSpan) estSizeSpan.textContent = `${formattedBytes} (.ico)`;
      if (metaSpan) metaSpan.textContent = `favicon.ico · [${icoState.selectedSizes.map(s => s + 'px').join(', ')}] · ${formattedBytes}`;
      if (badge) badge.textContent = `${icoState.selectedSizes.length} Layers (${formattedBytes})`;

    } catch (err) {
      console.warn('ICO package generation error:', err);
    }
  }

  window.commitIcoAction = async function(download = true) {
    if (!icoState.icoResult) {
      await recalculateIcoPackage();
    }

    const res = icoState.icoResult;
    if (!res || !res.blob) {
      showToast('Failed to create ICO package');
      return;
    }

    if (download) {
      const baseName = (engine.filename || 'favicon').replace(/\.[^/.]+$/, "");
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.ico`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Downloaded ${baseName}.ico (${PixKitEngine.formatBytes(res.blob.size)})`);
    } else {
      showToast('Opened in PixKit Studio');
      window.showView('edit');
    }
  };

  // ==============================================================
  // TOOL 14: IMAGE TO BASE64 (DATA URI & SNIPPET GENERATOR) CONTROLLER
  // ==============================================================
  let base64State = {
    snippetType: 'data-uri',
    mimeType: 'image/png',
    quality: 0.85,
    maxDim: null,
    isWrapped: true,
    lastResult: null
  };
  let base64CalcTimeout = null;

  function initConvertBase64Stage() {
    updateBase64UI();
    recalculateBase64Package();
  }

  window.setBase64SnippetType = function(type) {
    base64State.snippetType = type;
    const types = ['data-uri', 'html-img', 'css-bg', 'raw', 'markdown', 'json'];
    types.forEach(t => {
      document.getElementById(`base64-type-${t}`)?.classList.toggle('active', t === type);
    });

    const badge = document.getElementById('base64-snippet-type-badge');
    const labelMap = {
      'data-uri': 'Data URI Snippet',
      'html-img': 'HTML <img> Snippet',
      'css-bg': 'CSS Background Snippet',
      'raw': 'Raw Base64 String',
      'markdown': 'Markdown Image',
      'json': 'JSON Object'
    };
    if (badge) badge.textContent = labelMap[type] || 'Base64 Snippet';

    debouncedRecalculateBase64();
  };

  window.setBase64MimeType = function(mime) {
    base64State.mimeType = mime;
    document.getElementById('base64-mime-png')?.classList.toggle('active', mime === 'image/png');
    document.getElementById('base64-mime-jpeg')?.classList.toggle('active', mime === 'image/jpeg');
    document.getElementById('base64-mime-webp')?.classList.toggle('active', mime === 'image/webp');

    const qualityGroup = document.getElementById('base64-quality-group');
    if (qualityGroup) {
      qualityGroup.style.display = (mime === 'image/jpeg' || mime === 'image/webp') ? 'block' : 'none';
    }

    debouncedRecalculateBase64();
  };

  window.handleBase64QualityChange = function(val) {
    base64State.quality = parseInt(val, 10) / 100;
    const valLabel = document.getElementById('base64-quality-val');
    if (valLabel) valLabel.textContent = `${val}%`;
    debouncedRecalculateBase64();
  };

  window.setBase64MaxDim = function(dim) {
    base64State.maxDim = dim;
    document.getElementById('base64-dim-orig')?.classList.toggle('active', dim === null);
    document.getElementById('base64-dim-800')?.classList.toggle('active', dim === 800);
    document.getElementById('base64-dim-400')?.classList.toggle('active', dim === 400);
    document.getElementById('base64-dim-200')?.classList.toggle('active', dim === 200);

    debouncedRecalculateBase64();
  };

  window.toggleBase64Wrap = function() {
    base64State.isWrapped = !base64State.isWrapped;
    const textarea = document.getElementById('base64-output-textarea');
    const btn = document.getElementById('btn-base64-wrap');
    if (textarea) {
      textarea.style.whiteSpace = base64State.isWrapped ? 'pre-wrap' : 'pre';
      textarea.style.wordBreak = base64State.isWrapped ? 'break-all' : 'normal';
    }
    if (btn) {
      btn.innerHTML = base64State.isWrapped ? '<span>↩</span> Wrap Lines' : '<span>↔</span> Single Line';
    }
  };

  function updateBase64UI() {
    const types = ['data-uri', 'html-img', 'css-bg', 'raw', 'markdown', 'json'];
    types.forEach(t => {
      document.getElementById(`base64-type-${t}`)?.classList.toggle('active', t === base64State.snippetType);
    });
    document.getElementById('base64-mime-png')?.classList.toggle('active', base64State.mimeType === 'image/png');
    document.getElementById('base64-mime-jpeg')?.classList.toggle('active', base64State.mimeType === 'image/jpeg');
    document.getElementById('base64-mime-webp')?.classList.toggle('active', base64State.mimeType === 'image/webp');
  }

  function debouncedRecalculateBase64() {
    clearTimeout(base64CalcTimeout);
    base64CalcTimeout = setTimeout(recalculateBase64Package, 120);
  }

  async function recalculateBase64Package() {
    try {
      const res = await engine.canvasToBase64(engine.activeCanvas, {
        mimeType: base64State.mimeType,
        quality: base64State.quality,
        maxDim: base64State.maxDim,
        snippetType: base64State.snippetType
      });
      base64State.lastResult = res;

      // Update textarea
      const textarea = document.getElementById('base64-output-textarea');
      if (textarea) {
        textarea.value = res.snippet;
      }

      // Update live rendered image preview
      const previewImg = document.getElementById('base64-live-preview-img');
      if (previewImg) {
        previewImg.src = res.dataUri;
      }

      // Update labels & metrics
      const charCountLabel = document.getElementById('base64-char-count-label');
      const rawSizeSpan = document.getElementById('base64-raw-size');
      const stringCharsSpan = document.getElementById('base64-string-chars');
      const renderDimsSpan = document.getElementById('base64-render-dims');
      const renderMimeSpan = document.getElementById('base64-render-mime');
      const metaSpan = document.getElementById('meta-convert-base64');

      const formattedChars = res.charLength.toLocaleString();
      const formattedBytes = PixKitEngine.formatBytes(res.byteSize);

      if (charCountLabel) charCountLabel.textContent = `${formattedChars} characters`;
      if (rawSizeSpan) rawSizeSpan.textContent = formattedBytes;
      if (stringCharsSpan) stringCharsSpan.textContent = `${formattedChars} chars`;
      if (renderDimsSpan) renderDimsSpan.textContent = `${res.width} × ${res.height} px`;
      if (renderMimeSpan) renderMimeSpan.textContent = res.mimeType;
      if (metaSpan) metaSpan.textContent = `Base64 String · ${res.width}×${res.height}px · ${formattedChars} chars (${formattedBytes})`;

    } catch (err) {
      console.warn('Base64 calculation error:', err);
    }
  }

  window.copyBase64Code = async function() {
    if (!base64State.lastResult) {
      await recalculateBase64Package();
    }
    const snippet = base64State.lastResult?.snippet || '';
    if (!snippet) {
      showToast('No Base64 code generated');
      return;
    }
    try {
      await navigator.clipboard.writeText(snippet);
      showToast(`Copied ${base64State.lastResult.charLength.toLocaleString()} chars to clipboard!`);
    } catch {
      const textarea = document.getElementById('base64-output-textarea');
      if (textarea) {
        textarea.select();
        document.execCommand('copy');
        showToast('Base64 code copied to clipboard!');
      }
    }
  };

  window.downloadBase64Snippet = async function() {
    if (!base64State.lastResult) {
      await recalculateBase64Package();
    }
    const snippet = base64State.lastResult?.snippet || '';
    if (!snippet) {
      showToast('No Base64 code available');
      return;
    }
    const blob = new Blob([snippet], { type: 'text/plain;charset=utf-8' });
    const ext = base64State.snippetType === 'html-img' ? 'html' : (base64State.snippetType === 'css-bg' ? 'css' : (base64State.snippetType === 'json' ? 'json' : 'txt'));
    const filename = `${engine.filename ? engine.filename.replace(/\.[^/.]+$/, '') : 'image'}-base64.${ext}`;
    PixKitEngine.downloadBlob(blob, filename);
    showToast(`Downloaded ${filename}`);
  };

  // ==============================================================
  // TOOL 15: IMAGE TO PDF (DOCUMENT GENERATOR) CONTROLLER
  // ==============================================================
  let pdfState = {
    pageSize: 'a4',       // 'a4', 'letter', 'legal', 'auto'
    orientation: 'auto',  // 'auto', 'portrait', 'landscape'
    margin: 'small',      // 'none', 'small', 'standard'
    fitMode: 'contain',   // 'contain', 'cover', 'original'
    quality: 0.92,
    pdfResult: null
  };
  let pdfCalcTimeout = null;

  function initConvertPdfStage() {
    updatePdfUI();
    recalculatePdfPackage();
  }

  window.setPdfPageSize = function(size) {
    pdfState.pageSize = size;
    ['a4', 'letter', 'legal', 'auto'].forEach(s => {
      document.getElementById(`pdf-size-${s}`)?.classList.toggle('active', s === size);
    });
    // Hide or show orientation and margin if size is auto
    const orientGroup = document.getElementById('pdf-orientation-group');
    const marginGroup = document.getElementById('pdf-margin-group');
    if (orientGroup) orientGroup.style.display = size === 'auto' ? 'none' : 'block';
    if (marginGroup) marginGroup.style.display = size === 'auto' ? 'none' : 'block';

    debouncedRecalculatePdf();
  };

  window.setPdfOrientation = function(orient) {
    pdfState.orientation = orient;
    ['auto', 'portrait', 'landscape'].forEach(o => {
      document.getElementById(`pdf-orient-${o}`)?.classList.toggle('active', o === orient);
    });
    debouncedRecalculatePdf();
  };

  window.setPdfMargin = function(m) {
    pdfState.margin = m;
    ['none', 'small', 'standard'].forEach(val => {
      document.getElementById(`pdf-margin-${val}`)?.classList.toggle('active', val === m);
    });
    debouncedRecalculatePdf();
  };

  window.setPdfFitMode = function(fit) {
    pdfState.fitMode = fit;
    ['contain', 'cover', 'original'].forEach(f => {
      document.getElementById(`pdf-fit-${f}`)?.classList.toggle('active', f === fit);
    });
    debouncedRecalculatePdf();
  };

  window.setPdfQuality = function(q) {
    pdfState.quality = q;
    document.getElementById('pdf-quality-high')?.classList.toggle('active', q >= 0.9);
    document.getElementById('pdf-quality-medium')?.classList.toggle('active', q < 0.9);
    debouncedRecalculatePdf();
  };

  function updatePdfUI() {
    ['a4', 'letter', 'legal', 'auto'].forEach(s => {
      document.getElementById(`pdf-size-${s}`)?.classList.toggle('active', s === pdfState.pageSize);
    });
    ['auto', 'portrait', 'landscape'].forEach(o => {
      document.getElementById(`pdf-orient-${o}`)?.classList.toggle('active', o === pdfState.orientation);
    });
    ['none', 'small', 'standard'].forEach(val => {
      document.getElementById(`pdf-margin-${val}`)?.classList.toggle('active', val === pdfState.margin);
    });
    ['contain', 'cover', 'original'].forEach(f => {
      document.getElementById(`pdf-fit-${f}`)?.classList.toggle('active', f === pdfState.fitMode);
    });
    document.getElementById('pdf-quality-high')?.classList.toggle('active', pdfState.quality >= 0.9);
    document.getElementById('pdf-quality-medium')?.classList.toggle('active', pdfState.quality < 0.9);
  }

  function debouncedRecalculatePdf() {
    clearTimeout(pdfCalcTimeout);
    pdfCalcTimeout = setTimeout(recalculatePdfPackage, 120);
  }

  async function recalculatePdfPackage() {
    try {
      const res = await engine.canvasToPdfBlob(engine.activeCanvas, {
        pageSize: pdfState.pageSize,
        orientation: pdfState.orientation,
        margin: pdfState.margin,
        fitMode: pdfState.fitMode,
        quality: pdfState.quality
      });
      pdfState.pdfResult = res;

      // Draw simulated sheet preview onto canvas
      const stageCanvas = document.getElementById('canvas-convert-pdf');
      const sheetWrapper = document.getElementById('pdf-sheet-wrapper');

      if (stageCanvas && sheetWrapper) {
        // Compute mockup scale
        const maxStageW = 420;
        const maxStageH = 440;
        const scale = Math.min(maxStageW / res.pageWidthPt, maxStageH / res.pageHeightPt);
        
        const canvasW = Math.round(res.pageWidthPt * scale * 2); // 2x retina
        const canvasH = Math.round(res.pageHeightPt * scale * 2);

        stageCanvas.width = canvasW;
        stageCanvas.height = canvasH;
        stageCanvas.style.width = `${Math.round(res.pageWidthPt * scale)}px`;
        stageCanvas.style.height = `${Math.round(res.pageHeightPt * scale)}px`;

        sheetWrapper.style.width = `${Math.round(res.pageWidthPt * scale)}px`;
        sheetWrapper.style.height = `${Math.round(res.pageHeightPt * scale)}px`;

        const ctx = stageCanvas.getContext('2d');
        ctx.clearRect(0, 0, canvasW, canvasH);
        
        // Fill white sheet background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Draw image onto canvas
        const scaledMarginX = (res.pageWidthPt - res.renderWidthPt) / 2 * scale * 2;
        const scaledMarginY = (res.pageHeightPt - res.renderHeightPt) / 2 * scale * 2;
        const scaledRenderW = res.renderWidthPt * scale * 2;
        const scaledRenderH = res.renderHeightPt * scale * 2;

        ctx.drawImage(engine.activeCanvas, scaledMarginX, scaledMarginY, scaledRenderW, scaledRenderH);
      }

      // Update badges & metrics
      const specBadge = document.getElementById('pdf-page-spec-badge');
      const origDimsSpan = document.getElementById('pdf-orig-dims');
      const estSizeSpan = document.getElementById('pdf-est-size');
      const metaSpan = document.getElementById('meta-convert-pdf');
      const pdfBadge = document.getElementById('pdf-badge');

      const orientLabel = res.isLandscape ? 'Landscape' : 'Portrait';
      const formattedBytes = PixKitEngine.formatBytes(res.byteSize);

      if (specBadge) specBadge.textContent = `${res.pageSizeName} ${orientLabel} · ${res.pageWidthMm} × ${res.pageHeightMm} mm`;
      if (origDimsSpan) origDimsSpan.textContent = `${engine.activeCanvas.width} × ${engine.activeCanvas.height} px`;
      if (estSizeSpan) estSizeSpan.textContent = `${formattedBytes} (.pdf)`;
      if (metaSpan) metaSpan.textContent = `document.pdf · ${res.pageSizeName} ${orientLabel} (${res.pageWidthMm}×${res.pageHeightMm}mm) · ${formattedBytes}`;
      if (pdfBadge) pdfBadge.textContent = `${res.pageSizeName} Document (${formattedBytes})`;

    } catch (err) {
      console.warn('PDF package calculation error:', err);
    }
  }

  window.commitPdfAction = async function(download = true) {
    if (!pdfState.pdfResult) {
      await recalculatePdfPackage();
    }
    const res = pdfState.pdfResult;
    if (!res || !res.blob) {
      showToast('Failed to create PDF document');
      return;
    }

    const baseName = (engine.filename || 'document').replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(res.blob);

    if (download) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Downloaded ${baseName}.pdf (${PixKitEngine.formatBytes(res.byteSize)})`);
    } else {
      window.open(url, '_blank');
    }
  };

  window.previewPdfInNewTab = function() {
    commitPdfAction(false);
  };

  // Global Toast
  window.showToast = function(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✳</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  };

  // ==============================================================
  // APPLICATION STARTUP & SESSION RESTORATION
  // ==============================================================
  restoreSavedSession().then((restored) => {
    if (!restored) {
      engine.generateSampleArtwork();
      setTimeout(syncMetadata, 60);
      handleRoute(location.hash || '#/home');
    }
  });
});
