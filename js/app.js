/**
 * PixKit - Production Application Controller with Magic UI Animated Theme Toggler
 */

document.addEventListener('DOMContentLoaded', () => {
  const engine = window.pixkitEngine;
  let currentView = 'home';
  let activeTool = null;
  let hasUserAddedImage = false;

  // Mark that user has entered the studio on this browser
  localStorage.setItem('pixkit_entered', 'true');

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
    const raw = hashString || location.hash || localStorage.getItem('pixkit_last_route') || '#/home';
    const clean = raw.replace(/^#\/?/, '');
    const parts = clean.split('/');

    localStorage.setItem('pixkit_last_route', raw.startsWith('#') ? raw : '#' + raw);

    if (!parts[0] || parts[0] === 'home') {
      renderViewDirect('home');
    } else if (parts[0] === 'edit') {
      renderViewDirect('edit');
    } else if (parts[0] === 'convert') {
      renderViewDirect('convert');
    } else if (parts[0] === 'document') {
      renderViewDirect('document');
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
    localStorage.setItem('pixkit_last_route', `#/${viewId}`);
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const target = document.getElementById(`${viewId}-view`);
    if (target) target.classList.add('active');

    // Topbar active tab indicator
    document.getElementById('nav-home')?.classList.toggle('active', viewId === 'home');
    document.getElementById('nav-edit')?.classList.toggle('active', viewId === 'edit');
    document.getElementById('nav-convert')?.classList.toggle('active', viewId === 'convert');
    document.getElementById('nav-document')?.classList.toggle('active', viewId === 'document');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHistoryUI();
  }

  let lastCategoryOrigin = 'document';

  window.navigatePdfBack = function() {
    window.showView(lastCategoryOrigin === 'convert' ? 'convert' : 'document');
  };

  function renderToolWorkspaceDirect(toolId) {
    if (toolId === 'doc-images-to-pdf' || toolId === 'convert-pdf') {
      lastCategoryOrigin = toolId === 'convert-pdf' ? 'convert' : 'document';
      const parentCrumb = document.getElementById('pdf-parent-crumb');
      const titleCrumb = document.getElementById('pdf-title-crumb');
      const backBtnText = document.getElementById('pdf-back-btn-text');
      
      if (parentCrumb) parentCrumb.textContent = lastCategoryOrigin === 'convert' ? 'Convert' : 'Document';
      if (titleCrumb) titleCrumb.textContent = lastCategoryOrigin === 'convert' ? 'Image to PDF' : 'Images to PDF';
      if (backBtnText) backBtnText.textContent = lastCategoryOrigin === 'convert' ? 'Back to Convert Tools' : 'Back to Document Tools';

      toolId = 'convert-pdf';
    }

    activeTool = toolId;
    currentView = `tool-${toolId}`;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const workspaceView = document.getElementById(`tool-${toolId}-view`) || document.getElementById(`${toolId}-view`);
    if (workspaceView) {
      workspaceView.classList.add('active');
      initToolStage(toolId);
    } else {
      // If individual tool workspace is not yet built, notify the user and keep on category view
      const toolName = toolId.replace(/^doc-/, '').replace(/-/g, ' ');
      showToast(`${toolName.charAt(0).toUpperCase() + toolName.slice(1)} tool workspace will be built next!`);
      const fallbackView = toolId.startsWith('doc-') ? document.getElementById('document-view') : document.getElementById('home-view');
      fallbackView?.classList.add('active');
    }

    const isDocTool = toolId.startsWith('doc-') || (toolId === 'convert-pdf' && lastCategoryOrigin === 'document');
    const isConvertTool = toolId.startsWith('convert-') && lastCategoryOrigin !== 'document';
    document.getElementById('nav-home')?.classList.remove('active');
    document.getElementById('nav-edit')?.classList.toggle('active', !isDocTool && !isConvertTool);
    document.getElementById('nav-convert')?.classList.toggle('active', isConvertTool);
    document.getElementById('nav-document')?.classList.toggle('active', isDocTool);

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    } else if (toolId === 'doc-pdf-to-images') {
      initPdfExtractStage();
    } else if (toolId === 'doc-merge-pdf') {
      initPdfMergeStage();
    } else if (toolId === 'doc-split-pdf') {
      initPdfSplitStage();
    } else if (toolId === 'doc-compress-pdf') {
      initPdfCompressStage();
    } else if (toolId === 'doc-rotate-pdf') {
      initPdfRotateStage();
    } else if (toolId === 'doc-delete-pdf') {
      initPdfDeleteStage();
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

  // Helper function to trigger browser blob downloads safely
  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }, 2500);
  }

  // ==============================================================
  // TOOL 16: PDF TO IMAGES (PAGE EXTRACTOR & RASTERIZER) CONTROLLER
  // ==============================================================
  let pdfExtractState = {
    pdfDoc: null,
    pdfBytes: null,
    fileName: 'document.pdf',
    fileSize: 0,
    numPages: 0,
    pages: [], // array of { pageNum, canvas, dataUrl, width, height, selected: true }
    activePageIndex: 0,
    format: 'png',
    scale: 2,
    quality: 0.92,
    rangeMode: 'all',
    customRange: '',
    isExtracting: false
  };

  // Configure PDF.js Worker
  if (typeof pdfjsLib !== 'undefined') {
    if (typeof pdfjsWorker !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerPort = null;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js';
    }
  }

  function initPdfExtractStage() {
    setupPdfExtractDropzone();
    updatePdfExtractUI();
  }

  function setupPdfExtractDropzone() {
    const dropzone = document.getElementById('pdf-extract-dropzone');
    if (!dropzone || dropzone.dataset.bound) return;
    dropzone.dataset.bound = 'true';

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handlePdfFileUpload(files[0]);
      }
    });
  }

  window.handlePdfFileUpload = async function(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a valid PDF document (.pdf)');
      return;
    }

    if (typeof pdfjsLib === 'undefined') {
      showToast('Loading PDF engine, please wait a moment...');
      return;
    }

    pdfExtractState.fileName = file.name;
    pdfExtractState.fileSize = file.size;

    const nameEl = document.getElementById('pdf-extract-file-name');
    const subEl = document.getElementById('pdf-extract-file-sub');
    if (nameEl) nameEl.textContent = file.name;
    if (subEl) subEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB · Loading pages...`;

    // Show loading indicator
    const dropzone = document.getElementById('pdf-extract-dropzone');
    const grid = document.getElementById('pdf-extract-grid');
    const loader = document.getElementById('pdf-extract-loading');
    const loadText = document.getElementById('pdf-extract-loading-text');

    if (dropzone) dropzone.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadText) loadText.textContent = 'Parsing PDF document structure...';
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfExtractState.pdfBytes = arrayBuffer;
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument({
        data: typedArray,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true
      });
      const pdfDoc = await loadingTask.promise;
      pdfExtractState.pdfDoc = pdfDoc;
      pdfExtractState.numPages = pdfDoc.numPages;

      await renderAllPdfPages();
    } catch (err) {
      console.error('PDF parsing error:', err);
      showToast('Failed to open PDF file: ' + (err.message || 'Invalid format'));
      if (loader) loader.style.display = 'none';
      if (dropzone) dropzone.style.display = 'flex';
    }
  };

  // Generate a multi-page sample PDF on the fly so users can test immediately
  window.loadSamplePdfForExtract = async function() {
    showToast('Generating sample 3-page PDF document...');
    
    // Create 3 nice graphic pages in memory
    const pagesBlobs = [];
    const colors = [
      { top: '#41624F', bot: '#253B36', title: 'Page 1 — Mountain Peaks', subtitle: 'PixKit High-Resolution PDF Rasterizer' },
      { top: '#2B5B84', bot: '#172E44', title: 'Page 2 — Ocean Waves', subtitle: 'In-Browser 100% Client-Side Processing' },
      { top: '#7C3AED', bot: '#4C1D95', title: 'Page 3 — Studio Document', subtitle: 'Private, Fast & Zero Server Upload' }
    ];

    for (let i = 0; i < colors.length; i++) {
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 1600;
      const ctx = c.getContext('2d');

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1600);
      grad.addColorStop(0, colors[i].top);
      grad.addColorStop(1, colors[i].bot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 1600);

      // Card overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(80, 120, 1040, 1360, 24);
      ctx.fill();

      // Brand mark
      ctx.fillStyle = '#121310';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('✳ pixkit', 140, 240);

      // Page title
      ctx.fillStyle = '#22241F';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(colors[i].title, 140, 360);

      ctx.fillStyle = '#85877F';
      ctx.font = '22px sans-serif';
      ctx.fillText(colors[i].subtitle, 140, 410);

      // Visual placeholder chart
      ctx.fillStyle = '#D7F36A';
      ctx.beginPath();
      ctx.roundRect(140, 480, 920, 420, 16);
      ctx.fill();

      ctx.fillStyle = '#22241F';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`Sample Illustration / Diagram #${i + 1}`, 180, 700);

      // Footer badge
      ctx.fillStyle = '#E9E9E3';
      ctx.fillRect(140, 1380, 920, 2);
      ctx.fillStyle = '#85877F';
      ctx.font = '18px sans-serif';
      ctx.fillText(`PixKit Studio Sample Document · Sheet ${i + 1} of 3`, 140, 1420);

      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.9));
      pagesBlobs.push(blob);
    }

    // Build PDF using engine's native PDF builder
    const pdfPackage = await PixKitEngine.generatePdfDocument(pagesBlobs, {
      pageSize: 'a4',
      orientation: 'portrait',
      margin: 'none',
      fitMode: 'contain',
      quality: 0.9
    });

    const sampleFile = new File([pdfPackage.blob], 'sample-document.pdf', { type: 'application/pdf' });
    await handlePdfFileUpload(sampleFile);
  };

  async function renderAllPdfPages() {
    const pdfDoc = pdfExtractState.pdfDoc;
    if (!pdfDoc) return;

    const loader = document.getElementById('pdf-extract-loading');
    const loadText = document.getElementById('pdf-extract-loading-text');
    const grid = document.getElementById('pdf-extract-grid');
    const subEl = document.getElementById('pdf-extract-file-sub');

    pdfExtractState.pages = [];
    if (grid) grid.innerHTML = '';

    const numPages = pdfDoc.numPages;
    for (let i = 1; i <= numPages; i++) {
      if (loadText) loadText.textContent = `Rendering page ${i} of ${numPages} @ ${pdfExtractState.scale}x resolution...`;
      
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: pdfExtractState.scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // Fill white background for crisp rendering
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      await page.render(renderContext).promise;

      const pageRecord = {
        pageNum: i,
        canvas: canvas,
        width: canvas.width,
        height: canvas.height,
        selected: true
      };
      pdfExtractState.pages.push(pageRecord);
    }

    if (loader) loader.style.display = 'none';
    if (grid) grid.style.display = 'grid';

    if (subEl) {
      subEl.textContent = `${(pdfExtractState.fileSize / (1024 * 1024)).toFixed(2)} MB · ${numPages} Page${numPages > 1 ? 's' : ''}`;
    }

    const topbarTools = document.getElementById('pdf-extract-topbar-tools');
    if (topbarTools) topbarTools.style.display = 'flex';

    buildPdfPagesGridUI();
    updatePdfExtractUI();
    showToast(`Successfully rendered all ${numPages} PDF pages!`);
  }

  function buildPdfPagesGridUI() {
    const grid = document.getElementById('pdf-extract-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const targetPages = getTargetExportPages();

    pdfExtractState.pages.forEach((page, idx) => {
      const isSelected = page.selected;
      const isIncluded = targetPages.includes(page);

      const card = document.createElement('div');
      card.className = `pdf-page-card ${isSelected ? 'selected' : ''}`;
      card.id = `pdf-card-page-${page.pageNum}`;
      card.onclick = (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        toggleSinglePdfPageSelection(idx);
      };

      // Thumbnail wrapper with high-res rendered canvas
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'pdf-page-thumb-wrap';
      
      const thumbImg = document.createElement('img');
      thumbImg.src = page.canvas.toDataURL('image/jpeg', 0.85);
      thumbImg.alt = `Page ${page.pageNum}`;
      thumbWrap.appendChild(thumbImg);

      // Header row with checkbox and page number
      const headerRow = document.createElement('div');
      headerRow.className = 'pdf-page-card-header';
      headerRow.innerHTML = `
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSinglePdfPageSelection(${idx})">
          <span>Page ${page.pageNum}</span>
        </label>
        <span class="badge-pill" style="font-size:10px; background:var(--soft); color:var(--muted);">${page.width} × ${page.height}</span>
      `;

      // Quick action buttons
      const actionsRow = document.createElement('div');
      actionsRow.className = 'pdf-page-card-actions';
      actionsRow.innerHTML = `
        <button class="primary-action" onclick="downloadSinglePdfPageDirect(${idx})" title="Download this page image">
          ⬇ ${pdfExtractState.format.toUpperCase()}
        </button>
        <button onclick="openSpecificPdfPageInStudio(${idx})" title="Open this page in PixKit Studio Editor">
          ✎ Edit
        </button>
      `;

      card.appendChild(headerRow);
      card.appendChild(thumbWrap);
      card.appendChild(actionsRow);
      grid.appendChild(card);
    });
  }

  function toggleSinglePdfPageSelection(index) {
    if (!pdfExtractState.pages[index]) return;
    pdfExtractState.pages[index].selected = !pdfExtractState.pages[index].selected;
    buildPdfPagesGridUI();
    updatePdfExtractUI();
  }

  window.toggleSelectAllPdfPages = function(select) {
    pdfExtractState.pages.forEach(p => p.selected = select);
    buildPdfPagesGridUI();
    updatePdfExtractUI();
    showToast(select ? 'Selected all pages' : 'Deselected all pages');
  };

  window.setPdfExtractFormat = function(fmt) {
    pdfExtractState.format = fmt;
    ['png', 'jpg', 'webp'].forEach(f => {
      document.getElementById(`pdf-fmt-${f}`)?.classList.toggle('active', f === fmt);
    });
    const qualityGroup = document.getElementById('pdf-extract-quality-group');
    if (qualityGroup) qualityGroup.style.display = fmt === 'png' ? 'none' : 'block';
    
    buildPdfPagesGridUI();
    updatePdfExtractUI();
  };

  window.setPdfExtractScale = async function(scale) {
    if (pdfExtractState.scale === scale) return;
    pdfExtractState.scale = scale;
    [1, 2, 3].forEach(s => {
      document.getElementById(`pdf-scale-${s}`)?.classList.toggle('active', s === scale);
    });
    if (pdfExtractState.pdfDoc) {
      await renderAllPdfPages();
    } else {
      updatePdfExtractUI();
    }
  };

  window.setPdfExtractQuality = function(val) {
    pdfExtractState.quality = parseInt(val, 10) / 100;
    const badge = document.getElementById('pdf-extract-quality-val');
    if (badge) badge.textContent = `${val}%`;
    updatePdfExtractUI();
  };

  window.setPdfExtractRangeMode = function(mode) {
    pdfExtractState.rangeMode = mode;
    ['all', 'selected', 'custom'].forEach(m => {
      document.getElementById(`pdf-range-${m}`)?.classList.toggle('active', m === mode);
    });
    const customWrap = document.getElementById('pdf-custom-range-input-wrap');
    if (customWrap) customWrap.style.display = mode === 'custom' ? 'block' : 'none';
    
    buildPdfPagesGridUI();
    updatePdfExtractUI();
  };

  window.handlePdfCustomRangeChange = function(val) {
    pdfExtractState.customRange = val;
    buildPdfPagesGridUI();
    updatePdfExtractUI();
  };

  function getTargetExportPages() {
    const { pages, rangeMode, customRange } = pdfExtractState;
    if (!pages || !pages.length) return [];

    if (rangeMode === 'all') {
      return pages;
    }
    if (rangeMode === 'selected') {
      return pages.filter(p => p.selected);
    }
    if (rangeMode === 'custom') {
      if (!customRange.trim()) return pages;
      const targetIndices = new Set();
      const parts = customRange.split(',');
      parts.forEach(part => {
        const clean = part.trim();
        if (clean.includes('-')) {
          const [start, end] = clean.split('-').map(n => parseInt(n.trim(), 10));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              if (i >= 1 && i <= pages.length) targetIndices.add(i - 1);
            }
          }
        } else {
          const num = parseInt(clean, 10);
          if (!isNaN(num) && num >= 1 && num <= pages.length) {
            targetIndices.add(num - 1);
          }
        }
      });
      return pages.filter((_, idx) => targetIndices.has(idx));
    }
    return pages;
  }

  function updatePdfExtractUI() {
    const { pages, format, scale, numPages } = pdfExtractState;
    const targetPages = getTargetExportPages();

    const totalEl = document.getElementById('pdf-summary-total');
    const selectedEl = document.getElementById('pdf-summary-selected');
    const formatEl = document.getElementById('pdf-summary-format');
    const counterEl = document.getElementById('pdf-extract-page-counter');
    const hintEl = document.getElementById('pdf-extract-status-hint');

    if (totalEl) totalEl.textContent = numPages.toString();
    if (selectedEl) selectedEl.textContent = `${targetPages.length} Page${targetPages.length === 1 ? '' : 's'}`;
    if (formatEl) formatEl.textContent = `${format.toUpperCase()} @ ${scale}x (${scale === 1 ? '150' : scale === 2 ? '300' : '450'} DPI)`;
    if (counterEl) counterEl.textContent = `${targetPages.length} / ${numPages} Selected`;
    if (hintEl && numPages > 0) {
      hintEl.textContent = `Extracted ${numPages} pages · Ready for instant export or studio editing`;
    }

    const hasPages = targetPages.length > 0;
    const btnZip = document.getElementById('btn-pdf-download-zip');
    const btnSingle = document.getElementById('btn-pdf-download-single');
    const btnStudio = document.getElementById('btn-pdf-open-studio');

    if (btnZip) btnZip.disabled = !hasPages;
    if (btnSingle) btnSingle.disabled = !hasPages;
    if (btnStudio) {
      btnStudio.disabled = pages.length === 0;
      btnStudio.textContent = `✎ Open Page 1 in Studio Editor`;
    }
  }

  window.downloadPdfExtractedZip = async function() {
    const targetPages = getTargetExportPages();
    if (!targetPages.length) {
      showToast('No pages selected for export');
      return;
    }

    if (typeof JSZip === 'undefined') {
      showToast('Loading ZIP bundler...');
      return;
    }

    const btnZip = document.getElementById('btn-pdf-download-zip');
    if (btnZip) {
      btnZip.disabled = true;
      btnZip.textContent = '⏳ Creating ZIP archive...';
    }

    try {
      const zip = new JSZip();
      const baseName = pdfExtractState.fileName.replace(/\.pdf$/i, '') || 'document';
      const fmt = pdfExtractState.format;
      const mime = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
      const ext = fmt === 'jpg' ? 'jpg' : fmt;

      for (let i = 0; i < targetPages.length; i++) {
        const p = targetPages[i];
        const blob = await new Promise(res => p.canvas.toBlob(res, mime, pdfExtractState.quality));
        if (blob) {
          zip.file(`${baseName}_page_${String(p.pageNum).padStart(2, '0')}.${ext}`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerBlobDownload(zipBlob, `${baseName}-extracted-pages.zip`);
      showToast(`Downloaded ${targetPages.length} pages in ZIP package!`);
    } catch (err) {
      console.error('ZIP packaging error:', err);
      showToast('Failed to create ZIP package: ' + err.message);
    } finally {
      if (btnZip) {
        btnZip.disabled = false;
        btnZip.textContent = '📦 Download All as ZIP';
      }
    }
  };

  window.downloadSelectedPdfPagesSingle = async function() {
    const targetPages = getTargetExportPages();
    if (!targetPages.length) {
      showToast('No pages selected for export');
      return;
    }

    const baseName = pdfExtractState.fileName.replace(/\.pdf$/i, '') || 'document';
    const fmt = pdfExtractState.format;
    const mime = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
    const ext = fmt === 'jpg' ? 'jpg' : fmt;

    for (let i = 0; i < targetPages.length; i++) {
      const p = targetPages[i];
      const blob = await new Promise(res => p.canvas.toBlob(res, mime, pdfExtractState.quality));
      if (blob) {
        triggerBlobDownload(blob, `${baseName}_page_${String(p.pageNum).padStart(2, '0')}.${ext}`);
        await new Promise(r => setTimeout(r, 250));
      }
    }
    showToast(`Downloaded ${targetPages.length} image files!`);
  };

  window.downloadSinglePdfPageDirect = async function(index) {
    const p = pdfExtractState.pages[index];
    if (!p) return;

    const baseName = pdfExtractState.fileName.replace(/\.pdf$/i, '') || 'document';
    const fmt = pdfExtractState.format;
    const mime = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
    const ext = fmt === 'jpg' ? 'jpg' : fmt;

    const blob = await new Promise(res => p.canvas.toBlob(res, mime, pdfExtractState.quality));
    if (blob) {
      triggerBlobDownload(blob, `${baseName}_page_${String(p.pageNum).padStart(2, '0')}.${ext}`);
      showToast(`Downloaded Page ${p.pageNum} as .${ext}`);
    }
  };

  window.openSpecificPdfPageInStudio = function(index) {
    const p = pdfExtractState.pages[index];
    if (!p) return;

    const baseName = pdfExtractState.fileName.replace(/\.pdf$/i, '') || 'document';
    engine.loadFromCanvas(p.canvas, `${baseName}-page-${p.pageNum}.png`);
    hasUserAddedImage = true;
    syncMetadata();
    updateHeroPreview();
    persistCurrentSession();
    showToast(`Opened Page ${p.pageNum} in PixKit Studio!`);
    window.showView('edit');
  };

  window.openActivePdfPageInStudio = function() {
    if (pdfExtractState.pages.length > 0) {
      openSpecificPdfPageInStudio(0);
    }
  };

  // ==============================================================
  // SHARED PDF PREVIEW HELPERS (ROBUST EMBEDDED VIEWER)
  // ==============================================================
  function createPreviewPlaceholderTab(toolName = 'PDF') {
    const previewTab = window.open('', '_blank');
    if (previewTab) {
      try {
        previewTab.document.open();
        previewTab.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Generating ${toolName} Preview...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; height: 100vh; width: 100vw; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .loader-box { text-align: center; padding: 32px; }
    .spinner { width: 44px; height: 44px; border: 3px solid rgba(255,255,255,0.15); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 18px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 13.5px; color: #94a3b8; }
    #pdf-frame-container { display: none; width: 100vw; height: 100vh; }
    iframe { width: 100vw; height: 100vh; border: none; display: block; }
  </style>
</head>
<body>
  <div id="loading-box" class="loader-box">
    <div class="spinner"></div>
    <h3>Generating ${toolName} Preview...</h3>
    <p>Processing and rendering document streams, please wait...</p>
  </div>
  <div id="pdf-frame-container"></div>
  <script>
    window.displayPdfBlob = function(url, title) {
      if (title) document.title = title;
      var loadEl = document.getElementById('loading-box');
      var container = document.getElementById('pdf-frame-container');
      if (loadEl) loadEl.style.display = 'none';
      if (container) {
        container.style.display = 'block';
        container.innerHTML = '<iframe src="' + url + '" allowfullscreen></iframe>';
      }
    };
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'PIXKIT_PDF_PREVIEW') {
        window.displayPdfBlob(e.data.url, e.data.title);
      }
    });
  <\/script>
</body>
</html>`);
        previewTab.document.close();
      } catch (_) {}
    }
    return previewTab;
  }

  function openPdfPreviewTab(previewTab, blob, filename = 'document.pdf') {
    const blobUrl = URL.createObjectURL(blob);

    if (previewTab && !previewTab.closed) {
      // 1. Try direct function invocation
      try {
        if (typeof previewTab.displayPdfBlob === 'function') {
          previewTab.displayPdfBlob(blobUrl, filename);
          return;
        }
      } catch (_) {}

      // 2. Try direct DOM manipulation in same-origin popup
      try {
        const doc = previewTab.document;
        if (doc) {
          const frame = doc.getElementById('pdf-frame-container');
          const loader = doc.getElementById('loading-box');
          if (frame) {
            if (loader) loader.style.display = 'none';
            frame.style.display = 'block';
            frame.innerHTML = `<iframe src="${blobUrl}" style="width:100vw;height:100vh;border:none;" allowfullscreen></iframe>`;
            doc.title = filename;
            return;
          }
        }
      } catch (_) {}

      // 3. PostMessage fallback
      try {
        previewTab.postMessage({ type: 'PIXKIT_PDF_PREVIEW', url: blobUrl, title: filename }, '*');
      } catch (_) {}

      // 4. Direct navigation fallback
      try {
        previewTab.location.replace(blobUrl);
        return;
      } catch (_) {
        try {
          previewTab.location.href = blobUrl;
          return;
        } catch (_) {}
      }
      return;
    }

    // Fallback: trigger download directly if tab could not be updated
    triggerBlobDownload(blob, filename);
  }

  // ==============================================================
  // TOOL 17 CONTROLLER: MERGE PDF (COMBINE MULTIPLE PDF DOCUMENTS)
  // ==============================================================
  let pdfMergeState = {
    files: [] // Array of { id, name, size, pageCount, bytes, thumbUrl }
  };

  function initPdfMergeStage() {
    const dropzone = document.getElementById('pdf-merge-dropzone');
    if (dropzone && !dropzone.dataset.bound) {
      dropzone.dataset.bound = 'true';
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-active');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-active');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePdfMergeFiles(e.dataTransfer.files);
        }
      });
    }

    renderPdfMergeUI();
  }

  window.handlePdfMergeFiles = async function(fileList) {
    if (!fileList || !fileList.length) return;
    const rawList = Array.from(fileList);
    const files = rawList.filter(f => {
      if (f.bytes || f instanceof ArrayBuffer || f instanceof Uint8Array) return true;
      const fName = (f.name || '').toLowerCase();
      const fType = (f.type || '').toLowerCase();
      return fType === 'application/pdf' || fName.endsWith('.pdf') || !fType;
    });

    if (!files.length) {
      showToast('Please select valid PDF (.pdf) documents.');
      return;
    }

    const loader = document.getElementById('pdf-merge-loading');
    const loadingText = document.getElementById('pdf-merge-loading-text');
    const dropzone = document.getElementById('pdf-merge-dropzone');
    const listEl = document.getElementById('pdf-merge-list');

    if (dropzone) dropzone.style.display = 'none';
    if (listEl) listEl.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = `Reading ${files.length} PDF file(s)...`;
    }

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = file.name || `Document_${pdfMergeState.files.length + i + 1}.pdf`;
        if (loadingText) loadingText.textContent = `Processing "${name}" (${i + 1} of ${files.length})...`;

        let rawUint8 = null;
        if (file.bytes instanceof Uint8Array) {
          rawUint8 = new Uint8Array(file.bytes);
        } else if (file.bytes instanceof ArrayBuffer) {
          rawUint8 = new Uint8Array(file.bytes);
        } else if (file instanceof Uint8Array) {
          rawUint8 = new Uint8Array(file);
        } else if (file instanceof ArrayBuffer) {
          rawUint8 = new Uint8Array(file);
        } else if (typeof file.arrayBuffer === 'function') {
          const ab = await file.arrayBuffer();
          rawUint8 = new Uint8Array(ab);
        }

        if (!rawUint8 || rawUint8.byteLength === 0) continue;

        // CRITICAL: Clone an independent Uint8Array storage copy that will NEVER be passed directly to PDF.js or transferred to a worker
        const storedBytes = new Uint8Array(rawUint8.byteLength);
        storedBytes.set(rawUint8);

        const size = file.size || storedBytes.byteLength;
        let pageCount = file.pageCount || 1;
        let thumbUrl = '';

        // Read page count via PDFLib using an isolated buffer copy
        try {
          if (window.PDFLib) {
            const countCopy = new Uint8Array(storedBytes.byteLength);
            countCopy.set(storedBytes);
            const pdfDoc = await window.PDFLib.PDFDocument.load(countCopy, { ignoreEncryption: true });
            pageCount = pdfDoc.getPageCount();
          }
        } catch (err) {
          console.warn('PDF-Lib count failed:', err);
        }

        // Render first page thumbnail with timeout protection using an isolated buffer copy
        try {
          if (window.pdfjsLib) {
            const renderThumbPromise = (async () => {
              // Pass a separate clone to pdfjsLib so worker transfers do NOT detach storedBytes!
              const pdfjsData = new Uint8Array(storedBytes.byteLength);
              pdfjsData.set(storedBytes);
              const loadingTask = window.pdfjsLib.getDocument({
                data: pdfjsData,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true,
              });
              const pdfjsDoc = await loadingTask.promise;
              pageCount = pdfjsDoc.numPages || pageCount;
              const firstPage = await pdfjsDoc.getPage(1);
              const viewport = firstPage.getViewport({ scale: 0.5 });
              const thumbCanvas = document.createElement('canvas');
              thumbCanvas.width = Math.max(80, Math.floor(viewport.width));
              thumbCanvas.height = Math.max(100, Math.floor(viewport.height));
              const ctx = thumbCanvas.getContext('2d');
              await firstPage.render({ canvasContext: ctx, viewport }).promise;
              return thumbCanvas.toDataURL('image/jpeg', 0.8);
            })();

            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(''), 1800));
            thumbUrl = await Promise.race([renderThumbPromise, timeoutPromise]);
          }
        } catch (err) {
          console.warn('Thumbnail generation skipped:', err);
        }

        pdfMergeState.files.push({
          id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: name,
          size: size,
          pageCount: pageCount,
          bytes: storedBytes,
          file: file,
          thumbUrl: thumbUrl
        });
      }

      showToast(`Added ${files.length} PDF document(s) to merge list.`);
    } catch (err) {
      console.error('Error adding PDF files for merge:', err);
      showToast('Error loading PDF files: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      renderPdfMergeUI();
    }
  };

  function renderPdfMergeUI() {
    const listEl = document.getElementById('pdf-merge-list');
    const dropzone = document.getElementById('pdf-merge-dropzone');
    const topbarTools = document.getElementById('pdf-merge-topbar-tools');
    const summaryPill = document.getElementById('pdf-merge-summary-pill');
    const footerTitle = document.getElementById('pdf-merge-footer-title');
    const footerSub = document.getElementById('pdf-merge-footer-sub');
    const summaryFiles = document.getElementById('pdf-merge-summary-files');
    const summaryPages = document.getElementById('pdf-merge-summary-pages');
    const summarySize = document.getElementById('pdf-merge-summary-size');
    const btnDownload = document.getElementById('btn-pdf-merge-download');
    const btnPreview = document.getElementById('btn-pdf-merge-preview');

    const totalFiles = pdfMergeState.files.length;
    let totalPages = 0;
    let totalBytes = 0;

    pdfMergeState.files.forEach(f => {
      totalPages += (f.pageCount || 1);
      totalBytes += (f.size || 0);
    });

    const sizeFormatted = totalBytes > 1024 * 1024 
      ? (totalBytes / (1024 * 1024)).toFixed(2) + ' MB' 
      : (totalBytes / 1024).toFixed(1) + ' KB';

    if (totalFiles === 0) {
      if (listEl) { listEl.style.display = 'none'; listEl.innerHTML = ''; }
      if (dropzone) dropzone.style.display = 'flex';
      if (topbarTools) topbarTools.style.display = 'none';
      if (footerTitle) footerTitle.textContent = 'No PDF Files Added';
      if (footerSub) footerSub.textContent = 'Add at least 2 PDF files to merge';
      if (summaryFiles) summaryFiles.textContent = '0';
      if (summaryPages) summaryPages.textContent = '0 Pages';
      if (summarySize) summarySize.textContent = '0 KB';
      if (btnDownload) btnDownload.disabled = true;
      if (btnPreview) btnPreview.disabled = true;
      return;
    }

    if (dropzone) dropzone.style.display = 'none';
    if (topbarTools) topbarTools.style.display = 'flex';
    if (listEl) {
      listEl.style.display = 'flex';
      listEl.innerHTML = '';

      pdfMergeState.files.forEach((fileItem, index) => {
        const card = document.createElement('div');
        card.className = 'pdf-merge-card';
        card.innerHTML = `
          <div class="pdf-merge-card-order">${index + 1}</div>
          <div class="pdf-merge-thumb-wrap">
            ${fileItem.thumbUrl 
              ? `<img src="${fileItem.thumbUrl}" class="pdf-merge-thumb" alt="Preview">` 
              : `<div class="pdf-merge-thumb-fallback">📄</div>`
            }
          </div>
          <div class="pdf-merge-card-info">
            <strong class="pdf-merge-card-name" title="${fileItem.name}">${fileItem.name}</strong>
            <div class="pdf-merge-card-meta">
              <span class="badge-pill" style="font-size:10px; background:var(--surface); border:1px solid var(--line);">${fileItem.pageCount} ${fileItem.pageCount === 1 ? 'Page' : 'Pages'}</span>
              <span>·</span>
              <span style="font-size:11px; color:var(--muted);">${fileItem.size > 1024 * 1024 ? (fileItem.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(fileItem.size / 1024) + ' KB'}</span>
            </div>
          </div>
          <div class="pdf-merge-actions">
            <button class="icon-btn-sm" title="Move Up" onclick="movePdfMergeItemUp(${index})" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon-btn-sm" title="Move Down" onclick="movePdfMergeItemDown(${index})" ${index === totalFiles - 1 ? 'disabled' : ''}>↓</button>
            <button class="icon-btn-sm danger" title="Remove Document" onclick="removePdfMergeItem(${index})">✕</button>
          </div>
        `;
        listEl.appendChild(card);
      });
    }

    if (summaryPill) summaryPill.textContent = `${totalFiles} File${totalFiles === 1 ? '' : 's'} · ${totalPages} Page${totalPages === 1 ? '' : 's'}`;
    if (footerTitle) footerTitle.textContent = `${totalFiles} PDF Documents Ready`;
    if (footerSub) footerSub.textContent = `Will produce a combined ${totalPages}-page document (${sizeFormatted})`;
    if (summaryFiles) summaryFiles.textContent = String(totalFiles);
    if (summaryPages) summaryPages.textContent = `${totalPages} Pages`;
    if (summarySize) summarySize.textContent = sizeFormatted;

    const canMerge = totalFiles >= 2;
    if (btnDownload) btnDownload.disabled = !canMerge;
    if (btnPreview) btnPreview.disabled = !canMerge;
  }

  window.movePdfMergeItemUp = function(index) {
    if (index <= 0 || index >= pdfMergeState.files.length) return;
    const temp = pdfMergeState.files[index - 1];
    pdfMergeState.files[index - 1] = pdfMergeState.files[index];
    pdfMergeState.files[index] = temp;
    renderPdfMergeUI();
  };

  window.movePdfMergeItemDown = function(index) {
    if (index < 0 || index >= pdfMergeState.files.length - 1) return;
    const temp = pdfMergeState.files[index + 1];
    pdfMergeState.files[index + 1] = pdfMergeState.files[index];
    pdfMergeState.files[index] = temp;
    renderPdfMergeUI();
  };

  window.removePdfMergeItem = function(index) {
    if (index >= 0 && index < pdfMergeState.files.length) {
      const removed = pdfMergeState.files.splice(index, 1)[0];
      showToast(`Removed "${removed.name}"`);
      renderPdfMergeUI();
    }
  };

  window.clearAllMergePdfs = function() {
    pdfMergeState.files = [];
    renderPdfMergeUI();
    showToast('Cleared merge list.');
  };

  window.executePdfMerge = async function(download = true) {
    if (pdfMergeState.files.length < 2) {
      showToast('Please add at least 2 PDF documents to merge.');
      return;
    }

    if (!window.PDFLib) {
      showToast('PDF-Lib engine is loading, please retry in a moment...');
      return;
    }

    let previewTab = null;
    if (!download) {
      previewTab = createPreviewPlaceholderTab('Merged PDF');
    }

    const loader = document.getElementById('pdf-merge-loading');
    const loadingText = document.getElementById('pdf-merge-loading-text');
    const listEl = document.getElementById('pdf-merge-list');

    if (listEl) listEl.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = `Merging ${pdfMergeState.files.length} documents...`;
    }

    try {
      const mergedPdf = await window.PDFLib.PDFDocument.create();

      for (let i = 0; i < pdfMergeState.files.length; i++) {
        const item = pdfMergeState.files[i];
        if (loadingText) loadingText.textContent = `Merging "${item.name}" (${i + 1}/${pdfMergeState.files.length})...`;

        let rawBytes = item.bytes;
        // Automatic recovery if buffer was detached or empty
        if ((!rawBytes || rawBytes.byteLength === 0) && item.file && typeof item.file.arrayBuffer === 'function') {
          const rebuf = await item.file.arrayBuffer();
          rawBytes = new Uint8Array(rebuf);
          item.bytes = rawBytes;
        }

        if (!rawBytes || rawBytes.byteLength === 0) {
          throw new Error(`Document "${item.name}" has an empty data buffer.`);
        }

        const uint8 = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
        const bytesClone = new Uint8Array(uint8.byteLength);
        bytesClone.set(uint8);

        const srcDoc = await window.PDFLib.PDFDocument.load(bytesClone, { ignoreEncryption: true });
        const indices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      if (loadingText) loadingText.textContent = 'Finalizing combined PDF bytes...';
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });

      let outName = (document.getElementById('pdf-merge-output-name')?.value || 'merged_document.pdf').trim();
      if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

      if (download) {
        triggerBlobDownload(blob, outName);
        showToast(`Successfully merged ${pdfMergeState.files.length} documents into "${outName}"!`);
      } else {
        openPdfPreviewTab(previewTab, blob, outName);
        showToast('Opened merged document preview in new tab.');
      }
    } catch (err) {
      console.error('PDF Merge Error:', err);
      if (previewTab && !previewTab.closed) {
        try { previewTab.close(); } catch (_) {}
      }
      showToast('Error during PDF merging: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (listEl) listEl.style.display = 'flex';
    }
  };

  window.loadSamplePdfsForMerge = async function() {
    if (!window.PDFLib) {
      showToast('PDF Engine is initializing, please wait...');
      return;
    }

    const loader = document.getElementById('pdf-merge-loading');
    const loadingText = document.getElementById('pdf-merge-loading-text');
    const dropzone = document.getElementById('pdf-merge-dropzone');
    if (dropzone) dropzone.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Generating 2 colorful sample PDF documents...';
    }

    try {
      const rgb = window.PDFLib.rgb;
      const StandardFonts = window.PDFLib.StandardFonts;

      // Create Sample Doc A (3 Pages)
      const docA = await window.PDFLib.PDFDocument.create();
      const fontA = await docA.embedFont(StandardFonts.Helvetica);
      const fontABold = await docA.embedFont(StandardFonts.HelveticaBold);
      
      const pA1 = docA.addPage([595, 842]);
      pA1.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.96, 0.97, 0.99) });
      pA1.drawRectangle({ x: 40, y: 740, width: 515, height: 60, color: rgb(0.08, 0.55, 0.45) });
      pA1.drawText('PixKit Report A - Annual Summary', { x: 60, y: 762, size: 20, font: fontABold, color: rgb(1, 1, 1) });
      pA1.drawText('Page 1: Executive Overview and Metrics', { x: 60, y: 690, size: 14, font: fontABold, color: rgb(0.1, 0.1, 0.1) });
      pA1.drawRectangle({ x: 60, y: 450, width: 475, height: 200, color: rgb(1, 1, 1), borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 1 });
      pA1.drawText('Key Performance Indicators (KPIs)', { x: 80, y: 620, size: 13, font: fontABold, color: rgb(0.2, 0.3, 0.4) });
      pA1.drawText('- Total Projects Processed: 4,820', { x: 80, y: 580, size: 12, font: fontA, color: rgb(0.3, 0.3, 0.3) });
      pA1.drawText('- Conversion Accuracy: 99.98%', { x: 80, y: 550, size: 12, font: fontA, color: rgb(0.3, 0.3, 0.3) });
      pA1.drawText('- Average Client Render Time: 42ms', { x: 80, y: 520, size: 12, font: fontA, color: rgb(0.3, 0.3, 0.3) });

      const pA2 = docA.addPage([595, 842]);
      pA2.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      pA2.drawText('PixKit Report A - Section 2: Regional Performance', { x: 60, y: 760, size: 16, font: fontABold, color: rgb(0.08, 0.55, 0.45) });
      pA2.drawText('Page 2: Regional breakdowns across North America, Europe and APAC', { x: 60, y: 720, size: 12, font: fontA, color: rgb(0.4, 0.4, 0.4) });

      const pA3 = docA.addPage([595, 842]);
      pA3.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.98, 0.98, 0.98) });
      pA3.drawText('PixKit Report A - Section 3: Conclusions', { x: 60, y: 760, size: 16, font: fontABold, color: rgb(0.08, 0.55, 0.45) });
      pA3.drawText('Page 3: Strategic roadmap and upcoming milestones', { x: 60, y: 720, size: 12, font: fontA, color: rgb(0.4, 0.4, 0.4) });

      const bytesA = await docA.save();

      // Create Sample Doc B (2 Pages)
      const docB = await window.PDFLib.PDFDocument.create();
      const fontB = await docB.embedFont(StandardFonts.Helvetica);
      const fontBBold = await docB.embedFont(StandardFonts.HelveticaBold);

      const pB1 = docB.addPage([595, 842]);
      pB1.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.99, 0.97, 0.95) });
      pB1.drawRectangle({ x: 40, y: 740, width: 515, height: 60, color: rgb(0.9, 0.4, 0.15) });
      pB1.drawText('PixKit Appendix B - Technical Specs', { x: 60, y: 762, size: 20, font: fontBBold, color: rgb(1, 1, 1) });
      pB1.drawText('Page 1: Architecture, WebAssembly and Canvas Pipelines', { x: 60, y: 690, size: 14, font: fontBBold, color: rgb(0.1, 0.1, 0.1) });

      const pB2 = docB.addPage([595, 842]);
      pB2.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(1, 1, 1) });
      pB2.drawText('PixKit Appendix B - Sign-off and Approvals', { x: 60, y: 760, size: 16, font: fontBBold, color: rgb(0.9, 0.4, 0.15) });
      pB2.drawText('Page 2: Final Verification Checklist', { x: 60, y: 720, size: 12, font: fontB, color: rgb(0.4, 0.4, 0.4) });

      const bytesB = await docB.save();

      const sampleFiles = [
        { name: 'PixKit_Report_A.pdf', bytes: bytesA, size: bytesA.byteLength, pageCount: 3 },
        { name: 'PixKit_Appendix_B.pdf', bytes: bytesB, size: bytesB.byteLength, pageCount: 2 }
      ];

      await handlePdfMergeFiles(sampleFiles);
      showToast('Loaded 2 sample PDFs (5 pages total) ready to merge!');
    } catch (err) {
      console.error('Sample generation failed:', err);
      showToast('Failed generating sample PDFs: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
    }
  };

  // ==============================================================
  // TOOL 18 CONTROLLER: SPLIT PDF (PAGES & RANGES EXTRACTOR)
  // ==============================================================
  let pdfSplitState = {
    file: null,
    fileName: '',
    fileSize: 0,
    bytes: null,
    numPages: 0,
    pages: [], // Array of { pageNum: 1, selected: true, canvas: HTMLCanvasElement }
    mode: 'extract-selected', // 'extract-selected' | 'split-ranges' | 'split-all' | 'split-fixed'
    chunkSize: 2
  };

  function initPdfSplitStage() {
    const dropzone = document.getElementById('pdf-split-dropzone');
    if (dropzone && !dropzone.dataset.bound) {
      dropzone.dataset.bound = 'true';
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-active');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-active');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePdfSplitFile(e.dataTransfer.files[0]);
        }
      });
    }

    renderPdfSplitUI();
  }

  window.handlePdfSplitFile = async function(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a valid PDF (.pdf) file.');
      return;
    }

    const loader = document.getElementById('pdf-split-loading');
    const loadingText = document.getElementById('pdf-split-loading-text');
    const grid = document.getElementById('pdf-split-grid');
    const dropzone = document.getElementById('pdf-split-dropzone');

    if (dropzone) dropzone.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = `Reading PDF file "${file.name}"...`;
    }

    try {
      const rawBuf = await file.arrayBuffer();
      const storedBytes = new Uint8Array(rawBuf.byteLength);
      storedBytes.set(new Uint8Array(rawBuf));

      pdfSplitState.file = file;
      pdfSplitState.fileName = file.name;
      pdfSplitState.fileSize = file.size;
      pdfSplitState.bytes = storedBytes;
      pdfSplitState.pages = [];

      // Auto-suggest base filename
      const baseName = file.name.replace(/\.pdf$/i, '');
      const prefixInput = document.getElementById('pdf-split-output-prefix');
      if (prefixInput) prefixInput.value = `${baseName}_split`;

      if (!window.pdfjsLib) {
        throw new Error('PDF.js library is not available.');
      }

      const pdfjsData = new Uint8Array(storedBytes.byteLength);
      pdfjsData.set(storedBytes);
      const loadingTask = window.pdfjsLib.getDocument({
        data: pdfjsData,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });

      const pdfjsDoc = await loadingTask.promise;
      pdfSplitState.numPages = pdfjsDoc.numPages;

      for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        if (loadingText) loadingText.textContent = `Rendering thumbnail for Page ${i} of ${pdfjsDoc.numPages}...`;
        const page = await pdfjsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.75 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        pdfSplitState.pages.push({
          pageNum: i,
          selected: true,
          canvas: canvas
        });
      }

      // Default suggested range
      const rangesInput = document.getElementById('pdf-split-ranges-input');
      if (rangesInput && pdfSplitState.numPages >= 2) {
        if (pdfSplitState.numPages <= 4) {
          rangesInput.value = `1-${Math.ceil(pdfSplitState.numPages / 2)}, ${Math.ceil(pdfSplitState.numPages / 2) + 1}-${pdfSplitState.numPages}`;
        } else {
          rangesInput.value = `1-2, 3-${pdfSplitState.numPages}`;
        }
      }

      showToast(`Loaded ${pdfSplitState.numPages}-page document ready to split!`);
    } catch (err) {
      console.error('Error loading PDF for split:', err);
      showToast('Failed to load PDF: ' + err.message);
      if (dropzone) dropzone.style.display = 'flex';
    } finally {
      if (loader) loader.style.display = 'none';
      renderPdfSplitUI();
    }
  };

  function renderPdfSplitUI() {
    const grid = document.getElementById('pdf-split-grid');
    const dropzone = document.getElementById('pdf-split-dropzone');
    const topbarTools = document.getElementById('pdf-split-topbar-tools');
    const footerTitle = document.getElementById('pdf-split-footer-title');
    const footerSub = document.getElementById('pdf-split-footer-sub');
    const summaryTotal = document.getElementById('pdf-split-summary-total');
    const btnExecute = document.getElementById('btn-pdf-split-execute');
    const btnPreview = document.getElementById('btn-pdf-split-preview');

    if (!pdfSplitState.pages || pdfSplitState.pages.length === 0) {
      if (dropzone) dropzone.style.display = 'flex';
      if (grid) { grid.style.display = 'none'; grid.innerHTML = ''; }
      if (topbarTools) topbarTools.style.display = 'none';
      if (footerTitle) footerTitle.textContent = 'No PDF Loaded';
      if (footerSub) footerSub.textContent = 'Load a PDF document to begin splitting';
      if (summaryTotal) summaryTotal.textContent = '0 Pages';
      if (btnExecute) btnExecute.disabled = true;
      if (btnPreview) btnPreview.disabled = true;
      updatePdfSplitSummary();
      return;
    }

    if (dropzone) dropzone.style.display = 'none';
    if (topbarTools) topbarTools.style.display = 'flex';
    if (grid) {
      grid.style.display = 'grid';
      grid.innerHTML = '';

      pdfSplitState.pages.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className = `pdf-page-card ${p.selected ? 'selected' : ''}`;
        card.onclick = (e) => {
          if (e.target.tagName.toLowerCase() === 'input') return;
          togglePdfSplitPage(idx);
        };

        // Header with checkbox and page number
        const header = document.createElement('div');
        header.className = 'pdf-page-card-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.width = '100%';

        const checkLabel = document.createElement('label');
        checkLabel.style.display = 'inline-flex';
        checkLabel.style.alignItems = 'center';
        checkLabel.style.gap = '6px';
        checkLabel.style.cursor = 'pointer';
        checkLabel.style.fontSize = '12px';
        checkLabel.style.fontWeight = '600';
        checkLabel.style.color = 'var(--ink)';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = p.selected;
        checkbox.onchange = () => togglePdfSplitPage(idx);

        checkLabel.appendChild(checkbox);
        checkLabel.appendChild(document.createTextNode(`Page ${p.pageNum}`));
        header.appendChild(checkLabel);

        const badge = document.createElement('span');
        badge.className = 'badge-pill';
        badge.style.fontSize = '10px';
        badge.textContent = `${p.canvas.width}×${p.canvas.height}`;
        header.appendChild(badge);

        // Preview image / canvas wrapper
        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'pdf-page-thumb-wrap';
        canvasWrap.style.display = 'flex';
        canvasWrap.style.justifyContent = 'center';
        canvasWrap.style.background = '#e5e7eb';
        canvasWrap.style.borderRadius = 'var(--radius-sm)';
        canvasWrap.style.overflow = 'hidden';
        canvasWrap.style.padding = '4px';

        const thumbImg = document.createElement('img');
        thumbImg.src = p.canvas.toDataURL('image/jpeg', 0.8);
        thumbImg.style.maxWidth = '100%';
        thumbImg.style.maxHeight = '200px';
        thumbImg.style.objectFit = 'contain';
        thumbImg.style.borderRadius = '2px';
        thumbImg.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';

        canvasWrap.appendChild(thumbImg);

        card.appendChild(header);
        card.appendChild(canvasWrap);
        grid.appendChild(card);
      });
    }

    if (footerTitle) footerTitle.textContent = pdfSplitState.fileName;
    if (footerSub) {
      const sizeStr = pdfSplitState.fileSize > 1024 * 1024 
        ? (pdfSplitState.fileSize / (1024 * 1024)).toFixed(2) + ' MB' 
        : (pdfSplitState.fileSize / 1024).toFixed(1) + ' KB';
      footerSub.textContent = `${pdfSplitState.numPages} Pages · ${sizeStr}`;
    }
    if (summaryTotal) summaryTotal.textContent = `${pdfSplitState.numPages} Pages`;

    updatePdfSplitSummary();
  }

  window.togglePdfSplitPage = function(index) {
    if (pdfSplitState.pages[index]) {
      pdfSplitState.pages[index].selected = !pdfSplitState.pages[index].selected;
      renderPdfSplitUI();
    }
  };

  window.selectPdfSplitPages = function(type) {
    if (!pdfSplitState.pages || !pdfSplitState.pages.length) return;

    pdfSplitState.pages.forEach((p) => {
      if (type === 'all') p.selected = true;
      else if (type === 'none') p.selected = false;
      else if (type === 'odd') p.selected = (p.pageNum % 2 !== 0);
      else if (type === 'even') p.selected = (p.pageNum % 2 === 0);
      else if (type === 'invert') p.selected = !p.selected;
    });

    renderPdfSplitUI();
  };

  window.onPdfSplitModeChange = function(mode) {
    pdfSplitState.mode = mode;
    const rangesGroup = document.getElementById('pdf-split-ranges-group');
    const fixedGroup = document.getElementById('pdf-split-fixed-group');

    if (rangesGroup) rangesGroup.style.display = mode === 'split-ranges' ? 'block' : 'none';
    if (fixedGroup) fixedGroup.style.display = mode === 'split-fixed' ? 'block' : 'none';

    updatePdfSplitSummary();
  };

  window.updatePdfSplitChunkSize = function(val) {
    pdfSplitState.chunkSize = parseInt(val, 10) || 2;
    const lbl = document.getElementById('pdf-split-chunk-size-val');
    if (lbl) lbl.textContent = `${pdfSplitState.chunkSize} ${pdfSplitState.chunkSize === 1 ? 'Page' : 'Pages'}`;
    updatePdfSplitSummary();
  };

  window.validatePdfSplitRanges = function() {
    updatePdfSplitSummary();
  };

  function parseCustomPdfRanges(str, totalPages) {
    if (!str || !str.trim()) return [];
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    const ranges = [];

    parts.forEach(part => {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        let start = parseInt(startStr, 10);
        let end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          start = Math.min(start, totalPages);
          end = Math.min(end, totalPages);
          const pageIndices = [];
          for (let i = start; i <= end; i++) pageIndices.push(i - 1);
          if (pageIndices.length > 0) {
            ranges.push({ name: `pages_${start}-${end}`, indices: pageIndices });
          }
        }
      } else {
        const single = parseInt(part, 10);
        if (!isNaN(single) && single > 0 && single <= totalPages) {
          ranges.push({ name: `page_${single}`, indices: [single - 1] });
        }
      }
    });

    return ranges;
  }

  function updatePdfSplitSummary() {
    const summarySelected = document.getElementById('pdf-split-summary-selected');
    const summaryFiles = document.getElementById('pdf-split-summary-files');
    const summaryPill = document.getElementById('pdf-split-summary-pill');
    const btnExecute = document.getElementById('btn-pdf-split-execute');
    const btnPreview = document.getElementById('btn-pdf-split-preview');

    const totalPages = pdfSplitState.numPages || 0;
    const selectedCount = pdfSplitState.pages ? pdfSplitState.pages.filter(p => p.selected).length : 0;
    const mode = pdfSplitState.mode || 'extract-selected';

    let filesToGen = 0;
    let isValid = false;

    if (totalPages > 0) {
      if (mode === 'extract-selected') {
        filesToGen = selectedCount > 0 ? 1 : 0;
        isValid = selectedCount > 0;
        if (summarySelected) summarySelected.textContent = `${selectedCount} Pages`;
      } else if (mode === 'split-ranges') {
        const rawRanges = document.getElementById('pdf-split-ranges-input')?.value || '';
        const ranges = parseCustomPdfRanges(rawRanges, totalPages);
        filesToGen = ranges.length;
        isValid = filesToGen > 0;
        let totalRangePages = 0;
        ranges.forEach(r => totalRangePages += r.indices.length);
        if (summarySelected) summarySelected.textContent = `${totalRangePages} Pages in Ranges`;
      } else if (mode === 'split-all') {
        filesToGen = totalPages;
        isValid = totalPages > 0;
        if (summarySelected) summarySelected.textContent = `All ${totalPages} Pages`;
      } else if (mode === 'split-fixed') {
        const cSize = pdfSplitState.chunkSize || 2;
        filesToGen = Math.ceil(totalPages / cSize);
        isValid = totalPages > 0;
        if (summarySelected) summarySelected.textContent = `All ${totalPages} Pages (Chunks of ${cSize})`;
      }
    } else {
      if (summarySelected) summarySelected.textContent = '0 Pages';
    }

    if (summaryFiles) summaryFiles.textContent = `${filesToGen} ${filesToGen === 1 ? 'PDF File' : 'PDF Files'}`;
    if (summaryPill) summaryPill.textContent = `${selectedCount} / ${totalPages} Pages Selected`;

    if (btnExecute) {
      btnExecute.disabled = !isValid;
      if (mode === 'extract-selected') {
        btnExecute.textContent = '✂️ Extract Selected Pages (PDF)';
      } else if (filesToGen > 1) {
        btnExecute.textContent = `✂️ Split into ${filesToGen} Files (ZIP)`;
      } else {
        btnExecute.textContent = '✂️ Split & Download PDF';
      }
    }

    if (btnPreview) {
      btnPreview.disabled = !isValid;
    }
  }

  window.executePdfSplit = async function(download = true) {
    if (!pdfSplitState.bytes || !pdfSplitState.numPages) {
      showToast('Please load a PDF document first.');
      return;
    }

    if (!window.PDFLib) {
      showToast('PDF-Lib engine is still loading, please retry...');
      return;
    }

    const loader = document.getElementById('pdf-split-loading');
    const loadingText = document.getElementById('pdf-split-loading-text');
    const grid = document.getElementById('pdf-split-grid');

    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Preparing PDF split engine...';
    }

    let previewTab = null;
    if (!download) {
      previewTab = createPreviewPlaceholderTab('Split PDF');
    }

    try {
      const mode = pdfSplitState.mode || 'extract-selected';
      const prefix = (document.getElementById('pdf-split-output-prefix')?.value || 'split_document').trim();
      let rawBytes = pdfSplitState.bytes;
      if ((!rawBytes || rawBytes.byteLength === 0) && pdfSplitState.file && typeof pdfSplitState.file.arrayBuffer === 'function') {
        const rebuf = await pdfSplitState.file.arrayBuffer();
        rawBytes = new Uint8Array(rebuf);
        pdfSplitState.bytes = rawBytes;
      }

      if (!rawBytes || rawBytes.byteLength === 0) {
        throw new Error('PDF file buffer is empty. Please select or load a valid PDF file.');
      }

      const uint8 = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
      const bytesClone = new Uint8Array(uint8.byteLength);
      bytesClone.set(uint8);

      const srcDoc = await window.PDFLib.PDFDocument.load(bytesClone, { ignoreEncryption: true });

      // Plan files to generate: array of { name: '...', indices: [0, 1, 2] }
      let plan = [];

      if (mode === 'extract-selected') {
        const selectedIndices = pdfSplitState.pages
          .filter(p => p.selected)
          .map(p => p.pageNum - 1);

        if (!selectedIndices.length) {
          showToast('No pages selected for extraction.');
          return;
        }

        plan.push({
          name: `${prefix}.pdf`,
          indices: selectedIndices
        });
      } else if (mode === 'split-ranges') {
        const rawRanges = document.getElementById('pdf-split-ranges-input')?.value || '';
        const ranges = parseCustomPdfRanges(rawRanges, pdfSplitState.numPages);
        if (!ranges.length) {
          showToast('Please enter valid page ranges (e.g. 1-2, 3-5).');
          return;
        }
        ranges.forEach((r, idx) => {
          plan.push({
            name: `${prefix}_${r.name}.pdf`,
            indices: r.indices
          });
        });
      } else if (mode === 'split-all') {
        for (let i = 0; i < pdfSplitState.numPages; i++) {
          plan.push({
            name: `${prefix}_page_${String(i + 1).padStart(2, '0')}.pdf`,
            indices: [i]
          });
        }
      } else if (mode === 'split-fixed') {
        const cSize = pdfSplitState.chunkSize || 2;
        let partIdx = 1;
        for (let i = 0; i < pdfSplitState.numPages; i += cSize) {
          const chunkIndices = [];
          for (let j = i; j < Math.min(i + cSize, pdfSplitState.numPages); j++) {
            chunkIndices.push(j);
          }
          plan.push({
            name: `${prefix}_part_${partIdx}_pages_${i + 1}-${i + chunkIndices.length}.pdf`,
            indices: chunkIndices
          });
          partIdx++;
        }
      }

      if (!plan.length) {
        showToast('No output files planned.');
        return;
      }

      // Generate PDF for each planned item
      const generatedFiles = [];
      for (let i = 0; i < plan.length; i++) {
        const item = plan[i];
        if (loadingText) loadingText.textContent = `Building "${item.name}" (${i + 1} of ${plan.length})...`;

        const newPdf = await window.PDFLib.PDFDocument.create();
        const copiedPages = await newPdf.copyPages(srcDoc, item.indices);
        copiedPages.forEach(p => newPdf.addPage(p));
        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        generatedFiles.push({ name: item.name, blob: blob });
      }

      // If user clicked preview, open the first generated PDF
      if (!download) {
        const firstBlob = generatedFiles[0].blob;
        openPdfPreviewTab(previewTab, firstBlob, generatedFiles[0].name || 'split_document.pdf');
        showToast('Opened preview of generated document in new tab.');
        return;
      }

      // If single file, download directly
      if (generatedFiles.length === 1) {
        triggerBlobDownload(generatedFiles[0].blob, generatedFiles[0].name);
        showToast(`Extracted ${plan[0].indices.length} pages into "${generatedFiles[0].name}"!`);
      } else {
        // Multiple files -> Pack into ZIP
        if (loadingText) loadingText.textContent = `Packing ${generatedFiles.length} PDF files into ZIP package...`;
        if (!window.JSZip) {
          throw new Error('JSZip library is not loaded.');
        }

        const zip = new window.JSZip();
        generatedFiles.forEach(f => {
          zip.file(f.name, f.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        triggerBlobDownload(zipBlob, `${prefix}_package.zip`);
        showToast(`Downloaded ${generatedFiles.length} PDF files in ZIP package!`);
      }
    } catch (err) {
      console.error('Split PDF execution failed:', err);
      if (previewTab && !previewTab.closed) {
        try {
          previewTab.close();
        } catch (_) {}
      }
      showToast('Split PDF error: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForSplit = async function() {
    if (!window.PDFLib) {
      showToast('PDF Engine is initializing, please wait...');
      return;
    }

    const loader = document.getElementById('pdf-split-loading');
    const loadingText = document.getElementById('pdf-split-loading-text');
    const dropzone = document.getElementById('pdf-split-dropzone');
    if (dropzone) dropzone.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Generating 6-page interactive sample PDF document...';
    }

    try {
      const doc = await window.PDFLib.PDFDocument.create();
      const rgb = window.PDFLib.rgb;
      const StandardFonts = window.PDFLib.StandardFonts;
      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      const pageThemes = [
        { title: 'Page 1: Executive Overview', color: rgb(0.1, 0.5, 0.4), bg: rgb(0.96, 0.98, 0.97), desc: 'High-level business performance summary and annual growth trajectory.' },
        { title: 'Page 2: Product Architecture', color: rgb(0.2, 0.35, 0.8), bg: rgb(0.96, 0.97, 1.0), desc: 'WebAssembly, Canvas 2D engine, and client-side binary pipeline design.' },
        { title: 'Page 3: User Analytics and Traffic', color: rgb(0.8, 0.4, 0.1), bg: rgb(1.0, 0.98, 0.95), desc: 'Global regional user activity, retention rates, and daily active sessions.' },
        { title: 'Page 4: Security and Privacy Compliance', color: rgb(0.5, 0.2, 0.7), bg: rgb(0.98, 0.96, 1.0), desc: 'Zero-cloud data retention, 100% in-browser sandboxed processing guarantee.' },
        { title: 'Page 5: Financial Forecasts', color: rgb(0.15, 0.6, 0.3), bg: rgb(0.95, 0.99, 0.96), desc: 'Quarterly projections, cost reduction benchmarks, and gross margins.' },
        { title: 'Page 6: Strategic Roadmap', color: rgb(0.85, 0.25, 0.25), bg: rgb(1.0, 0.96, 0.96), desc: 'Next quarter milestones, upcoming document tools, and API additions.' }
      ];

      for (let i = 0; i < pageThemes.length; i++) {
        const theme = pageThemes[i];
        const page = doc.addPage([595, 842]);
        page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: theme.bg });
        page.drawRectangle({ x: 40, y: 740, width: 515, height: 60, color: theme.color });
        page.drawText('PixKit Comprehensive Report 2026', { x: 60, y: 764, size: 18, font: fontBold, color: rgb(1, 1, 1) });
        page.drawText(theme.title, { x: 60, y: 690, size: 15, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(theme.desc, { x: 60, y: 660, size: 11.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

        // Decorative body card
        page.drawRectangle({ x: 60, y: 320, width: 475, height: 300, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1 });
        page.drawText(`Section ${i + 1} Detailed Breakdown:`, { x: 80, y: 580, size: 13, font: fontBold, color: theme.color });
        page.drawText(`- Status: Verified and Approved`, { x: 80, y: 540, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(`- Processing Time: 12ms`, { x: 80, y: 510, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(`- Integrity Checksum: 0x${Math.random().toString(16).substring(2, 8).toUpperCase()}`, { x: 80, y: 480, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(`- Confidentiality Level: Internal Document`, { x: 80, y: 450, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

        // Footer
        page.drawText(`PixKit Studio - Document Split Test Sample - Page ${i + 1} of 6`, { x: 170, y: 40, size: 10, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
      }

      const bytes = await doc.save();
      const file = new File([bytes], 'PixKit_6Page_Corporate_Report.pdf', { type: 'application/pdf' });
      await handlePdfSplitFile(file);
    } catch (err) {
      console.error('Sample PDF generation failed:', err);
      showToast('Error generating sample: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
    }
  };

  // ==============================================================
  // TOOL 19 CONTROLLER: COMPRESS PDF (OPTIMIZE & SHRINK FILE SIZE)
  // ==============================================================
  let pdfCompressState = {
    file: null,
    bytes: null,
    name: '',
    fileSize: 0,
    numPages: 0,
    pages: [],
    preset: 'balanced',
    quality: 0.70,
    scale: 1.0,
    colorMode: 'color'
  };

  function formatPdfBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return Math.round(bytes / 1024) + ' KB';
  }

  window.triggerPdfCompressPicker = function(e) {
    if (e) {
      if (e.target && (e.target.closest('#pdf-compress-sample-btn') || e.target.closest('label') || e.target.id === 'pdf-compress-file-picker')) return;
      e.stopPropagation();
    }
    const picker = document.getElementById('pdf-compress-file-picker');
    if (picker) {
      picker.value = '';
      picker.click();
    }
  };

  function initPdfCompressStage() {
    const dropzone = document.getElementById('pdf-compress-dropzone');
    if (dropzone && !dropzone.dataset.bound) {
      dropzone.dataset.bound = 'true';
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
          dropzone.classList.add('drag-over');
        });
      });
      ['dragleave'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
          dropzone.classList.remove('drag-over');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePdfCompressFile(e.dataTransfer.files[0]);
        }
      });
    }

    renderPdfCompressUI();
  }

  window.handlePdfCompressFile = async function(file) {
    if (!file) return;
    const fName = (file.name || '').toLowerCase();
    const fType = (file.type || '').toLowerCase();
    const isPdf = fName.endsWith('.pdf') || fType.includes('pdf') || file.bytes || (file instanceof ArrayBuffer) || (file instanceof Uint8Array);

    if (!isPdf) {
      showToast('Please select a valid PDF (.pdf) file.');
      return;
    }

    const loader = document.getElementById('pdf-compress-loading');
    const loadingText = document.getElementById('pdf-compress-loading-text');
    const dropzone = document.getElementById('pdf-compress-dropzone');
    const grid = document.getElementById('pdf-compress-grid');

    if (dropzone) dropzone.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = `Reading PDF file "${file.name || 'document'}"...`;
    }

    try {
      let uint8 = null;
      if (file.bytes) {
        uint8 = file.bytes instanceof Uint8Array ? new Uint8Array(file.bytes) : new Uint8Array(file.bytes.buffer || file.bytes);
      } else if (file instanceof Uint8Array) {
        uint8 = new Uint8Array(file);
      } else if (file instanceof ArrayBuffer) {
        uint8 = new Uint8Array(file);
      }

      if ((!uint8 || uint8.byteLength === 0) && typeof file.arrayBuffer === 'function') {
        try {
          const ab = await file.arrayBuffer();
          if (ab && ab.byteLength > 0) {
            uint8 = new Uint8Array(ab);
          }
        } catch (readErr) {
          console.warn('file.arrayBuffer failed:', readErr);
        }
      }

      if ((!uint8 || uint8.byteLength === 0) && typeof FileReader !== 'undefined') {
        try {
          const ab = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
            reader.readAsArrayBuffer(file);
          });
          if (ab && ab.byteLength > 0) {
            uint8 = new Uint8Array(ab);
          }
        } catch (readerErr) {
          console.warn('FileReader failed:', readerErr);
        }
      }

      if (!uint8 || uint8.byteLength === 0) {
        throw new Error('Unable to read PDF file buffer.');
      }

      const fileName = file.name || 'document.pdf';
      const fileSize = file.size || uint8.byteLength;

      pdfCompressState.file = file;
      pdfCompressState.bytes = new Uint8Array(uint8);
      pdfCompressState.name = fileName;
      pdfCompressState.fileSize = fileSize;
      pdfCompressState.pages = [];

      // Determine page count & read doc
      let numPages = 0;
      if (window.PDFLib) {
        try {
          const pdfDoc = await window.PDFLib.PDFDocument.load(new Uint8Array(uint8), { ignoreEncryption: true });
          numPages = pdfDoc.getPageCount();
        } catch (_) {}
      }

      if (window.pdfjsLib) {
        try {
          const loadingTask = window.pdfjsLib.getDocument({
            data: new Uint8Array(uint8),
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
          });

          const pdfjsDoc = await loadingTask.promise;
          numPages = pdfjsDoc.numPages || numPages;
          pdfCompressState.numPages = numPages;

          for (let i = 1; i <= numPages; i++) {
            if (loadingText) loadingText.textContent = `Rendering page thumbnails (${i} of ${numPages})...`;
            try {
              const page = await pdfjsDoc.getPage(i);
              const viewport = page.getViewport({ scale: 0.6 });
              const canvas = document.createElement('canvas');
              canvas.width = Math.max(100, Math.floor(viewport.width));
              canvas.height = Math.max(130, Math.floor(viewport.height));
              const ctx = canvas.getContext('2d');
              await page.render({ canvasContext: ctx, viewport }).promise;

              pdfCompressState.pages.push({
                pageNum: i,
                thumbUrl: canvas.toDataURL('image/jpeg', 0.8),
                width: viewport.width,
                height: viewport.height
              });
            } catch (pageErr) {
              console.warn(`Thumbnail failed for page ${i}:`, pageErr);
              pdfCompressState.pages.push({
                pageNum: i,
                thumbUrl: '',
                width: 595,
                height: 842
              });
            }
          }
        } catch (pdfjsErr) {
          console.warn('PDF.js parse warning:', pdfjsErr);
          pdfCompressState.numPages = numPages || 1;
          for (let i = 1; i <= pdfCompressState.numPages; i++) {
            pdfCompressState.pages.push({
              pageNum: i,
              thumbUrl: '',
              width: 595,
              height: 842
            });
          }
        }
      } else {
        pdfCompressState.numPages = numPages || 1;
        for (let i = 1; i <= pdfCompressState.numPages; i++) {
          pdfCompressState.pages.push({
            pageNum: i,
            thumbUrl: '',
            width: 595,
            height: 842
          });
        }
      }

      // Output filename default
      const base = fileName.replace(/\.pdf$/i, '');
      const outInput = document.getElementById('pdf-compress-output-name');
      if (outInput) outInput.value = `${base}_compressed.pdf`;

      showToast(`Loaded "${fileName}" (${pdfCompressState.numPages} pages, ${formatPdfBytes(fileSize)})`);
      renderPdfCompressUI();
    } catch (err) {
      console.error('PDF Compress load error:', err);
      showToast('Failed to load PDF: ' + (err.message || 'Unknown error'));
      if (dropzone) dropzone.style.display = 'flex';
    } finally {
      if (loader) loader.style.display = 'none';
      const picker = document.getElementById('pdf-compress-file-picker');
      if (picker) picker.value = '';
    }
  };

  function renderPdfCompressUI() {
    const dropzone = document.getElementById('pdf-compress-dropzone');
    const grid = document.getElementById('pdf-compress-grid');
    const footerTitle = document.getElementById('pdf-compress-footer-title');
    const footerSub = document.getElementById('pdf-compress-footer-sub');
    const topbarTools = document.getElementById('pdf-compress-topbar-tools');

    if (!pdfCompressState.bytes || !pdfCompressState.numPages) {
      if (dropzone) dropzone.style.display = 'flex';
      if (grid) grid.style.display = 'none';
      if (topbarTools) topbarTools.style.display = 'none';
      if (footerTitle) footerTitle.textContent = 'No PDF Loaded';
      if (footerSub) footerSub.textContent = 'Load a PDF document to begin compression';
      updatePdfCompressEstimates();
      return;
    }

    if (dropzone) dropzone.style.display = 'none';
    if (topbarTools) topbarTools.style.display = 'flex';
    if (footerTitle) footerTitle.textContent = pdfCompressState.name;
    if (footerSub) {
      footerSub.textContent = `${formatPdfBytes(pdfCompressState.fileSize)} · ${pdfCompressState.numPages} Page${pdfCompressState.numPages > 1 ? 's' : ''}`;
    }

    if (grid) {
      grid.style.display = 'grid';
      grid.innerHTML = '';

      pdfCompressState.pages.forEach((pageItem) => {
        const card = document.createElement('div');
        card.className = 'pdf-page-card';
        card.style.cursor = 'default';

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'pdf-page-thumb-wrap';

        if (pageItem.thumbUrl) {
          const img = document.createElement('img');
          img.src = pageItem.thumbUrl;
          img.alt = `Page ${pageItem.pageNum}`;
          thumbWrap.appendChild(img);
        } else {
          const fb = document.createElement('div');
          fb.style.cssText = 'width:100%;height:100%;display:grid;place-items:center;color:var(--muted);font-size:24px;background:var(--soft);';
          fb.textContent = '📄';
          thumbWrap.appendChild(fb);
        }

        const footer = document.createElement('div');
        footer.className = 'pdf-page-card-header';
        footer.style.borderTop = '1px solid var(--line)';
        footer.style.borderBottom = 'none';
        footer.style.padding = '8px 10px';

        const label = document.createElement('strong');
        label.style.fontSize = '12px';
        label.textContent = `Page ${pageItem.pageNum}`;

        const badge = document.createElement('span');
        badge.className = 'badge-pill';
        badge.style.fontSize = '10px';
        badge.textContent = `${Math.round(pageItem.width)}×${Math.round(pageItem.height)}`;

        footer.appendChild(label);
        footer.appendChild(badge);

        card.appendChild(thumbWrap);
        card.appendChild(footer);
        grid.appendChild(card);
      });
    }

    updatePdfCompressEstimates();
  }

  window.onPdfCompressPresetChange = function(preset) {
    pdfCompressState.preset = preset;

    // Toggle active class on option cards
    const presetCards = ['extreme', 'balanced', 'low', 'custom'];
    presetCards.forEach(p => {
      const card = document.getElementById(`preset-card-${p}`);
      if (card) {
        if (p === preset) {
          card.classList.add('active');
          card.style.borderColor = 'var(--ink)';
          card.style.background = 'var(--soft)';
        } else {
          card.classList.remove('active');
          card.style.borderColor = 'var(--line)';
          card.style.background = 'var(--surface)';
        }
      }
    });

    const customControls = document.getElementById('pdf-compress-custom-controls');
    if (customControls) {
      customControls.style.display = preset === 'custom' ? 'flex' : 'none';
    }

    if (preset === 'extreme') {
      pdfCompressState.quality = 0.45;
      pdfCompressState.scale = 0.75;
      pdfCompressState.colorMode = 'color';
    } else if (preset === 'balanced') {
      pdfCompressState.quality = 0.70;
      pdfCompressState.scale = 1.0;
      pdfCompressState.colorMode = 'color';
    } else if (preset === 'low') {
      pdfCompressState.quality = 0.88;
      pdfCompressState.scale = 1.25;
      pdfCompressState.colorMode = 'color';
    } else if (preset === 'custom') {
      onPdfCompressCustomInput();
      return;
    }

    updatePdfCompressColorModeUI(pdfCompressState.colorMode || 'color');
    updatePdfCompressEstimates();
  };

  window.setPdfCompressColorMode = function(mode) {
    const sel = document.getElementById('pdf-compress-colormode');
    if (sel) sel.value = mode;
    updatePdfCompressColorModeUI(mode);
    onPdfCompressCustomInput();
  };

  window.onPdfCompressColorModeSelect = function(mode) {
    updatePdfCompressColorModeUI(mode);
    onPdfCompressCustomInput();
  };

  function updatePdfCompressColorModeUI(mode) {
    const badge = document.getElementById('pdf-compress-colormode-badge');
    if (badge) {
      if (mode === 'grayscale') {
        badge.textContent = 'Grayscale (B&W)';
      } else if (mode === 'high-contrast') {
        badge.textContent = 'High Contrast';
      } else {
        badge.textContent = 'Full Color';
      }
    }
    const btnColor = document.getElementById('btn-colormode-color');
    const btnGray = document.getElementById('btn-colormode-grayscale');
    const btnContrast = document.getElementById('btn-colormode-contrast');
    if (btnColor) btnColor.classList.toggle('active', mode === 'color');
    if (btnGray) btnGray.classList.toggle('active', mode === 'grayscale');
    if (btnContrast) btnContrast.classList.toggle('active', mode === 'high-contrast');

    const sel = document.getElementById('pdf-compress-colormode');
    if (sel && sel.value !== mode) {
      sel.value = mode;
    }
  }

  window.onPdfCompressCustomInput = function() {
    const qSlider = document.getElementById('pdf-compress-quality');
    const sSlider = document.getElementById('pdf-compress-scale');
    const colorSelect = document.getElementById('pdf-compress-colormode');
    const qVal = document.getElementById('pdf-compress-quality-val');
    const sVal = document.getElementById('pdf-compress-scale-val');

    const q = qSlider ? parseInt(qSlider.value, 10) / 100 : 0.70;
    const s = sSlider ? parseFloat(sSlider.value) : 1.0;
    const mode = colorSelect ? colorSelect.value : 'color';

    pdfCompressState.quality = q;
    pdfCompressState.scale = s;
    pdfCompressState.colorMode = mode;

    updatePdfCompressColorModeUI(mode);

    if (qVal) qVal.textContent = `${Math.round(q * 100)}%`;
    if (sVal) {
      const approxDpi = Math.round(s * 150);
      sVal.textContent = `${s.toFixed(1)}x (~${approxDpi} DPI)`;
    }

    updatePdfCompressEstimates();
  };

  function updatePdfCompressEstimates() {
    const statOriginal = document.getElementById('pdf-compress-stat-original');
    const statEstimated = document.getElementById('pdf-compress-stat-estimated');
    const statSavings = document.getElementById('pdf-compress-stat-savings');
    const statPages = document.getElementById('pdf-compress-stat-pages');
    const summaryPill = document.getElementById('pdf-compress-summary-pill');
    const btnExecute = document.getElementById('btn-pdf-compress-execute');
    const btnPreview = document.getElementById('btn-pdf-compress-preview');

    const totalPages = pdfCompressState.numPages || 0;
    const origBytes = pdfCompressState.fileSize || 0;
    const hasDoc = origBytes > 0 && totalPages > 0;

    if (hasDoc) {
      let reductionRatio = 0.60;
      if (pdfCompressState.preset === 'extreme') {
        reductionRatio = 0.80;
      } else if (pdfCompressState.preset === 'balanced') {
        reductionRatio = 0.60;
      } else if (pdfCompressState.preset === 'low') {
        reductionRatio = 0.35;
      } else {
        // Custom formula
        const qFactor = (1 - pdfCompressState.quality) * 0.5;
        const sFactor = (1.5 - pdfCompressState.scale) * 0.4;
        const colorFactor = pdfCompressState.colorMode === 'grayscale' ? 0.25 : (pdfCompressState.colorMode === 'high-contrast' ? 0.45 : 0);
        reductionRatio = Math.max(0.15, Math.min(0.92, qFactor + sFactor + colorFactor));
      }

      const estBytes = Math.max(12 * 1024 * totalPages, Math.round(origBytes * (1 - reductionRatio)));
      const actualSavingsRatio = Math.max(5, Math.round(((origBytes - estBytes) / origBytes) * 100));

      if (statOriginal) statOriginal.textContent = formatPdfBytes(origBytes);
      if (statEstimated) statEstimated.textContent = `~${formatPdfBytes(estBytes)}`;
      if (statSavings) statSavings.textContent = `↓ ~${actualSavingsRatio}% Reduction`;
      if (statPages) statPages.textContent = `${totalPages} Pages`;
      if (summaryPill) summaryPill.textContent = `${totalPages} Pages · ${formatPdfBytes(origBytes)} → ~${formatPdfBytes(estBytes)} (↓${actualSavingsRatio}%)`;
    } else {
      if (statOriginal) statOriginal.textContent = '0 KB';
      if (statEstimated) statEstimated.textContent = '0 KB';
      if (statSavings) statSavings.textContent = '0% Reduction';
      if (statPages) statPages.textContent = '0 Pages';
      if (summaryPill) summaryPill.textContent = '0 Pages · 0 KB';
    }

    if (btnExecute) btnExecute.disabled = !hasDoc;
    if (btnPreview) btnPreview.disabled = !hasDoc;
  }

  window.executePdfCompress = async function(download = true) {
    if (!pdfCompressState.bytes || !pdfCompressState.numPages) {
      showToast('Please load a PDF document first.');
      return;
    }

    if (!window.PDFLib || !window.pdfjsLib) {
      showToast('PDF Engine is still initializing, please wait...');
      return;
    }

    const loader = document.getElementById('pdf-compress-loading');
    const loadingText = document.getElementById('pdf-compress-loading-text');
    const grid = document.getElementById('pdf-compress-grid');

    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Initializing compression engine...';
    }

    let previewTab = null;
    if (!download) {
      previewTab = createPreviewPlaceholderTab('Compressed PDF');
    }

    try {
      // Reload buffer from File object if bytes somehow became empty/detached
      if (!pdfCompressState.bytes || pdfCompressState.bytes.byteLength === 0) {
        if (pdfCompressState.file && typeof pdfCompressState.file.arrayBuffer === 'function') {
          const rebuf = await pdfCompressState.file.arrayBuffer();
          pdfCompressState.bytes = new Uint8Array(rebuf);
        }
      }

      if (!pdfCompressState.bytes || pdfCompressState.bytes.byteLength === 0) {
        throw new Error('PDF file buffer is empty. Please select or load a valid PDF file.');
      }

      const rawBytes = pdfCompressState.bytes instanceof Uint8Array ? pdfCompressState.bytes : new Uint8Array(pdfCompressState.bytes);
      let compressedBytes = null;

      try {
        const typedData = new Uint8Array(rawBytes);
        const loadingTask = window.pdfjsLib.getDocument({
          data: typedData,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        const pdfjsDoc = await loadingTask.promise;
        const totalPages = pdfjsDoc.numPages;

        const newPdf = await window.PDFLib.PDFDocument.create();
        const scale = pdfCompressState.scale || 1.0;
        const quality = pdfCompressState.quality || 0.70;
        const colorMode = pdfCompressState.colorMode || 'color';

        for (let i = 1; i <= totalPages; i++) {
          if (loadingText) loadingText.textContent = `Compressing and encoding page ${i} of ${totalPages}...`;
          const page = await pdfjsDoc.getPage(i);
          const origViewport = page.getViewport({ scale: 1.0 });
          const renderViewport = page.getViewport({ scale: scale * 1.5 }); // 1.5 baseline multiplier for crisp text rendering

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(renderViewport.width);
          canvas.height = Math.floor(renderViewport.height);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          // Fill solid white background in case of transparent PDF streams
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

          // Apply Grayscale / High-Contrast transform if selected
          if (colorMode === 'grayscale' || colorMode === 'high-contrast') {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            const isHighContrast = colorMode === 'high-contrast';

            for (let p = 0; p < d.length; p += 4) {
              const gray = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
              if (isHighContrast) {
                const val = gray > 165 ? 255 : 0;
                d[p] = val;
                d[p + 1] = val;
                d[p + 2] = val;
              } else {
                d[p] = gray;
                d[p + 1] = gray;
                d[p + 2] = gray;
              }
            }
            ctx.putImageData(imgData, 0, 0);
          }

          // Convert page to compressed JPEG data URL
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const jpgImage = await newPdf.embedJpg(dataUrl);

          // Add page matching original PDF dimensions exactly
          const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
          newPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: origViewport.width,
            height: origViewport.height,
          });
        }

        if (loadingText) loadingText.textContent = 'Saving compressed document...';
        compressedBytes = await newPdf.save();
      } catch (pdfjsErr) {
        console.warn('PDF.js compression fallback to PDFLib:', pdfjsErr);
        if (loadingText) loadingText.textContent = 'Applying PDF-Lib stream compression...';
        const copyBuf = new Uint8Array(rawBytes);
        const fallbackDoc = await window.PDFLib.PDFDocument.load(copyBuf, { ignoreEncryption: true });
        compressedBytes = await fallbackDoc.save({ useObjectStreams: true });
      }

      const compBlob = new Blob([compressedBytes], { type: 'application/pdf' });

      const origSize = pdfCompressState.fileSize;
      const compSize = compressedBytes.byteLength;
      const savingsPct = Math.round(((origSize - compSize) / origSize) * 100);

      let outName = (document.getElementById('pdf-compress-output-name')?.value || 'compressed_document.pdf').trim();
      if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

      if (!download) {
        openPdfPreviewTab(previewTab, compBlob, outName);
        showToast(`Compressed from ${formatPdfBytes(origSize)} to ${formatPdfBytes(compSize)} (${savingsPct > 0 ? `↓ ${savingsPct}%` : 'optimized'})`);
        return;
      }

      triggerBlobDownload(compBlob, outName);
      showToast(`Saved "${outName}"! Reduced from ${formatPdfBytes(origSize)} to ${formatPdfBytes(compSize)} (${savingsPct > 0 ? `↓ ${savingsPct}% smaller` : 'optimized'})!`);
    } catch (err) {
      console.error('PDF compression failed:', err);
      if (previewTab && !previewTab.closed) {
        try {
          previewTab.close();
        } catch (_) {}
      }
      showToast('Compression failed: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForCompress = async function() {
    if (!window.PDFLib) {
      showToast('PDF Engine is initializing, please wait...');
      return;
    }

    const loader = document.getElementById('pdf-compress-loading');
    const loadingText = document.getElementById('pdf-compress-loading-text');
    const dropzone = document.getElementById('pdf-compress-dropzone');
    if (dropzone) dropzone.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Generating graphic-rich 4-page sample PDF...';
    }

    try {
      const doc = await window.PDFLib.PDFDocument.create();
      const rgb = window.PDFLib.rgb;
      const StandardFonts = window.PDFLib.StandardFonts;
      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      const pageThemes = [
        { title: 'Page 1: Visual Design Spectrum', col1: rgb(0.12, 0.45, 0.9), col2: rgb(0.9, 0.25, 0.4), desc: 'High-density color gradients and full bleed visual elements.' },
        { title: 'Page 2: Studio Engine Performance', col1: rgb(0.08, 0.65, 0.45), col2: rgb(0.1, 0.35, 0.7), desc: 'Binary buffers, client-side WebAssembly, and lossless transformations.' },
        { title: 'Page 3: Global Media Assets & Gallery', col1: rgb(0.85, 0.4, 0.1), col2: rgb(0.65, 0.15, 0.6), desc: 'High-resolution photo composition and vector graphics.' },
        { title: 'Page 4: Technical Specifications', col1: rgb(0.3, 0.2, 0.6), col2: rgb(0.15, 0.5, 0.8), desc: 'Zero-cloud pipeline architecture, local sandbox security, and data privacy.' }
      ];

      for (let i = 0; i < pageThemes.length; i++) {
        const theme = pageThemes[i];
        const page = doc.addPage([595, 842]);

        // Background
        page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.97, 0.98, 0.99) });

        // Header Banner
        page.drawRectangle({ x: 30, y: 730, width: 535, height: 80, color: theme.col1 });
        page.drawText('PixKit Studio - Media and Document Optimization', { x: 50, y: 775, size: 16, font: fontBold, color: rgb(1, 1, 1) });
        page.drawText(theme.title, { x: 50, y: 750, size: 12, font: fontRegular, color: rgb(0.9, 0.95, 1) });

        // High-density graphic pattern
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 8; c++) {
            const bx = 50 + c * 60;
            const by = 420 + r * 45;
            const isAlt = (r + c) % 2 === 0;
            page.drawRectangle({
              x: bx,
              y: by,
              width: 50,
              height: 35,
              color: isAlt ? theme.col1 : theme.col2,
              opacity: 0.15 + ((r * 8 + c) % 10) * 0.07
            });
          }
        }

        // Card Container
        page.drawRectangle({ x: 40, y: 100, width: 515, height: 280, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1 });
        page.drawText('Document Optimization Benchmark Details', { x: 65, y: 340, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(theme.desc, { x: 65, y: 315, size: 11, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

        const specs = [
          'Rasterization Density: Multi-channel RGBA Stream',
          'Color Palette Depth: 24-bit TrueColor gamut',
          'Embedded Vector Metadata: High Precision Streams',
          'Recommended Compression: Balanced (150 DPI JPEG Re-encode)',
          'Expected Size Reduction: 50% to 75% without visible text artifacts'
        ];

        specs.forEach((text, sIdx) => {
          page.drawText(`[OK]  ${text}`, { x: 65, y: 275 - sIdx * 28, size: 11, font: fontRegular, color: rgb(0.2, 0.25, 0.3) });
        });

        // Footer
        page.drawText(`PixKit Studio - Test Document - Page ${i + 1} of 4`, { x: 200, y: 40, size: 9.5, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
      }

      const bytes = await doc.save();
      const file = new File([bytes], 'PixKit_Graphic_Document_Sample.pdf', { type: 'application/pdf' });
      file.bytes = bytes;
      await handlePdfCompressFile(file);
    } catch (err) {
      console.error('Sample compress PDF generation failed:', err);
      showToast('Error creating sample: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
    }
  };

  // ==============================================================
  // TOOL 20 CONTROLLER: ROTATE PDF PAGES
  // ==============================================================
  let pdfRotateState = {
    file: null,
    fileName: '',
    fileSize: 0,
    bytes: null,
    numPages: 0,
    filter: 'all', // 'all' | 'odd' | 'even' | 'first'
    pages: [], // Array of { pageNum: 1, rotation: 0, originalRotation: 0, thumbUrl: '' }
  };

  function initPdfRotateStage() {
    const dropzone = document.getElementById('pdf-rotate-dropzone');
    if (dropzone && !dropzone.dataset.bound) {
      dropzone.dataset.bound = 'true';
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-active');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-active');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePdfRotateFile(e.dataTransfer.files[0]);
        }
      });
    }

    renderPdfRotateUI();
  }

  window.handlePdfRotateFile = async function(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf') && !file.bytes) {
      showToast('Please select a valid PDF (.pdf) file.');
      return;
    }

    const loader = document.getElementById('pdf-rotate-loading');
    const loadingText = document.getElementById('pdf-rotate-loading-text');
    const grid = document.getElementById('pdf-rotate-grid');
    const dropzone = document.getElementById('pdf-rotate-dropzone');

    if (dropzone) dropzone.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = `Reading PDF file "${file.name}"...`;
    }

    try {
      let rawBuf = null;
      if (file.bytes instanceof Uint8Array) {
        rawBuf = file.bytes;
      } else if (file.bytes instanceof ArrayBuffer) {
        rawBuf = new Uint8Array(file.bytes);
      } else if (file instanceof Uint8Array) {
        rawBuf = file;
      } else if (file instanceof ArrayBuffer) {
        rawBuf = new Uint8Array(file);
      } else if (typeof file.arrayBuffer === 'function') {
        const ab = await file.arrayBuffer();
        rawBuf = new Uint8Array(ab);
      }

      if (!rawBuf || rawBuf.byteLength === 0) {
        throw new Error('PDF file buffer is empty.');
      }

      // Safeguarded isolated clone that will never be detached
      const storedBytes = new Uint8Array(rawBuf.byteLength);
      storedBytes.set(rawBuf);

      pdfRotateState.file = file;
      pdfRotateState.fileName = file.name || 'document.pdf';
      pdfRotateState.fileSize = file.size || storedBytes.byteLength;
      pdfRotateState.bytes = storedBytes;
      pdfRotateState.pages = [];

      // Auto-suggest output filename
      const baseName = (file.name || 'document').replace(/\.pdf$/i, '');
      const outInput = document.getElementById('pdf-rotate-output-name');
      if (outInput) outInput.value = `${baseName}_rotated.pdf`;

      if (!window.pdfjsLib || !window.PDFLib) {
        throw new Error('PDF engine libraries are not fully loaded.');
      }

      // Check original page count and initial rotations from PDFLib
      let origRotations = [];
      try {
        const checkCopy = new Uint8Array(storedBytes.byteLength);
        checkCopy.set(storedBytes);
        const pdfDoc = await window.PDFLib.PDFDocument.load(checkCopy, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        for (let p = 0; p < count; p++) {
          origRotations.push(pdfDoc.getPage(p).getRotation()?.angle || 0);
        }
      } catch (e) {
        console.warn('PDF-Lib rotation inspect failed:', e);
      }

      // Render thumbnails with PDF.js using an isolated clone
      const pdfjsData = new Uint8Array(storedBytes.byteLength);
      pdfjsData.set(storedBytes);
      const loadingTask = window.pdfjsLib.getDocument({
        data: pdfjsData,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });

      const pdfjsDoc = await loadingTask.promise;
      pdfRotateState.numPages = pdfjsDoc.numPages;

      for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        if (loadingText) loadingText.textContent = `Rendering page ${i} of ${pdfjsDoc.numPages}...`;
        const page = await pdfjsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.75 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
        const origRot = origRotations[i - 1] || 0;

        pdfRotateState.pages.push({
          pageNum: i,
          rotation: 0, // user-applied delta in degrees (0, 90, 180, 270)
          originalRotation: origRot,
          thumbUrl: thumbUrl
        });
      }

      showToast(`Loaded ${pdfRotateState.fileName} (${pdfRotateState.numPages} pages). Ready to rotate!`);
    } catch (err) {
      console.error('Error loading PDF for rotate:', err);
      showToast('Failed loading PDF: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      renderPdfRotateUI();
    }
  };

  window.rotatePdfPage = function(index, deltaDegrees) {
    if (index < 0 || index >= pdfRotateState.pages.length) return;
    const page = pdfRotateState.pages[index];
    const newRot = (((page.rotation + deltaDegrees) % 360) + 360) % 360;
    page.rotation = newRot;

    // Fast DOM update for instant smooth visual feedback
    const imgEl = document.getElementById(`rotate-thumb-img-${index}`);
    const badgeEl = document.getElementById(`page-rot-badge-${index}`);
    if (imgEl) {
      imgEl.style.transform = `rotate(${newRot}deg)`;
    }
    if (badgeEl) {
      badgeEl.textContent = `${newRot}°`;
      if (newRot !== 0) {
        badgeEl.style.background = 'var(--lime-tint)';
        badgeEl.style.color = '#2d6a4f';
        badgeEl.style.border = '1px solid var(--accent-lime-border)';
      } else {
        badgeEl.style.background = 'var(--white)';
        badgeEl.style.color = 'var(--muted)';
        badgeEl.style.border = '1px solid var(--line)';
      }
    }

    updatePdfRotateStats();
  };

  window.rotateAllPdfPages = function(deltaDegrees) {
    if (!pdfRotateState.pages.length) return;
    const filter = pdfRotateState.filter || 'all';

    let affected = 0;
    pdfRotateState.pages.forEach((page, idx) => {
      let match = true;
      if (filter === 'odd') match = (page.pageNum % 2 !== 0);
      else if (filter === 'even') match = (page.pageNum % 2 === 0);
      else if (filter === 'first') match = (idx === 0);

      if (match) {
        page.rotation = (((page.rotation + deltaDegrees) % 360) + 360) % 360;
        affected++;
      }
    });

    renderPdfRotateGrid();
    updatePdfRotateStats();
    showToast(`Rotated ${affected} page(s) by ${deltaDegrees > 0 ? '+' : ''}${deltaDegrees}°.`);
  };

  window.resetAllPdfPageRotations = function() {
    if (!pdfRotateState.pages.length) return;
    pdfRotateState.pages.forEach(p => p.rotation = 0);
    renderPdfRotateGrid();
    updatePdfRotateStats();
    showToast('Reset all pages to original orientation.');
  };

  window.onPdfRotateFilterChange = function(val) {
    pdfRotateState.filter = val;
  };

  function renderPdfRotateUI() {
    const dropzone = document.getElementById('pdf-rotate-dropzone');
    const grid = document.getElementById('pdf-rotate-grid');
    const topbarTools = document.getElementById('pdf-rotate-topbar-tools');
    const footerTitle = document.getElementById('pdf-rotate-footer-title');
    const footerSub = document.getElementById('pdf-rotate-footer-sub');
    const btnExecute = document.getElementById('btn-pdf-rotate-execute');
    const btnPreview = document.getElementById('btn-pdf-rotate-preview');

    const hasPages = pdfRotateState.pages.length > 0;

    if (dropzone) dropzone.style.display = hasPages ? 'none' : 'flex';
    if (grid) grid.style.display = hasPages ? 'grid' : 'none';
    if (topbarTools) topbarTools.style.display = hasPages ? 'flex' : 'none';

    if (hasPages) {
      if (footerTitle) footerTitle.textContent = pdfRotateState.fileName;
      if (footerSub) {
        const mb = (pdfRotateState.fileSize / (1024 * 1024)).toFixed(2);
        footerSub.textContent = `${mb} MB · ${pdfRotateState.numPages} Page${pdfRotateState.numPages > 1 ? 's' : ''}`;
      }
      renderPdfRotateGrid();
    } else {
      if (footerTitle) footerTitle.textContent = 'No PDF Loaded';
      if (footerSub) footerSub.textContent = 'Load a PDF document to begin rotating pages';
      if (grid) grid.innerHTML = '';
    }

    if (btnExecute) btnExecute.disabled = !hasPages;
    if (btnPreview) btnPreview.disabled = !hasPages;

    updatePdfRotateStats();
  }

  function renderPdfRotateGrid() {
    const grid = document.getElementById('pdf-rotate-grid');
    if (!grid) return;
    grid.innerHTML = '';

    pdfRotateState.pages.forEach((page, i) => {
      const card = document.createElement('div');
      card.className = 'pdf-page-card';
      card.id = `rotate-card-${i}`;

      const rot = page.rotation || 0;
      const isRotated = rot !== 0;

      card.innerHTML = `
        <div class="pdf-page-card-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="badge-pill" style="font-size:10px; background:var(--soft); color:var(--ink);">Page ${page.pageNum}</span>
          </div>
          <span class="badge-pill" id="page-rot-badge-${i}" style="font-size:10.5px; font-weight:700; ${isRotated ? 'background:var(--lime-tint); color:#2d6a4f; border:1px solid var(--accent-lime-border);' : 'background:var(--white); border:1px solid var(--line); color:var(--muted);'}">
            ${rot}°
          </span>
        </div>
        <div class="pdf-page-thumb-wrap" onclick="rotatePdfPage(${i}, 90)" title="Click to rotate 90° right" style="cursor:pointer; overflow:hidden;">
          <img src="${page.thumbUrl}" alt="Page ${page.pageNum}" style="max-width:100%; max-height:100%; object-fit:contain; transform:rotate(${rot}deg); transition:transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);" id="rotate-thumb-img-${i}">
        </div>
        <div class="pdf-page-card-actions">
          <button type="button" onclick="rotatePdfPage(${i}, -90); event.stopPropagation();" title="Rotate 90° Left">
            ↺ 90° Left
          </button>
          <button type="button" onclick="rotatePdfPage(${i}, 90); event.stopPropagation();" title="Rotate 90° Right">
            ↻ 90° Right
          </button>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  function updatePdfRotateStats() {
    const statTotal = document.getElementById('pdf-rotate-stat-total');
    const statModified = document.getElementById('pdf-rotate-stat-modified');
    const summaryPill = document.getElementById('pdf-rotate-summary-pill');

    const total = pdfRotateState.pages.length;
    const modified = pdfRotateState.pages.filter(p => p.rotation !== 0).length;

    if (statTotal) statTotal.textContent = `${total} Page${total !== 1 ? 's' : ''}`;
    if (statModified) statModified.textContent = `${modified} Modified`;
    if (summaryPill) {
      summaryPill.textContent = `${total} Pages · ${modified} Rotated`;
      if (modified > 0) {
        summaryPill.style.background = 'var(--lime-tint)';
        summaryPill.style.color = '#2d6a4f';
        summaryPill.style.borderColor = 'var(--accent-lime-border)';
      } else {
        summaryPill.style.background = 'var(--soft)';
        summaryPill.style.color = 'var(--ink)';
        summaryPill.style.borderColor = 'var(--line)';
      }
    }
  }

  window.executePdfRotate = async function(download = true) {
    if (!pdfRotateState.bytes || !pdfRotateState.pages.length) {
      showToast('Please load a PDF document first.');
      return;
    }

    if (!window.PDFLib) {
      showToast('PDF-Lib engine is loading, please wait...');
      return;
    }

    let previewTab = null;
    if (!download) {
      previewTab = createPreviewPlaceholderTab('Rotated PDF');
    }

    const loader = document.getElementById('pdf-rotate-loading');
    const loadingText = document.getElementById('pdf-rotate-loading-text');
    const grid = document.getElementById('pdf-rotate-grid');

    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Applying page rotations to PDF document...';
    }

    try {
      let rawBytes = pdfRotateState.bytes;
      if ((!rawBytes || rawBytes.byteLength === 0) && pdfRotateState.file && typeof pdfRotateState.file.arrayBuffer === 'function') {
        const rebuf = await pdfRotateState.file.arrayBuffer();
        rawBytes = new Uint8Array(rebuf);
        pdfRotateState.bytes = rawBytes;
      }

      if (!rawBytes || rawBytes.byteLength === 0) {
        throw new Error('PDF file buffer is empty. Please select or load a valid PDF file.');
      }

      const uint8 = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
      const bytesClone = new Uint8Array(uint8.byteLength);
      bytesClone.set(uint8);

      const pdfDoc = await window.PDFLib.PDFDocument.load(bytesClone, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();

      let modifiedCount = 0;
      for (let i = 0; i < totalPages; i++) {
        const pageRecord = pdfRotateState.pages[i];
        if (pageRecord && pageRecord.rotation !== 0) {
          const page = pdfDoc.getPage(i);
          const currentAngle = page.getRotation()?.angle || 0;
          const finalAngle = (((currentAngle + pageRecord.rotation) % 360) + 360) % 360;
          page.setRotation(window.PDFLib.degrees(finalAngle));
          modifiedCount++;
        }
      }

      if (loadingText) loadingText.textContent = 'Saving rotated PDF stream...';
      const rotatedBytes = await pdfDoc.save();
      const blob = new Blob([rotatedBytes], { type: 'application/pdf' });

      let outName = (document.getElementById('pdf-rotate-output-name')?.value || 'rotated_document.pdf').trim();
      if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

      if (download) {
        triggerBlobDownload(blob, outName);
        showToast(`Successfully rotated ${modifiedCount} page(s) and downloaded "${outName}"!`);
      } else {
        openPdfPreviewTab(previewTab, blob, outName);
        showToast(`Opened rotated PDF preview (${modifiedCount} page(s) modified) in new tab.`);
      }
    } catch (err) {
      console.error('Error executing PDF rotation:', err);
      if (previewTab && !previewTab.closed) {
        try { previewTab.close(); } catch (_) {}
      }
      showToast('Error rotating PDF: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForRotate = async function() {
    if (!window.PDFLib) {
      showToast('PDF Engine is initializing, please wait...');
      return;
    }

    const loader = document.getElementById('pdf-rotate-loading');
    const loadingText = document.getElementById('pdf-rotate-loading-text');
    const dropzone = document.getElementById('pdf-rotate-dropzone');

    if (dropzone) dropzone.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Generating 6-page multi-orientation sample PDF...';
    }

    try {
      const doc = await window.PDFLib.PDFDocument.create();
      const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      const rgb = window.PDFLib.rgb;

      const pageThemes = [
        { title: 'Project Overview & Roadmap', sub: 'Page 1 - Executive Summary', color: rgb(0.13, 0.45, 0.35) },
        { title: 'Financial Forecast & Projections', sub: 'Page 2 - Q1-Q4 Financials', color: rgb(0.2, 0.35, 0.6) },
        { title: 'System Architecture Blueprint', sub: 'Page 3 - Technical Infrastructure', color: rgb(0.5, 0.2, 0.5) },
        { title: 'User Analytics & Demographics', sub: 'Page 4 - Audience Growth', color: rgb(0.8, 0.35, 0.15) },
        { title: 'Security Audit & Compliance', sub: 'Page 5 - Protocol Checklist', color: rgb(0.25, 0.25, 0.3) },
        { title: 'Final Appendix & Certifications', sub: 'Page 6 - Legal Signatures', color: rgb(0.15, 0.5, 0.4) }
      ];

      for (let i = 0; i < pageThemes.length; i++) {
        const theme = pageThemes[i];
        const page = doc.addPage([595, 842]);

        // Background
        page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.98, 0.98, 0.98) });
        // Header banner
        page.drawRectangle({ x: 40, y: 740, width: 515, height: 60, color: theme.color });
        page.drawText(theme.title, { x: 60, y: 762, size: 20, font: fontBold, color: rgb(1, 1, 1) });
        page.drawText(theme.sub, { x: 60, y: 700, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

        // Content card
        page.drawRectangle({ x: 60, y: 350, width: 475, height: 320, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.88, 0.9), borderWidth: 1 });
        page.drawText('Sample PDF Orientation Test Document', { x: 80, y: 630, size: 15, font: fontBold, color: theme.color });
        page.drawText(`Page Number: ${i + 1} of 6`, { x: 80, y: 595, size: 12, font: font, color: rgb(0.3, 0.3, 0.3) });
        page.drawText('Use this sample to test 90° clockwise, counter-clockwise, or 180° page rotations.', { x: 80, y: 565, size: 11, font: font, color: rgb(0.4, 0.4, 0.4) });
        page.drawText('All vector text and shapes remain 100% crisp and uncompressed.', { x: 80, y: 540, size: 11, font: font, color: rgb(0.4, 0.4, 0.4) });

        // Large direction arrow symbol for visual orientation test
        page.drawText(`TOP (Orientation Reference)`, { x: 180, y: 460, size: 16, font: fontBold, color: theme.color });
        page.drawText(`▲ ▲ ▲`, { x: 260, y: 420, size: 22, font: fontBold, color: theme.color });

        page.drawText(`PixKit Studio - Document Tools - 2026`, { x: 200, y: 40, size: 10, font: font, color: rgb(0.6, 0.6, 0.6) });
      }

      const bytes = await doc.save();
      const sampleFile = new File([bytes], 'PixKit_Sample_Orientation_Test.pdf', { type: 'application/pdf' });
      sampleFile.bytes = bytes;
      await handlePdfRotateFile(sampleFile);
    } catch (err) {
      console.error('Error generating sample for rotate:', err);
      showToast('Failed generating sample: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
    }
  };

  // ==============================================================
  // TOOL 21 CONTROLLER: DELETE PDF PAGES
  // ==============================================================
  let pdfDeleteState = {
    file: null,
    fileName: '',
    fileSize: 0,
    bytes: null,
    numPages: 0,
    pages: [], // Array of { pageNum: 1, deleted: false, thumbUrl: '' }
  };

  function initPdfDeleteStage() {
    const dropzone = document.getElementById('pdf-delete-dropzone');
    if (dropzone && !dropzone.dataset.bound) {
      dropzone.dataset.bound = 'true';
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-active');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-active');
        });
      });
      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePdfDeleteFile(e.dataTransfer.files[0]);
        }
      });
    }

    renderPdfDeleteUI();
  }

  window.handlePdfDeleteFile = async function(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf') && !file.bytes) {
      showToast('Please select a valid PDF (.pdf) file.');
      return;
    }

    const loader = document.getElementById('pdf-delete-loading');
    const loadingText = document.getElementById('pdf-delete-loading-text');
    const grid = document.getElementById('pdf-delete-grid');
    const dropzone = document.getElementById('pdf-delete-dropzone');

    if (dropzone) dropzone.style.display = 'none';
    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = `Reading PDF file "${file.name}"...`;
    }

    try {
      let rawBuf = null;
      if (file.bytes instanceof Uint8Array) {
        rawBuf = file.bytes;
      } else if (file.bytes instanceof ArrayBuffer) {
        rawBuf = new Uint8Array(file.bytes);
      } else if (file instanceof Uint8Array) {
        rawBuf = file;
      } else if (file instanceof ArrayBuffer) {
        rawBuf = new Uint8Array(file);
      } else if (typeof file.arrayBuffer === 'function') {
        const ab = await file.arrayBuffer();
        rawBuf = new Uint8Array(ab);
      }

      if (!rawBuf || rawBuf.byteLength === 0) {
        throw new Error('PDF file buffer is empty.');
      }

      // Safeguarded isolated clone that will never be detached
      const storedBytes = new Uint8Array(rawBuf.byteLength);
      storedBytes.set(rawBuf);

      pdfDeleteState.file = file;
      pdfDeleteState.fileName = file.name || 'document.pdf';
      pdfDeleteState.fileSize = file.size || storedBytes.byteLength;
      pdfDeleteState.bytes = storedBytes;
      pdfDeleteState.pages = [];

      // Auto-suggest output filename
      const baseName = (file.name || 'document').replace(/\.pdf$/i, '');
      const outInput = document.getElementById('pdf-delete-output-name');
      if (outInput) outInput.value = `${baseName}_edited.pdf`;

      const rangeInput = document.getElementById('pdf-delete-range-input');
      if (rangeInput) rangeInput.value = '';

      if (!window.pdfjsLib || !window.PDFLib) {
        throw new Error('PDF engine libraries are not fully loaded.');
      }

      // Render thumbnails with PDF.js using an isolated clone
      const pdfjsData = new Uint8Array(storedBytes.byteLength);
      pdfjsData.set(storedBytes);
      const loadingTask = window.pdfjsLib.getDocument({
        data: pdfjsData,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });

      const pdfjsDoc = await loadingTask.promise;
      pdfDeleteState.numPages = pdfjsDoc.numPages;

      for (let i = 1; i <= pdfjsDoc.numPages; i++) {
        if (loadingText) loadingText.textContent = `Rendering page ${i} of ${pdfjsDoc.numPages}...`;
        const page = await pdfjsDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.75 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);

        pdfDeleteState.pages.push({
          pageNum: i,
          deleted: false,
          thumbUrl: thumbUrl
        });
      }

      showToast(`Loaded ${pdfDeleteState.fileName} (${pdfDeleteState.numPages} pages). Click pages to mark for deletion.`);
    } catch (err) {
      console.error('Error loading PDF for delete:', err);
      showToast('Failed loading PDF: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      renderPdfDeleteUI();
    }
  };

  window.togglePdfPageDelete = function(index) {
    if (index < 0 || index >= pdfDeleteState.pages.length) return;
    pdfDeleteState.pages[index].deleted = !pdfDeleteState.pages[index].deleted;
    syncPdfDeleteRangeInput();
    renderPdfDeleteGrid();
    updatePdfDeleteStats();
  };

  window.setPdfDeleteFilter = function(filter) {
    if (!pdfDeleteState.pages.length) return;
    pdfDeleteState.pages.forEach((page, idx) => {
      if (filter === 'odd') page.deleted = (page.pageNum % 2 !== 0);
      else if (filter === 'even') page.deleted = (page.pageNum % 2 === 0);
      else if (filter === 'first') page.deleted = (idx === 0);
      else if (filter === 'last') page.deleted = (idx === pdfDeleteState.pages.length - 1);
    });
    syncPdfDeleteRangeInput();
    renderPdfDeleteGrid();
    updatePdfDeleteStats();
  };

  window.invertPdfDeleteSelection = function() {
    if (!pdfDeleteState.pages.length) return;
    pdfDeleteState.pages.forEach(p => p.deleted = !p.deleted);
    syncPdfDeleteRangeInput();
    renderPdfDeleteGrid();
    updatePdfDeleteStats();
  };

  window.resetPdfDeleteSelection = function() {
    if (!pdfDeleteState.pages.length) return;
    pdfDeleteState.pages.forEach(p => p.deleted = false);
    const rangeInput = document.getElementById('pdf-delete-range-input');
    if (rangeInput) rangeInput.value = '';
    renderPdfDeleteGrid();
    updatePdfDeleteStats();
    showToast('Reset: all pages kept.');
  };

  window.onPdfDeleteRangeInput = function(val) {
    if (!pdfDeleteState.pages.length) return;
    // Parse range string e.g. "2, 4-5, 7"
    const pagesToDelete = new Set();
    const parts = val.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(part => {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map(s => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let p = min; p <= max; p++) {
            if (p >= 1 && p <= pdfDeleteState.pages.length) {
              pagesToDelete.add(p);
            }
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= pdfDeleteState.pages.length) {
          pagesToDelete.add(num);
        }
      }
    });

    pdfDeleteState.pages.forEach(p => {
      p.deleted = pagesToDelete.has(p.pageNum);
    });

    renderPdfDeleteGrid();
    updatePdfDeleteStats();
  };

  function syncPdfDeleteRangeInput() {
    const rangeInput = document.getElementById('pdf-delete-range-input');
    if (!rangeInput) return;
    const deletedNums = pdfDeleteState.pages
      .filter(p => p.deleted)
      .map(p => p.pageNum);

    if (!deletedNums.length) {
      rangeInput.value = '';
      return;
    }

    // Collapse consecutive numbers into ranges e.g. [1, 2, 3, 5] -> "1-3, 5"
    const ranges = [];
    let start = deletedNums[0];
    let prev = start;

    for (let i = 1; i < deletedNums.length; i++) {
      const curr = deletedNums[i];
      if (curr === prev + 1) {
        prev = curr;
      } else {
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = curr;
        prev = curr;
      }
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    rangeInput.value = ranges.join(', ');
  }

  function renderPdfDeleteUI() {
    const dropzone = document.getElementById('pdf-delete-dropzone');
    const grid = document.getElementById('pdf-delete-grid');
    const topbarTools = document.getElementById('pdf-delete-topbar-tools');
    const footerTitle = document.getElementById('pdf-delete-footer-title');
    const footerSub = document.getElementById('pdf-delete-footer-sub');
    const btnExecute = document.getElementById('btn-pdf-delete-execute');
    const btnPreview = document.getElementById('btn-pdf-delete-preview');

    const hasPages = pdfDeleteState.pages.length > 0;

    if (dropzone) dropzone.style.display = hasPages ? 'none' : 'flex';
    if (grid) grid.style.display = hasPages ? 'grid' : 'none';
    if (topbarTools) topbarTools.style.display = hasPages ? 'flex' : 'none';

    if (hasPages) {
      if (footerTitle) footerTitle.textContent = pdfDeleteState.fileName;
      if (footerSub) {
        const mb = (pdfDeleteState.fileSize / (1024 * 1024)).toFixed(2);
        footerSub.textContent = `${mb} MB · ${pdfDeleteState.numPages} Page${pdfDeleteState.numPages > 1 ? 's' : ''}`;
      }
      renderPdfDeleteGrid();
    } else {
      if (footerTitle) footerTitle.textContent = 'No PDF Loaded';
      if (footerSub) footerSub.textContent = 'Load a PDF document to begin removing pages';
      if (grid) grid.innerHTML = '';
    }

    updatePdfDeleteStats();
  }

  function renderPdfDeleteGrid() {
    const grid = document.getElementById('pdf-delete-grid');
    if (!grid) return;
    grid.innerHTML = '';

    pdfDeleteState.pages.forEach((page, i) => {
      const card = document.createElement('div');
      card.className = `pdf-page-card ${page.deleted ? 'delete-marked' : ''}`;
      card.id = `delete-card-${i}`;

      card.innerHTML = `
        <div class="pdf-page-card-header">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="badge-pill" style="font-size:10px; background:var(--soft); color:var(--ink);">Page ${page.pageNum}</span>
          </div>
          <span class="badge-pill" id="page-delete-badge-${i}" style="font-size:10.5px; font-weight:700; ${page.deleted ? 'background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5;' : 'background:var(--white); border:1px solid var(--line); color:#2d6a4f;'}">
            ${page.deleted ? '✕ Delete' : '✓ Keep'}
          </span>
        </div>
        <div class="pdf-page-thumb-wrap" onclick="togglePdfPageDelete(${i})" title="${page.deleted ? 'Click to keep page' : 'Click to delete page'}" style="cursor:pointer; overflow:hidden;">
          <img src="${page.thumbUrl}" alt="Page ${page.pageNum}" style="max-width:100%; max-height:100%; object-fit:contain;">
        </div>
        <div class="pdf-page-card-actions">
          <button type="button" class="${page.deleted ? 'primary-action' : 'danger-action'}" onclick="togglePdfPageDelete(${i}); event.stopPropagation();" title="${page.deleted ? 'Keep this page' : 'Mark page for removal'}">
            ${page.deleted ? '↩ Keep Page' : '🗑️ Delete Page'}
          </button>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  function updatePdfDeleteStats() {
    const statTotal = document.getElementById('pdf-delete-stat-total');
    const statDeleted = document.getElementById('pdf-delete-stat-deleted');
    const statRemaining = document.getElementById('pdf-delete-stat-remaining');
    const summaryPill = document.getElementById('pdf-delete-summary-pill');
    const btnExecute = document.getElementById('btn-pdf-delete-execute');
    const btnPreview = document.getElementById('btn-pdf-delete-preview');

    const total = pdfDeleteState.pages.length;
    const deletedCount = pdfDeleteState.pages.filter(p => p.deleted).length;
    const remainingCount = total - deletedCount;

    if (statTotal) statTotal.textContent = `${total} Page${total !== 1 ? 's' : ''}`;
    if (statDeleted) statDeleted.textContent = `${deletedCount} Page${deletedCount !== 1 ? 's' : ''}`;
    if (statRemaining) statRemaining.textContent = `${remainingCount} Page${remainingCount !== 1 ? 's' : ''}`;

    if (summaryPill) {
      if (deletedCount > 0) {
        summaryPill.textContent = `${deletedCount} Marked for Deletion · ${remainingCount} Kept`;
        summaryPill.style.background = '#fee2e2';
        summaryPill.style.color = '#b91c1c';
        summaryPill.style.borderColor = '#fca5a5';
      } else {
        summaryPill.textContent = `${total} Pages · All Kept`;
        summaryPill.style.background = 'var(--soft)';
        summaryPill.style.color = 'var(--ink)';
        summaryPill.style.borderColor = 'var(--line)';
      }
    }

    const canExport = total > 0 && remainingCount > 0 && deletedCount > 0;
    if (btnExecute) btnExecute.disabled = !canExport;
    if (btnPreview) btnPreview.disabled = !canExport;
  }

  window.executePdfDelete = async function(download = true) {
    if (!pdfDeleteState.bytes || !pdfDeleteState.pages.length) {
      showToast('Please load a PDF document first.');
      return;
    }

    const keptIndices = pdfDeleteState.pages
      .map((p, idx) => ({ idx, deleted: p.deleted }))
      .filter(item => !item.deleted)
      .map(item => item.idx);

    if (keptIndices.length === 0) {
      showToast('Cannot delete all pages. At least 1 page must be kept.');
      return;
    }

    if (keptIndices.length === pdfDeleteState.pages.length) {
      showToast('No pages marked for deletion. Click a page to mark it for removal.');
      return;
    }

    if (!window.PDFLib) {
      showToast('PDF-Lib engine is loading, please wait...');
      return;
    }

    let previewTab = null;
    if (!download) {
      previewTab = createPreviewPlaceholderTab('Edited PDF');
    }

    const loader = document.getElementById('pdf-delete-loading');
    const loadingText = document.getElementById('pdf-delete-loading-text');
    const grid = document.getElementById('pdf-delete-grid');

    if (grid) grid.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = `Removing ${pdfDeleteState.pages.length - keptIndices.length} page(s) from document...`;
    }

    try {
      let rawBytes = pdfDeleteState.bytes;
      if ((!rawBytes || rawBytes.byteLength === 0) && pdfDeleteState.file && typeof pdfDeleteState.file.arrayBuffer === 'function') {
        const rebuf = await pdfDeleteState.file.arrayBuffer();
        rawBytes = new Uint8Array(rebuf);
        pdfDeleteState.bytes = rawBytes;
      }

      if (!rawBytes || rawBytes.byteLength === 0) {
        throw new Error('PDF file buffer is empty. Please select or load a valid PDF file.');
      }

      const uint8 = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
      const bytesClone = new Uint8Array(uint8.byteLength);
      bytesClone.set(uint8);

      const srcDoc = await window.PDFLib.PDFDocument.load(bytesClone, { ignoreEncryption: true });
      const newPdf = await window.PDFLib.PDFDocument.create();

      const copiedPages = await newPdf.copyPages(srcDoc, keptIndices);
      copiedPages.forEach(p => newPdf.addPage(p));

      if (loadingText) loadingText.textContent = 'Saving clean PDF document stream...';
      const cleanBytes = await newPdf.save();
      const blob = new Blob([cleanBytes], { type: 'application/pdf' });

      let outName = (document.getElementById('pdf-delete-output-name')?.value || 'edited_document.pdf').trim();
      if (!outName.toLowerCase().endsWith('.pdf')) outName += '.pdf';

      const deletedCount = pdfDeleteState.pages.length - keptIndices.length;

      if (download) {
        triggerBlobDownload(blob, outName);
        showToast(`Successfully deleted ${deletedCount} page(s) and saved "${outName}" (${keptIndices.length} pages remaining)!`);
      } else {
        openPdfPreviewTab(previewTab, blob, outName);
        showToast(`Opened preview (${keptIndices.length} pages remaining) in new tab.`);
      }
    } catch (err) {
      console.error('Error executing PDF page deletion:', err);
      if (previewTab && !previewTab.closed) {
        try { previewTab.close(); } catch (_) {}
      }
      showToast('Error removing pages: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForDelete = async function() {
    if (!window.PDFLib) {
      showToast('PDF Engine is initializing, please wait...');
      return;
    }

    const loader = document.getElementById('pdf-delete-loading');
    const loadingText = document.getElementById('pdf-delete-loading-text');
    const dropzone = document.getElementById('pdf-delete-dropzone');

    if (dropzone) dropzone.style.display = 'none';
    if (loader) {
      loader.style.display = 'flex';
      if (loadingText) loadingText.textContent = 'Generating 6-page sample PDF with removable pages...';
    }

    try {
      const doc = await window.PDFLib.PDFDocument.create();
      const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      const rgb = window.PDFLib.rgb;

      const pageThemes = [
        { title: 'Executive Summary', tag: 'KEEP (Important Report Intro)', color: rgb(0.13, 0.45, 0.35), isTrashCandidate: false },
        { title: 'Draft Notes & Scratchpad', tag: 'RECOMMENDED TO DELETE (Draft Notes)', color: rgb(0.7, 0.2, 0.2), isTrashCandidate: true },
        { title: 'Main Findings & Insights', tag: 'KEEP (Core Insights)', color: rgb(0.2, 0.35, 0.6), isTrashCandidate: false },
        { title: 'Accidental Blank Sheet', tag: 'RECOMMENDED TO DELETE (Blank Page)', color: rgb(0.6, 0.6, 0.6), isTrashCandidate: true },
        { title: 'Detailed Budget Sheet', tag: 'KEEP (Financial Breakdown)', color: rgb(0.15, 0.5, 0.4), isTrashCandidate: false },
        { title: 'Signatures & Final Sign-off', tag: 'KEEP (Verified Approvals)', color: rgb(0.25, 0.25, 0.3), isTrashCandidate: false }
      ];

      for (let i = 0; i < pageThemes.length; i++) {
        const theme = pageThemes[i];
        const page = doc.addPage([595, 842]);

        page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.98, 0.98, 0.98) });
        page.drawRectangle({ x: 40, y: 740, width: 515, height: 60, color: theme.color });
        page.drawText(theme.title, { x: 60, y: 762, size: 20, font: fontBold, color: rgb(1, 1, 1) });
        page.drawText(`Page ${i + 1} of 6 — ${theme.tag}`, { x: 60, y: 700, size: 13, font: fontBold, color: theme.color });

        page.drawRectangle({ x: 60, y: 380, width: 475, height: 280, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.88, 0.9), borderWidth: 1 });
        page.drawText(`Document Section: ${theme.title}`, { x: 80, y: 620, size: 15, font: fontBold, color: theme.color });
        page.drawText(`Status: ${theme.tag}`, { x: 80, y: 585, size: 12, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        
        if (theme.isTrashCandidate) {
          page.drawText('This sample page is marked as a draft/unwanted sheet.', { x: 80, y: 540, size: 11, font: font, color: rgb(0.7, 0.2, 0.2) });
          page.drawText('Test removing it with 1 click to clean up your final PDF output.', { x: 80, y: 515, size: 11, font: font, color: rgb(0.4, 0.4, 0.4) });
        } else {
          page.drawText('This is essential document content that should be preserved.', { x: 80, y: 540, size: 11, font: font, color: rgb(0.2, 0.4, 0.3) });
          page.drawText('All vector text, shapes, and layout will remain 100% lossless.', { x: 80, y: 515, size: 11, font: font, color: rgb(0.4, 0.4, 0.4) });
        }

        page.drawText(`PixKit Studio - Delete Pages Test Document`, { x: 200, y: 40, size: 10, font: font, color: rgb(0.6, 0.6, 0.6) });
      }

      const bytes = await doc.save();
      const sampleFile = new File([bytes], 'PixKit_Sample_Doc_With_Drafts.pdf', { type: 'application/pdf' });
      sampleFile.bytes = bytes;
      await handlePdfDeleteFile(sampleFile);
    } catch (err) {
      console.error('Error generating sample for delete:', err);
      showToast('Failed generating sample: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
    }
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
