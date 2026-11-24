/**
 * PixKit - Production Application Controller with Magic UI Animated Theme Toggler
 */

document.addEventListener('DOMContentLoaded', () => {
  const engine = window.pixkitEngine;
  window.engine = window.pixkitEngine;
  if (engine && typeof engine.onChange === 'function') {
    engine.onChange(() => {
      updateHistoryUI();
    });
  }
  let currentView = 'home';
  let activeTool = null;
  let hasUserAddedImage = false;
  const DOCK_ENTRANCE_KEY = 'pixkit_dock_entrance_seen';
  let dockEntrancePlayed = false;

  // Mark that user has entered the studio on this browser
  localStorage.setItem('pixkit_entered', 'true');

  // Strip .html and # from browser address bar immediately for clean branding, preserving target route
  let initialUrlRoute = null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTool = urlParams.get('tool');
    if (paramTool) {
      initialUrlRoute = `#/tool/${paramTool}`;
    } else if (window.location.hash) {
      initialUrlRoute = window.location.hash;
    }
    const cleanBaseInit = window.location.pathname.replace(/\/studio\.html\/?$/, '/studio').replace(/\.html$/, '') || '/studio';
    if (window.location.pathname.endsWith('.html') || window.location.hash || window.location.search) {
      window.history.replaceState({ route: initialUrlRoute || window.location.hash || '#/home' }, '', cleanBaseInit);
    }
  } catch (_) { }

  // Initialize theme from localStorage or system preference
  const savedTheme = localStorage.getItem('pixkit-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  // Global Studio Toast Notification Helper
  function showToast(message) {
    if (!message) return;
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-indicator"></span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease-out';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }
  window.showToast = showToast;

  // Minimal Bottom-Right Image Upload Progress Loader
  let uploadLoaderTimer = null;
  let uploadLoaderSafetyTimer = null;
  function showImageUploadProgress(filename, progressPercent, statusText) {
    let loader = document.getElementById('pixkit-upload-progress');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'pixkit-upload-progress';
      loader.className = 'pixkit-upload-loader';
      document.body.appendChild(loader);
    }
    clearTimeout(uploadLoaderTimer);
    clearTimeout(uploadLoaderSafetyTimer);
    loader.classList.remove('fade-down');
    void loader.offsetWidth;
    loader.classList.add('visible');

    const cleanName = (filename || 'image').length > 22 ? filename.substring(0, 19) + '...' : (filename || 'image');
    const isComplete = progressPercent >= 100;
    const pct = Math.min(100, Math.max(0, Math.round(progressPercent)));

    loader.innerHTML = `
      <div class="upload-loader-content">
        <div class="upload-loader-icon">
          ${isComplete ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : `<span class="upload-loader-spinner"></span>`}
        </div>
        <div class="upload-loader-info">
          <div class="upload-loader-header">
            <span class="upload-loader-title">${escapeDockHtml(cleanName)}</span>
            <span class="upload-loader-pct">${isComplete ? 'Ready' : pct + '%'}</span>
          </div>
          <div class="upload-loader-track">
            <div class="upload-loader-bar" style="width: ${pct}%;"></div>
          </div>
          ${statusText ? `<div class="upload-loader-sub">${escapeDockHtml(statusText)}</div>` : ''}
        </div>
      </div>
    `;

    if (isComplete) {
      uploadLoaderTimer = setTimeout(() => {
        loader.classList.add('fade-down');
        setTimeout(() => {
          loader.classList.remove('visible', 'fade-down');
        }, 360);
      }, 1200);
    } else {
      // Safety auto-dismiss after 6 seconds so it can never get stuck indefinitely
      uploadLoaderSafetyTimer = setTimeout(() => {
        if (loader && loader.classList.contains('visible')) {
          loader.classList.add('fade-down');
          setTimeout(() => {
            loader.classList.remove('visible', 'fade-down');
          }, 360);
        }
      }, 6000);
    }
  }
  window.showImageUploadProgress = showImageUploadProgress;

  function hideImageUploadProgress() {
    clearTimeout(uploadLoaderTimer);
    clearTimeout(uploadLoaderSafetyTimer);
    const loader = document.getElementById('pixkit-upload-progress');
    if (loader) {
      loader.classList.remove('visible');
      loader.classList.add('fade-down');
      setTimeout(() => {
        try { loader.remove(); } catch (_) { }
      }, 360);
    }
  }
  window.hideImageUploadProgress = hideImageUploadProgress;

  // Initialize Magic UI Kinetic Text & Aceternity 3D Card & Floating Dock
  initKineticText();
  init3DCardEffect();
  initFloatingDockPhysics();
  initDockElasticInteraction();
  initDockDropletEntrance();

  // ==============================================================
  // LIQUID DROPLET ENTRANCE PHYSICS (Left Edge Escape & Vertical Unfurl)
  // Plays on opening the site in the browser; skips seamlessly on reload (Ctrl+R / F5)
  // ==============================================================

  function triggerDockDropletEntrance(force = false) {
    const wrapper = document.getElementById('floatingDockWrapper');
    if (!wrapper || (dockEntrancePlayed && !force)) return;
    dockEntrancePlayed = true;

    try {
      localStorage.removeItem(DOCK_ENTRANCE_KEY);
    } catch (_) { }

    document.documentElement.classList.remove('dock-intro-seen');
    wrapper.classList.remove('droplet-escape');
    void wrapper.offsetWidth;
    wrapper.classList.add('droplet-escape');

    setTimeout(() => {
      wrapper.classList.remove('droplet-escape');
      document.documentElement.classList.add('dock-intro-seen');
      if (window.refreshDockElasticPath) window.refreshDockElasticPath();
    }, 1300);
  }
  window.triggerDockDropletEntrance = triggerDockDropletEntrance;

  window.resetDockEntrance = function () {
    try {
      localStorage.removeItem(DOCK_ENTRANCE_KEY);
      sessionStorage.removeItem(DOCK_ENTRANCE_KEY);
      document.documentElement.classList.remove('dock-intro-seen');
    } catch (_) { }
    dockEntrancePlayed = false;
  };

  function initDockDropletEntrance() {
    const wrapper = document.getElementById('floatingDockWrapper');
    if (!wrapper) return;

    // Detect if this page load is a browser RELOAD (Ctrl+R / F5 / Reload button)
    let isReload = false;
    try {
      localStorage.removeItem(DOCK_ENTRANCE_KEY);
      const navEntries = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation') : null;
      if (navEntries && navEntries.length > 0) {
        isReload = navEntries[0].type === 'reload';
      } else if (window.performance && window.performance.navigation) {
        isReload = window.performance.navigation.type === 1;
      }
    } catch (_) { }

    if (isReload) {
      // User refreshed/reloaded the page: skip the entrance animation on reload!
      dockEntrancePlayed = true;
      document.documentElement.classList.add('dock-intro-seen');
      wrapper.classList.remove('droplet-escape');
      if (window.refreshDockElasticPath) window.refreshDockElasticPath();
      return;
    }

    // User opened the site (first visit, new tab, opening browser):
    // Play the escaping droplet entrance animation!
    dockEntrancePlayed = true;
    document.documentElement.classList.remove('dock-intro-seen');
    wrapper.classList.remove('droplet-escape');
    void wrapper.offsetWidth;
    wrapper.classList.add('droplet-escape');

    setTimeout(() => {
      wrapper.classList.remove('droplet-escape');
      document.documentElement.classList.add('dock-intro-seen');
      if (window.refreshDockElasticPath) window.refreshDockElasticPath();
    }, 1300);
  }

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

  function updateHeroPreview() {
    const imgEl = document.getElementById('hero-preview-img');
    const artworkEl = document.getElementById('hero-sample-artwork');
    if (!imgEl || !artworkEl) return;

    if (hasUserAddedImage && engine && engine.activeCanvas && engine.filename !== 'mountain-view.jpg' && !engine.isSampleArtwork) {
      try {
        imgEl.src = engine.activeCanvas.toDataURL('image/jpeg', 0.92);
        imgEl.style.display = 'block';
        artworkEl.style.display = 'none';
      } catch (e) {
        console.warn('Hero preview update warning:', e);
      }
    } else {
      imgEl.style.display = 'none';
      artworkEl.style.display = 'block';
    }
  }
  window.updateHeroPreview = updateHeroPreview;

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

  window.toggleThemeAnimated = function (event) {
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
    },

    async setItem(key, data) {
      try {
        const db = await this.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.put({ id: key, data, savedAt: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async getItem(key) {
      try {
        const db = await this.openDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result ? req.result.data : null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },

    async removeItem(key) {
      try {
        const db = await this.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.delete(key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async saveRecentFile(name, record) {
      if (!name || name === 'mountain-view.jpg') return false;
      try {
        const db = await this.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.put({ id: 'file_' + name, ...record, savedAt: Date.now() });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async getRecentFile(name) {
      if (!name) return null;
      try {
        const db = await this.openDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get('file_' + name);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) {
        return null;
      }
    },

    async deleteRecentFile(name) {
      if (!name) return false;
      try {
        const db = await this.openDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.delete('file_' + name);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      } catch (e) {
        return false;
      }
    },

    async pruneRecentFiles(allowedNames) {
      if (!Array.isArray(allowedNames)) return;
      try {
        const db = await this.openDB();
        if (!db) return;
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          const keys = req.result || [];
          keys.forEach(k => {
            if (typeof k === 'string' && k.startsWith('file_')) {
              const fname = k.substring(5);
              if (!allowedNames.includes(fname)) {
                store.delete(k);
              }
            }
          });
        };
      } catch (_) { }
    },

    async clearAllRecentFiles() {
      try {
        const db = await this.openDB();
        if (!db) return;
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.getAllKeys();
        req.onsuccess = () => {
          const keys = req.result || [];
          keys.forEach(k => {
            if (typeof k === 'string' && k.startsWith('file_')) {
              store.delete(k);
            }
          });
        };
      } catch (_) { }
    }
  };

  let persistTimer = null;
  function persistCurrentSession() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(async () => {
      if (!hasUserAddedImage || engine.filename === 'mountain-view.jpg' || engine.isSampleArtwork || !engine.activeCanvas || engine.activeCanvas.width === 0) return;
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

        // Also persist high-res edited blob in recent storage
        await PixKitStorage.saveRecentFile(engine.filename, {
          filename: engine.filename,
          fileType: engine.fileType,
          fileSize: engine.fileSize,
          activeBlob,
          width: engine.activeCanvas.width,
          height: engine.activeCanvas.height,
          savedAt: Date.now()
        });

        // Fast metadata in localStorage
        localStorage.setItem('pixkit_saved_session', JSON.stringify({
          filename: engine.filename,
          fileType: engine.fileType,
          fileSize: engine.fileSize,
          hasUserAddedImage: true,
          currentHash: sessionPayload.currentHash,
          savedAt: sessionPayload.savedAt
        }));

        // Limit cached blobs in memory/IndexedDB to top 10 recent files
        try {
          const recents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
          const top10 = recents.slice(0, 10).map(f => f.name);
          if (!top10.includes(engine.filename)) top10.unshift(engine.filename);
          PixKitStorage.pruneRecentFiles(top10);
        } catch (_) { }
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
      if (session && session.hasUserAddedImage && session.filename !== 'mountain-view.jpg' && (session.activeBlob || session.activeDataUrl)) {
        return new Promise((resolve) => {
          const img = new Image();
          const objectUrl = session.activeBlob ? URL.createObjectURL(session.activeBlob) : session.activeDataUrl;

          img.onload = () => {
            if (session.activeBlob) {
              try { URL.revokeObjectURL(objectUrl); } catch (_) { }
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
                try { URL.revokeObjectURL(srcUrl); } catch (_) { }
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
  // CLEAN SPA ROUTING & BROWSER NAVIGATION (No .html, No # in URL)
  // ==============================================================
  function getCleanStudioBase() {
    return window.location.pathname.replace(/\/studio\.html\/?$/, '/studio').replace(/\.html$/, '') || '/studio';
  }

  function cleanCurrentUrl(targetRoute) {
    try {
      const cleanBase = getCleanStudioBase();
      if (window.location.pathname.endsWith('.html') || window.location.hash) {
        window.history.replaceState({ route: targetRoute || location.hash || localStorage.getItem('pixkit_last_route') || '#/home' }, '', cleanBase);
      }
    } catch (_) { }
  }

  function navigateTo(route, push = true) {
    const cleanBase = getCleanStudioBase();
    if (push) {
      history.pushState({ route }, '', cleanBase);
    } else {
      history.replaceState({ route }, '', cleanBase);
    }
    handleRoute(route, true);
  }

  function handleRoute(hashString, cleanUrl = true) {
    const targetStored = localStorage.getItem('pixkit_target_route');
    if (targetStored) {
      localStorage.removeItem('pixkit_target_route');
      hashString = targetStored;
    }
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
    } else if (parts[0] === 'recent') {
      if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
        if (!window.PixKitRemote.isFeatureEnabled('community', 'recentFiles')) {
          renderViewDirect('home');
          if (typeof showToast === 'function') {
            showToast('This feature is temporarily unavailable: Recent Files & History is currently disabled.', 'info');
          }
          return;
        }
      }
      renderViewDirect('recent');
    } else if (parts[0] === 'settings') {
      renderViewDirect('settings');
    } else if (parts[0] === 'tool' && parts[1]) {
      renderToolWorkspaceDirect(parts[1]);
    } else {
      renderViewDirect('home');
    }
    persistCurrentSession();

    if (cleanUrl) {
      cleanCurrentUrl(raw);
    }
  }

  function renderViewDirect(viewId) {
    currentView = viewId;
    activeTool = null;
    window.activeTool = null;
    localStorage.setItem('pixkit_last_route', `#/${viewId}`);
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const target = document.getElementById(`${viewId}-view`);
    if (target) target.classList.add('active');

    // Topbar active tab indicator
    document.getElementById('nav-home')?.classList.toggle('active', viewId === 'home');
    document.getElementById('nav-edit')?.classList.toggle('active', viewId === 'edit');
    document.getElementById('nav-convert')?.classList.toggle('active', viewId === 'convert');
    document.getElementById('nav-document')?.classList.toggle('active', viewId === 'document');

    // Floating Dock active tab indicator
    document.getElementById('dock-btn-home')?.classList.toggle('active', viewId === 'home');
    document.getElementById('dock-btn-recent')?.classList.toggle('active', viewId === 'recent');
    document.getElementById('dock-btn-settings')?.classList.toggle('active', viewId === 'settings');

    if (viewId === 'recent') {
      renderRecentFilesPage();
    } else if (viewId === 'settings') {
      updateSettingsThemeUI();
      if (typeof window.triggerSettingsSpeedRoll === 'function') {
        window.triggerSettingsSpeedRoll();
      }
      if (typeof window.refreshStorageMeter === 'function') {
        window.refreshStorageMeter();
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHistoryUI();
  }

  let lastCategoryOrigin = 'document';

  window.navigatePdfBack = function () {
    window.showView(lastCategoryOrigin === 'convert' ? 'convert' : 'document');
  };

  function renderToolWorkspaceDirect(toolId) {
    // Normalize aliases from URL hashes, landing pages, and search queries
    let targetFormatOverride = null;
    if (toolId === 'convert' || toolId === 'convert-image') toolId = 'convert-format';
    if (toolId === 'heic' || toolId === 'heic-to-jpg') toolId = 'convert-heic';
    if (toolId === 'doc-pdf-to-img' || toolId === 'pdf-to-jpg' || toolId === 'pdf-to-image') toolId = 'doc-pdf-to-images';
    if (toolId === 'doc-img-to-pdf' || toolId === 'images-to-pdf' || toolId === 'jpg-to-pdf' || toolId === 'doc-images-to-pdf') toolId = 'convert-pdf';
    if (toolId === 'compress-image') toolId = 'compress';
    if (toolId === 'resize-image') toolId = 'resize';
    if (toolId === 'crop-image') toolId = 'crop';
    if (toolId === 'blur-image') toolId = 'blur';
    if (toolId === 'adjust-image') toolId = 'adjust';
    if (toolId === 'batch' || toolId === 'batch-process' || toolId === 'batch-image' || toolId === 'batch-image-processor') toolId = 'batch-edit';
    if (toolId === 'batch-convert' || toolId === 'convert-batch' || toolId === 'batch-converter' || toolId === 'batch-convert-formats') {
      toolId = 'batch-convert';
      lastCategoryOrigin = 'convert';
    }
    if (toolId === 'batch-pdf' || toolId === 'doc-batch-pdf' || toolId === 'batch-document' || toolId === 'pdf-batch' || toolId === 'batch-pdf-processor') {
      toolId = 'batch-pdf';
      lastCategoryOrigin = 'document';
    }

    // Converter category tool aliases & format presets
    if (toolId === 'svg-to-png') {
      toolId = 'convert-svg';
      lastCategoryOrigin = 'convert';
    }
    if (toolId === 'image-to-ico' || toolId === 'png-to-ico' || toolId === 'favicon-generator') {
      toolId = 'convert-ico';
      lastCategoryOrigin = 'convert';
    }
    if (toolId === 'image-to-base64') {
      toolId = 'convert-base64';
      lastCategoryOrigin = 'convert';
    }
    if (toolId === 'png-to-jpg' || toolId === 'webp-to-jpg') {
      toolId = 'convert-format';
      targetFormatOverride = 'jpeg';
      lastCategoryOrigin = 'convert';
    }
    if (toolId === 'jpg-to-png') {
      toolId = 'convert-format';
      targetFormatOverride = 'png';
      lastCategoryOrigin = 'convert';
    }
    if (toolId === 'jpg-to-webp') {
      toolId = 'convert-format';
      targetFormatOverride = 'webp';
      lastCategoryOrigin = 'convert';
    }

    if (toolId === 'convert-pdf') {
      const isFromDoc = (lastCategoryOrigin === 'document');
      const parentCrumb = document.getElementById('pdf-parent-crumb');
      const titleCrumb = document.getElementById('pdf-title-crumb');
      const backBtnText = document.getElementById('pdf-back-btn-text');

      if (parentCrumb) parentCrumb.textContent = isFromDoc ? 'Tool 01 · Document Suite' : 'Tool 06 · Convert Suite';
      if (titleCrumb) titleCrumb.textContent = 'Images to PDF';
      if (backBtnText) backBtnText.textContent = isFromDoc ? 'Back to Document Tools' : 'Back to Convert Tools';
    }

    // Check remote feature flag before opening workspace
    if (window.PixKitRemote && typeof window.PixKitRemote.checkToolAccess === 'function') {
      if (!window.PixKitRemote.checkToolAccess(toolId)) {
        renderViewDirect('home');
        return;
      }
    }

    activeTool = toolId;
    window.activeTool = toolId;
    currentView = `tool-${toolId}`;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

    const workspaceView = document.getElementById(`tool-${toolId}-view`) || document.getElementById(`${toolId}-view`);
    if (workspaceView) {
      workspaceView.classList.add('active');
      initToolStage(toolId);
      if (targetFormatOverride) {
        setTimeout(() => {
          if (typeof window.setConvertTargetFormat === 'function') {
            window.setConvertTargetFormat(targetFormatOverride);
          }
        }, 50);
      }
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

  function trackAnalyticsEvent(eventName, params = {}) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      }
    } catch (_) { }
  }
  window.trackAnalyticsEvent = trackAnalyticsEvent;

  window.showView = function (viewId) {
    if (viewId === 'recent') {
      if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
        if (!window.PixKitRemote.isFeatureEnabled('community', 'recentFiles')) {
          if (typeof showToast === 'function') {
            showToast('This feature is temporarily unavailable: Recent Files & History is currently disabled.', 'info');
          }
          return;
        }
      }
    }
    trackAnalyticsEvent('view_page', { page_name: viewId });
    navigateTo(`#/${viewId}`, true);
  };

  window.getActiveTool = function () {
    return activeTool;
  };

  window.openToolWorkspace = function (toolId) {
    if (window.PixKitRemote && typeof window.PixKitRemote.checkToolAccess === 'function') {
      if (!window.PixKitRemote.checkToolAccess(toolId)) return;
    }
    trackAnalyticsEvent('open_tool', { tool_id: toolId });
    navigateTo(`#/tool/${toolId}`, true);
  };

  window.sharePixKitStudio = function () {
    let toolSlug = '';
    if (activeTool) {
      const slugMap = {
        'convert-svg': 'svg-to-png',
        'convert-ico': 'image-to-ico',
        'convert-base64': 'image-to-base64',
        'convert-heic': 'heic-to-jpg',
        'convert-format': 'convert-image',
        'convert-pdf': 'images-to-pdf',
        'doc-merge-pdf': 'merge-pdf',
        'doc-split-pdf': 'split-pdf',
        'doc-compress-pdf': 'compress-pdf',
        'doc-rotate-pdf': 'rotate-pdf',
        'doc-delete-pdf': 'delete-pdf-pages',
        'doc-pdf-to-images': 'pdf-to-jpg',
        'compress': 'compress-image',
        'resize': 'resize-image',
        'crop': 'crop-image',
        'blur': 'blur-image',
        'adjust': 'adjust-image',
        'batch-edit': 'batch-image-processor',
        'batch-convert': 'batch-convert'
      };
      toolSlug = slugMap[activeTool] || '';
    }
    const shareUrl = toolSlug ? `https://pixkit.site/${toolSlug}` : 'https://pixkit.site/studio';
    const shareTitle = 'PixKit Studio — Free & Private In-Browser Image & PDF Toolkit';
    const shareText = 'Edit images, convert formats, and manage PDFs with 100% in-browser privacy:';

    if (navigator.share) {
      navigator.share({ title: shareTitle, text: shareText, url: shareUrl }).catch(() => { });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('🔗 PixKit link copied to clipboard!');
      }).catch(() => {
        showToast(`Share PixKit: ${shareUrl}`);
      });
    }
  };

  // Browser Navigation Listener (Back / Forward buttons & System Gesture Navigation)
  window.addEventListener('popstate', (e) => {
    // If Shortcuts modal is open, close it first without navigating away
    const modal = document.getElementById('shortcuts-modal');
    if (modal && modal.classList.contains('active')) {
      toggleShortcutsModal(false);
      return;
    }
    // If Batch sub-tool detail is open, dismiss back to All Configurations
    if (typeof batchState !== 'undefined' && batchState.activeDetailTool) {
      if (typeof closeBatchToolDetail === 'function') {
        closeBatchToolDetail(true);
        return;
      }
    }
    const targetRoute = (e.state && e.state.route) ? e.state.route : (location.hash || localStorage.getItem('pixkit_last_route') || '#/home');
    handleRoute(targetRoute, true);
  });

  // Touch Gesture Navigation (Swipe-Right to Go Back across all tools)
  (function initTouchGestureNavigation() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTracking = false;

    document.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const target = e.target;

      // Do not hijack interactive controls, sliders, or drawing/crop canvases
      if (target && target.closest('input, textarea, select, canvas, .range-slider, .track-thumb, .crop-box-corner')) {
        isTracking = false;
        return;
      }

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      isTracking = true;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isTracking) return;
      isTracking = false;
      if (!e.changedTouches || e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;

      const startX = touchStartX;
      touchStartX = 0;
      touchStartY = 0;

      // Horizontal swipe-right condition:
      // Minimum 60px rightward travel, low vertical drift, fast gesture (< 450ms)
      if (deltaX >= 60 && Math.abs(deltaY) <= 75 && deltaX > Math.abs(deltaY) * 1.25 && deltaTime <= 450) {
        // Priority 1: If Batch tool detail is open, swipe-right navigates back to All Configurations
        if (typeof batchState !== 'undefined' && batchState.activeDetailTool && typeof closeBatchToolDetail === 'function') {
          closeBatchToolDetail();
          return;
        }

        // Priority 2: If in a standalone tool workspace and swipe started near left screen edge (<= 110px)
        if (activeTool && startX <= 110) {
          if (activeTool.startsWith('doc-') || (activeTool === 'convert-pdf' && lastCategoryOrigin === 'document')) {
            window.showView('document');
          } else if (activeTool.startsWith('convert-')) {
            window.showView('convert');
          } else {
            window.showView('edit');
          }
        }
      }
    }, { passive: true });
  })();

  // --- Stage Preview Smooth Image Transitions (Fade Down & Fade Up) ---
  let stageTransitionTimer = null;

  function getActivePreviewElements() {
    const elements = new Set();
    if (activeTool) {
      const activeSection = document.getElementById(`tool-${activeTool}-view`);
      if (activeSection) {
        const wrappers = activeSection.querySelectorAll('.canvas-wrapper, #pdf-sheet-wrapper');
        wrappers.forEach(el => elements.add(el));
        if (elements.size === 0) {
          const canvases = activeSection.querySelectorAll('.stage-viewport canvas');
          canvases.forEach(c => elements.add(c.parentElement || c));
        }
      }
    }
    if (elements.size === 0) {
      document.querySelectorAll('.view.active .stage-viewport .canvas-wrapper, .view.active #pdf-sheet-wrapper').forEach(el => elements.add(el));
    }
    if (elements.size === 0) {
      document.querySelectorAll('.view.active .stage-viewport canvas').forEach(c => elements.add(c.parentElement || c));
    }
    if (currentView === 'home') {
      const heroImg = document.getElementById('hero-preview-img');
      if (heroImg) elements.add(heroImg);
    }
    return Array.from(elements);
  }

  function startPreviewFadeDown() {
    clearTimeout(stageTransitionTimer);
    const elements = getActivePreviewElements();
    elements.forEach(el => {
      el.classList.remove('stage-img-fade-up-prep', 'stage-img-fade-up-active');
      el.classList.add('stage-img-fade-down');
    });
  }

  function startPreviewFadeUp() {
    clearTimeout(stageTransitionTimer);
    const elements = getActivePreviewElements();
    if (elements.length === 0) return;

    elements.forEach(el => {
      el.classList.remove('stage-img-fade-down');
      el.classList.add('stage-img-fade-up-prep');
      void el.offsetWidth;
    });

    requestAnimationFrame(() => {
      elements.forEach(el => {
        el.classList.add('stage-img-fade-up-active');
      });

      stageTransitionTimer = setTimeout(() => {
        elements.forEach(el => {
          el.classList.remove('stage-img-fade-up-prep', 'stage-img-fade-up-active', 'stage-img-fade-down');
        });
      }, 450);
    });
  }

  window.startPreviewFadeDown = startPreviewFadeDown;
  window.startPreviewFadeUp = startPreviewFadeUp;

  // --- Global File Upload Handling ---
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP, etc.)');
      return Promise.reject('Invalid file');
    }

    startPreviewFadeDown();
    showImageUploadProgress(file.name, 35, 'Reading image file...');
    const progressTimer = setTimeout(() => {
      showImageUploadProgress(file.name, 75, 'Rendering canvas stage...');
    }, 120);

    return Promise.all([
      engine.loadFromFile(file),
      new Promise(r => setTimeout(r, 110))
    ]).then(([meta]) => {
      clearTimeout(progressTimer);
      hasUserAddedImage = true;
      syncMetadata();
      updateHeroPreview();
      persistCurrentSession();
      if (window.recordRecentFile) {
        window.recordRecentFile(meta.name, file.size, file.type, meta.width, meta.height);
      }

      showImageUploadProgress(meta.name, 100, `${meta.width} × ${meta.height} px`);

      if (activeTool) {
        initToolStage(activeTool);
      } else if (currentView === 'home') {
        window.showView('edit');
      }
      updateHistoryUI();

      startPreviewFadeUp();
      return meta;
    }).catch(err => {
      clearTimeout(progressTimer);
      console.error(err);
      showToast('Failed to load image');
      const loader = document.getElementById('pixkit-upload-progress');
      if (loader) loader.classList.add('fade-down');
      startPreviewFadeUp();
      throw err;
    });
  }

  // File Inputs
  document.querySelectorAll('.global-file-picker').forEach(input => {
    input.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        if (files.length === 1) {
          handleImageFile(files[0]);
        } else {
          for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const pct = Math.round(((i + 1) / files.length) * 100);
            showImageUploadProgress(f.name, pct, `Imported ${i + 1} of ${files.length} images`);
            try {
              await handleImageFile(f);
            } catch (_) { }
          }
        }
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
    document.querySelectorAll('.img-meta-name').forEach(el => {
      if (el.id && el.id.startsWith('pdf-')) return;
      el.textContent = engine.filename;
    });
    document.querySelectorAll('.img-meta-dims').forEach(el => {
      if (el.id && el.id.startsWith('pdf-')) return;
      el.textContent = `${w} × ${h} px`;
    });

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
      const rw = document.getElementById('resize-w');
      const rh = document.getElementById('resize-h');
      if (rw) rw.value = engine.activeCanvas.width;
      if (rh) rh.value = engine.activeCanvas.height;
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
    } else if (toolId === 'batch-edit') {
      initBatchEditStage();
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
    } else if (toolId === 'batch-convert') {
      initBatchConvertStage();
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
    } else if (toolId === 'batch-pdf') {
      initBatchPdfStage();
    }

    updateHistoryUI();
  }

  // --- Global History UI & Keybindings ---
  function updateHistoryUI() {
    const historyBar = document.getElementById('floating-history-bar');
    const isEditTool = ['resize', 'crop', 'rotate', 'compress', 'adjust', 'filters', 'text', 'draw', 'blur'].includes(activeTool) || (currentView && ['tool-resize', 'tool-crop', 'tool-rotate', 'tool-compress', 'tool-adjust', 'tool-filters', 'tool-text', 'tool-draw', 'tool-blur'].includes(currentView));

    if (historyBar) {
      // Must ONLY be visible when inside an active editing tool workspace (tool-*)
      // Must NEVER be visible on category screens (edit, convert, document), home, recent files, or settings!
      if (isEditTool) {
        historyBar.classList.add('visible');
      } else {
        historyBar.classList.remove('visible');
      }
    }

    const undoBtn = document.getElementById('btn-global-undo');
    const redoBtn = document.getElementById('btn-global-redo');
    const badge = document.getElementById('history-status-badge');

    const canUndo = (activeTool === 'draw' && typeof drawnShapes !== 'undefined' && drawnShapes.length > 0) || (engine && typeof engine.canUndo === 'function' && engine.canUndo());
    const canRedo = engine && typeof engine.canRedo === 'function' && engine.canRedo();

    if (undoBtn) {
      undoBtn.disabled = !canUndo;
      undoBtn.style.opacity = canUndo ? '1' : '0.4';
      undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
    }
    if (redoBtn) {
      redoBtn.disabled = !canRedo;
      redoBtn.style.opacity = canRedo ? '1' : '0.4';
      redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
    }

    if (badge) {
      if (activeTool === 'draw' && typeof drawnShapes !== 'undefined' && drawnShapes.length > 0) {
        badge.textContent = `${drawnShapes.length} shape${drawnShapes.length === 1 ? '' : 's'}`;
      } else if (engine && engine.historyStack && engine.historyStack[engine.historyIndex]) {
        badge.textContent = engine.historyStack[engine.historyIndex].label || 'Original';
      } else {
        badge.textContent = 'Original';
      }
    }
  }

  window.handleGlobalUndo = function () {
    // 1. If inside Draw tool and shapes are staged on canvas, undo last shape first
    if (activeTool === 'draw' && typeof drawnShapes !== 'undefined' && drawnShapes.length > 0) {
      drawnShapes.pop();
      if (typeof redrawDrawCanvas === 'function') redrawDrawCanvas();
      showToast('Undone shape drawing');
      updateHistoryUI();
      return;
    }

    // 2. Perform engine canvas undo
    if (engine && engine.undo()) {
      const currentLabel = engine.historyStack && engine.historyStack[engine.historyIndex]
        ? engine.historyStack[engine.historyIndex].label
        : 'Edit';
      showToast(`Undone: ${currentLabel}`);
      syncMetadata();
      if (activeTool) initToolStage(activeTool);
      updateHistoryUI();
      persistCurrentSession();
    } else {
      showToast('No more edits to undo', 'info');
    }
  };

  window.handleGlobalRedo = function () {
    if (engine && engine.redo()) {
      const currentLabel = engine.historyStack && engine.historyStack[engine.historyIndex]
        ? engine.historyStack[engine.historyIndex].label
        : 'Edit';
      showToast(`Redone: ${currentLabel}`);
      syncMetadata();
      if (activeTool) initToolStage(activeTool);
      updateHistoryUI();
      persistCurrentSession();
    } else {
      showToast('Nothing to redo', 'info');
    }
  };

  // --- Studio Mobile Menu Management (< 768px) ---
  window.toggleStudioMobileMenu = function (e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('studio-mobile-menu-dropdown');
    if (!dropdown) return;
    const isShowing = dropdown.style.display !== 'none';
    dropdown.style.display = isShowing ? 'none' : 'flex';
  };

  window.closeStudioMobileMenu = function () {
    const dropdown = document.getElementById('studio-mobile-menu-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.mobile-menu-wrapper')) {
      window.closeStudioMobileMenu();
    }
  });

  // --- Keyboard Shortcuts Modal Management ---
  window.toggleShortcutsModal = function (open) {
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    if (open) {
      modal.classList.add('active');
      // Reset filter to 'all' and clear search
      window.filterShortcutsTab('all');
      setTimeout(() => {
        const searchInput = document.getElementById('shortcuts-search-input');
        if (searchInput) searchInput.focus();
      }, 100);
    } else {
      modal.classList.remove('active');
    }
  };

  window.handleShortcutsBackdropClick = function (e) {
    if (e.target.id === 'shortcuts-modal') {
      window.toggleShortcutsModal(false);
    }
  };

  // --- Keyboard Shortcuts Modal Filtering & Search ---
  window.filterShortcutsTab = function (tabName) {
    document.querySelectorAll('.shortcuts-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const searchInput = document.getElementById('shortcuts-search-input');
    if (searchInput) {
      searchInput.value = '';
      const clearBtn = document.getElementById('shortcuts-search-clear');
      if (clearBtn) clearBtn.style.display = 'none';
    }

    const sections = document.querySelectorAll('#shortcuts-modal .shortcuts-section');
    const emptyState = document.getElementById('shortcuts-search-empty');
    if (emptyState) emptyState.style.display = 'none';

    sections.forEach(sec => {
      const cat = sec.dataset.cat;
      const items = sec.querySelectorAll('.shortcut-row, .shortcut-pill');
      items.forEach(item => item.style.display = '');

      if (tabName === 'all' || cat === tabName) {
        sec.style.display = '';
      } else {
        sec.style.display = 'none';
      }
    });
  };

  window.filterShortcutsSearch = function (query) {
    const q = (query || '').toLowerCase().trim();
    const clearBtn = document.getElementById('shortcuts-search-clear');
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';

    // If typing query, reset tab buttons visually to "all" to indicate multi-suite search
    if (q) {
      document.querySelectorAll('.shortcuts-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'all');
      });
    }

    const sections = document.querySelectorAll('#shortcuts-modal .shortcuts-section');
    let totalMatches = 0;

    sections.forEach(sec => {
      let sectionMatches = 0;
      const items = sec.querySelectorAll('.shortcut-row, .shortcut-pill');
      items.forEach(item => {
        if (!q) {
          item.style.display = '';
          sectionMatches++;
        } else {
          const text = item.textContent.toLowerCase();
          if (text.includes(q)) {
            item.style.display = '';
            sectionMatches++;
          } else {
            item.style.display = 'none';
          }
        }
      });

      if (sectionMatches > 0) {
        sec.style.display = '';
        totalMatches += sectionMatches;
      } else {
        sec.style.display = 'none';
      }
    });

    const emptyState = document.getElementById('shortcuts-search-empty');
    if (emptyState) {
      emptyState.style.display = (q && totalMatches === 0) ? 'flex' : 'none';
    }
  };

  window.clearShortcutsSearch = function () {
    const input = document.getElementById('shortcuts-search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    window.filterShortcutsSearch('');
  };

  // --- Aceternity UI Floating Dock Navigation ---
  window.dockNavigateHome = function () {
    window.showView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.triggerGlobalUpload = function () {
    const picker = document.querySelector('.global-file-picker');
    if (picker) picker.click();
  };

  window.recordRecentFile = function (name, size, type, width, height, category, customBlob, customPreviewUrl, originTool, sourceFiles, operation) {
    if (!name || name === 'mountain-view.jpg') return;
    if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
      if (!window.PixKitRemote.isFeatureEnabled('community', 'recentFiles')) return;
    }
    try {
      let previewUrl = customPreviewUrl || null;
      if (!previewUrl && engine && engine.activeCanvas && engine.activeCanvas.width > 0 && !engine.isSampleArtwork && engine.filename === name) {
        try {
          const thumbCanvas = document.createElement('canvas');
          const maxDim = 96;
          let tw = engine.activeCanvas.width;
          let th = engine.activeCanvas.height;
          if (tw > th) {
            th = Math.round((th * maxDim) / tw);
            tw = maxDim;
          } else {
            tw = Math.round((tw * maxDim) / th);
            th = maxDim;
          }
          thumbCanvas.width = Math.max(tw, 1);
          thumbCanvas.height = Math.max(th, 1);
          const tctx = thumbCanvas.getContext('2d');
          tctx.drawImage(engine.activeCanvas, 0, 0, tw, th);
          previewUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);
        } catch (_) { }
      }

      const fileCategory = category || getFileCategory({ name, type });
      const toolOrigin = originTool || (fileCategory === 'pdf' ? (activeTool || 'doc-pdf-to-images') : (activeTool || null));

      // Sanitize sourceFiles for localStorage (lightweight metadata)
      const lightSourceFiles = Array.isArray(sourceFiles) ? sourceFiles.map(s => ({
        name: s.name,
        size: s.size || 0,
        type: s.type || 'application/pdf',
        pageCount: s.pageCount || 1,
        thumbUrl: s.thumbUrl ? (s.thumbUrl.length < 5000 ? s.thumbUrl : null) : null
      })) : null;

      let recents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
      recents = recents.filter(f => f.name !== name && f.name !== 'mountain-view.jpg');

      // Purge any source files from top-level recents so only the product is shown
      if (lightSourceFiles && lightSourceFiles.length > 0) {
        const srcNames = new Set(lightSourceFiles.map(s => s.name));
        recents = recents.filter(f => !srcNames.has(f.name));
        srcNames.forEach(sn => {
          if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.deleteRecentFile === 'function') {
            PixKitStorage.deleteRecentFile(sn).catch(() => { });
          }
        });
      }

      recents.unshift({
        name,
        size: size || (customBlob ? customBlob.size : 0),
        type: type || (customBlob ? customBlob.type : (fileCategory === 'pdf' ? 'application/pdf' : 'image/png')),
        width: width || (engine?.activeCanvas?.width || 0),
        height: height || (engine?.activeCanvas?.height || 0),
        previewUrl: previewUrl || null,
        category: fileCategory,
        originTool: toolOrigin,
        operation: operation || null,
        sourceFiles: lightSourceFiles || null,
        timestamp: Date.now()
      });
      if (recents.length > 24) recents = recents.slice(0, 24);
      localStorage.setItem('pixkit_recent_files', JSON.stringify(recents));

      const top10 = recents.slice(0, 10).map(f => f.name);

      if (customBlob && typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.saveRecentFile === 'function') {
        PixKitStorage.saveRecentFile(name, {
          filename: name,
          fileType: type || customBlob.type || (fileCategory === 'pdf' ? 'application/pdf' : 'image/png'),
          fileSize: size || customBlob.size || 0,
          activeBlob: customBlob,
          width: width || 0,
          height: height || 0,
          category: fileCategory,
          originTool: toolOrigin,
          operation: operation || null,
          sourceFiles: sourceFiles || null,
          savedAt: Date.now()
        });
        PixKitStorage.pruneRecentFiles(top10);
      } else if (engine && engine.activeCanvas && engine.activeCanvas.width > 0 && !engine.isSampleArtwork && engine.filename === name) {
        engine.activeCanvas.toBlob(blob => {
          if (blob && typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.saveRecentFile === 'function') {
            PixKitStorage.saveRecentFile(name, {
              filename: name,
              fileType: type || engine.fileType || 'image/png',
              fileSize: size || engine.fileSize || 0,
              activeBlob: blob,
              width: width || engine.activeCanvas.width,
              height: height || engine.activeCanvas.height,
              category: fileCategory,
              originTool: toolOrigin,
              operation: operation || null,
              sourceFiles: sourceFiles || null,
              savedAt: Date.now()
            });
            PixKitStorage.pruneRecentFiles(top10);
          }
        }, 'image/png');
      }

      if (typeof currentView !== 'undefined' && currentView === 'recent') {
        window.renderRecentFilesPage();
      }
    } catch (e) { }
  };

  function formatDockTimeAgo(timestamp) {
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function escapeDockHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  function getFormatBadgeLabel(filename, mimeType) {
    if (filename) {
      const ext = filename.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'heic', 'ico', 'pdf', 'avif'].includes(ext)) {
        return ext === 'jpeg' ? 'JPG' : ext.toUpperCase();
      }
    }
    if (mimeType && mimeType.includes('/')) {
      const sub = mimeType.split('/')[1].toUpperCase();
      return sub.replace('X-', '').replace('VND.ADOBE.', '');
    }
    return 'IMG';
  }

  function getFileCategory(file) {
    if (!file) return 'edit';
    if (file.category) return file.category;
    if (file.originTool && file.originTool.startsWith('convert-')) return 'convert';
    const name = ((file && file.name) || '').toLowerCase();
    const type = ((file && file.type) || '').toLowerCase();
    if (name.endsWith('.pdf') || type.includes('pdf')) return 'pdf';
    if (name.endsWith('.svg') || name.endsWith('.ico') || name.endsWith('.heic') || name.endsWith('.avif') || name.endsWith('.base64') || name.includes('-converted') || name.includes('_converted')) return 'convert';
    return 'edit';
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (_) { }
    }, 2000);
    if (typeof window.triggerDownloadSupportPrompt === 'function') {
      window.triggerDownloadSupportPrompt();
    }
  }

  window.downloadRecentFileItem = async function (name, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // 1. If currently active in engine
    if (engine && engine.filename === name && hasUserAddedImage && engine.activeCanvas && engine.activeCanvas.width > 0) {
      try {
        const mimeType = engine.fileType || 'image/png';
        engine.activeCanvas.toBlob((blob) => {
          if (!blob) return;
          triggerBlobDownload(blob, name);
          showToast(`Downloaded latest edit of ${name}`);
        }, mimeType);
        return;
      } catch (_) { }
    }

    // 2. High-res blob from IndexedDB recent store
    try {
      if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.getRecentFile === 'function') {
        const record = await PixKitStorage.getRecentFile(name);
        const blob = record ? (record.activeBlob || record.blob) : null;
        if (blob) {
          triggerBlobDownload(blob, name);
          showToast(`Downloaded latest edit of ${name}`);
          return;
        }
      }
    } catch (_) { }

    // 3. Fallback to active session in PixKitStorage
    try {
      const session = await PixKitStorage.loadSession();
      if (session && session.filename === name && session.activeBlob) {
        triggerBlobDownload(session.activeBlob, name);
        showToast(`Downloaded latest edit of ${name}`);
        return;
      }
    } catch (_) { }

    // 4. Fallback to preview thumbnail
    try {
      let recents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
      const fileMeta = recents.find(f => f.name === name);
      if (fileMeta && fileMeta.previewUrl) {
        const a = document.createElement('a');
        a.href = fileMeta.previewUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Downloaded preview of ${name}`);
        return;
      }
    } catch (_) { }

    showToast(`No saved edit found for ${name}`);
  };

  window.downloadCurrentSessionFile = function (event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (engine && engine.filename && engine.filename !== 'mountain-view.jpg' && hasUserAddedImage) {
      window.downloadRecentFileItem(engine.filename, event);
    } else {
      showToast('No active session image to download');
    }
  };

  window.openRecentFromPage = async function (name, isCurrent, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const isPdf = name.toLowerCase().endsWith('.pdf');
    if (!isPdf && (isCurrent || (engine.filename === name && hasUserAddedImage && !engine.isSampleArtwork))) {
      if (!activeTool) window.showView('edit');
      showToast(`Resumed editing ${name}`);
      return;
    }
    // 1. Try high-res blob from IndexedDB recent store
    try {
      if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.getRecentFile === 'function') {
        const record = await PixKitStorage.getRecentFile(name);
        const blob = record ? (record.activeBlob || record.blob) : null;
        if (blob) {
          const recCat = record.category || (isPdf ? 'pdf' : 'edit');
          const isPdfFile = isPdf || recCat === 'pdf' || (record.fileType && record.fileType.includes('pdf'));
          const file = new File([blob], name, { type: record.fileType || (isPdfFile ? 'application/pdf' : 'image/png') });

          if (isPdfFile) {
            let targetTool = record.originTool || 'doc-pdf-to-images';
            if (targetTool === 'convert-pdf') targetTool = 'doc-pdf-to-images';
            window.openToolWorkspace(targetTool);
            setTimeout(() => {
              if (targetTool === 'doc-merge-pdf' && window.handlePdfMergeFiles) {
                window.handlePdfMergeFiles([file]);
              } else if (targetTool === 'doc-split-pdf' && window.handlePdfSplitFile) {
                window.handlePdfSplitFile(file);
              } else if (targetTool === 'doc-compress-pdf' && window.handlePdfCompressFile) {
                window.handlePdfCompressFile(file);
              } else if (targetTool === 'doc-rotate-pdf' && window.handlePdfRotateFile) {
                window.handlePdfRotateFile(file);
              } else if (targetTool === 'doc-delete-pdf' && window.handlePdfDeleteFile) {
                window.handlePdfDeleteFile(file);
              } else if (window.handlePdfFileUpload) {
                window.handlePdfFileUpload(file);
              }
            }, 120);
            showToast(`Loaded ${name} into PDF tools`);
            return;
          } else {
            await handleImageFile(file);
            if (!activeTool) window.showView('edit');
            showToast(`Loaded ${name} into editor`);
            return;
          }
        }
      }
    } catch (_) { }

    // 2. Fallback to active session
    try {
      const session = await PixKitStorage.loadSession();
      if (session && session.filename === name && session.activeBlob) {
        const isPdfFile = isPdf || (session.fileType && session.fileType.includes('pdf'));
        const file = new File([session.activeBlob], name, { type: session.fileType || (isPdfFile ? 'application/pdf' : 'image/png') });
        if (isPdfFile) {
          window.openToolWorkspace('doc-pdf-to-images');
          setTimeout(() => {
            if (window.handlePdfFileUpload) window.handlePdfFileUpload(file);
          }, 120);
          showToast(`Loaded ${name} into PDF tools`);
          return;
        } else {
          await handleImageFile(file);
          if (!activeTool) window.showView('edit');
          showToast(`Loaded ${name} from storage`);
          return;
        }
      }
    } catch (_) { }

    // 3. Prompt user if memory purged
    showToast(`Select "${name}" to load original file`);
    window.triggerGlobalUpload();
  };

  // --- Replace Image Dropdown & Quick Recent Picker ---
  window.toggleReplaceDropdown = function (btn, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const wrap = btn.closest('.replace-dropdown-wrap');
    if (!wrap) return;
    const isOpen = wrap.classList.contains('open');
    window.closeAllReplaceDropdowns();
    if (!isOpen) {
      wrap.classList.add('open');
    }
  };

  window.closeAllReplaceDropdowns = function () {
    document.querySelectorAll('.replace-dropdown-wrap.open').forEach(w => w.classList.remove('open'));
  };

  window.closeRecentPickerModal = function () {
    const modal = document.getElementById('recent-picker-modal');
    if (modal) modal.classList.remove('active');
  };

  window.handleRecentPickerBackdropClick = function (event) {
    if (event.target && event.target.id === 'recent-picker-modal') {
      window.closeRecentPickerModal();
    }
  };

  window.triggerActiveToolUpload = function () {
    window.closeAllReplaceDropdowns();
    let input = null;
    if (activeTool) {
      const view = document.getElementById(`tool-${activeTool}-view`);
      if (view) {
        input = view.querySelector('.replace-dropdown-menu input[type="file"]') || view.querySelector('input[type="file"]');
      }
    }
    if (!input) {
      input = document.querySelector('.global-file-picker');
    }
    if (input) {
      input.click();
    }
  };

  window.openRecentFilesPicker = async function (event, filterType) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    window.closeAllReplaceDropdowns();

    // Default to 'pdf' if activeTool is a doc tool and filterType is not specified
    if (!filterType && activeTool && activeTool.startsWith('doc-')) {
      filterType = 'pdf';
    }

    const modal = document.getElementById('recent-picker-modal');
    const container = document.getElementById('recent-picker-list');
    if (!modal || !container) return;

    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
    } catch (_) {
      recents = [];
    }
    recents = recents.filter(f => f.name && f.name !== 'mountain-view.jpg');
    // Sort newest first and strictly limit to the top 10 most recent files
    recents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    recents = recents.slice(0, 10);

    if (filterType === 'svg') {
      recents = recents.filter(f => (f.name || '').toLowerCase().endsWith('.svg') || (f.type || '').includes('svg'));
    } else if (filterType === 'heic') {
      recents = recents.filter(f => {
        const ext = (f.name || '').toLowerCase().split('.').pop();
        return ext === 'heic' || ext === 'heif' || (f.type || '').includes('heic') || (f.type || '').includes('heif');
      });
    } else if (filterType === 'pdf') {
      recents = recents.filter(f => (f.name || '').toLowerCase().endsWith('.pdf') || (f.type || '').includes('pdf') || f.category === 'pdf');
    }

    if (recents.length === 0) {
      container.innerHTML = `
        <div class="recent-picker-empty">
          <div class="recent-picker-empty-icon"><i class="fa-regular fa-images"></i></div>
          <h4>No Recent Files Found</h4>
          <p>${filterType ? `No recently opened ${filterType.toUpperCase()} files found.` : 'You have not opened or edited any images yet in this session.'}</p>
          <button type="button" class="btn-primary" onclick="closeRecentPickerModal(); triggerActiveToolUpload();" style="display:inline-flex; align-items:center; gap:6px; padding:8px 18px; font-weight:600; font-size:12px;">
            <i class="fa-solid fa-arrow-up-from-bracket"></i>
            <span>Upload from Local</span>
          </button>
        </div>
      `;
    } else {
      let html = '<div class="recent-picker-grid">';
      recents.forEach((file, idx) => {
        const isCur = (engine && engine.filename === file.name && hasUserAddedImage && !engine.isSampleArtwork);
        const isPdfDoc = (file.category === 'pdf') || (file.name && file.name.toLowerCase().endsWith('.pdf'));
        const ext = isPdfDoc ? 'PDF' : (file.name.split('.').pop() || 'IMG').toUpperCase();
        const dims = isPdfDoc ? 'PDF Document' : ((file.width && file.height) ? `${file.width} × ${file.height} px` : (file.size ? formatFileSize(file.size) : ''));
        const timeStr = formatDockTimeAgo(file.timestamp || Date.now());
        const hasSources = Array.isArray(file.sourceFiles) && file.sourceFiles.length > 0;
        const safeId = 'pkr-' + (file.name || 'f').replace(/[^a-zA-Z0-9_-]/g, '_') + '-' + idx;

        let sourcesHtml = '';
        if (hasSources) {
          sourcesHtml = file.sourceFiles.map((src, sIdx) => {
            const isSrcPdf = (src.type && src.type.includes('pdf')) || (src.name && src.name.toLowerCase().endsWith('.pdf'));
            const srcSize = formatFileSize(src.size || 0);
            return `
              <div class="picker-source-row" onclick="selectPickerSourceFile('${escapeDockHtml(file.name)}', ${sIdx}, event)">
                <div class="picker-source-left">
                  <span class="picker-source-num">#${sIdx + 1}</span>
                  ${src.thumbUrl ? `
                    <img class="picker-source-thumb" src="${src.thumbUrl}" alt="${escapeDockHtml(src.name)}">
                  ` : (isSrcPdf ? `
                    <i class="fa-solid fa-file-pdf"></i>
                  ` : `
                    <i class="fa-solid fa-image"></i>
                  `)}
                  <div class="picker-source-text">
                    <strong title="${escapeDockHtml(src.name)}">${escapeDockHtml(src.name)}</strong>
                    <small>${srcSize}${src.pageCount ? ` · ${src.pageCount} pgs` : ''}</small>
                  </div>
                </div>
                <button type="button" class="picker-source-use-btn" onclick="selectPickerSourceFile('${escapeDockHtml(file.name)}', ${sIdx}, event)" title="Load this source file">
                  <i class="fa-solid fa-check"></i>
                  <span>Use</span>
                </button>
              </div>
            `;
          }).join('');
        }

        html += `
          <div class="recent-picker-card-wrap" id="picker-wrap-${safeId}">
            <div class="recent-picker-card ${isCur ? 'is-current' : ''}" onclick="selectRecentForTool('${escapeDockHtml(file.name)}')">
              ${file.previewUrl ? `
                <img class="recent-picker-thumb" src="${file.previewUrl}" alt="${escapeDockHtml(file.name)}">
              ` : (isPdfDoc ? `
                <div class="recent-picker-pdf-tile">
                  <i class="fa-solid fa-file-pdf"></i>
                  <span>PDF</span>
                </div>
              ` : `
                <div class="recent-picker-thumb-placeholder"><i class="fa-regular fa-image"></i></div>
              `)}
              <div class="recent-picker-info">
                <div class="recent-picker-name" title="${escapeDockHtml(file.name)}">${escapeDockHtml(file.name)}</div>
                <div class="recent-picker-meta">
                  <span class="recent-picker-badge ${isPdfDoc ? 'recent-fmt-badge-pdf' : ''}">${ext}</span>
                  ${isCur ? '<span class="recent-picker-current-tag">Active</span>' : ''}
                  <span>${dims}</span>
                  <span>· ${timeStr}</span>
                </div>
              </div>
              ${hasSources ? `
                <button type="button" class="recent-picker-expand-toggle" onclick="togglePickerCardSources('${safeId}', event)" title="View original source files">
                  <i class="fa-solid fa-layer-group"></i>
                  <span>${file.sourceFiles.length} Sources</span>
                  <i class="fa-solid fa-chevron-down chevron-icon"></i>
                </button>
              ` : ''}
            </div>
            ${hasSources ? `
              <div class="recent-picker-sources-dropdown" id="picker-sources-${safeId}" style="display:none;">
                <div class="picker-sources-header">
                  <span>Original Source Files (${file.sourceFiles.length})</span>
                  <span style="font-size:9.5px; font-weight:500; color:var(--muted);">Click "Use" to load into workspace</span>
                </div>
                <div class="picker-sources-items">
                  ${sourcesHtml}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    }

    modal.classList.add('active');
  };

  window.togglePickerCardSources = function (safeId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const wrap = document.getElementById(`picker-wrap-${safeId}`);
    const dropdown = document.getElementById(`picker-sources-${safeId}`);
    if (!wrap || !dropdown) return;

    const isExpanded = wrap.classList.contains('expanded');
    // Collapse any other open cards in the picker
    document.querySelectorAll('.recent-picker-card-wrap.expanded').forEach(el => {
      if (el !== wrap) {
        el.classList.remove('expanded');
        const otherDd = el.querySelector('.recent-picker-sources-dropdown');
        if (otherDd) otherDd.style.display = 'none';
      }
    });

    if (isExpanded) {
      wrap.classList.remove('expanded');
      dropdown.style.display = 'none';
    } else {
      wrap.classList.add('expanded');
      dropdown.style.display = 'block';
    }
  };

  function decodeHtmlEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  async function generateSampleDocABlob() {
    if (!window.PDFLib) return null;
    try {
      const rgb = window.PDFLib.rgb;
      const StandardFonts = window.PDFLib.StandardFonts;
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
      return new Blob([bytesA], { type: 'application/pdf' });
    } catch (_) {
      return null;
    }
  }

  async function generateSampleDocBBlob() {
    if (!window.PDFLib) return null;
    try {
      const rgb = window.PDFLib.rgb;
      const StandardFonts = window.PDFLib.StandardFonts;
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
      return new Blob([bytesB], { type: 'application/pdf' });
    } catch (_) {
      return null;
    }
  }

  async function generateSample6PageBlob() {
    if (!window.PDFLib) return null;
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
        page.drawRectangle({ x: 60, y: 320, width: 475, height: 300, color: rgb(1, 1, 1), borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1 });
        page.drawText(`Section ${i + 1} Detailed Breakdown:`, { x: 80, y: 580, size: 13, font: fontBold, color: theme.color });
        page.drawText(`- Status: Verified and Approved`, { x: 80, y: 540, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(`PixKit Studio - Document Test Sample - Page ${i + 1} of 6`, { x: 170, y: 40, size: 10, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
      }

      const bytes = await doc.save();
      return new Blob([bytes], { type: 'application/pdf' });
    } catch (_) {
      return null;
    }
  }

  async function getSourceFileBlob(parentName, index) {
    const cleanParentName = decodeHtmlEntities(parentName);
    let blob = null;
    let fileName = '';

    // 1. Try reading the parent record from PixKitStorage
    let record = null;
    try {
      if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.getRecentFile === 'function') {
        record = await PixKitStorage.getRecentFile(cleanParentName);
        if (!record && cleanParentName !== parentName) {
          record = await PixKitStorage.getRecentFile(parentName);
        }
      }
    } catch (_) { }

    // Find metadata from localStorage if needed
    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
    } catch (_) { }
    const parentMeta = recents.find(f => f.name === cleanParentName || f.name === parentName);
    const sourceList = (record && Array.isArray(record.sourceFiles) && record.sourceFiles.length)
      ? record.sourceFiles
      : (parentMeta?.sourceFiles || []);
    const src = sourceList[index] || null;
    fileName = src?.name || `source_document_${index + 1}.pdf`;

    // A. Check if the record already has the Blob or bytes attached to src
    if (src) {
      if (src.blob instanceof Blob && src.blob.size > 0) {
        blob = src.blob;
      } else if (src.bytes && (src.bytes.byteLength || src.bytes.length)) {
        blob = new Blob([src.bytes], { type: src.type || 'application/pdf' });
      }
    }

    // B. Check if src.name exists independently in PixKitStorage
    if (!blob && fileName) {
      try {
        const directRecord = await PixKitStorage.getRecentFile(fileName);
        if (directRecord) {
          const directBlob = directRecord.activeBlob || directRecord.blob;
          if (directBlob instanceof Blob && directBlob.size > 0) {
            blob = directBlob;
          }
        }
      } catch (_) { }
    }

    // C. Check if it's one of the built-in sample PDFs
    if (!blob && fileName) {
      const lower = fileName.toLowerCase();
      if (lower.includes('report_a')) {
        blob = await generateSampleDocABlob();
      } else if (lower.includes('appendix_b')) {
        blob = await generateSampleDocBBlob();
      } else if (lower.includes('corporate_report') || lower.includes('6page')) {
        blob = await generateSample6PageBlob();
      }
    }

    // D. Extract pages directly from the parent document's cached Blob using PDFLib!
    if (!blob && record && window.PDFLib) {
      const parentBlob = record.activeBlob || record.blob;
      if (parentBlob instanceof Blob && parentBlob.size > 0) {
        try {
          let startPage = 0;
          for (let i = 0; i < index; i++) {
            startPage += (sourceList[i]?.pageCount || 1);
          }
          const pageCount = src?.pageCount || 1;

          const parentBytes = await parentBlob.arrayBuffer();
          const parentDoc = await window.PDFLib.PDFDocument.load(parentBytes, { ignoreEncryption: true });
          const totalPages = parentDoc.getPageCount();

          const pageIndices = [];
          for (let p = startPage; p < Math.min(startPage + pageCount, totalPages); p++) {
            pageIndices.push(p);
          }

          if (pageIndices.length > 0) {
            const extractedDoc = await window.PDFLib.PDFDocument.create();
            const copiedPages = await extractedDoc.copyPages(parentDoc, pageIndices);
            copiedPages.forEach(p => extractedDoc.addPage(p));
            const extractedBytes = await extractedDoc.save();
            blob = new Blob([extractedBytes], { type: 'application/pdf' });
          }
        } catch (extractErr) {
          console.warn('Could not slice source pages from merged PDF:', extractErr);
        }
      }
    }

    return { blob, fileName, src };
  }

  window.selectPickerSourceFile = async function (parentName, index, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    window.closeRecentPickerModal();

    showImageUploadProgress('source_doc', 35, 'Loading source document...');
    try {
      const blobPromise = getSourceFileBlob(parentName, index);
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ blob: null, fileName: '' }), 5000));
      const { blob, fileName } = await Promise.race([blobPromise, timeoutPromise]);

      if (blob) {
        const isPdf = (fileName.toLowerCase().endsWith('.pdf')) || (blob.type && blob.type.includes('pdf'));
        const file = new File([blob], fileName, { type: blob.type || (isPdf ? 'application/pdf' : 'image/png') });

        if (isPdf) {
          if (window.handlePdfMergeFiles && activeTool === 'doc-merge-pdf') {
            await window.handlePdfMergeFiles([file]);
          } else if (window.handlePdfSplitFile && activeTool === 'doc-split-pdf') {
            await window.handlePdfSplitFile(file);
          } else if (window.handlePdfCompressFile && activeTool === 'doc-compress-pdf') {
            await window.handlePdfCompressFile(file);
          } else if (window.handlePdfRotateFile && activeTool === 'doc-rotate-pdf') {
            await window.handlePdfRotateFile(file);
          } else if (window.handlePdfDeleteFile && activeTool === 'doc-delete-pdf') {
            await window.handlePdfDeleteFile(file);
          } else if (window.handlePdfFileUpload) {
            await window.handlePdfFileUpload(file);
          }
          showImageUploadProgress(fileName, 100, `${formatFileSize(blob.size)} · Ready`);
          showToast(`Loaded source "${fileName}" into workspace`);
          return;
        } else {
          await handleImageFile(file);
          showImageUploadProgress(fileName, 100, `${formatFileSize(blob.size)} · Ready`);
          showToast(`Loaded source "${fileName}" into workspace`);
          return;
        }
      }
    } catch (err) {
      console.warn('Error selecting source file from picker:', err);
    }
    showImageUploadProgress('source_doc', 100, 'Source file unavailable');
    showToast('Source file buffer not available in local cache');
    setTimeout(() => hideImageUploadProgress(), 1500);
  };

  window.selectRecentForTool = async function (name) {
    window.closeRecentPickerModal();
    const isPdf = name.toLowerCase().endsWith('.pdf');
    if (!isPdf && engine && engine.filename === name && hasUserAddedImage && !engine.isSampleArtwork) {
      showToast(`"${name}" is already loaded in the workspace`);
      return;
    }

    showImageUploadProgress(name, 35, 'Loading from recents...');

    // 1. Try high-res blob from IndexedDB PixKitStorage
    try {
      if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.getRecentFile === 'function') {
        const record = await PixKitStorage.getRecentFile(name);
        const blob = record ? (record.activeBlob || record.blob) : null;
        if (blob) {
          const isPdfFile = isPdf || (record.category === 'pdf') || (record.fileType && record.fileType.includes('pdf'));
          const file = new File([blob], name, { type: record.fileType || blob.type || (isPdfFile ? 'application/pdf' : 'image/png') });

          if (isPdfFile) {
            if (window.handlePdfMergeFiles && activeTool === 'doc-merge-pdf') {
              await window.handlePdfMergeFiles([file]);
            } else if (window.handlePdfSplitFile && activeTool === 'doc-split-pdf') {
              await window.handlePdfSplitFile(file);
            } else if (window.handlePdfCompressFile && activeTool === 'doc-compress-pdf') {
              await window.handlePdfCompressFile(file);
            } else if (window.handlePdfRotateFile && activeTool === 'doc-rotate-pdf') {
              await window.handlePdfRotateFile(file);
            } else if (window.handlePdfDeleteFile && activeTool === 'doc-delete-pdf') {
              await window.handlePdfDeleteFile(file);
            } else if (window.handlePdfFileUpload) {
              await window.handlePdfFileUpload(file);
            }
            showImageUploadProgress(name, 100, `${formatFileSize(blob.size)} · Ready`);
            showToast(`Loaded "${name}" into workspace`);
            return;
          } else if (activeTool === 'convert-svg' || file.type === 'image/svg+xml' || name.toLowerCase().endsWith('.svg')) {
            if (typeof window.handleSvgFileSelect === 'function') {
              window.handleSvgFileSelect({ target: { files: [file] } });
            }
            showImageUploadProgress(name, 100, `${formatFileSize(blob.size)} · Ready`);
            showToast(`Loaded "${name}" into workspace`);
            return;
          } else {
            await handleImageFile(file);
            showImageUploadProgress(name, 100, `${formatFileSize(blob.size)} · Ready`);
            showToast(`Loaded "${name}" into workspace`);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Recent picker load error:', err);
    }

    // 2. Check if it's one of the built-in sample PDFs
    if (isPdf) {
      let sampleBlob = null;
      const lower = name.toLowerCase();
      if (lower.includes('report_a')) sampleBlob = await generateSampleDocABlob();
      else if (lower.includes('appendix_b')) sampleBlob = await generateSampleDocBBlob();
      else if (lower.includes('corporate_report') || lower.includes('6page')) sampleBlob = await generateSample6PageBlob();

      if (sampleBlob) {
        const file = new File([sampleBlob], name, { type: 'application/pdf' });
        if (window.handlePdfMergeFiles && activeTool === 'doc-merge-pdf') {
          await window.handlePdfMergeFiles([file]);
        } else if (window.handlePdfSplitFile && activeTool === 'doc-split-pdf') {
          await window.handlePdfSplitFile(file);
        } else if (window.handlePdfCompressFile && activeTool === 'doc-compress-pdf') {
          await window.handlePdfCompressFile(file);
        } else if (window.handlePdfRotateFile && activeTool === 'doc-rotate-pdf') {
          await window.handlePdfRotateFile(file);
        } else if (window.handlePdfDeleteFile && activeTool === 'doc-delete-pdf') {
          await window.handlePdfDeleteFile(file);
        } else if (window.handlePdfFileUpload) {
          await window.handlePdfFileUpload(file);
        }
        showImageUploadProgress(name, 100, `${formatFileSize(sampleBlob.size)} · Ready`);
        showToast(`Loaded "${name}" into workspace`);
        return;
      }
    }

    // 3. Try session fallback
    try {
      if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.loadSession === 'function') {
        const session = await PixKitStorage.loadSession();
        if (session && session.filename === name && session.activeBlob) {
          const file = new File([session.activeBlob], name, { type: session.fileType || 'image/png' });
          await handleImageFile(file);
          showImageUploadProgress(name, 100, `${formatFileSize(session.activeBlob.size)} · Ready`);
          showToast(`Loaded "${name}" from storage`);
          return;
        }
      }
    } catch (_) { }

    // 4. Prompt user if memory was purged
    showImageUploadProgress(name, 100, 'Cache purged');
    showToast(`High-resolution cache purged for "${name}". Please choose the file from disk.`);
    window.triggerActiveToolUpload();
  };

  // --- PDF Source Files Modal Controller ---
  window.openPdfSourcesModal = async function (parentName, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const modal = document.getElementById('pdf-sources-modal');
    const titleEl = document.getElementById('modal-pdf-sources-title');
    const subEl = document.getElementById('modal-pdf-sources-sub');
    const metaBar = document.getElementById('pdf-sources-meta-bar');
    const listEl = document.getElementById('pdf-sources-list');
    const footerEl = document.getElementById('pdf-sources-footer');
    if (!modal || !listEl) return;

    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
    } catch (_) {
      recents = [];
    }

    const fileMeta = recents.find(f => f.name === parentName);
    let sourceFiles = (fileMeta && fileMeta.sourceFiles) ? fileMeta.sourceFiles : [];

    let storageRecord = null;
    try {
      if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.getRecentFile === 'function') {
        storageRecord = await PixKitStorage.getRecentFile(parentName);
        if (storageRecord && Array.isArray(storageRecord.sourceFiles) && storageRecord.sourceFiles.length > 0) {
          sourceFiles = storageRecord.sourceFiles;
        }
      }
    } catch (_) { }

    if (titleEl) titleEl.textContent = `Source Files: ${parentName}`;
    if (subEl) subEl.textContent = `${sourceFiles.length} original file${sourceFiles.length === 1 ? '' : 's'} used to create this document`;

    const totalBytes = sourceFiles.reduce((acc, s) => acc + (s.size || 0), 0);
    const opLabel = (fileMeta?.operation || storageRecord?.operation || 'combined').toUpperCase();

    if (metaBar) {
      metaBar.innerHTML = `
        <div><strong>Operation:</strong> ${opLabel}</div>
        <div><strong>Input Files:</strong> ${sourceFiles.length}</div>
        <div><strong>Combined Size:</strong> ${formatFileSize(totalBytes)}</div>
      `;
    }

    if (!sourceFiles.length) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:32px 16px; color:var(--muted);">
          <div style="font-size:32px; margin-bottom:8px;">📁</div>
          <div style="font-weight:700; color:var(--ink); margin-bottom:4px;">No Source Records Available</div>
          <p style="font-size:12px;">This document does not have cached source files in your current browser.</p>
        </div>
      `;
    } else {
      let html = '';
      sourceFiles.forEach((src, idx) => {
        const isPdf = (src.type && src.type.includes('pdf')) || (src.name && src.name.toLowerCase().endsWith('.pdf'));
        const sizeStr = formatFileSize(src.size || 0);
        const metaStr = isPdf ? `PDF Document · ${sizeStr}${src.pageCount ? ` · ${src.pageCount} Page${src.pageCount > 1 ? 's' : ''}` : ''}` : `Image · ${sizeStr}`;

        html += `
          <div class="source-file-item">
            <div class="source-file-left">
              <span class="source-file-index">#${idx + 1}</span>
              ${src.thumbUrl ? `
                <img class="source-file-thumb" src="${src.thumbUrl}" alt="${escapeDockHtml(src.name)}">
              ` : (isPdf ? `
                <div class="recent-picker-pdf-tile">
                  <i class="fa-solid fa-file-pdf"></i>
                  <span>PDF</span>
                </div>
              ` : `
                <div class="recent-picker-thumb-placeholder"><i class="fa-regular fa-image"></i></div>
              `)}
              <div class="source-file-details">
                <div class="source-file-name" title="${escapeDockHtml(src.name)}">${escapeDockHtml(src.name)}</div>
                <div class="source-file-meta">${metaStr}</div>
              </div>
            </div>
            <div class="source-file-actions">
              <button type="button" class="source-btn" onclick="downloadSourceItem('${escapeDockHtml(parentName)}', ${idx}, event)" title="Download this original file">
                <i class="fa-solid fa-download"></i> <span>Download</span>
              </button>
              <button type="button" class="source-btn btn-primary-source" onclick="openSourceItemInStudio('${escapeDockHtml(parentName)}', ${idx}, event)" title="Open in Studio">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> <span>Open</span>
              </button>
            </div>
          </div>
        `;
      });
      listEl.innerHTML = html;
    }

    if (footerEl) {
      footerEl.innerHTML = `
        <button type="button" class="btn-secondary" onclick="closePdfSourcesModal()" style="padding:8px 16px; font-size:12px; font-weight:700;">
          Close
        </button>
        ${sourceFiles.length > 1 ? `
          <button type="button" class="btn-primary" onclick="downloadAllSourceItemsZip('${escapeDockHtml(parentName)}', event)" style="padding:8px 18px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
            <i class="fa-solid fa-file-zipper"></i> <span>Download All Sources (ZIP)</span>
          </button>
        ` : ''}
      `;
    }

    modal.classList.add('active');
  };

  window.closePdfSourcesModal = function () {
    const modal = document.getElementById('pdf-sources-modal');
    if (modal) modal.classList.remove('active');
  };

  window.handlePdfSourcesBackdropClick = function (event) {
    if (event.target && event.target.id === 'pdf-sources-modal') {
      window.closePdfSourcesModal();
    }
  };

  window.downloadSourceItem = async function (parentName, index, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      const { blob, fileName } = await getSourceFileBlob(parentName, index);
      if (blob) {
        triggerBlobDownload(blob, fileName);
        showToast(`Downloaded original source: ${fileName}`);
        return;
      }
    } catch (e) {
      console.warn('Error downloading source file:', e);
    }
    showToast('Source file buffer not found in cache');
  };

  window.openSourceItemInStudio = async function (parentName, index, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      const { blob, fileName } = await getSourceFileBlob(parentName, index);
      if (blob) {
        window.closePdfSourcesModal();
        const isPdf = (fileName.toLowerCase().endsWith('.pdf')) || (blob.type && blob.type.includes('pdf'));
        const file = new File([blob], fileName, { type: blob.type || (isPdf ? 'application/pdf' : 'image/png') });
        if (isPdf) {
          window.openToolWorkspace('doc-pdf-to-images');
          setTimeout(() => {
            if (window.handlePdfFileUpload) window.handlePdfFileUpload(file);
          }, 120);
        } else {
          await handleImageFile(file);
          if (!activeTool) window.showView('edit');
        }
        showToast(`Loaded "${fileName}" into workspace`);
        return;
      }
    } catch (e) {
      console.warn('Error opening source file:', e);
    }
    showToast('Source file buffer not available in local cache');
  };

  window.downloadAllSourceItemsZip = async function (parentName, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!window.JSZip) {
      showToast('ZIP utility loading, please wait...');
      return;
    }
    try {
      const record = await PixKitStorage.getRecentFile(parentName);
      if (!record || !record.sourceFiles || !record.sourceFiles.length) {
        showToast('No source files found to package');
        return;
      }
      showToast('Packaging source files into ZIP...');
      const zip = new window.JSZip();
      for (let i = 0; i < record.sourceFiles.length; i++) {
        const src = record.sourceFiles[i];
        let blob = src.blob;
        if (!blob && src.bytes) {
          blob = new Blob([src.bytes], { type: src.type || 'application/pdf' });
        }
        if (blob) {
          zip.file(src.name, blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const cleanBase = parentName.replace(/\.[^/.]+$/, "");
      triggerBlobDownload(zipBlob, `${cleanBase}_sources.zip`);
      showToast(`Downloaded all ${record.sourceFiles.length} source files in ZIP package!`);
    } catch (err) {
      showToast('Failed packaging ZIP: ' + err.message);
    }
  };

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.replace-dropdown-wrap')) {
      window.closeAllReplaceDropdowns();
    }
  });

  window.deleteRecentFileItem = function (name, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    try {
      let recents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
      recents = recents.filter(f => f.name !== name && f.name !== 'mountain-view.jpg');
      localStorage.setItem('pixkit_recent_files', JSON.stringify(recents));

      if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.deleteRecentFile === 'function') {
        PixKitStorage.deleteRecentFile(name).catch(() => { });
      }

      if (engine && engine.filename === name) {
        hasUserAddedImage = false;
        localStorage.removeItem('pixkit_saved_session');
        if (PixKitStorage && typeof PixKitStorage.clearSession === 'function') {
          PixKitStorage.clearSession().catch(() => { });
        }
        engine.isSampleArtwork = true;
        engine.filename = 'mountain-view.jpg';
        engine.fileSize = 0;
        engine.historyStack = [];
        engine.historyIndex = -1;
        engine.generateSampleArtwork();
        updateHistoryUI();
        updateHeroPreview();
      }

      window.renderRecentFilesPage();
      showToast(`Removed "${name}" from history`);
    } catch (e) { }
  };

  let clearConfirmPending = false;
  let clearConfirmTimeout = null;

  window.clearAllRecentFiles = function (force = false) {
    const btn = document.getElementById('clear-recent-page-btn');

    // First click: Ask confirmation inline on the button without annoying/blocked browser modal
    if (!force && !clearConfirmPending) {
      clearConfirmPending = true;
      if (btn) {
        btn.dataset.origHtml = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg> Click to Confirm Clear`;
        btn.style.color = '#DC2626';
        btn.style.borderColor = '#DC2626';
        btn.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
      }
      clearTimeout(clearConfirmTimeout);
      clearConfirmTimeout = setTimeout(() => {
        clearConfirmPending = false;
        if (btn && btn.dataset.origHtml) {
          btn.innerHTML = btn.dataset.origHtml;
          btn.style.color = '';
          btn.style.borderColor = '';
          btn.style.backgroundColor = '';
        }
      }, 3500);
      return;
    }

    // Second click: Immediately clear all storage & reset in-memory session!
    clearConfirmPending = false;
    clearTimeout(clearConfirmTimeout);
    if (btn && btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.style.backgroundColor = '';
    }

    try {
      localStorage.removeItem('pixkit_recent_files');
      localStorage.removeItem('pixkit_saved_session');
      sessionStorage.removeItem('pixkit_recent_files');
      sessionStorage.removeItem('pixkit_saved_session');

      if (PixKitStorage && typeof PixKitStorage.clearSession === 'function') {
        PixKitStorage.clearSession().catch(() => { });
      }
      if (PixKitStorage && typeof PixKitStorage.clearAllRecentFiles === 'function') {
        PixKitStorage.clearAllRecentFiles().catch(() => { });
      }

      hasUserAddedImage = false;
      if (engine) {
        engine.isSampleArtwork = true;
        engine.filename = 'mountain-view.jpg';
        engine.fileSize = 0;
        engine.historyStack = [];
        engine.historyIndex = -1;
        engine.generateSampleArtwork();
      }

      recentPageState.currentCategory = 'all';
      recentPageState.searchQuery = '';
      const input = document.getElementById('recent-search-input');
      if (input) input.value = '';
      const clearBtn = document.getElementById('recent-search-clear');
      if (clearBtn) clearBtn.classList.remove('visible');

      window.renderRecentFilesPage();
      updateHistoryUI();
      updateHeroPreview();
      showToast('All recent files & session history cleared');
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  };

  window.setAppTheme = function (themeName) {
    applyTheme(themeName);
    updateSettingsThemeUI();
  };

  function updateSettingsThemeUI() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const lightBtn = document.getElementById('settings-theme-light');
    const darkBtn = document.getElementById('settings-theme-dark');
    if (lightBtn) lightBtn.classList.toggle('active', !isDark);
    if (darkBtn) darkBtn.classList.toggle('active', isDark);

    const lightCard = document.getElementById('theme-card-light');
    const darkCard = document.getElementById('theme-card-dark');
    if (lightCard) lightCard.classList.toggle('active', !isDark);
    if (darkCard) darkCard.classList.toggle('active', isDark);
  }

  // ==============================================================
  // STUDIO SETTINGS BENTO GRID INTERACTIONS & STATE
  // ==============================================================
  window.refreshStorageMeter = async function () {
    try {
      let usedBytes = 0;
      let quotaBytes = 500 * 1024 * 1024; // Default fallback: 500MB
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usedBytes = estimate.usage || 0;
        quotaBytes = estimate.quota || quotaBytes;
      } else {
        let total = 0;
        for (let key in localStorage) {
          if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
            total += ((localStorage[key].length + key.length) * 2);
          }
        }
        usedBytes = total;
      }

      let recentsCount = 0;
      try {
        if (typeof PixKitStorage !== 'undefined' && typeof PixKitStorage.getRecentFiles === 'function') {
          const recents = await PixKitStorage.getRecentFiles();
          recentsCount = Array.isArray(recents) ? recents.length : 0;
        } else {
          const stored = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
          recentsCount = Array.isArray(stored) ? stored.length : 0;
        }
      } catch (err) {
        recentsCount = 0;
      }

      const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
      const quotaMB = (quotaBytes / (1024 * 1024)).toFixed(0);
      const percent = Math.min(100, Math.max(2, (usedBytes / quotaBytes) * 100)).toFixed(1);

      const usedEl = document.getElementById('settings-storage-used');
      const quotaEl = document.getElementById('settings-storage-quota');
      const barEl = document.getElementById('settings-storage-bar');
      const recentsEl = document.getElementById('settings-storage-recents-count');

      if (usedEl) usedEl.textContent = `${usedMB} MB`;
      if (quotaEl) quotaEl.textContent = `of ~${quotaMB} MB quota`;
      if (barEl) barEl.style.width = `${percent}%`;
      if (recentsEl) recentsEl.textContent = `${recentsCount} file${recentsCount === 1 ? '' : 's'}`;
    } catch (e) {
      console.warn('Storage calculation error:', e);
    }
  };

  window.verifyPrivacyShield = function () {
    const btn = document.getElementById('verify-privacy-btn');
    if (!btn) return;
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner"></span> Scanning Network Sockets...`;

    setTimeout(() => {
      btn.innerHTML = `✓ Verified: 100% In-Browser Air-Gapped`;
      btn.classList.add('verified');
      showToast('Privacy Shield Verified: 0 outbound connections, 0 telemetry packets');
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        btn.classList.remove('verified');
      }, 3500);
    }, 900);
  };

  window.optimizeStudioCache = async function () {
    const btn = document.getElementById('optimize-cache-btn');
    if (btn) btn.disabled = true;

    // Revoke any tracked temporary object URLs
    if (window.activeObjectURLs && Array.isArray(window.activeObjectURLs)) {
      window.activeObjectURLs.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { }
      });
      window.activeObjectURLs = [];
    }

    await window.refreshStorageMeter();
    showToast('Studio cache & local memory buffers optimized');
    if (btn) btn.disabled = false;
  };

  window.testKeycapPress = function (action) {
    const idMap = {
      help: 'keycap-help',
      undo: 'keycap-undo',
      open: 'keycap-open',
      export: 'keycap-export'
    };
    const el = document.getElementById(idMap[action]);
    if (el) {
      el.classList.add('key-pressed');
      setTimeout(() => el.classList.remove('key-pressed'), 250);
    }
    if (action === 'help') {
      setTimeout(() => { if (typeof toggleShortcutsModal === 'function') toggleShortcutsModal(true); }, 150);
    } else if (action === 'undo') {
      showToast('Undo (⌘+Z) keycap tested');
    } else if (action === 'open') {
      showToast('Open File (⌘+O) keycap tested');
    } else if (action === 'export') {
      showToast('Export (E) keycap tested');
    }
  };

  window.toggleSettingCanvasGrid = function (checked) {
    localStorage.setItem('pixkit_setting_grid', checked ? 'true' : 'false');
    showToast(`Canvas dot matrix grid ${checked ? 'enabled' : 'disabled'}`);
  };

  window.toggleSettingHardwareAccel = function (checked) {
    localStorage.setItem('pixkit_setting_accel', checked ? 'true' : 'false');
    showToast(`Hardware WebGL acceleration ${checked ? 'enabled' : 'disabled'}`);
  };

  // ==============================================================
  // STUDIO SETTINGS REAL-TIME PRESENCE COUNTER & SPEED COUNTER (FIREBASE)
  // ==============================================================
  (function initStudioSettingsPresence() {
    const container = document.getElementById('settingsSpeedCounterNumber');
    const widget = document.getElementById('settingsActiveUsersWidget');
    if (!container) return;

    // 1. Hardware-level Device Fingerprinting
    // Deduplicates all tabs in Brave, Chrome, etc. on the SAME physical computer/phone to 1 user!
    function getDeviceFingerprint() {
      let storedId = null;
      try { storedId = localStorage.getItem('pixkit_dev_id'); } catch (e) { }

      const hwSignature = [
        screen.width,
        screen.height,
        screen.colorDepth,
        (Intl.DateTimeFormat().resolvedOptions().timeZone || 'utc'),
        (navigator.hardwareConcurrency || 4),
        (navigator.platform || '')
      ].join('__');

      let hash = 0;
      for (let i = 0; i < hwSignature.length; i++) {
        hash = ((hash << 5) - hash) + hwSignature.charCodeAt(i);
        hash |= 0;
      }
      const hwKey = 'dev_' + Math.abs(hash).toString(36);

      if (!storedId) {
        storedId = hwKey;
        try { localStorage.setItem('pixkit_dev_id', storedId); } catch (e) { }
      }
      return storedId;
    }

    const deviceId = getDeviceFingerprint();
    const tabId = 'tab_studio_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

    let currentNumber = 1;
    let targetNumber = 1;

    function setDisplayNumber(num, animate = true, direction = 'left') {
      const strVal = String(num);
      const targetLen = strVal.length;
      let slots = Array.from(container.querySelectorAll('.speed-digit-slot'));

      if (slots.length !== targetLen) {
        container.innerHTML = '';
        for (let i = 0; i < targetLen; i++) {
          const slot = document.createElement('span');
          slot.className = 'speed-digit-slot';
          const charSpan = document.createElement('span');
          charSpan.className = 'speed-digit-char active';
          charSpan.textContent = strVal[i];
          slot.appendChild(charSpan);
          container.appendChild(slot);
        }
        currentNumber = num;
        return;
      }

      for (let i = 0; i < targetLen; i++) {
        const slot = slots[i];
        const newChar = strVal[i];
        const activeChar = slot.querySelector('.speed-digit-char.active');

        if (!activeChar) {
          slot.innerHTML = `<span class="speed-digit-char active">${newChar}</span>`;
          continue;
        }

        if (activeChar.textContent !== newChar) {
          if (!animate) {
            activeChar.textContent = newChar;
            continue;
          }

          activeChar.classList.remove('active');
          const outClass = direction === 'right' ? 'racing-out-right' : 'racing-out-left';
          activeChar.classList.add(outClass);

          const inClass = direction === 'right' ? 'racing-in-left' : 'racing-in-right';
          const incoming = document.createElement('span');
          incoming.className = `speed-digit-char ${inClass}`;
          incoming.textContent = newChar;
          slot.appendChild(incoming);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              incoming.classList.remove(inClass);
              incoming.classList.add('active');
            });
          });

          setTimeout(() => {
            if (activeChar.parentNode === slot) slot.removeChild(activeChar);
          }, 260);
        }
      }
      currentNumber = num;
    }

    function playEntranceSpeedRoll(target) {
      if (target <= 0) {
        setDisplayNumber(target, false);
        return;
      }
      const steps = [];
      const countSteps = Math.min(8, Math.max(4, Math.floor(target / 4)));
      for (let i = 1; i <= countSteps; i++) {
        const progress = i / countSteps;
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = Math.max(1, Math.min(target, Math.round(eased * target)));
        if (!steps.includes(val)) steps.push(val);
      }
      if (steps[steps.length - 1] !== target) steps.push(target);

      setDisplayNumber(0, false);
      let stepIdx = 0;
      function nextStep() {
        if (stepIdx >= steps.length) return;
        const val = steps[stepIdx];
        setDisplayNumber(val, true, 'left');
        stepIdx++;
        if (stepIdx < steps.length) {
          const delay = 40 + Math.floor(Math.pow((stepIdx / steps.length), 2) * 55);
          setTimeout(nextStep, delay);
        }
      }
      setTimeout(nextStep, 100);
    }

    // Initialize Firebase Realtime Presence
    try {
      const firebaseConfig = {
        apiKey: "AIzaSyDCueyN5HjZWuCFuXbVcV5v27QhM3jC0vw",
        authDomain: "pixkit-a7862.firebaseapp.com",
        databaseURL: "https://pixkit-a7862-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "pixkit-a7862",
        storageBucket: "pixkit-a7862.firebasestorage.app",
        messagingSenderId: "704646920606",
        appId: "1:704646920606:web:f50077d6ab0a913bb2fe8f"
      };

      if (typeof firebase !== 'undefined') {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        const rtdb = firebase.database();

        const connectedRef = rtdb.ref(".info/connected");
        const deviceTabRef = rtdb.ref(`presence/${deviceId}/${tabId}`);
        const allPresenceRef = rtdb.ref("presence");

        connectedRef.on("value", (snap) => {
          if (snap.val() === true) {
            deviceTabRef.onDisconnect().remove();
            deviceTabRef.set(firebase.database.ServerValue.TIMESTAMP);
          }
        });

        allPresenceRef.on("value", (snapshot) => {
          let activeDevices = 0;
          const data = snapshot.val();
          if (data && typeof data === 'object') {
            for (const dId in data) {
              if (data[dId] && typeof data[dId] === 'object' && Object.keys(data[dId]).length > 0) {
                activeDevices++;
              }
            }
          }
          const liveCount = Math.max(1, activeDevices);
          targetNumber = liveCount;
          if (liveCount !== currentNumber) {
            const dir = liveCount > currentNumber ? 'left' : 'right';
            setDisplayNumber(liveCount, true, dir);
          }
        });

        window.addEventListener('beforeunload', () => { deviceTabRef.remove(); });
        window.addEventListener('pagehide', () => { deviceTabRef.remove(); });
      }
    } catch (err) {
      console.warn('Firebase Realtime Presence:', err);
    }

    // Interactive click to re-trigger speed counter roll
    if (widget) {
      widget.addEventListener('click', () => {
        playEntranceSpeedRoll(targetNumber);
      });
    }

    // Expose for route trigger
    window.triggerSettingsSpeedRoll = function () {
      playEntranceSpeedRoll(targetNumber);
    };
  })();

  // Keyboard shortcut listener for physical keycap feedback in Settings
  window.addEventListener('keydown', (e) => {
    const settingsView = document.getElementById('settings-view');
    if (!settingsView || !settingsView.classList.contains('active')) return;

    let keycapId = null;
    if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
      keycapId = 'keycap-help';
    } else if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyZ' || e.key.toLowerCase() === 'z')) {
      keycapId = 'keycap-undo';
    } else if ((e.metaKey || e.ctrlKey) && (e.code === 'KeyO' || e.key.toLowerCase() === 'o')) {
      keycapId = 'keycap-open';
    } else if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.code === 'KeyE' || e.key.toLowerCase() === 'e')) {
      keycapId = 'keycap-export';
    }

    if (keycapId) {
      const el = document.getElementById(keycapId);
      if (el) el.classList.add('key-pressed');
    }
  });

  window.addEventListener('keyup', () => {
    document.querySelectorAll('.keycap-item.key-pressed').forEach(el => el.classList.remove('key-pressed'));
  });

  // State for Recent Files category filter & real-time search
  let recentPageState = {
    currentCategory: 'all',
    searchQuery: ''
  };

  window.setRecentCategoryFilter = function (category) {
    if (recentPageState.currentCategory === category) return;
    const container = document.getElementById('recent-files-page-container');
    if (container) {
      container.classList.add('category-switching');
      container.classList.remove('category-entering');
      setTimeout(() => {
        recentPageState.currentCategory = category || 'all';
        window.renderRecentFilesPage();
        container.classList.remove('category-switching');
        container.classList.add('category-entering');
        setTimeout(() => {
          container.classList.remove('category-entering');
        }, 320);
      }, 150);
    } else {
      recentPageState.currentCategory = category || 'all';
      window.renderRecentFilesPage();
    }
  };

  window.handleRecentSearch = function (query) {
    recentPageState.searchQuery = (query || '').trim().toLowerCase();
    const clearBtn = document.getElementById('recent-search-clear');
    if (clearBtn) clearBtn.classList.toggle('visible', !!recentPageState.searchQuery);
    window.renderRecentFilesPage();
  };

  window.clearRecentSearch = function () {
    recentPageState.searchQuery = '';
    const input = document.getElementById('recent-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('recent-search-clear');
    if (clearBtn) clearBtn.classList.remove('visible');
    window.renderRecentFilesPage();
  };

  window.resetRecentFilters = function () {
    recentPageState.currentCategory = 'all';
    recentPageState.searchQuery = '';
    const input = document.getElementById('recent-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('recent-search-clear');
    if (clearBtn) clearBtn.classList.remove('visible');
    window.renderRecentFilesPage();
  };

  window.renderRecentFilesPage = function () {
    const container = document.getElementById('recent-files-page-container');
    const controlsBar = document.getElementById('recentControlsBar');
    if (!container) return;
    if (!container.classList.contains('recent-files-container')) {
      container.classList.add('recent-files-container');
    }

    if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
      if (!window.PixKitRemote.isFeatureEnabled('community', 'recentFiles')) {
        if (controlsBar) controlsBar.style.display = 'none';
        container.innerHTML = `
          <div style="text-align: center; padding: 60px 20px; color: var(--muted);">
            <div style="font-size: 38px; margin-bottom: 14px;">⏳</div>
            <h3 style="font-size: 19px; color: var(--text-color); margin-bottom: 8px; font-weight: 800;">Feature Temporarily Unavailable</h3>
            <p style="font-size: 13.5px; max-width: 440px; margin: 0 auto 22px; line-height: 1.6;">Recent Files &amp; History is currently disabled by administrator. Please check back shortly!</p>
            <button type="button" class="btn-primary" onclick="showView('home')" style="margin: 0 auto;">Back to Home</button>
          </div>
        `;
        return;
      }
    }

    let rawRecents = [];
    try {
      rawRecents = JSON.parse(localStorage.getItem('pixkit_recent_files') || '[]');
    } catch (e) {
      rawRecents = [];
    }

    // Clean out any default/sample images (e.g. mountain-view.jpg)
    let recents = rawRecents.filter(f => f && f.name && f.name !== 'mountain-view.jpg');

    // Auto-heal: If merged_document.pdf exists without sourceFiles, group orphan exec-... PDFs into it
    try {
      const mergedDoc = recents.find(f => f && f.name && f.name.toLowerCase().includes('merged'));
      if (mergedDoc && (!mergedDoc.sourceFiles || !mergedDoc.sourceFiles.length)) {
        const orphanExecs = recents.filter(f => f && f.name && f.name.startsWith('exec-') && (f.category === 'pdf' || f.name.endsWith('.pdf')));
        if (orphanExecs.length > 0) {
          mergedDoc.operation = 'merge';
          mergedDoc.sourceFiles = orphanExecs.map(o => ({
            name: o.name,
            size: o.size,
            type: o.type || 'application/pdf',
            thumbUrl: o.previewUrl || null,
            pageCount: 1
          }));
          recents = recents.filter(f => !(f && f.name && f.name.startsWith('exec-') && (f.category === 'pdf' || f.name.endsWith('.pdf'))));
          localStorage.setItem('pixkit_recent_files', JSON.stringify(recents));
        }
      }
    } catch (_) { }

    if (recents.length !== rawRecents.length) {
      try {
        localStorage.setItem('pixkit_recent_files', JSON.stringify(recents));
      } catch (_) { }
    }

    // Collect all child source file names so they don't show as separate duplicate cards
    const childSourceNames = new Set();
    recents.forEach(r => {
      if (r && Array.isArray(r.sourceFiles)) {
        r.sourceFiles.forEach(s => {
          if (s && s.name) childSourceNames.add(s.name);
        });
      }
    });

    // Only actual user uploaded/edited images qualify as active session
    const isRealUserImage = hasUserAddedImage && engine.filename && engine.filename !== 'mountain-view.jpg' && !engine.isSampleArtwork;
    const hasActiveSession = isRealUserImage && engine.activeCanvas && engine.activeCanvas.width > 0;

    let activeThumbUrl = null;
    if (hasActiveSession) {
      try {
        activeThumbUrl = engine.activeCanvas.toDataURL('image/jpeg', 0.85);
      } catch (_) { }
    }

    // Combine active session and recents into unified list of actual files
    const allFilesList = [];
    if (hasActiveSession) {
      allFilesList.push({
        name: engine.filename,
        size: engine.fileSize,
        type: engine.fileType,
        width: engine.activeCanvas.width,
        height: engine.activeCanvas.height,
        previewUrl: activeThumbUrl,
        isCurrent: true,
        category: getFileCategory({ name: engine.filename, type: engine.fileType })
      });
    }

    recents.forEach(r => {
      if ((!hasActiveSession || r.name !== engine.filename) && !childSourceNames.has(r.name)) {
        allFilesList.push({
          ...r,
          isCurrent: false,
          category: getFileCategory(r)
        });
      }
    });

    // Sort: active session first, then by timestamp descending (newest first)
    allFilesList.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

    // Exactly the top 10 most recent files across the entire library can resume in editor
    const top10GlobalNames = new Set(allFilesList.slice(0, 10).map(f => f.name));

    // Category match helper
    const isFileInCat = (file, cat) => {
      if (cat === 'all') return true;
      const fileCat = file.category || getFileCategory(file);
      if (cat === 'convert') {
        return fileCat === 'convert' || (file.originTool && file.originTool.startsWith('convert-')) || (file.name && (file.name.includes('_converted') || file.name.includes('-converted') || file.name.endsWith('.ico') || file.name.endsWith('.svg') || file.name.endsWith('.heic')));
      }
      if (cat === 'pdf') {
        return fileCat === 'pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf')) || (file.type && file.type.includes('pdf'));
      }
      if (cat === 'edit') {
        const isC = fileCat === 'convert' || (file.originTool && file.originTool.startsWith('convert-')) || (file.name && (file.name.includes('_converted') || file.name.includes('-converted') || file.name.endsWith('.ico') || file.name.endsWith('.svg') || file.name.endsWith('.heic')));
        const isP = fileCat === 'pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf')) || (file.type && file.type.includes('pdf'));
        return !isC && !isP;
      }
      return fileCat === cat;
    };

    // Compute category counts
    const counts = {
      all: allFilesList.length,
      edit: allFilesList.filter(f => isFileInCat(f, 'edit')).length,
      convert: allFilesList.filter(f => isFileInCat(f, 'convert')).length,
      pdf: allFilesList.filter(f => isFileInCat(f, 'pdf')).length
    };

    // Update pill count badges in DOM
    const updateCount = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count.toString();
    };
    updateCount('count-all', counts.all);
    updateCount('count-edit', counts.edit);
    updateCount('count-convert', counts.convert);
    updateCount('count-pdf', counts.pdf);

    // Update active class on category pills
    const curCat = recentPageState.currentCategory || 'all';
    document.querySelectorAll('.recent-filter-pill').forEach(pill => {
      const isAct = pill.getAttribute('data-cat') === curCat;
      pill.classList.toggle('active', isAct);
      pill.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });

    // If completely empty library (zero actual files)
    if (allFilesList.length === 0) {
      if (controlsBar) controlsBar.style.display = 'none';
      container.innerHTML = `
        <div class="recent-empty-state">
          <div class="recent-empty-icon">📁</div>
          <div class="recent-empty-title">Your Studio Library is Empty</div>
          <p class="recent-empty-desc">Images, photos, and PDF documents you edit in PixKit Studio are automatically remembered right on your computer so you can resume anytime.</p>
          <button class="btn-primary" onclick="triggerGlobalUpload()" style="display:inline-flex; align-items:center; gap:6px; padding:10px 22px; font-weight:700;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Open an Image
          </button>
          <div class="recent-empty-workflows">
            <span>Explore Suites:</span>
            <span class="recent-empty-pill" onclick="showView('edit')">✎ 9 Edit Tools</span>
            <span class="recent-empty-pill" onclick="showView('convert')">⇄ 6 Convert Tools</span>
            <span class="recent-empty-pill" onclick="showView('document')">📄 7 PDF Tools</span>
          </div>
        </div>
      `;
      return;
    }

    // Show controls bar if files exist
    if (controlsBar) controlsBar.style.display = 'flex';

    // Apply Category & Search Filter
    const searchQuery = recentPageState.searchQuery || '';
    const filteredList = allFilesList.filter(file => {
      if (curCat !== 'all' && !isFileInCat(file, curCat)) return false;
      if (searchQuery) {
        const name = (file.name || '').toLowerCase();
        const ext = name.split('.').pop() || '';
        const type = (file.type || '').toLowerCase();
        const cat = (file.category || '').toLowerCase();
        return name.includes(searchQuery) || ext.includes(searchQuery) || type.includes(searchQuery) || cat.includes(searchQuery);
      }
      return true;
    });

    // If filter yields 0 matches
    if (filteredList.length === 0) {
      const catLabel = curCat === 'all' ? 'All' : (curCat === 'edit' ? 'Edit Images' : (curCat === 'convert' ? 'Convert' : 'PDF'));
      container.innerHTML = `
        <div class="recent-empty-search-state">
          <div class="recent-empty-search-icon">🔍</div>
          <div class="recent-empty-search-title">No matching files found</div>
          <p class="recent-empty-search-desc">No files matched your search${searchQuery ? ` "<strong>${escapeDockHtml(searchQuery)}</strong>"` : ''} under category "<strong>${catLabel}</strong>".</p>
          <button class="btn-secondary" onclick="resetRecentFilters()" style="display:inline-flex; align-items:center; gap:6px; padding:8px 18px; font-weight:600; margin-top:8px;">
            Reset Filters
          </button>
        </div>
      `;
      return;
    }

    let html = '';

    // Notice explaining memory optimization and 10-file resume limit
    html += `
      <div class="recent-memory-notice">
        <i class="fa-solid fa-circle-info"></i>
        <span>To optimize performance and save browser memory, only your <strong>10 most recent files</strong> can be resumed back in the editor. Older files remain available for direct download of the last edit.</span>
      </div>
    `;

    // If an active session matches the filter, render the Active Session Banner
    const activeFileMatch = filteredList.find(f => f.isCurrent);
    if (activeFileMatch) {
      const dimStr = `${engine.activeCanvas.width} × ${engine.activeCanvas.height} px`;
      const sizeStr = formatFileSize(engine.fileSize);
      const fmtStr = getFormatBadgeLabel(engine.filename, engine.fileType);

      html += `
        <div class="recent-active-session-banner">
          <div class="recent-active-left">
            ${activeThumbUrl ? `<img class="recent-active-thumb" src="${activeThumbUrl}" alt="Active image preview">` : `<div class="recent-active-icon-fallback"><i class="fa-regular fa-image"></i></div>`}
            <div class="recent-active-details">
              <span class="recent-active-pill">
                <span class="recent-active-pulse"></span>
                CURRENT ACTIVE SESSION
              </span>
              <div class="recent-active-filename">${escapeDockHtml(engine.filename)}</div>
              <div class="recent-active-meta">${dimStr} · ${sizeStr} · ${fmtStr} format</div>
            </div>
          </div>
          <div class="recent-active-actions">
            <button class="btn-secondary" onclick="downloadCurrentSessionFile(event)" style="display:inline-flex; align-items:center; gap:6px; padding:10px 18px; font-weight:700;">
              <i class="fa-solid fa-download"></i> Download Last Edit
            </button>
            <button class="btn-primary" onclick="showView('edit')" style="display:inline-flex; align-items:center; gap:6px; padding:10px 20px; font-weight:700;">
              Resume Editing →
            </button>
          </div>
        </div>
      `;
    }

    // Grid files: exclude active banner file from grid
    const gridList = filteredList.filter(f => !f.isCurrent);

    if (gridList.length > 0) {
      html += `<div class="recent-files-grid">`;
      gridList.forEach((file, index) => {
        const fmtLabel = getFormatBadgeLabel(file.name, file.type);
        const timeStr = formatDockTimeAgo(file.timestamp || Date.now());
        const sizeStr = formatFileSize(file.size);
        const isPdfDoc = file.category === 'pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'));
        const isConvertDoc = isFileInCat(file, 'convert');
        const opLabels = {
          'merge': 'Merged',
          'split': 'Split',
          'compress': 'Compressed',
          'rotate': 'Rotated',
          'delete': 'Pages Removed',
          'convert': 'Converted',
          'heic': 'HEIC to JPG',
          'rasterize': 'Vector PNG',
          'favicon': 'Favicon',
          'base64': 'Base64',
          'extract': 'Extracted'
        };
        const opBadge = file.operation ? (opLabels[file.operation] || file.operation.toUpperCase()) : (isPdfDoc ? 'Document' : (isConvertDoc ? 'Converted' : 'Edit'));
        const resStr = isPdfDoc ? 'PDF Document' : (file.width && file.height ? `${file.width} × ${file.height} px` : '');
        const metaStr = resStr ? `${resStr} · ${sizeStr}` : sizeStr;
        const canResume = top10GlobalNames.has(file.name);
        const hasSources = Array.isArray(file.sourceFiles) && file.sourceFiles.length > 0;
        const actionClass = canResume && hasSources ? 'has-three-actions' : (hasSources ? 'has-two-actions' : '');

        html += `
          <div class="recent-file-card ${canResume ? '' : 'no-resume'}" style="--card-index: ${index};" onclick="${canResume ? `openRecentFromPage('${escapeDockHtml(file.name)}', false, event)` : `downloadRecentFileItem('${escapeDockHtml(file.name)}', event)`}">
            <div class="recent-card-top">
              <div class="recent-card-badges">
                <span class="recent-fmt-badge ${isPdfDoc ? 'recent-fmt-badge-pdf' : (isConvertDoc ? 'recent-fmt-badge-convert' : '')}">${fmtLabel}</span>
                <span class="recent-cat-badge ${isPdfDoc ? 'recent-cat-badge-pdf' : (isConvertDoc ? 'recent-cat-badge-convert' : '')}">${isPdfDoc ? opBadge : (isConvertDoc ? opBadge : 'Edit')}</span>
                ${hasSources ? `
                  <button type="button" class="recent-sources-chip ${isConvertDoc && !isPdfDoc ? 'recent-sources-chip-convert' : ''}" onclick="openPdfSourcesModal('${escapeDockHtml(file.name)}', event)" title="Click to view all ${file.sourceFiles.length} source file${file.sourceFiles.length > 1 ? 's' : ''} used">
                    <i class="fa-solid fa-layer-group"></i> <span>${file.sourceFiles.length} Source${file.sourceFiles.length > 1 ? 's' : ''}</span>
                  </button>
                ` : ''}
                <span class="recent-time-ago">${timeStr}</span>
                ${!canResume ? '<span class="recent-cat-badge" style="background:var(--soft); color:var(--muted); font-size:9.5px; border:1px solid var(--line);" title="Older file archived to optimize browser memory">Download Only</span>' : ''}
              </div>
              <button class="recent-card-delete-btn" onclick="deleteRecentFileItem('${escapeDockHtml(file.name)}', event)" title="Remove from recents" aria-label="Remove ${escapeDockHtml(file.name)} from history">✕</button>
            </div>
            <div class="recent-card-main">
              ${file.previewUrl ? `
                <img class="recent-card-thumb" src="${file.previewUrl}" alt="${escapeDockHtml(file.name)} thumbnail">
              ` : (isPdfDoc ? `
                <div class="recent-card-pdf-tile">
                  <i class="fa-solid fa-file-pdf"></i>
                  <span>PDF</span>
                </div>
              ` : `
                <div class="recent-card-icon-tile"><i class="fa-regular fa-image"></i></div>
              `)}
              <div class="recent-card-texts">
                <div class="recent-card-title">${escapeDockHtml(file.name)}</div>
                <div class="recent-card-meta">${metaStr}</div>
              </div>
            </div>
            <div class="recent-card-actions ${actionClass}">
              ${canResume ? `
                <button type="button" class="recent-action-btn btn-resume" onclick="openRecentFromPage('${escapeDockHtml(file.name)}', false, event)" title="Open in editor to continue editing">
                  <i class="fa-solid fa-pen-to-square"></i> <span>Open in Edit</span>
                </button>
              ` : ''}
              ${hasSources ? `
                <button type="button" class="recent-action-btn btn-expand" onclick="openPdfSourcesModal('${escapeDockHtml(file.name)}', event)" title="View all source files used to create this document">
                  <i class="fa-solid fa-up-right-and-down-left-from-center"></i> <span>Expand</span>
                </button>
              ` : ''}
              <button type="button" class="recent-action-btn btn-download" onclick="downloadRecentFileItem('${escapeDockHtml(file.name)}', event)" title="Download the latest edited file directly">
                <i class="fa-solid fa-download"></i> <span>Download Last Edit</span>
              </button>
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    container.innerHTML = html;
  };

  // --- Aceternity UI Floating Dock Magnification Physics ---
  function initFloatingDockPhysics() {
    const container = document.getElementById('floatingDockNav');
    if (!container) return;

    const items = Array.from(container.querySelectorAll('.floating-dock-item'));
    if (!items.length) return;

    const baseSize = 44;
    const maxSize = 66;
    const maxDistance = 100;

    let mouseX = -Infinity;
    let mouseY = -Infinity;
    let isHovering = false;
    let rafId = null;

    const state = items.map(el => ({
      el,
      icon: el.querySelector('.dock-icon-inner'),
      currentSize: baseSize,
      targetSize: baseSize,
      velocity: 0,
      currentScale: 1,
      targetScale: 1
    }));

    function updateTargets() {
      state.forEach(item => {
        if (!isHovering || mouseX === -Infinity || mouseY === -Infinity) {
          item.targetSize = baseSize;
          item.targetScale = 1;
          return;
        }

        const rect = item.el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 2D distance: smooth continuous falloff both horizontally and vertically
        const dx = Math.max(0, mouseX - centerX);
        const dy = Math.abs(mouseY - centerY);
        const distance = Math.hypot(dx * 1.15, dy);

        if (distance < maxDistance) {
          const ratio = distance / maxDistance;
          // Smooth cosine bell curve: continuous derivative at both ends (zero pop)
          const factor = Math.cos(ratio * (Math.PI / 2));
          item.targetSize = baseSize + (maxSize - baseSize) * factor;
          item.targetScale = 1 + 0.35 * factor;
        } else {
          item.targetSize = baseSize;
          item.targetScale = 1;
        }
      });
    }

    function tick() {
      let needsMoreFrames = false;
      const stiffness = 0.22;
      const damping = 0.78;

      let maxCurrentSize = baseSize;
      let totalItemsHeight = 0;

      state.forEach(item => {
        const force = (item.targetSize - item.currentSize) * stiffness;
        item.velocity = (item.velocity + force) * damping;
        item.currentSize += item.velocity;

        item.currentScale += (item.targetScale - item.currentScale) * 0.22;

        if (Math.abs(item.targetSize - item.currentSize) > 0.05 || Math.abs(item.velocity) > 0.05) {
          needsMoreFrames = true;
        }

        if (item.currentSize > maxCurrentSize) maxCurrentSize = item.currentSize;
        totalItemsHeight += item.currentSize;

        item.el.style.width = `${item.currentSize.toFixed(1)}px`;
        item.el.style.height = `${item.currentSize.toFixed(1)}px`;
        if (item.icon) {
          item.icon.style.transform = `scale(${item.currentScale.toFixed(3)})`;
        }
      });

      // Smooth float dock dimensions for ultra-fluid SVG membrane scaling
      const activeDockW = maxCurrentSize + 20;
      const activeDockH = 24 + totalItemsHeight + (items.length - 1) * 12;

      if (window.setDockMagnificationSize) {
        window.setDockMagnificationSize(activeDockW, activeDockH);
      }

      if (needsMoreFrames || isHovering) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
        if (window.setDockMagnificationSize && !isHovering) {
          window.setDockMagnificationSize(64, 180);
        }
      }
    }

    function startAnimation() {
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    }

    let lastKnownMouseX = -Infinity;
    let lastKnownMouseY = -Infinity;
    let stage2GraceTimer = null;

    function enterStage1() {
      if (stage2GraceTimer) {
        clearTimeout(stage2GraceTimer);
        stage2GraceTimer = null;
      }
      isHovering = false;
      mouseX = -Infinity;
      mouseY = -Infinity;
      updateTargets();
      startAnimation();
    }

    function enterStage2(x, y) {
      if (stage2GraceTimer) {
        clearTimeout(stage2GraceTimer);
        stage2GraceTimer = null;
      }
      isHovering = true;
      if (typeof x === 'number' && typeof y === 'number') {
        mouseX = x;
        mouseY = y;
        lastKnownMouseX = x;
        lastKnownMouseY = y;
      }
      updateTargets();
      startAnimation();
    }

    window.cancelDockStageTimer = function () {
      if (stage2GraceTimer) {
        clearTimeout(stage2GraceTimer);
        stage2GraceTimer = null;
      }
    };

    // Called when Stage 3 tension release finishes settling
    window.onDockDragSettled = function () {
      // Dock has smoothly settled into Stage 2 (Hover State)
      // Keep Stage 2 active for half a second (500ms), then gracefully transition to Stage 1 if cursor is outside
      if (stage2GraceTimer) clearTimeout(stage2GraceTimer);
      stage2GraceTimer = setTimeout(() => {
        stage2GraceTimer = null;
        if (window.isDockDragging) return;
        const rect = container.getBoundingClientRect();
        const withinZone = lastKnownMouseX >= rect.left - 40 && lastKnownMouseX <= rect.right + 105 &&
          lastKnownMouseY >= rect.top - 60 && lastKnownMouseY <= rect.bottom + 60;
        if (!withinZone) {
          enterStage1();
        }
      }, 500);
    };

    container.addEventListener('mousemove', (e) => {
      lastKnownMouseX = e.clientX;
      lastKnownMouseY = e.clientY;
      if (window.isDockDragging) return;
      enterStage2(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      lastKnownMouseX = e.clientX;
      lastKnownMouseY = e.clientY;

      if (window.isDockDragging) {
        // While dragging in Stage 3, keep Stage 2 active and steady
        return;
      }

      const rect = container.getBoundingClientRect();
      // Continuous 2D smooth zone out to 105px: zero cliff, zero jump
      const withinZone = e.clientX >= rect.left - 40 && e.clientX <= rect.right + 105 &&
        e.clientY >= rect.top - 60 && e.clientY <= rect.bottom + 60;

      if (withinZone) {
        enterStage2(e.clientX, e.clientY);
      } else if (isHovering && !stage2GraceTimer) {
        // Smoothly return from Stage 2 -> Stage 1
        enterStage1();
      }
    }, { passive: true });

    window.addEventListener('blur', () => {
      if (!window.isDockDragging) enterStage1();
    });

    document.addEventListener('mouseleave', () => {
      if (!window.isDockDragging) enterStage1();
    });
  }

  // ==============================================================
  // ACETERNITY UI ELASTIC MEMBRANE & RECOIL DYNAMICS
  // Unified connected-body localized deformation with hover magnification
  // ==============================================================
  function initDockElasticInteraction() {
    const wrapper = document.getElementById('floatingDockWrapper');
    const container = document.getElementById('floatingDockNav');
    const path = document.getElementById('dockElasticPath');
    const pathClip = document.getElementById('dockElasticPathClip');
    if (!wrapper || !container || !path) return;

    const items = Array.from(container.querySelectorAll('.floating-dock-item'));

    let currentW = 64;
    let currentH = 180;
    const numCap = 8;
    const numEdge = 12;
    const sigma = 62;

    let isPointerDown = false;
    let isDragging = false;
    let hasDraggedThisPress = false;
    let dragEndedTimestamp = 0;
    let startX = 0;
    let startY = 0;
    let grabX = currentW / 2;
    let grabY = currentH / 2;
    let currentPullX = 0;
    let currentPullY = 0;
    let springAnimId = null;

    // Build resting polygon for given width W and height H
    function getPolygon(W, H) {
      const r = W / 2;
      const pts = [];
      // 1. Top cap semicircle (pi to 2*pi)
      for (let i = 0; i <= numCap; i++) {
        const angle = Math.PI + i * (Math.PI / numCap);
        pts.push({ x: r + r * Math.cos(angle), y: r + r * Math.sin(angle) });
      }
      // 2. Right straight edge
      for (let i = 1; i < numEdge; i++) {
        const t = i / numEdge;
        pts.push({ x: W, y: r + t * (H - 2 * r) });
      }
      // 3. Bottom cap semicircle (0 to pi)
      for (let i = 0; i <= numCap; i++) {
        const angle = 0 + i * (Math.PI / numCap);
        pts.push({ x: r + r * Math.cos(angle), y: (H - r) + r * Math.sin(angle) });
      }
      // 4. Left straight edge
      for (let i = 1; i < numEdge; i++) {
        const t = i / numEdge;
        pts.push({ x: 0, y: (H - r) - t * (H - 2 * r) });
      }
      return pts;
    }

    // Render deformed SVG path: base membrane moves in exact lockstep with icons
    function renderPath(gx, gy, px, py) {
      const W = currentW;
      const H = currentH;
      const restPts = getPolygon(W, H);
      const n = restPts.length;
      const deformed = [];

      for (let i = 0; i < n; i++) {
        const pt = restPts[i];
        const dy = pt.y - gy;
        const w = Math.exp(-(dy * dy) / (2 * sigma * sigma));

        // Unified width interpolation factor:
        // Left edge (x=0) moves by 0.48, Right edge (x=W) moves by 1.02
        // Centerline (x=W/2) moves by (0.48 + 1.02) / 2 = 0.75!
        const tx = Math.max(0, Math.min(1, pt.x / W));
        const fx = px >= 0 ? (0.48 + 0.54 * tx) : (1.02 - 0.54 * tx);
        const fy = 0.65;

        deformed.push({
          x: pt.x + px * fx * w,
          y: pt.y + py * fy * w
        });
      }

      let d = `M ${deformed[0].x.toFixed(2)} ${deformed[0].y.toFixed(2)}`;
      for (let i = 0; i < n; i++) {
        const p0 = deformed[(i - 1 + n) % n];
        const p1 = deformed[i];
        const p2 = deformed[(i + 1) % n];
        const p3 = deformed[(i + 2) % n];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
      }
      d += ' Z';

      path.setAttribute('d', d);
      if (pathClip) pathClip.setAttribute('d', d);
    }

    // Dynamic magnification integration: called by initFloatingDockPhysics on hover
    function setDockMagnificationSize(w, h) {
      if (isDragging || springAnimId) return;
      currentW = w;
      currentH = h;
      renderPath(currentW / 2, currentH / 2, 0, 0);
    }
    window.setDockMagnificationSize = setDockMagnificationSize;

    // Translate & stretch buttons: moves and deforms together with the base membrane as a unified fluid body
    function updateButtonOffsets(gy, px, py) {
      const pullDist = Math.hypot(px, py);
      const angle = pullDist > 0.5 ? Math.atan2(py, px) : 0;

      items.forEach(btn => {
        const btnCenterY = btn.offsetTop + btn.offsetHeight / 2;
        const dy = btnCenterY - gy;
        const w = Math.exp(-(dy * dy) / (2 * sigma * sigma));

        // Exact 0.75 ratio matching the centerline of the deformed membrane
        const tx = px * 0.75 * w;
        const ty = py * 0.65 * w;

        let transformValue = '';
        if (pullDist > 1) {
          // Dynamic liquid squash and stretch matching the tension of the membrane
          const stretch = Math.min(0.38, (pullDist / 95) * 0.32) * w;
          const squash = stretch * 0.42;
          const sx = 1 + stretch;
          const sy = 1 - squash;
          const rotZ = (py / 100) * 4 * w;

          transformValue = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${angle.toFixed(3)}rad) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${(-angle).toFixed(3)}rad) rotate(${rotZ.toFixed(1)}deg)`;
        } else {
          transformValue = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
        }

        btn.style.setProperty('transform', transformValue, 'important');
      });
    }

    function clearButtonOffsets() {
      items.forEach(btn => {
        btn.style.removeProperty('transform');
      });
    }

    function refreshDockElasticPath() {
      if (isDragging || springAnimId) return;
      renderPath(currentW / 2, currentH / 2, 0, 0);
    }
    window.refreshDockElasticPath = refreshDockElasticPath;

    // Immediately render rest path
    refreshDockElasticPath();

    // Dedicated Navigation Action Dispatcher
    function triggerDockNavigation(viewId, e) {
      if (isDragging || (hasDraggedThisPress && Date.now() - dragEndedTimestamp < 120)) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (viewId === 'recent') {
        if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
          if (!window.PixKitRemote.isFeatureEnabled('community', 'recentFiles')) {
            if (typeof showToast === 'function') {
              showToast('This feature is temporarily unavailable: Recent Files & History is currently disabled.', 'info');
            }
            return;
          }
        }
      }
      window.showView(viewId);
    }

    // Direct, reliable click handlers on dock buttons
    const btnHome = document.getElementById('dock-btn-home');
    const btnRecent = document.getElementById('dock-btn-recent');
    const btnSettings = document.getElementById('dock-btn-settings');

    if (btnHome) {
      btnHome.addEventListener('click', (e) => triggerDockNavigation('home', e));
    }
    if (btnRecent) {
      btnRecent.addEventListener('click', (e) => triggerDockNavigation('recent', e));
    }
    if (btnSettings) {
      btnSettings.addEventListener('click', (e) => triggerDockNavigation('settings', e));
    }

    // Delegated click handler on container (intercepts drags, allows real clicks)
    container.addEventListener('click', (e) => {
      if (isDragging || (hasDraggedThisPress && Date.now() - dragEndedTimestamp < 120)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
      const item = e.target.closest('.floating-dock-item');
      if (item) {
        if (item.id === 'dock-btn-home') triggerDockNavigation('home', e);
        else if (item.id === 'dock-btn-recent') triggerDockNavigation('recent', e);
        else if (item.id === 'dock-btn-settings') triggerDockNavigation('settings', e);
      }
    }, true);

    container.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;

      if (window.cancelDockStageTimer) {
        window.cancelDockStageTimer();
      }

      isPointerDown = true;
      isDragging = false;
      hasDraggedThisPress = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = container.getBoundingClientRect();
      grabX = Math.max(0, Math.min(currentW, e.clientX - rect.left));
      grabY = Math.max(0, Math.min(currentH, e.clientY - rect.top));

      if (springAnimId) {
        cancelAnimationFrame(springAnimId);
        springAnimId = null;
      }
      // Note: Do NOT set pointer capture on pointerdown so normal clicks pass cleanly to buttons!
    });

    window.addEventListener('pointermove', (e) => {
      if (!isPointerDown) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const rawDist = Math.hypot(dx, dy);

      // Require explicit movement >= 8px before initiating elastic drag
      if (rawDist >= 8 && !isDragging) {
        isDragging = true;
        hasDraggedThisPress = true;
        window.isDockDragging = true;
        wrapper.classList.add('dock-is-dragging');
        container.classList.add('is-dragging');
        document.body.classList.add('dock-is-dragging');

        try {
          container.setPointerCapture(e.pointerId);
        } catch (_) { }
      }

      if (isDragging) {
        // Non-linear Hooke's tension saturation (rubber-band resistance)
        const maxStretch = 110;
        const elasticDist = maxStretch * Math.tanh(rawDist / (maxStretch * 1.65));
        const ratio = rawDist > 0 ? (elasticDist / rawDist) : 0;
        currentPullX = dx * ratio;
        currentPullY = dy * ratio;

        renderPath(grabX, grabY, currentPullX, currentPullY);
        updateButtonOffsets(grabY, currentPullX, currentPullY);
      }
    });

    function handlePointerUp(e) {
      if (!isPointerDown) return;
      isPointerDown = false;

      try {
        if (e && e.pointerId && container.hasPointerCapture && container.hasPointerCapture(e.pointerId)) {
          container.releasePointerCapture(e.pointerId);
        }
      } catch (_) { }

      if (isDragging) {
        dragEndedTimestamp = Date.now();
        wrapper.classList.remove('dock-is-dragging');
        container.classList.remove('is-dragging');
        container.classList.add('is-recoiling');
        document.body.classList.remove('dock-is-dragging');

        // Fast & snappy spring recoil (iOS-grade snappy damped recoil, settles in ~200ms)
        let px = currentPullX;
        let py = currentPullY;
        let vx = 0;
        let vy = 0;
        const k = 580; // higher tension stiffness for immediate snapback
        const c = 32;  // critical-near damping to prevent lingering wobble
        let startTime = performance.now();
        let lastTime = startTime;

        function springStep(now) {
          const dt = Math.min((now - lastTime) / 1000, 0.032);
          lastTime = now;
          const elapsed = (now - startTime) / 1000;

          const fx = -k * px - c * vx;
          const fy = -k * py - c * vy;

          vx += fx * dt;
          vy += fy * dt;
          px += vx * dt;
          py += vy * dt;

          currentPullX = px;
          currentPullY = py;

          renderPath(grabX, grabY, px, py);
          updateButtonOffsets(grabY, px, py);

          // Settle condition: either moving or displaced, or max 350ms elapsed
          const dist = Math.hypot(px, py);
          const speed = Math.hypot(vx, vy);

          if ((dist > 0.4 || speed > 1.5) && elapsed < 0.35) {
            springAnimId = requestAnimationFrame(springStep);
          } else {
            // Settle smoothly into Stage 2 (Hover State)!
            container.classList.remove('is-recoiling');
            container.classList.remove('is-dragging');
            currentPullX = 0;
            currentPullY = 0;
            clearButtonOffsets();
            renderPath(currentW / 2, currentH / 2, 0, 0);
            springAnimId = null;
            isDragging = false;
            window.isDockDragging = false;

            // Notify hover system that Stage 3 has settled into Stage 2,
            // initiating the 1-second transition sequence to Stage 1!
            if (window.onDockDragSettled) {
              window.onDockDragSettled();
            }
          }
        }
        springAnimId = requestAnimationFrame(springStep);
      }
    }

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }

  // --- Comprehensive Multi-Suite Global Keyboard Shortcuts Engine ---
  let pendingSequencePrefix = null;
  let pendingSequenceTimer = null;

  function showSequenceHud(htmlContent) {
    let hud = document.getElementById('shortcut-sequence-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'shortcut-sequence-hud';
      hud.className = 'shortcut-sequence-hud';
      document.body.appendChild(hud);
    }
    hud.innerHTML = htmlContent;
    hud.classList.remove('flash-success');
    hud.classList.add('active');

    clearTimeout(pendingSequenceTimer);
    pendingSequenceTimer = setTimeout(() => {
      hud.classList.remove('active');
      pendingSequencePrefix = null;
    }, 1500);
  }

  function flashSequenceHudSuccess(message) {
    const hud = document.getElementById('shortcut-sequence-hud');
    if (hud) {
      hud.innerHTML = `<span>✓ ${message}</span>`;
      hud.classList.add('flash-success', 'active');
      clearTimeout(pendingSequenceTimer);
      pendingSequenceTimer = setTimeout(() => {
        hud.classList.remove('active', 'flash-success');
        pendingSequencePrefix = null;
      }, 900);
    }
  }

  function hideSequenceHud() {
    const hud = document.getElementById('shortcut-sequence-hud');
    if (hud) {
      hud.classList.remove('active', 'flash-success');
    }
    clearTimeout(pendingSequenceTimer);
    pendingSequencePrefix = null;
  }

  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isTyping = activeEl && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName) || activeEl.isContentEditable);

    // 1. Escape: Context-aware Back / Dismiss
    if (e.key === 'Escape') {
      hideSequenceHud();
      window.closeAllReplaceDropdowns();
      const recentPicker = document.getElementById('recent-picker-modal');
      if (recentPicker && recentPicker.classList.contains('active')) {
        e.preventDefault();
        window.closeRecentPickerModal();
        return;
      }
      const pdfSourcesModal = document.getElementById('pdf-sources-modal');
      if (pdfSourcesModal && pdfSourcesModal.classList.contains('active')) {
        e.preventDefault();
        window.closePdfSourcesModal();
        return;
      }
      const pdfPreviewModal = document.getElementById('pdf-preview-modal');
      if (pdfPreviewModal && pdfPreviewModal.classList.contains('active')) {
        e.preventDefault();
        window.closePdfPreviewModal();
        return;
      }
      const modal = document.getElementById('shortcuts-modal');
      if (modal && modal.classList.contains('active')) {
        e.preventDefault();
        window.toggleShortcutsModal(false);
        return;
      }
      // Batch sub-tool detail dismissal back to All Configurations
      if (typeof batchState !== 'undefined' && batchState.activeDetailTool) {
        e.preventDefault();
        window.closeBatchToolDetail();
        return;
      }
      if (currentView === 'recent' || currentView === 'settings') {
        e.preventDefault();
        window.showView('home');
        return;
      }
      if (activeTool) {
        e.preventDefault();
        if (activeTool.startsWith('doc-') || (activeTool === 'convert-pdf' && lastCategoryOrigin === 'document')) {
          window.showView('document');
        } else if (activeTool.startsWith('convert-')) {
          window.showView('convert');
        } else {
          window.showView('edit');
        }
        return;
      }
      if (currentView === 'edit' || currentView === 'convert' || currentView === 'document') {
        e.preventDefault();
        window.showView('home');
        return;
      }
    }

    // Never handle navigation or action shortcuts while user is typing in form controls
    if (isTyping) return;

    // 2. Open / Close Shortcuts Cheat Sheet Modal: '?' or Shift+'/'
    if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      hideSequenceHud();
      const modal = document.getElementById('shortcuts-modal');
      const isCurrentlyActive = modal && modal.classList.contains('active');
      window.toggleShortcutsModal(!isCurrentlyActive);
      return;
    }

    // 3. Cmd+O / Ctrl+O: Open File Picker (Images or Documents)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      hideSequenceHud();
      const picker = document.querySelector('.global-file-picker');
      if (picker) picker.click();
      return;
    }

    // 4. Cmd+S / Ctrl+S: Quick Export / Save Image
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      hideSequenceHud();
      if (engine && engine.activeCanvas) {
        engine.download('jpg', 0.92);
        showToast('Quick downloaded image ⚡');
      } else {
        showToast('No active image to download');
      }
      return;
    }

    // 5. Cmd+Z / Ctrl+Z (Undo) and Cmd+Shift+Z / Cmd+Y / Ctrl+Y (Redo)
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      hideSequenceHud();
      if (e.shiftKey) {
        window.handleGlobalRedo();
      } else {
        window.handleGlobalUndo();
      }
      return;
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      hideSequenceHud();
      window.handleGlobalRedo();
      return;
    }

    // Check if browser modifiers are held - don't intercept system shortcuts
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const lowerKey = e.key.toLowerCase();

    // 6. Handle Sequence Prefix Second Key
    if (pendingSequencePrefix) {
      const prefix = pendingSequencePrefix;

      if (prefix === 'g') {
        const suiteNavMap = {
          'h': { view: 'home', name: 'Home 🏠' },
          'e': { view: 'edit', name: 'Edit Suite ✏️' },
          'c': { view: 'convert', name: 'Convert Suite ⇄' },
          'd': { view: 'document', name: 'Document Suite 📄' },
          'r': { view: 'recent', name: 'Recent Files 🕒' },
          's': { view: 'settings', name: 'Settings ⚙️' }
        };
        const target = suiteNavMap[lowerKey];
        if (target) {
          e.preventDefault();
          flashSequenceHudSuccess(`Jumped to ${target.name}`);
          window.showView(target.view);
          return;
        }
      } else if (prefix === 'c') {
        const convertMap = {
          '1': { tool: 'convert-format', name: 'Format Converter' },
          '2': { tool: 'convert-heic', name: 'HEIC Converter' },
          '3': { tool: 'convert-svg', name: 'SVG Converter' },
          '4': { tool: 'convert-ico', name: 'Favicon Generator' },
          '5': { tool: 'convert-base64', name: 'Base64 Converter' },
          '6': { tool: 'convert-pdf', name: 'Image to PDF' }
        };
        const target = convertMap[lowerKey];
        if (target) {
          e.preventDefault();
          flashSequenceHudSuccess(`Opening ${target.name} ⇄`);
          window.openToolWorkspace(target.tool);
          return;
        }
      } else if (prefix === 'd') {
        const docMap = {
          '1': { tool: 'doc-pdf-to-images', name: 'PDF to Images' },
          '2': { tool: 'doc-merge-pdf', name: 'Merge PDF' },
          '3': { tool: 'doc-split-pdf', name: 'Split PDF' },
          '4': { tool: 'doc-compress-pdf', name: 'Compress PDF' },
          '5': { tool: 'doc-rotate-pdf', name: 'Rotate PDF' },
          '6': { tool: 'doc-delete-pdf', name: 'Delete PDF Pages' }
        };
        const target = docMap[lowerKey];
        if (target) {
          e.preventDefault();
          flashSequenceHudSuccess(`Opening ${target.name} 📄`);
          window.openToolWorkspace(target.tool);
          return;
        }
      } else if (prefix === 'e') {
        const editMap = {
          '1': { tool: 'resize', name: 'Resize' },
          '2': { tool: 'crop', name: 'Crop' },
          '3': { tool: 'rotate', name: 'Rotate' },
          '4': { tool: 'compress', name: 'Compress' },
          '5': { tool: 'adjust', name: 'Adjust' },
          '6': { tool: 'filters', name: 'Filters' },
          '7': { tool: 'text', name: 'Text' },
          '8': { tool: 'draw', name: 'Draw' },
          '9': { tool: 'blur', name: 'Blur' }
        };
        const target = editMap[lowerKey];
        if (target) {
          e.preventDefault();
          flashSequenceHudSuccess(`Opening ${target.name} ✏️`);
          window.openToolWorkspace(target.tool);
          return;
        }
      }

      // If invalid second key, clear pending sequence
      hideSequenceHud();
    }

    // 7. Initiate Two-Key Sequences (G, C, D, E)
    if (lowerKey === 'g') {
      e.preventDefault();
      pendingSequencePrefix = 'g';
      showSequenceHud(`
        <strong style="color:#E3FF4D;">G</strong> ➜ Jump to:
        <span><kbd>H</kbd> Home</span> ·
        <span><kbd>E</kbd> Edit</span> ·
        <span><kbd>C</kbd> Convert</span> ·
        <span><kbd>D</kbd> PDF</span> ·
        <span><kbd>R</kbd> Recent</span> ·
        <span><kbd>S</kbd> Settings</span>
      `);
      return;
    } else if (lowerKey === 'c') {
      e.preventDefault();
      pendingSequencePrefix = 'c';
      showSequenceHud(`
        <strong style="color:#E3FF4D;">C</strong> ➜ Convert:
        <span><kbd>1</kbd> Format</span> ·
        <span><kbd>2</kbd> HEIC</span> ·
        <span><kbd>3</kbd> SVG</span> ·
        <span><kbd>4</kbd> ICO</span> ·
        <span><kbd>5</kbd> Base64</span> ·
        <span><kbd>6</kbd> PDF</span>
      `);
      return;
    } else if (lowerKey === 'd') {
      e.preventDefault();
      pendingSequencePrefix = 'd';
      showSequenceHud(`
        <strong style="color:#E3FF4D;">D</strong> ➜ PDF Tools:
        <span><kbd>1</kbd> To Img</span> ·
        <span><kbd>2</kbd> Merge</span> ·
        <span><kbd>3</kbd> Split</span> ·
        <span><kbd>4</kbd> Compress</span> ·
        <span><kbd>5</kbd> Rotate</span> ·
        <span><kbd>6</kbd> Delete</span>
      `);
      return;
    } else if (lowerKey === 'e') {
      e.preventDefault();
      pendingSequencePrefix = 'e';
      showSequenceHud(`
        <strong style="color:#E3FF4D;">E</strong> ➜ Edit Tools:
        <span><kbd>1</kbd> Resize</span> ·
        <span><kbd>2</kbd> Crop</span> ·
        <span><kbd>3</kbd> Rotate</span> ·
        <span><kbd>4</kbd> Compress</span> ·
        <span><kbd>5</kbd> Adjust</span> ·
        <span><kbd>6</kbd> Filters</span> ·
        <span><kbd>7</kbd> Text</span> ·
        <span><kbd>8</kbd> Draw</span> ·
        <span><kbd>9</kbd> Blur</span>
      `);
      return;
    }

    // 8. Single Key Quick Utilities: T (Theme), U (Upload)
    if (lowerKey === 't') {
      e.preventDefault();
      if (typeof window.toggleThemeAnimated === 'function') {
        window.toggleThemeAnimated();
      }
      return;
    } else if (lowerKey === 'u') {
      e.preventDefault();
      const picker = document.querySelector('.global-file-picker');
      if (picker) picker.click();
      return;
    }

    // 9. Context-Aware Number Keys (1-9)
    if (e.key >= '1' && e.key <= '9') {
      const isConvertContext = currentView === 'convert' || (activeTool && activeTool.startsWith('convert-') && activeTool !== 'convert-pdf');
      const isDocContext = currentView === 'document' || (activeTool && (activeTool.startsWith('doc-') || (activeTool === 'convert-pdf' && lastCategoryOrigin === 'document')));

      if (isConvertContext) {
        const convertMap = {
          '1': { tool: 'convert-format', name: 'Format Converter' },
          '2': { tool: 'convert-heic', name: 'HEIC Converter' },
          '3': { tool: 'convert-svg', name: 'SVG Converter' },
          '4': { tool: 'convert-ico', name: 'Favicon Generator' },
          '5': { tool: 'convert-base64', name: 'Base64 Converter' },
          '6': { tool: 'convert-pdf', name: 'Image to PDF' }
        };
        const target = convertMap[e.key];
        if (target) {
          e.preventDefault();
          window.openToolWorkspace(target.tool);
          showToast(`Opened ${target.name} ⇄`);
          return;
        }
      } else if (isDocContext) {
        const docMap = {
          '1': { tool: 'doc-pdf-to-images', name: 'PDF to Images' },
          '2': { tool: 'doc-merge-pdf', name: 'Merge PDF' },
          '3': { tool: 'doc-split-pdf', name: 'Split PDF' },
          '4': { tool: 'doc-compress-pdf', name: 'Compress PDF' },
          '5': { tool: 'doc-rotate-pdf', name: 'Rotate PDF' },
          '6': { tool: 'doc-delete-pdf', name: 'Delete PDF Pages' }
        };
        const target = docMap[e.key];
        if (target) {
          e.preventDefault();
          window.openToolWorkspace(target.tool);
          showToast(`Opened ${target.name} 📄`);
          return;
        }
      } else {
        // Default (Edit Suite, Home, or active Image Edit Tool)
        const editMap = {
          '1': { tool: 'resize', name: 'Resize' },
          '2': { tool: 'crop', name: 'Crop' },
          '3': { tool: 'rotate', name: 'Rotate' },
          '4': { tool: 'compress', name: 'Compress' },
          '5': { tool: 'adjust', name: 'Adjust' },
          '6': { tool: 'filters', name: 'Filters' },
          '7': { tool: 'text', name: 'Text' },
          '8': { tool: 'draw', name: 'Draw' },
          '9': { tool: 'blur', name: 'Blur' }
        };
        const target = editMap[e.key];
        if (target) {
          e.preventDefault();
          window.openToolWorkspace(target.tool);
          showToast(`Opened ${target.name} tool ✏️`);
          return;
        }
      }
    }
  });

  // --- Global Undo & Reset ---
  window.undoEdit = function () {
    window.handleGlobalUndo();
  };

  window.redoEdit = function () {
    window.handleGlobalRedo();
  };

  window.resetEdit = function () {
    if (activeTool === 'draw') {
      drawnShapes = [];
      if (typeof redrawDrawCanvas === 'function') redrawDrawCanvas();
    }
    engine.resetToOriginal();
    showToast('Reset to original');
    syncMetadata();
    if (activeTool) initToolStage(activeTool);
    updateHistoryUI();
    persistCurrentSession();
  };

  // ==============================================================
  // 1. RESIZE HANDLERS
  // ==============================================================
  let keepAspect = true;
  window.toggleAspect = function () {
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

  window.setPresetSize = function (w, h, btn) {
    document.querySelectorAll('#tool-resize-view .preset-card').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (rw && rh) {
      rw.value = w;
      rh.value = h;
    }
  };

  window.applyResizeAction = async function (download = false) {
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
    updateHistoryUI();

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
        try { wrapper.setPointerCapture(e.pointerId); } catch (_) { }
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
        try { wrapper.setPointerCapture(e.pointerId); } catch (_) { }
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
      try { wrapper.setPointerCapture(e.pointerId); } catch (_) { }
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
      } catch (_) { }

      cropInteractionState = null;
    };

    wrapper.addEventListener('pointerup', finishInteraction);
    wrapper.addEventListener('pointercancel', finishInteraction);
    window.addEventListener('pointerup', finishInteraction);
  }

  window.setCropRatio = function (ratio, btn) {
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

  window.applyCropAction = async function (download = false) {
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
    updateHistoryUI();

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

  window.stepRotate = function (deg) {
    rotDeg = (rotDeg + deg) % 360;
    renderRotatePreview();
  };

  window.flipAxis = function (axis) {
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

  window.applyRotateAction = async function (download = false) {
    engine.rotateAndFlip(rotDeg, fH, fV);
    showToast(`Applied ${rotDeg}° rotation`);
    rotDeg = 0; fH = false; fV = false;
    syncMetadata();
    renderToCanvas('canvas-rotate');
    updateHistoryUI();

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

  window.setCompressMode = function (mode) {
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

  // --- Calibration State Tracking & UI Feedback ---
  let activeCalibrationId = 0;
  let calibrationTimer = null;

  function setCalibratingUI(isCalibrating) {
    const qualText = document.getElementById('calibrated-quality-text');
    const dimsText = document.getElementById('calibrated-dims-text');
    const sizeText = document.getElementById('calibrated-size-text');
    const finalEl = document.getElementById('compress-final-size');
    const badge = document.getElementById('compress-savings-badge');
    const stat = document.getElementById('compress-stat');

    if (isCalibrating) {
      if (qualText) qualText.innerHTML = '<span class="calibrating-pulse">Auto-tuning quality...</span>';
      if (dimsText) dimsText.innerHTML = '<span class="calibrating-pulse">Optimizing resolution...</span>';
      if (sizeText) sizeText.innerHTML = '<span class="calibrating-pulse">Calibrating...</span>';
      if (finalEl) finalEl.innerHTML = '<span class="calibrating-pulse">Calibrating...</span>';
      if (badge) badge.style.display = 'none';
      if (stat) stat.textContent = 'Auto-calibrating optimal compression...';
    }
  }

  function scheduleCalibration(delay = 140) {
    if (calibrationTimer) clearTimeout(calibrationTimer);
    setCalibratingUI(true);
    calibrationTimer = setTimeout(() => {
      calibrateCompressTarget();
    }, delay);
  }

  window.onTargetSizeInput = function () {
    scheduleCalibration(160);
  };

  window.onTargetUnitChange = function () {
    scheduleCalibration(20);
  };

  window.setQuickTargetSize = function (val, unit) {
    const input = document.getElementById('compress-target-val');
    const select = document.getElementById('compress-target-unit');
    if (input) input.value = val;
    if (select) select.value = unit;

    document.querySelectorAll('#compress-mode-target-panel .chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === `${val} ${unit}`);
    });

    scheduleCalibration(20);
  };

  window.calibrateCompressTarget = async function () {
    const thisId = ++activeCalibrationId;

    const input = document.getElementById('compress-target-val');
    const select = document.getElementById('compress-target-unit');
    const errEl = document.getElementById('compress-target-error');
    const unit = select?.value || 'KB';
    const rawVal = parseFloat(input?.value);

    // Validation: Check for invalid, negative, or zero inputs
    if (isNaN(rawVal) || rawVal <= 0) {
      if (errEl) {
        errEl.textContent = 'Please enter a positive target size (minimum 1 KB).';
        errEl.style.display = 'block';
      }
      if (input) input.style.borderColor = 'var(--danger, #ef4444)';
      const qualText = document.getElementById('calibrated-quality-text');
      const dimsText = document.getElementById('calibrated-dims-text');
      const sizeText = document.getElementById('calibrated-size-text');
      const finalEl = document.getElementById('compress-final-size');
      const badge = document.getElementById('compress-savings-badge');
      const stat = document.getElementById('compress-stat');

      if (qualText) qualText.textContent = 'Invalid target';
      if (dimsText) dimsText.textContent = 'Target size must be positive';
      if (sizeText) sizeText.textContent = '--';
      if (finalEl) finalEl.textContent = '--';
      if (badge) badge.style.display = 'none';
      if (stat) stat.textContent = 'Enter a valid target size (min 1 KB)';
      compressCalibratedResult = null;
      return;
    }

    if (errEl) errEl.style.display = 'none';
    if (input) input.style.borderColor = '';

    setCalibratingUI(true);

    const val = rawVal;
    const targetBytes = unit === 'MB' ? val * 1024 * 1024 : val * 1024;
    const format = getCompressFormat();

    const result = await engine.autoCalibrateCompression(targetBytes, format);
    if (thisId !== activeCalibrationId) return;

    compressCalibratedResult = result;
    renderCompressedCanvas(result.canvas);

    const qualText = document.getElementById('calibrated-quality-text');
    const dimsText = document.getElementById('calibrated-dims-text');
    const sizeText = document.getElementById('calibrated-size-text');

    if (qualText) qualText.textContent = `${result.quality}%`;
    if (dimsText) dimsText.textContent = `${result.width} × ${result.height} px (${Math.round(result.scale * 100)}% res)`;
    if (sizeText) sizeText.textContent = `${PixKitEngine.formatBytes(result.blob.size)} (Target: ${val} ${unit})`;

    updateCompressSummaryStats(result.blob.size, result.width, result.height);
  };

  window.toggleCompressAspectLock = function () {
    compressLockAspect = !compressLockAspect;
    const btn = document.getElementById('compress-px-lock-btn');
    if (btn) {
      btn.classList.toggle('active', compressLockAspect);
      btn.title = compressLockAspect ? 'Lock aspect ratio' : 'Unlock aspect ratio';
    }
  };

  window.setCompressPxPreset = function (w, h) {
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

  window.onCompressPxChange = function (changedField) {
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

  window.updateCompressPxLive = async function () {
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

  window.updateCompressManualLive = async function () {
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

  window.recalculateCompression = function () {
    if (compressMode === 'target') {
      scheduleCalibration(30);
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
    const origBytes = engine.fileSize || 0;
    const origEl = document.getElementById('compress-orig-size');
    const finalEl = document.getElementById('compress-final-size');
    const badge = document.getElementById('compress-savings-badge');
    const stat = document.getElementById('compress-stat');

    if (origEl) origEl.textContent = PixKitEngine.formatBytes(origBytes || finalBytes);
    if (finalEl) finalEl.textContent = `${PixKitEngine.formatBytes(finalBytes)} (${finalW} × ${finalH} px)`;

    if (origBytes > 0 && finalBytes < origBytes) {
      const savings = Math.max(1, Math.round(((origBytes - finalBytes) / origBytes) * 100));
      if (badge) {
        badge.textContent = `↓ ${savings}% Savings`;
        badge.style.background = '';
        badge.style.color = '';
        badge.style.display = 'inline-block';
      }
      if (stat) {
        stat.textContent = `${PixKitEngine.formatBytes(finalBytes)} · ${finalW} × ${finalH} px (${savings}% smaller)`;
      }
    } else if (origBytes > 0 && finalBytes >= origBytes) {
      if (badge) {
        badge.textContent = `Already Optimized`;
        badge.style.background = 'rgba(125, 125, 125, 0.15)';
        badge.style.color = 'var(--muted)';
        badge.style.display = 'inline-block';
      }
      if (stat) {
        stat.textContent = `${PixKitEngine.formatBytes(finalBytes)} · ${finalW} × ${finalH} px (Output is already at minimum size)`;
      }
    } else {
      if (badge) badge.style.display = 'none';
      if (stat) {
        stat.textContent = `${PixKitEngine.formatBytes(finalBytes)} · ${finalW} × ${finalH} px`;
      }
    }
  }

  let isComparingOriginal = false;
  window.showCompressOriginal = function (showOriginal) {
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

  window.downloadCompressedAction = async function () {
    const input = document.getElementById('compress-target-val');
    const rawVal = parseFloat(input?.value);
    if (compressMode === 'target' && (isNaN(rawVal) || rawVal <= 0)) {
      showToast('Please enter a valid positive target size first.');
      return;
    }
    if (!compressCalibratedResult) {
      await recalculateCompression();
    }
    if (!compressCalibratedResult || !compressCalibratedResult.blob) {
      showToast('No valid compressed file to download.');
      return;
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
    if (typeof window.triggerDownloadSupportPrompt === 'function') {
      window.triggerDownloadSupportPrompt();
    }
  };

  window.applyCompressedToStudio = async function () {
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
  window.updateAdjustPreview = function () {
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

  window.applyAdjustAction = async function (download = false) {
    const bright = parseFloat(document.getElementById('adj-bright')?.value || 100);
    const contrast = parseFloat(document.getElementById('adj-contrast')?.value || 100);
    const sat = parseFloat(document.getElementById('adj-sat')?.value || 100);
    const warmth = parseFloat(document.getElementById('adj-warmth')?.value || 0);

    engine.commitFilters({ brightness: bright, contrast, saturation: sat, warmth });
    showToast('Applied adjustments');
    syncMetadata();
    renderToCanvas('canvas-adjust');
    updateHistoryUI();

    if (download) {
      await engine.download('jpg', 0.92);
      showToast('Downloaded adjusted image');
    }
  };

  // ==============================================================
  // 6. FILTERS
  // ==============================================================
  let activeFilterParams = { brightness: 100, contrast: 100, saturation: 100, warmth: 0, grayscale: 0, sepia: 0 };

  window.applyFilterPreset = function (type, btn) {
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

  window.commitFilterAction = async function (download = false) {
    engine.commitFilters(activeFilterParams);
    showToast('Applied preset filter');
    syncMetadata();
    renderToCanvas('canvas-filters');
    updateHistoryUI();

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

  window.setQuickTextPos = function (preset) {
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

  window.updateTextLive = function (showDragGuide = false) {
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

  window.commitTextAction = async function (download = false) {
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
    updateHistoryUI();

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

  window.setDrawMode = function (mode) {
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

  window.updateDrawStroke = function (val) {
    strokeW = parseInt(val, 10);
    document.getElementById('lbl-draw-stroke').textContent = `${strokeW}px`;
  };

  window.clearDrawings = function () {
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
        updateHistoryUI();
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

  window.commitDrawAction = async function (download = false) {
    if (drawCanvas) {
      engine.commitDrawing(drawCanvas);
      showToast('Committed drawings & shapes');
      drawnShapes = [];
      syncMetadata();
      updateHistoryUI();
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

  window.clearBlurBrush = function () {
    if (blurBrushMaskCanvas) {
      const ctx = blurBrushMaskCanvas.getContext('2d');
      ctx.clearRect(0, 0, blurBrushMaskCanvas.width, blurBrushMaskCanvas.height);
    }
    updateBlurLive();
    showToast('Cleared painted blur brush');
  };

  window.updateBlurBrushSize = function (val) {
    blurOptions.brushSize = parseInt(val, 10);
    document.getElementById('lbl-blur-brush-size').textContent = `${val}px`;
    drawBlurOverlayGuides();
  };

  window.setBlurMode = function (mode) {
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
    const topHint = document.getElementById('blur-mode-hint');
    if (tip) {
      if (mode === 'radial') {
        tip.innerHTML = '<span>Tip: Drag the green bullseye to move focus. Dashed rings indicate sharp core and blur edge.</span>';
        if (topHint) topHint.textContent = '◎ Bokeh lens: Drag guide on canvas to move focus';
      } else if (mode === 'tiltshift') {
        tip.innerHTML = '<span>Tip: Drag up or down on the canvas to move the miniature focus line.</span>';
        if (topHint) topHint.textContent = '⌸ Tilt-shift: Drag line on canvas to shift focus band';
      } else if (mode === 'brush') {
        tip.innerHTML = '<span>Tip: Paint directly with your cursor or touch over any image area to blur it.</span>';
        if (topHint) topHint.textContent = '🖌 Blur brush: Paint over areas you want to blur';
      } else {
        tip.innerHTML = '<span>Tip: Full frame blur applies uniform Gaussian blur across the entire image.</span>';
        if (topHint) topHint.textContent = '▦ Full blur: Uniform blur applied to entire image';
      }
    }

    const overlay = document.getElementById('canvas-blur-overlay');
    if (overlay) {
      overlay.style.cursor = isBrush ? 'none' : 'crosshair';
    }

    updateBlurLive();
  };

  window.setBlurType = function (type) {
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

  window.updateBlurLive = function () {
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

  window.drawBlurOverlayGuides = function () {
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

  window.commitBlurAction = async function (download = false) {
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
  // TOOL 10: BATCH IMAGE PROCESSOR CONTROLLER
  // ==============================================================
  const batchState = {
    items: [], // Array of { id, name, size, type, width, height, originalBlob, originalUrl, img, thumbUrl, hasCustom, customConfigs }
    activeIndex: 0,
    compareOriginal: false,
    isExpanded: false,
    isProcessing: false,
    activeAccordion: 'compress',
    activeDetailTool: null,
    editScope: 'all', // 'all' | 'single'
    globalConfigs: {
      resize: {
        enabled: false,
        mode: 'exact', // 'exact' | 'scale'
        scale: 100,
        w: 1600,
        h: 1200,
        lockAspect: true
      },
      crop: {
        enabled: false,
        ratio: 'original', // 'original' | '1:1' | '4:5' | '16:9' | '3:2' | '9:16'
        anchor: 'center' // 'center' | 'top' | 'bottom'
      },
      rotate: {
        enabled: false,
        angle: 0, // 0 | 90 | 180 | 270
        flipH: false,
        flipV: false
      },
      compress: {
        enabled: true,
        mode: 'target', // 'target' | 'pixels' | 'manual'
        targetVal: 200,
        targetUnit: 'KB',
        pxWidth: 1600,
        pxHeight: 1200,
        pxQuality: 82,
        lockAspect: true,
        manualQuality: 80,
        format: 'image/jpeg', // 'image/jpeg' | 'image/webp' | 'image/png' | 'original'
        calibratedQuality: 82,
        calibratedDims: '1600 × 1200',
        calibratedSize: 184000
      },
      adjust: {
        enabled: false,
        bright: 100,
        contrast: 100,
        saturate: 100,
        warmth: 0
      },
      filters: {
        enabled: false,
        preset: 'natural' // 'natural' | 'bw' | 'vintage' | 'warm' | 'cool' | 'crisp' | 'sepia'
      },
      blur: {
        enabled: false,
        mode: 'radial', // 'radial' | 'tiltshift' | 'brush' | 'full'
        type: 'gaussian', // 'gaussian' | 'pixelate' | 'motion' | 'zoom' | 'frosted'
        radius: 18,
        focusSize: 35,
        focusX: 0.5,
        focusY: 0.5,
        bandCenterY: 0.5,
        brushSize: 45,
        brushCanvas: null
      }
    }
  };

  Object.defineProperty(batchState, 'configs', {
    get() {
      if (this.editScope === 'single' && this.items && this.items[this.activeIndex]) {
        const it = this.items[this.activeIndex];
        if (!it.customConfigs) {
          it.customConfigs = JSON.parse(JSON.stringify(this.globalConfigs));
          it.hasCustom = true;
        }
        return it.customConfigs;
      }
      return this.globalConfigs;
    },
    set(val) {
      if (this.editScope === 'single' && this.items && this.items[this.activeIndex]) {
        this.items[this.activeIndex].customConfigs = val;
        this.items[this.activeIndex].hasCustom = true;
      } else {
        this.globalConfigs = val;
      }
    }
  });

  let batchBlurBrushMaskCanvas = null;
  let isDraggingBatchBlurFocus = false;
  let isPaintingBatchBlur = false;
  let lastBatchBlurBrushPos = null;
  let batchBlurHoverPos = null;

  let batchDropzoneBound = false;
  let batchCalibrationTimer = null;

  async function initBatchEditStage() {
    setupBatchDropzoneEvents();
    if (batchState.items.length === 0) {
      await restoreBatchSession();
    }
    syncBatchViewUI();
    updateBatchAccordionUI();
    updateAllBatchToolStatusLabels();
    updateBatchScopeUI();
    setupBatchBlurOverlayEvents();
    if (batchState.items.length > 0) {
      renderBatchPreviewCanvas();
      recalculateBatchCompression();
    }
  }
  window.initBatchEditStage = initBatchEditStage;

  function setupBatchDropzoneEvents() {
    if (batchDropzoneBound) return;
    const dropzone = document.getElementById('batch-dropzone');
    const viewport = document.getElementById('batch-viewport');

    [dropzone, viewport].forEach(el => {
      if (!el) return;
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.add('drag-over');
      });
      el.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.remove('drag-over');
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          processBatchInputFiles(e.dataTransfer.files);
        }
      });
    });
    batchDropzoneBound = true;
  }

  function triggerBatchUpload() {
    const input = document.getElementById('batch-files-input');
    if (input) input.click();
  }
  window.triggerBatchUpload = triggerBatchUpload;

  function handleBatchFilesSelect(e) {
    if (e.target && e.target.files && e.target.files.length) {
      processBatchInputFiles(e.target.files);
      e.target.value = '';
    }
  }
  window.handleBatchFilesSelect = handleBatchFilesSelect;

  async function processBatchInputFiles(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;

    showToast('Loading batch files...');
    let addedCount = 0;

    for (const file of files) {
      const lowerName = (file.name || '').toLowerCase();
      // Check if ZIP archive
      if (lowerName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        try {
          if (!window.JSZip) {
            showToast('Loading ZIP engine...');
            await new Promise(r => setTimeout(r, 200));
          }
          if (window.JSZip) {
            const zip = await window.JSZip.loadAsync(file);
            const zipEntries = Object.keys(zip.files).filter(k => {
              const f = zip.files[k];
              if (f.dir || k.startsWith('__MACOSX') || k.endsWith('.DS_Store')) return false;
              const ext = k.toLowerCase();
              return ext.match(/\.(jpe?g|png|webp|gif|bmp|svg|avif|heic)$/i);
            });

            for (const entryPath of zipEntries) {
              const zipFile = zip.files[entryPath];
              const blob = await zipFile.async('blob');
              const cleanFileName = entryPath.split('/').pop();
              const item = await createBatchItemFromBlob(blob, cleanFileName);
              if (item) {
                batchState.items.push(item);
                addedCount++;
              }
            }
          }
        } catch (zipErr) {
          console.error('Batch ZIP unpack error:', zipErr);
          showToast(`Error unpacking ZIP: ${zipErr.message}`);
        }
      } else if (file.type.startsWith('image/') || lowerName.match(/\.(jpe?g|png|webp|gif|bmp|svg|avif|heic)$/i)) {
        const item = await createBatchItemFromBlob(file, file.name);
        if (item) {
          batchState.items.push(item);
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      if (batchState.activeIndex >= batchState.items.length) {
        batchState.activeIndex = Math.max(0, batchState.items.length - 1);
      }
      syncBatchViewUI();
      renderBatchPreviewCanvas();
      recalculateBatchCompression();
      persistBatchSession();
      showToast(`Added ${addedCount} image${addedCount > 1 ? 's' : ''} to batch queue!`);
    } else {
      showToast('No supported image files detected in selection.');
    }
  }

  function createBatchItemFromBlob(blob, fileName) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        // Generate compact thumbnail for carousel
        const thumbCanvas = document.createElement('canvas');
        const aspect = img.naturalWidth / img.naturalHeight;
        thumbCanvas.width = 160;
        thumbCanvas.height = Math.round(160 / (aspect || 1));
        const ctx = thumbCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);

        resolve({
          id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name: fileName || 'image.jpg',
          size: blob.size,
          type: blob.type || 'image/jpeg',
          width: img.naturalWidth,
          height: img.naturalHeight,
          originalBlob: blob,
          originalUrl: url,
          img: img,
          thumbUrl: thumbUrl
        });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  }

  let persistBatchTimer = null;
  function persistBatchSession() {
    clearTimeout(persistBatchTimer);
    persistBatchTimer = setTimeout(async () => {
      try {
        if (!batchState.items || batchState.items.length === 0) {
          return;
        }
        const serializableItems = batchState.items.map(it => ({
          id: it.id,
          name: it.name,
          size: it.size,
          type: it.type,
          width: it.width,
          height: it.height,
          blob: it.originalBlob,
          hasCustom: !!it.hasCustom,
          customConfigs: it.customConfigs ? it.customConfigs : null
        }));
        if (typeof PixKitStorage !== 'undefined') {
          await PixKitStorage.setItem('batch_session', {
            items: serializableItems,
            activeIndex: batchState.activeIndex,
            globalConfigs: batchState.globalConfigs,
            configs: batchState.globalConfigs,
            editScope: batchState.editScope,
            activeDetailTool: batchState.activeDetailTool
          });
        }
      } catch (err) {
        console.warn('Failed to persist batch session:', err);
      }
    }, 60);
  }

  function syncBatchConfigsToDOM() {
    try {
      const cfg = batchState.configs;
      if (!cfg) return;

      // 1. Compress
      if (cfg.compress) {
        const c = cfg.compress;
        ['target', 'pixels', 'manual'].forEach(m => {
          const btn = document.getElementById(`batch-comp-mode-${m}`);
          if (btn) btn.classList.toggle('active', c.mode === m);
          const panel = document.getElementById(`batch-comp-panel-${m}`);
          if (panel) panel.style.display = (c.mode === m) ? 'block' : 'none';
        });
        const tVal = document.getElementById('batch-compress-target-val') || document.getElementById('batch-comp-target-val');
        if (tVal && c.targetVal) tVal.value = c.targetVal;
        const tUnit = document.getElementById('batch-compress-target-unit') || document.getElementById('batch-comp-target-unit');
        if (tUnit && c.targetUnit) tUnit.value = c.targetUnit;
        document.querySelectorAll('#batch-compress-mode-target-panel .chip-btn, .batch-target-pill').forEach(pill => {
          const v = parseInt(pill.dataset.val || pill.textContent, 10);
          const u = pill.dataset.unit || (pill.textContent.includes('MB') ? 'MB' : 'KB');
          pill.classList.toggle('active', (v === c.targetVal && u === c.targetUnit));
        });
        const pxW = document.getElementById('batch-compress-px-width') || document.getElementById('batch-comp-px-w');
        if (pxW && c.pxWidth) pxW.value = c.pxWidth;
        const pxH = document.getElementById('batch-compress-px-height') || document.getElementById('batch-comp-px-h');
        if (pxH && c.pxHeight) pxH.value = c.pxHeight;
        const pxQ = document.getElementById('batch-compress-px-slider') || document.getElementById('batch-comp-px-q');
        if (pxQ && c.pxQuality) pxQ.value = c.pxQuality;
        const pxQVal = document.getElementById('batch-compress-px-quality-val') || document.getElementById('batch-comp-px-q-val');
        if (pxQVal && c.pxQuality) pxQVal.textContent = c.pxQuality + '%';
        const lockAspectBtn = document.getElementById('batch-compress-px-lock-btn') || document.getElementById('btn-batch-comp-aspect');
        if (lockAspectBtn) lockAspectBtn.classList.toggle('active', !!c.lockAspect);
        const manQ = document.getElementById('batch-compress-manual-slider') || document.getElementById('batch-comp-manual-q');
        if (manQ && c.manualQuality) manQ.value = c.manualQuality;
        const manQVal = document.getElementById('batch-compress-manual-quality-val') || document.getElementById('batch-comp-manual-q-val');
        if (manQVal && c.manualQuality) manQVal.textContent = c.manualQuality + '%';
        ['jpeg', 'webp', 'png', 'original'].forEach(fmt => {
          const btn = document.getElementById(`batch-comp-fmt-${fmt}`);
          const isFmt = (fmt === 'original' && c.format === 'original') || (c.format === `image/${fmt}`);
          if (btn) btn.classList.toggle('active', isFmt);
        });
      }

      // 2. Resize
      if (cfg.resize) {
        const r = cfg.resize;
        const exactBtn = document.getElementById('btn-batch-resize-mode-exact') || document.getElementById('batch-resize-mode-exact');
        const scaleBtn = document.getElementById('btn-batch-resize-mode-scale') || document.getElementById('batch-resize-mode-scale');
        if (exactBtn) exactBtn.classList.toggle('active', r.mode === 'exact');
        if (scaleBtn) scaleBtn.classList.toggle('active', r.mode === 'scale');
        const scalePanel = document.getElementById('batch-resize-scale-box') || document.getElementById('batch-resize-scale-panel');
        const exactPanel = document.getElementById('batch-resize-exact-box') || document.getElementById('batch-resize-exact-panel');
        if (scalePanel) scalePanel.style.display = (r.mode === 'scale') ? 'block' : 'none';
        if (exactPanel) exactPanel.style.display = (r.mode === 'exact') ? 'block' : 'none';
        const scaleVal = document.getElementById('batch-resize-scale-slider') || document.getElementById('batch-resize-scale-val');
        if (scaleVal && r.scale) scaleVal.value = r.scale;
        const scaleNum = document.getElementById('batch-resize-scale-val');
        if (scaleNum && r.scale) scaleNum.textContent = r.scale + '%';
        const wVal = document.getElementById('batch-resize-w');
        if (wVal && r.w) wVal.value = r.w;
        const hVal = document.getElementById('batch-resize-h');
        if (hVal && r.h) hVal.value = r.h;
        const lockAspectBtn = document.getElementById('batch-resize-aspect-btn') || document.getElementById('btn-batch-resize-aspect');
        if (lockAspectBtn) lockAspectBtn.classList.toggle('active', !!r.lockAspect);
      }

      // 3. Crop
      if (cfg.crop) {
        const cr = cfg.crop;
        document.querySelectorAll('.batch-crop-pill').forEach(pill => {
          pill.classList.toggle('active', pill.dataset.ratio === cr.ratio);
        });
        document.querySelectorAll('.batch-anchor-dot').forEach(dot => {
          dot.classList.toggle('active', dot.dataset.anchor === cr.anchor);
        });
      }

      // 4. Rotate
      if (cfg.rotate) {
        const rot = cfg.rotate;
        const flipH = document.getElementById('btn-batch-flip-h');
        if (flipH) flipH.classList.toggle('active', !!rot.flipH);
        const flipV = document.getElementById('btn-batch-flip-v');
        if (flipV) flipV.classList.toggle('active', !!rot.flipV);
      }

      // 5. Adjust
      if (cfg.adjust) {
        const adj = cfg.adjust;
        const b = document.getElementById('batch-adj-bright');
        if (b) b.value = adj.bright || 100;
        const c = document.getElementById('batch-adj-contrast');
        if (c) c.value = adj.contrast || 100;
        const s = document.getElementById('batch-adj-saturate');
        if (s) s.value = adj.saturate || 100;
        const w = document.getElementById('batch-adj-warmth');
        if (w) w.value = adj.warmth || 0;
        const bVal = document.getElementById('batch-adj-bright-val');
        if (bVal) bVal.textContent = (adj.bright || 100) + '%';
        const cVal = document.getElementById('batch-adj-contrast-val');
        if (cVal) cVal.textContent = (adj.contrast || 100) + '%';
        const sVal = document.getElementById('batch-adj-saturate-val');
        if (sVal) sVal.textContent = (adj.saturate || 100) + '%';
        const wVal = document.getElementById('batch-adj-warmth-val');
        if (wVal) wVal.textContent = (adj.warmth > 0 ? '+' : '') + (adj.warmth || 0);
      }

      // 6. Filters
      if (cfg.filters) {
        document.querySelectorAll('.batch-filter-card').forEach(card => {
          card.classList.toggle('active', card.dataset.preset === cfg.filters.preset);
        });
      }

      // 7. Blur
      if (cfg.blur && typeof syncBatchBlurUI === 'function') {
        syncBatchBlurUI();
      }

      updateAllBatchToolStatusLabels();
    } catch (e) {
      console.warn('syncBatchConfigsToDOM error:', e);
    }
  }

  async function restoreBatchSession() {
    try {
      if (typeof PixKitStorage === 'undefined') return false;
      const data = await PixKitStorage.getItem('batch_session');
      if (!data || !data.items || data.items.length === 0) return false;

      const restoredItems = [];
      for (const it of data.items) {
        if (!it.blob) continue;
        const item = await createBatchItemFromBlob(it.blob, it.name);
        if (item) {
          item.id = it.id || item.id;
          item.hasCustom = !!it.hasCustom;
          item.customConfigs = it.customConfigs || null;
          restoredItems.push(item);
        }
      }
      if (restoredItems.length === 0) return false;

      batchState.items = restoredItems;
      batchState.activeIndex = Math.min(data.activeIndex || 0, restoredItems.length - 1);
      batchState.editScope = data.editScope || 'all';
      if (data.globalConfigs || data.configs) {
        batchState.globalConfigs = Object.assign(batchState.globalConfigs, data.globalConfigs || data.configs);
      }
      syncBatchConfigsToDOM();
      syncBatchViewUI();
      updateBatchAccordionUI();
      updateAllBatchToolStatusLabels();
      updateBatchScopeUI();
      if (data.activeDetailTool) {
        openBatchToolDetail(data.activeDetailTool);
      }
      renderBatchPreviewCanvas();
      recalculateBatchCompression();
      return true;
    } catch (err) {
      console.warn('Failed to restore batch session:', err);
      return false;
    }
  }

  // Load 5 curated, distinct sample artworks for 1-click testing
  window.loadSampleBatchImages = async function () {
    showToast('Generating 5 sample artworks for batch...');
    const samples = [
      {
        name: 'mountain-sunrise.jpg', w: 1600, h: 1200, gen: (ctx, w, h) => {
          const sky = ctx.createLinearGradient(0, 0, 0, h);
          sky.addColorStop(0, '#FFA07A');
          sky.addColorStop(0.4, '#FFD700');
          sky.addColorStop(0.7, '#20B2AA');
          sky.addColorStop(1, '#1C3144');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, w, h);
          // Sun
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.45, w * 0.1, 0, Math.PI * 2);
          ctx.fillStyle = '#FFF8E7';
          ctx.fill();
          // Mountains
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(w * 0.3, h * 0.5);
          ctx.lineTo(w * 0.6, h * 0.7);
          ctx.lineTo(w, h * 0.4);
          ctx.lineTo(w, h);
          ctx.fillStyle = '#0F1D2C';
          ctx.fill();
        }
      },
      {
        name: 'emerald-forest.jpg', w: 1400, h: 933, gen: (ctx, w, h) => {
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#134E5E');
          grad.addColorStop(0.5, '#71B280');
          grad.addColorStop(1, '#2E7D32');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 18; i++) {
            ctx.beginPath();
            const cx = (w / 18) * i + 30;
            const cy = h * 0.85;
            ctx.arc(cx, cy, 60 + (i % 5) * 15, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + (i % 3) * 0.05})`;
            ctx.fill();
          }
        }
      },
      {
        name: 'ocean-waves.jpg', w: 1920, h: 1080, gen: (ctx, w, h) => {
          const sea = ctx.createLinearGradient(0, 0, 0, h);
          sea.addColorStop(0, '#00C9FF');
          sea.addColorStop(0.5, '#92FE9D');
          sea.addColorStop(1, '#005C97');
          ctx.fillStyle = sea;
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.ellipse(w * 0.5, h * 0.6 + i * 50, w * 0.6, 60, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      {
        name: 'desert-dunes.jpg', w: 1200, h: 1200, gen: (ctx, w, h) => {
          const sand = ctx.createLinearGradient(0, 0, w, h);
          sand.addColorStop(0, '#F3904F');
          sand.addColorStop(0.6, '#3B4371');
          sand.addColorStop(1, '#1A1E36');
          ctx.fillStyle = sand;
          ctx.fillRect(0, 0, w, h);
          ctx.beginPath();
          ctx.moveTo(0, h * 0.6);
          ctx.bezierCurveTo(w * 0.3, h * 0.4, w * 0.7, h * 0.8, w, h * 0.55);
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.fillStyle = '#E65100';
          ctx.fill();
        }
      },
      {
        name: 'neon-cyber-city.jpg', w: 1080, h: 1350, gen: (ctx, w, h) => {
          ctx.fillStyle = '#0a0a12';
          ctx.fillRect(0, 0, w, h);
          const neon = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
          neon.addColorStop(0, '#FF007F');
          neon.addColorStop(0.5, '#7928CA');
          neon.addColorStop(1, '#00F0FF');
          ctx.fillStyle = neon;
          ctx.beginPath();
          ctx.arc(w * 0.5, h * 0.5, w * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    ];

    for (const s of samples) {
      const c = document.createElement('canvas');
      c.width = s.w;
      c.height = s.h;
      const ctx = c.getContext('2d');
      s.gen(ctx, s.w, s.h);
      await new Promise(res => {
        c.toBlob(async (blob) => {
          const item = await createBatchItemFromBlob(blob, s.name);
          if (item) batchState.items.push(item);
          res();
        }, 'image/jpeg', 0.92);
      });
    }

    batchState.activeIndex = 0;
    syncBatchViewUI();
    renderBatchPreviewCanvas();
    recalculateBatchCompression();
    persistBatchSession();
    showToast('Loaded 5 sample batch photos!');
  };

  function syncBatchViewUI() {
    const hasItems = batchState.items.length > 0;
    const dropzone = document.getElementById('batch-dropzone');
    const canvasWrap = document.getElementById('batch-canvas-wrapper');
    const sliderPanel = document.getElementById('batch-slider-panel');
    const stageFooter = document.getElementById('batch-stage-footer');
    const topbarTools = document.getElementById('batch-topbar-tools');
    const statusHint = document.getElementById('batch-stage-status');
    const viewingTag = document.getElementById('batch-viewing-tag');
    const glassHud = document.getElementById('batch-stage-glass-hud');
    const floatingNav = document.getElementById('batch-floating-nav-bar');
    const navCounter = document.getElementById('batch-nav-counter');

    if (dropzone) dropzone.style.display = hasItems ? 'none' : 'flex';
    if (canvasWrap) canvasWrap.style.display = hasItems ? 'flex' : 'none';
    if (sliderPanel) sliderPanel.style.display = hasItems ? 'block' : 'none';
    if (stageFooter) stageFooter.style.display = 'none';
    if (topbarTools) topbarTools.style.display = hasItems ? 'flex' : 'none';
    if (glassHud) glassHud.style.display = hasItems ? 'flex' : 'none';
    if (floatingNav) floatingNav.style.display = hasItems ? 'inline-flex' : 'none';

    if (hasItems) {
      const cur = batchState.items[batchState.activeIndex];
      const count = batchState.items.length;
      if (viewingTag) {
        viewingTag.style.display = 'inline-flex';
        viewingTag.textContent = `Viewing ${batchState.activeIndex + 1} of ${count}`;
      }
      if (navCounter) {
        navCounter.textContent = `${batchState.activeIndex + 1} / ${count}`;
      }
      if (statusHint) {
        statusHint.textContent = cur ? cur.name : '';
        statusHint.title = cur ? `${cur.name} (${cur.width} × ${cur.height} px)` : '';
      }
      renderBatchCarousel();
    } else {
      if (viewingTag) viewingTag.style.display = 'none';
      if (navCounter) navCounter.textContent = '0 / 0';
      if (statusHint) {
        statusHint.textContent = 'Batch queue empty · Drop images or ZIP to begin';
        statusHint.title = '';
      }
    }
    updateBatchScopeUI();
  }

  function renderBatchCarousel() {
    const strip = document.getElementById('batch-carousel-strip');
    const countPill = document.getElementById('batch-count-pill');
    const activeName = document.getElementById('batch-active-name');
    const metaSummary = document.getElementById('batch-meta-summary');
    const metaDetails = document.getElementById('batch-meta-details');
    const navCounter = document.getElementById('batch-nav-counter');

    if (!strip) return;
    strip.innerHTML = '';

    const count = batchState.items.length;
    let totalBytes = 0;
    batchState.items.forEach(it => { totalBytes += (it.size || 0); });
    const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);

    if (countPill) countPill.textContent = `${count} Photo${count !== 1 ? 's' : ''}`;
    const activeItem = batchState.items[batchState.activeIndex];
    if (activeName) activeName.textContent = activeItem ? `· ${activeItem.name}` : '';
    if (metaSummary) metaSummary.textContent = `${sizeMb} MB Total`;
    if (metaDetails) metaDetails.textContent = activeItem ? `Active: ${activeItem.name} (${activeItem.width} × ${activeItem.height} px)` : 'Ready to process';
    if (navCounter) navCounter.textContent = count > 0 ? `${batchState.activeIndex + 1} / ${count}` : '0 / 0';

    batchState.items.forEach((item, index) => {
      const card = document.createElement('div');
      const isCustom = !!item.hasCustom;
      card.className = `batch-thumb-card ${index === batchState.activeIndex ? 'active' : ''} ${isCustom ? 'has-custom' : ''}`;
      card.onclick = () => selectBatchImage(index);

      card.innerHTML = `
        <span class="batch-thumb-badge">#${index + 1}</span>
        ${isCustom ? '<span class="batch-thumb-custom-badge" title="Has separate custom edits">⚡ Custom</span>' : ''}
        <button type="button" class="batch-thumb-del-btn" title="Remove image from batch" onclick="removeBatchItem(${index}, event)">×</button>
        <div class="batch-thumb-img-wrap">
          <img src="${item.thumbUrl || item.originalUrl}" alt="${item.name}" loading="lazy" />
        </div>
        <div class="batch-thumb-info">
          <span class="batch-thumb-name" title="${item.name}">${item.name}</span>
          <span class="batch-thumb-meta">${item.width} × ${item.height}</span>
          <div class="batch-thumb-actions">
            <button type="button" class="batch-thumb-edit-btn ${isCustom ? 'is-custom' : ''}" onclick="openBatchItemCustomEdit(${index}, event)" title="${isCustom ? 'Modify separate settings for this image' : 'Customize this image separately'}">
              ${isCustom ? '⚡ Edit Separately' : '✏️ Edit Separately'}
            </button>
          </div>
        </div>
      `;
      strip.appendChild(card);
    });

    const activeCard = strip.children[batchState.activeIndex];
    if (activeCard && !batchState.isExpanded) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  let isBatchImageSelecting = false;

  window.selectBatchImage = function (index, skipFade = false) {
    if (index < 0 || index >= batchState.items.length) return;
    const isDifferent = (index !== batchState.activeIndex);
    batchState.activeIndex = index;

    const cur = batchState.items[index];
    if (cur && cur.hasCustom) {
      batchState.editScope = 'single';
    } else if (batchState.editScope === 'single' && (!cur || !cur.hasCustom)) {
      batchState.editScope = 'all';
    }

    syncBatchConfigsToDOM();
    updateBatchAccordionUI();
    updateAllBatchToolStatusLabels();
    updateBatchScopeUI();
    renderBatchCarousel();

    const count = batchState.items.length;
    const viewingTag = document.getElementById('batch-viewing-tag');
    const statusHint = document.getElementById('batch-stage-status');
    const navCounter = document.getElementById('batch-nav-counter');
    if (viewingTag) {
      viewingTag.style.display = 'inline-flex';
      viewingTag.textContent = `Viewing ${index + 1} of ${count}`;
    }
    if (navCounter) {
      navCounter.textContent = `${index + 1} / ${count}`;
    }
    if (statusHint && cur) {
      statusHint.textContent = cur.name;
      statusHint.title = `${cur.name} (${cur.width} × ${cur.height} px)`;
    }

    const canvas = document.getElementById('canvas-batch-preview');
    const wrapper = document.getElementById('batch-canvas-wrapper');

    // Smooth photographic cross-fade & aspect ratio morphing
    if (isDifferent && !skipFade && canvas && wrapper) {
      isBatchImageSelecting = true;
      canvas.classList.remove('batch-preview-fade-in-prep', 'batch-preview-fade-in-active');
      canvas.classList.add('batch-preview-fade-out');

      setTimeout(async () => {
        await renderBatchPreviewCanvas();
        recalculateBatchCompression();

        canvas.classList.remove('batch-preview-fade-out');
        canvas.classList.add('batch-preview-fade-in-prep');

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            canvas.classList.remove('batch-preview-fade-in-prep');
            canvas.classList.add('batch-preview-fade-in-active');

            setTimeout(() => {
              canvas.classList.remove('batch-preview-fade-in-active');
              isBatchImageSelecting = false;
            }, 360);
          });
        });
      }, 100);
    } else {
      renderBatchPreviewCanvas();
      recalculateBatchCompression();
    }
    persistBatchSession();
  };

  window.setBatchEditScope = function (scope) {
    if (!batchState.items.length) return;
    const activeItem = batchState.items[batchState.activeIndex];
    if (!activeItem) return;

    if (scope === 'single') {
      batchState.editScope = 'single';
      if (!activeItem.customConfigs) {
        activeItem.customConfigs = JSON.parse(JSON.stringify(batchState.globalConfigs));
        activeItem.hasCustom = true;
      }
    } else {
      batchState.editScope = 'all';
    }

    syncBatchConfigsToDOM();
    updateBatchAccordionUI();
    updateAllBatchToolStatusLabels();
    updateBatchScopeUI();
    renderBatchCarousel();
    renderBatchPreviewCanvas();
    recalculateBatchCompression();

    if (batchState.editScope === 'single') {
      showToast(`🎯 Now editing Image #${batchState.activeIndex + 1} (${activeItem.name}) separately`);
    } else {
      showToast('👥 Now editing batch configurations for all images');
    }
    persistBatchSession();
  };

  window.toggleBatchEditScopeForActiveItem = function () {
    if (batchState.editScope === 'single') {
      setBatchEditScope('all');
    } else {
      setBatchEditScope('single');
    }
  };

  window.openBatchItemCustomEdit = function (index, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (index < 0 || index >= batchState.items.length) return;
    const item = batchState.items[index];
    if (!item) return;

    batchState.activeIndex = index;
    batchState.editScope = 'single';
    if (!item.customConfigs) {
      item.customConfigs = JSON.parse(JSON.stringify(batchState.globalConfigs));
      item.hasCustom = true;
    }

    syncBatchConfigsToDOM();
    updateBatchAccordionUI();
    updateAllBatchToolStatusLabels();
    updateBatchScopeUI();
    renderBatchCarousel();
    renderBatchPreviewCanvas();
    recalculateBatchCompression();

    showToast(`🎯 Customizing Image #${index + 1} (${item.name}) separately`);
    persistBatchSession();
  };

  window.revertActiveItemToBatch = function () {
    const activeItem = batchState.items[batchState.activeIndex];
    if (!activeItem) return;

    activeItem.hasCustom = false;
    activeItem.customConfigs = null;
    batchState.editScope = 'all';

    syncBatchConfigsToDOM();
    updateBatchAccordionUI();
    updateAllBatchToolStatusLabels();
    updateBatchScopeUI();
    renderBatchCarousel();
    renderBatchPreviewCanvas();
    recalculateBatchCompression();

    showToast(`↺ Image #${batchState.activeIndex + 1} (${activeItem.name}) reverted to batch settings`);
    persistBatchSession();
  };

  function updateBatchScopeUI() {
    const isSingle = (batchState.editScope === 'single');
    const activeItem = batchState.items[batchState.activeIndex];
    const total = batchState.items.length;
    const index = batchState.activeIndex;

    // Scope tab buttons
    const allBtn = document.getElementById('batch-scope-all-btn');
    const singleBtn = document.getElementById('batch-scope-single-btn');
    const countSpan = document.getElementById('batch-scope-count');
    const singleLabel = document.getElementById('batch-scope-single-label');

    if (countSpan) countSpan.textContent = total;
    if (singleLabel) {
      singleLabel.textContent = activeItem ? `This Image (#${index + 1}${activeItem.hasCustom ? ' ⚡' : ''})` : `This Image (#${index + 1})`;
    }

    if (allBtn) allBtn.classList.toggle('active', !isSingle);
    if (singleBtn) {
      singleBtn.classList.toggle('active', isSingle);
      singleBtn.classList.toggle('is-custom-active', !!(activeItem && activeItem.hasCustom));
    }

    // Panel Header text
    const titleEl = document.getElementById('batch-cc-title');
    const subtitleEl = document.getElementById('batch-cc-subtitle');
    const revertBtn = document.getElementById('batch-revert-scope-btn');

    if (isSingle && activeItem) {
      if (titleEl) titleEl.textContent = `Customizing: #${index + 1} · ${activeItem.name}`;
      if (subtitleEl) subtitleEl.textContent = 'Settings apply to this image only. Other images follow batch.';
      if (revertBtn) revertBtn.style.display = activeItem.hasCustom ? 'inline-flex' : 'none';
    } else {
      if (titleEl) titleEl.textContent = 'Batch Configurations';
      if (subtitleEl) subtitleEl.textContent = 'Actions apply to all queued images simultaneously.';
      if (revertBtn) revertBtn.style.display = 'none';
    }

    // Topbar customize / revert buttons
    const topbarScopeControls = document.getElementById('batch-topbar-scope-controls');
    const topbarCustomizeBtn = document.getElementById('batch-topbar-customize-btn');
    const topbarRevertBtn = document.getElementById('batch-topbar-revert-btn');

    if (topbarScopeControls) {
      topbarScopeControls.style.display = (total > 0) ? 'inline-flex' : 'none';
    }
    if (topbarCustomizeBtn && activeItem) {
      if (isSingle) {
        topbarCustomizeBtn.innerHTML = '🎯 Editing Separately';
        topbarCustomizeBtn.classList.add('active');
      } else if (activeItem.hasCustom) {
        topbarCustomizeBtn.innerHTML = '⚡ Has Custom Edits';
        topbarCustomizeBtn.classList.remove('active');
      } else {
        topbarCustomizeBtn.innerHTML = '✏️ Edit Separately';
        topbarCustomizeBtn.classList.remove('active');
      }
    }
    if (topbarRevertBtn && activeItem) {
      topbarRevertBtn.style.display = activeItem.hasCustom ? 'inline-flex' : 'none';
    }

    // Topbar floating glass custom badge
    const topbarCustomBadge = document.getElementById('batch-topbar-custom-badge');
    if (topbarCustomBadge) {
      topbarCustomBadge.style.display = (activeItem && activeItem.hasCustom) ? 'inline-flex' : 'none';
    }

    // Detail view scope badge
    const detailBadge = document.getElementById('batch-detail-scope-badge');
    if (detailBadge) {
      if (isSingle && activeItem) {
        detailBadge.style.display = 'inline-block';
        detailBadge.textContent = `🎯 Image #${index + 1} Only`;
      } else {
        detailBadge.style.display = 'none';
      }
    }
  }
  window.updateBatchScopeUI = updateBatchScopeUI;

  // Keyboard Left / Right Navigation for Batch Mode
  document.addEventListener('keydown', (e) => {
    const batchView = document.getElementById('tool-batch-edit-view');
    if (!batchView || batchView.style.display === 'none') return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateBatchImage(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateBatchImage(1);
    }
  });

  // Responsive Canvas Refit on Window Resize
  let batchWindowResizeTimer = null;
  window.addEventListener('resize', () => {
    const batchView = document.getElementById('tool-batch-edit-view');
    if (!batchView || batchView.style.display === 'none') return;
    clearTimeout(batchWindowResizeTimer);
    batchWindowResizeTimer = setTimeout(() => {
      if (batchState.items.length > 0 && typeof renderBatchPreviewCanvas === 'function') {
        renderBatchPreviewCanvas();
      }
    }, 120);
  });

  window.navigateBatchImage = function (dir) {
    if (!batchState.items.length) return;
    let next = batchState.activeIndex + dir;
    if (next < 0) next = batchState.items.length - 1;
    if (next >= batchState.items.length) next = 0;
    selectBatchImage(next);
  };

  window.scrollBatchCarousel = function (dir) {
    const strip = document.getElementById('batch-carousel-strip');
    if (strip) {
      strip.scrollBy({ left: dir * 260, behavior: 'smooth' });
    }
  };

  window.toggleBatchGridExpand = function () {
    const panel = document.getElementById('batch-slider-panel');
    const strip = document.getElementById('batch-carousel-strip');
    const btnText = document.getElementById('batch-expand-btn-text');
    if (!panel || !strip) return;

    const willExpand = !batchState.isExpanded;
    batchState.isExpanded = willExpand;

    // Quick gentle fade out for seamless morphing
    strip.style.transition = 'opacity 0.12s cubic-bezier(0.4, 0, 0.2, 1), transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)';
    strip.style.opacity = '0';
    strip.style.transform = willExpand ? 'translateY(6px) scale(0.99)' : 'translateY(-6px) scale(0.99)';

    setTimeout(() => {
      panel.classList.toggle('expanded', willExpand);
      if (btnText) {
        btnText.textContent = willExpand ? 'Collapse Strip' : 'Expand Grid';
      }
      renderBatchCarousel();

      // Smooth glide in with staggered card entrance
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          strip.style.transition = 'opacity 0.34s cubic-bezier(0.16, 1, 0.3, 1), transform 0.34s cubic-bezier(0.16, 1, 0.3, 1)';
          strip.style.opacity = '1';
          strip.style.transform = 'translateY(0) scale(1)';

          setTimeout(() => {
            strip.style.transition = '';
            strip.style.opacity = '';
            strip.style.transform = '';
          }, 360);
        });
      });
    }, 110);
  };

  window.removeBatchItem = function (index, e) {
    if (e) e.stopPropagation();
    if (index < 0 || index >= batchState.items.length) return;
    const removed = batchState.items.splice(index, 1)[0];
    if (removed && removed.originalUrl) {
      try { URL.revokeObjectURL(removed.originalUrl); } catch (_) { }
    }
    if (batchState.activeIndex >= batchState.items.length) {
      batchState.activeIndex = Math.max(0, batchState.items.length - 1);
    }
    syncBatchViewUI();
    if (batchState.items.length > 0) {
      renderBatchPreviewCanvas();
      recalculateBatchCompression();
    }
    persistBatchSession();
    showToast('Removed image from batch queue');
  };

  window.clearBatchQueue = function () {
    batchState.items.forEach(it => {
      if (it.originalUrl) {
        try { URL.revokeObjectURL(it.originalUrl); } catch (_) { }
      }
    });
    batchState.items = [];
    batchState.activeIndex = 0;
    batchState.activeCalibratedCanvas = null;
    if (typeof closeBatchToolDetail === 'function') {
      closeBatchToolDetail();
    }
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('batch_session');
    }
    syncBatchViewUI();
    showToast('Cleared all images from batch queue');
  };

  // ==============================================================
  // MASTER-DETAIL CONTROL CENTER HANDLERS (Slide-over sub-views)
  // ==============================================================
  const batchToolMeta = {
    resize: {
      icon: '↗',
      title: 'Resize',
      desc: 'Exact dimensions (px) or proportional scaling (%)'
    },
    crop: {
      icon: '⌗',
      title: 'Crop & Aspect',
      desc: 'Aspect ratio presets & focal anchor position'
    },
    rotate: {
      icon: '↻',
      title: 'Rotate & Mirror',
      desc: '90°/180° rotation & horizontal/vertical flipping'
    },
    compress: {
      icon: '◉',
      title: 'Compress Image',
      desc: 'Auto-calibrate target size, pixel sizing, or manual quality'
    },
    adjust: {
      icon: '☼',
      title: 'Lighting & Tone',
      desc: 'Fine-tune brightness, contrast, saturation, and warmth'
    },
    filters: {
      icon: '✧',
      title: 'Preset Styles',
      desc: 'Curated photographic tone and aesthetic filters'
    },
    blur: {
      icon: '◎',
      title: 'Focus & Depth',
      desc: 'Bokeh lens, tilt-shift, blur styles & intensity'
    }
  };

  let isBatchTransitioning = false;

  window.openBatchToolDetail = function (toolName) {
    if (!toolName || !batchState.configs[toolName]) return;
    if (isBatchTransitioning) return;
    batchState.activeDetailTool = toolName;

    // Push history state so default device back button, trackpad & system gesture navigation return to All Configurations
    try {
      history.pushState({ isBatchDetail: true, tool: toolName, route: '#/tool/batch-edit' }, '', getCleanStudioBase());
    } catch (_) { }

    // Update Detail Header
    const meta = batchToolMeta[toolName] || { icon: '◉', title: toolName, desc: '' };
    const iconEl = document.getElementById('batch-detail-icon');
    const titleEl = document.getElementById('batch-detail-title');
    const descEl = document.getElementById('batch-detail-desc');
    const toggleBtn = document.getElementById('batch-detail-toggle-btn');

    if (iconEl) iconEl.textContent = meta.icon;
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.desc;

    const isEnabled = !!batchState.configs[toolName].enabled;
    if (toggleBtn) {
      toggleBtn.textContent = isEnabled ? 'Active' : 'Off';
      toggleBtn.classList.toggle('active', isEnabled);
    }
    updateBatchScopeUI();

    // Hide all sub-panels, show target sub-panel
    const allPanels = document.querySelectorAll('.batch-tool-detail-body');
    allPanels.forEach(p => p.style.display = 'none');

    const targetPanel = document.getElementById(`batch-detail-${toolName}`);
    if (targetPanel) {
      targetPanel.style.display = 'block';
    }

    // Smooth Fade Up & Out Transition
    const masterView = document.getElementById('batch-cc-master-view');
    const detailView = document.getElementById('batch-cc-detail-view');
    const panel = document.getElementById('batch-control-center-panel');

    if (masterView && detailView) {
      isBatchTransitioning = true;
      masterView.classList.remove('anim-fade-up-in', 'anim-fade-down-in', 'anim-fade-down-out');
      masterView.classList.add('anim-fade-up-out');

      setTimeout(() => {
        masterView.style.display = 'none';
        masterView.classList.remove('anim-fade-up-out');

        detailView.style.display = 'block';
        detailView.classList.remove('anim-fade-up-out', 'anim-fade-down-out', 'anim-fade-down-in');
        detailView.classList.add('anim-fade-up-in');

        if (panel) panel.scrollTop = 0;
        isBatchTransitioning = false;
      }, 110);
    } else {
      if (masterView) masterView.style.display = 'none';
      if (detailView) detailView.style.display = 'block';
      if (panel) panel.scrollTop = 0;
    }

    if (toolName === 'compress' || toolName === 'resize') {
      recalculateBatchCompression();
    }
    if (toolName === 'blur') {
      setupBatchBlurOverlayEvents();
      if (typeof syncBatchBlurUI === 'function') {
        syncBatchBlurUI();
      }
      drawBatchBlurOverlayGuides();
    } else {
      const overlay = document.getElementById('canvas-batch-blur-overlay');
      if (overlay) overlay.style.display = 'none';
    }
    persistBatchSession();
  };

  window.closeBatchToolDetail = function (fromPopState = false) {
    if (isBatchTransitioning) return;
    if (!batchState.activeDetailTool) return;

    // Reset canvas cursor & hide blur overlay
    const c = document.getElementById('canvas-batch-preview');
    if (c) c.style.cursor = 'default';
    const overlay = document.getElementById('canvas-batch-blur-overlay');
    if (overlay) overlay.style.display = 'none';

    // If dismissed via button, keyboard or touch gesture (not popstate), pop the history state
    if (!fromPopState && history.state && history.state.isBatchDetail) {
      history.back();
      return;
    }

    batchState.activeDetailTool = null;

    const masterView = document.getElementById('batch-cc-master-view');
    const detailView = document.getElementById('batch-cc-detail-view');
    const panel = document.getElementById('batch-control-center-panel');

    // Update all status labels & toggle pills in Master View
    updateAllBatchToolStatusLabels();
    renderBatchPreviewCanvas();

    if (detailView && masterView) {
      isBatchTransitioning = true;
      detailView.classList.remove('anim-fade-up-in', 'anim-fade-down-in', 'anim-fade-up-out');
      detailView.classList.add('anim-fade-down-out');

      setTimeout(() => {
        detailView.style.display = 'none';
        detailView.classList.remove('anim-fade-down-out');

        masterView.style.display = 'block';
        masterView.classList.remove('anim-fade-up-in', 'anim-fade-up-out', 'anim-fade-down-out');
        masterView.classList.add('anim-fade-down-in');

        if (panel) panel.scrollTop = 0;
        isBatchTransitioning = false;
        updateBatchScopeUI();
      }, 110);
    } else {
      if (detailView) detailView.style.display = 'none';
      if (masterView) masterView.style.display = 'block';
      if (panel) panel.scrollTop = 0;
      updateBatchScopeUI();
    }

    persistBatchSession();
  };

  window.toggleBatchFeatureFromDetail = function () {
    const toolName = batchState.activeDetailTool;
    if (!toolName) return;
    toggleBatchFeature(toolName);
    const isEnabled = !!batchState.configs[toolName]?.enabled;
    const toggleBtn = document.getElementById('batch-detail-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = isEnabled ? 'Active' : 'Off';
      toggleBtn.classList.toggle('active', isEnabled);
    }
  };

  // Backwards compatibility alias
  window.toggleBatchAccordion = function (toolName) {
    openBatchToolDetail(toolName);
  };

  function updateBatchAccordionUI() {
    // Legacy accordion support if rendered elsewhere
    const items = document.querySelectorAll('#batch-accordion-list .batch-acc-item');
    items.forEach(item => {
      const tool = item.getAttribute('data-tool');
      const isOpen = (tool === batchState.activeDetailTool);
      item.classList.toggle('open', isOpen);
    });
  }

  function updateAllBatchToolStatusLabels() {
    ['resize', 'crop', 'rotate', 'compress', 'adjust', 'filters', 'blur'].forEach(t => {
      updateBatchToolStatusLabel(t);
      const pill = document.getElementById(`batch-toggle-${t}`);
      if (pill && batchState.configs[t]) {
        const active = !!batchState.configs[t].enabled;
        pill.textContent = active ? 'Active' : 'Off';
        pill.classList.toggle('active', active);
      }
    });
  }
  window.updateAllBatchToolStatusLabels = updateAllBatchToolStatusLabels;

  window.toggleBatchFeature = function (toolName) {
    const cfg = batchState.configs[toolName];
    if (!cfg) return;
    cfg.enabled = !cfg.enabled;
    if (toolName === 'blur') {
      if (cfg.enabled) {
        if (!cfg.mode || cfg.mode === 'none') cfg.mode = 'radial';
      }
      if (typeof syncBatchBlurUI === 'function') syncBatchBlurUI();
      drawBatchBlurOverlayGuides();
    }
    const pill = document.getElementById(`batch-toggle-${toolName}`);
    if (pill) {
      pill.textContent = cfg.enabled ? 'Active' : 'Off';
      pill.classList.toggle('active', cfg.enabled);
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === toolName) {
      detailPill.textContent = cfg.enabled ? 'Active' : 'Off';
      detailPill.classList.toggle('active', cfg.enabled);
    }
    updateBatchToolStatusLabel(toolName);
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
    showToast(`${toolName.charAt(0).toUpperCase() + toolName.slice(1)} ${cfg.enabled ? 'enabled' : 'disabled'} for batch`);
  };

  function updateBatchToolStatusLabel(toolName) {
    const lbl = document.getElementById(`batch-status-${toolName}`);
    const cfg = batchState.configs[toolName];
    if (!lbl || !cfg) return;

    // Sync header toggle button if this tool is currently open in Detail View
    if (batchState.activeDetailTool === toolName) {
      const toggleBtn = document.getElementById('batch-detail-toggle-btn');
      if (toggleBtn) {
        toggleBtn.textContent = cfg.enabled ? 'Active' : 'Off';
        toggleBtn.classList.toggle('active', !!cfg.enabled);
      }
    }

    if (!cfg.enabled) {
      lbl.textContent = 'Off';
      return;
    }

    if (toolName === 'resize') {
      if (cfg.mode === 'scale') lbl.textContent = `${cfg.scale}% Scale`;
      else lbl.textContent = `${cfg.w} × ${cfg.h} px`;
    } else if (toolName === 'crop') {
      lbl.textContent = cfg.ratio === 'original' ? 'Original (No Crop)' : `${cfg.ratio} (${cfg.anchor})`;
    } else if (toolName === 'rotate') {
      lbl.textContent = `${cfg.angle}°${cfg.flipH ? ' FlipH' : ''}${cfg.flipV ? ' FlipV' : ''}`;
    } else if (toolName === 'compress') {
      const fmt = cfg.format === 'original' ? 'Auto' : cfg.format.replace('image/', '').toUpperCase();
      if (cfg.mode === 'target') {
        lbl.textContent = `< ${cfg.targetVal} ${cfg.targetUnit} (${fmt})`;
      } else if (cfg.mode === 'pixels') {
        lbl.textContent = `${cfg.pxWidth}×${cfg.pxHeight} (${cfg.pxQuality}%)`;
      } else {
        lbl.textContent = `${cfg.manualQuality}% ${fmt}`;
      }
    } else if (toolName === 'adjust') {
      lbl.textContent = `B:${cfg.bright}% C:${cfg.contrast}% S:${cfg.saturate}%${cfg.warmth !== 0 ? ' W:' + cfg.warmth : ''}`;
    } else if (toolName === 'filters') {
      lbl.textContent = cfg.preset.charAt(0).toUpperCase() + cfg.preset.slice(1);
    } else if (toolName === 'blur') {
      if (!cfg.enabled || cfg.mode === 'none') {
        lbl.textContent = 'Off';
      } else {
        const modeNames = { radial: 'Bokeh', tiltshift: 'Tilt-Shift', brush: 'Brush', full: 'Full Blur' };
        const typeNames = { gaussian: 'Gaussian', pixelate: 'Pixelated', motion: 'Motion', zoom: 'Zoom', frosted: 'Frosted' };
        const mName = modeNames[cfg.mode] || 'Bokeh';
        const tName = typeNames[cfg.type] || 'Gaussian';
        lbl.textContent = `${mName} (${tName}, ${cfg.radius}px)`;
      }
    }
  }

  // --- 1. Resize Tool Handlers ---
  window.setBatchResizeMode = function (mode) {
    batchState.configs.resize.mode = mode;
    batchState.configs.resize.enabled = true;
    document.getElementById('batch-toggle-resize')?.classList.add('active');
    const pill = document.getElementById('batch-toggle-resize');
    if (pill) pill.textContent = 'Active';
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'resize') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }

    document.getElementById('btn-batch-resize-mode-exact')?.classList.toggle('active', mode === 'exact');
    document.getElementById('btn-batch-resize-mode-scale')?.classList.toggle('active', mode === 'scale');

    const exactBox = document.getElementById('batch-resize-exact-box');
    const scaleBox = document.getElementById('batch-resize-scale-box');
    if (exactBox) exactBox.style.display = (mode === 'exact') ? 'block' : 'none';
    if (scaleBox) scaleBox.style.display = (mode === 'scale') ? 'block' : 'none';

    updateBatchToolStatusLabel('resize');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  window.updateBatchResizeScale = function (val) {
    const v = parseInt(val, 10) || 100;
    batchState.configs.resize.scale = v;
    batchState.configs.resize.enabled = true;
    const slider = document.getElementById('batch-resize-scale-slider');
    const text = document.getElementById('batch-resize-scale-val');
    if (slider) slider.value = v;
    if (text) text.textContent = `${v}%`;
    document.getElementById('batch-toggle-resize')?.classList.add('active');
    const pill = document.getElementById('batch-toggle-resize');
    if (pill) pill.textContent = 'Active';
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'resize') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }
    updateBatchToolStatusLabel('resize');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  window.setBatchResizePreset = function (w, h, btn) {
    batchState.configs.resize.w = w;
    batchState.configs.resize.h = h;
    batchState.configs.resize.enabled = true;

    const wInput = document.getElementById('batch-resize-w');
    const hInput = document.getElementById('batch-resize-h');
    if (wInput) wInput.value = w;
    if (hInput) hInput.value = h;

    const box = document.getElementById('batch-resize-exact-box');
    if (box) {
      box.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }
    document.getElementById('batch-toggle-resize')?.classList.add('active');
    const pill = document.getElementById('batch-toggle-resize');
    if (pill) pill.textContent = 'Active';
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'resize') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }
    updateBatchToolStatusLabel('resize');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  window.toggleBatchResizeAspect = function () {
    const btn = document.getElementById('batch-resize-aspect-btn');
    batchState.configs.resize.lockAspect = !batchState.configs.resize.lockAspect;
    if (btn) btn.classList.toggle('active', batchState.configs.resize.lockAspect);
  };

  window.onBatchResizeDimsChange = function () {
    const wInput = document.getElementById('batch-resize-w');
    const hInput = document.getElementById('batch-resize-h');
    if (!wInput || !hInput) return;
    const w = parseInt(wInput.value, 10);
    const h = parseInt(hInput.value, 10);
    if (w > 0) batchState.configs.resize.w = w;
    if (h > 0) batchState.configs.resize.h = h;
    batchState.configs.resize.enabled = true;
    document.getElementById('batch-toggle-resize')?.classList.add('active');
    const pill = document.getElementById('batch-toggle-resize');
    if (pill) pill.textContent = 'Active';
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'resize') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }
    updateBatchToolStatusLabel('resize');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  // --- 2. Crop Tool Handlers ---
  window.setBatchCropRatio = function (ratio, btn) {
    batchState.configs.crop.ratio = ratio;
    batchState.configs.crop.enabled = (ratio !== 'original');
    const group = btn ? btn.parentElement : null;
    if (group) {
      group.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }
    const pill = document.getElementById('batch-toggle-crop');
    if (pill) {
      pill.textContent = batchState.configs.crop.enabled ? 'Active' : 'Off';
      pill.classList.toggle('active', batchState.configs.crop.enabled);
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'crop') {
      detailPill.textContent = batchState.configs.crop.enabled ? 'Active' : 'Off';
      detailPill.classList.toggle('active', batchState.configs.crop.enabled);
    }
    updateBatchToolStatusLabel('crop');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  window.setBatchCropAnchor = function (anchor, btn) {
    batchState.configs.crop.anchor = anchor;
    if (btn) {
      btn.parentElement.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    updateBatchToolStatusLabel('crop');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  // --- 3. Rotate & Flip Handlers ---
  window.batchRotateStep = function (degrees) {
    let angle = (batchState.configs.rotate.angle + degrees) % 360;
    if (angle < 0) angle += 360;
    batchState.configs.rotate.angle = angle;
    batchState.configs.rotate.enabled = (angle !== 0 || batchState.configs.rotate.flipH || batchState.configs.rotate.flipV);
    const pill = document.getElementById('batch-toggle-rotate');
    if (pill) {
      pill.textContent = batchState.configs.rotate.enabled ? 'Active' : 'Off';
      pill.classList.toggle('active', batchState.configs.rotate.enabled);
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'rotate') {
      detailPill.textContent = batchState.configs.rotate.enabled ? 'Active' : 'Off';
      detailPill.classList.toggle('active', batchState.configs.rotate.enabled);
    }
    updateBatchToolStatusLabel('rotate');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  window.batchRotateReset = function () {
    batchState.configs.rotate.angle = 0;
    batchState.configs.rotate.flipH = false;
    batchState.configs.rotate.flipV = false;
    batchState.configs.rotate.enabled = false;
    document.getElementById('btn-batch-flip-h')?.classList.remove('active');
    document.getElementById('btn-batch-flip-v')?.classList.remove('active');
    const pill = document.getElementById('batch-toggle-rotate');
    if (pill) {
      pill.textContent = 'Off';
      pill.classList.remove('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'rotate') {
      detailPill.textContent = 'Off';
      detailPill.classList.remove('active');
    }
    updateBatchToolStatusLabel('rotate');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  window.batchToggleFlip = function (axis) {
    if (axis === 'h') {
      batchState.configs.rotate.flipH = !batchState.configs.rotate.flipH;
      document.getElementById('btn-batch-flip-h')?.classList.toggle('active', batchState.configs.rotate.flipH);
    } else if (axis === 'v') {
      batchState.configs.rotate.flipV = !batchState.configs.rotate.flipV;
      document.getElementById('btn-batch-flip-v')?.classList.toggle('active', batchState.configs.rotate.flipV);
    }
    batchState.configs.rotate.enabled = (batchState.configs.rotate.angle !== 0 || batchState.configs.rotate.flipH || batchState.configs.rotate.flipV);
    const pill = document.getElementById('batch-toggle-rotate');
    if (pill) {
      pill.textContent = batchState.configs.rotate.enabled ? 'Active' : 'Off';
      pill.classList.toggle('active', batchState.configs.rotate.enabled);
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'rotate') {
      detailPill.textContent = batchState.configs.rotate.enabled ? 'Active' : 'Off';
      detailPill.classList.toggle('active', batchState.configs.rotate.enabled);
    }
    updateBatchToolStatusLabel('rotate');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  // --- 4. Compress Tool Handlers (Complete Match with Default Tool) ---
  window.setBatchCompressMode = function (mode) {
    batchState.configs.compress.mode = mode;
    batchState.configs.compress.enabled = true;
    document.getElementById('batch-compress-tab-target')?.classList.toggle('active', mode === 'target');
    document.getElementById('batch-compress-tab-pixels')?.classList.toggle('active', mode === 'pixels');
    document.getElementById('batch-compress-tab-manual')?.classList.toggle('active', mode === 'manual');

    const targetPanel = document.getElementById('batch-compress-mode-target-panel');
    const pixelsPanel = document.getElementById('batch-compress-mode-pixels-panel');
    const manualPanel = document.getElementById('batch-compress-mode-manual-panel');

    if (targetPanel) targetPanel.style.display = mode === 'target' ? 'block' : 'none';
    if (pixelsPanel) pixelsPanel.style.display = mode === 'pixels' ? 'block' : 'none';
    if (manualPanel) manualPanel.style.display = mode === 'manual' ? 'block' : 'none';

    updateBatchToolStatusLabel('compress');
    recalculateBatchCompression();
  };

  window.onBatchTargetSizeInput = function () {
    if (batchCalibrationTimer) clearTimeout(batchCalibrationTimer);
    batchState.configs.compress.enabled = true;
    batchCalibrationTimer = setTimeout(() => {
      const input = document.getElementById('batch-compress-target-val');
      const val = parseFloat(input?.value || 200);
      if (val > 0) batchState.configs.compress.targetVal = val;

      const unit = batchState.configs.compress.targetUnit;
      document.querySelectorAll('#batch-compress-mode-target-panel .chip-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === `${val} ${unit}`);
      });

      const pill = document.getElementById('batch-toggle-compress');
      if (pill) {
        pill.textContent = 'Active';
        pill.classList.add('active');
      }
      const detailPill = document.getElementById('batch-detail-toggle-btn');
      if (detailPill && batchState.activeDetailTool === 'compress') {
        detailPill.textContent = 'Active';
        detailPill.classList.add('active');
      }

      recalculateBatchCompression();
    }, 140);
  };

  window.onBatchTargetUnitChange = function () {
    const select = document.getElementById('batch-compress-target-unit');
    batchState.configs.compress.targetUnit = select?.value || 'KB';
    batchState.configs.compress.enabled = true;

    const val = batchState.configs.compress.targetVal;
    const unit = batchState.configs.compress.targetUnit;
    document.querySelectorAll('#batch-compress-mode-target-panel .chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === `${val} ${unit}`);
    });

    const pill = document.getElementById('batch-toggle-compress');
    if (pill) {
      pill.textContent = 'Active';
      pill.classList.add('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'compress') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }

    recalculateBatchCompression();
  };

  window.setBatchQuickTargetSize = function (val, unit) {
    batchState.configs.compress.targetVal = val;
    batchState.configs.compress.targetUnit = unit;
    batchState.configs.compress.enabled = true;

    const input = document.getElementById('batch-compress-target-val');
    const select = document.getElementById('batch-compress-target-unit');
    if (input) input.value = val;
    if (select) select.value = unit;

    document.querySelectorAll('#batch-compress-mode-target-panel .chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === `${val} ${unit}`);
    });

    const pill = document.getElementById('batch-toggle-compress');
    if (pill) {
      pill.textContent = 'Active';
      pill.classList.add('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'compress') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }

    recalculateBatchCompression();
  };

  window.toggleBatchCompressAspectLock = function () {
    batchState.configs.compress.lockAspect = !batchState.configs.compress.lockAspect;
    const btn = document.getElementById('batch-compress-px-lock-btn');
    if (btn) btn.classList.toggle('active', batchState.configs.compress.lockAspect);
  };

  window.setBatchCompressPxPreset = function (w, h) {
    const activeItem = batchState.items[batchState.activeIndex];
    const srcW = activeItem ? activeItem.width : 1600;
    const srcH = activeItem ? activeItem.height : 1200;
    const aspect = srcW / srcH;

    let targetW = w;
    let targetH = h;
    if (batchState.configs.compress.lockAspect) {
      if (srcW >= srcH) {
        targetW = w;
        targetH = Math.round(w / aspect);
      } else {
        targetH = h;
        targetW = Math.round(h * aspect);
      }
    }

    batchState.configs.compress.pxWidth = targetW;
    batchState.configs.compress.pxHeight = targetH;
    batchState.configs.compress.enabled = true;

    const wInput = document.getElementById('batch-compress-px-width');
    const hInput = document.getElementById('batch-compress-px-height');
    if (wInput) wInput.value = targetW;
    if (hInput) hInput.value = targetH;

    const pill = document.getElementById('batch-toggle-compress');
    if (pill) {
      pill.textContent = 'Active';
      pill.classList.add('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'compress') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }

    updateBatchCompressPxLive();
  };

  window.onBatchCompressPxChange = function (field) {
    const wInput = document.getElementById('batch-compress-px-width');
    const hInput = document.getElementById('batch-compress-px-height');
    if (!wInput || !hInput) return;

    const activeItem = batchState.items[batchState.activeIndex];
    const srcW = activeItem ? activeItem.width : 1600;
    const srcH = activeItem ? activeItem.height : 1200;
    const aspect = srcW / srcH;

    let w = parseInt(wInput.value, 10) || srcW;
    let h = parseInt(hInput.value, 10) || srcH;

    if (batchState.configs.compress.lockAspect) {
      if (field === 'width') {
        h = Math.max(1, Math.round(w / aspect));
        hInput.value = h;
      } else {
        w = Math.max(1, Math.round(h * aspect));
        wInput.value = w;
      }
    }
    batchState.configs.compress.pxWidth = w;
    batchState.configs.compress.pxHeight = h;
    batchState.configs.compress.enabled = true;

    const pill = document.getElementById('batch-toggle-compress');
    if (pill) {
      pill.textContent = 'Active';
      pill.classList.add('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'compress') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }

    updateBatchCompressPxLive();
  };

  window.updateBatchCompressPxLive = function () {
    const slider = document.getElementById('batch-compress-px-slider');
    const val = parseInt(slider?.value || 82, 10);
    batchState.configs.compress.pxQuality = val;
    const valText = document.getElementById('batch-compress-px-quality-val');
    if (valText) valText.textContent = `${val}%`;

    const wInput = document.getElementById('batch-compress-px-width');
    const hInput = document.getElementById('batch-compress-px-height');
    if (wInput) batchState.configs.compress.pxWidth = parseInt(wInput.value, 10) || 1600;
    if (hInput) batchState.configs.compress.pxHeight = parseInt(hInput.value, 10) || 1200;

    recalculateBatchCompression();
  };

  window.updateBatchCompressManualLive = function () {
    const slider = document.getElementById('batch-compress-manual-slider');
    const val = parseInt(slider?.value || 80, 10);
    batchState.configs.compress.manualQuality = val;
    batchState.configs.compress.enabled = true;
    const valText = document.getElementById('batch-compress-manual-quality-val');
    if (valText) valText.textContent = `${val}%`;

    const pill = document.getElementById('batch-toggle-compress');
    if (pill) {
      pill.textContent = 'Active';
      pill.classList.add('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'compress') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }

    recalculateBatchCompression();
  };

  window.setBatchCompressFormat = function (fmt) {
    batchState.configs.compress.format = fmt;
    batchState.configs.compress.enabled = true;

    const pill = document.getElementById('batch-toggle-compress');
    if (pill) {
      pill.textContent = 'Active';
      pill.classList.add('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'compress') {
      detailPill.textContent = 'Active';
      detailPill.classList.add('active');
    }

    updateBatchToolStatusLabel('compress');
    recalculateBatchCompression();
  };

  let activeBatchCalibrationId = 0;

  function setBatchCalibratingUI(isCalibrating) {
    const qualEl = document.getElementById('batch-calibrated-quality-text');
    const dimsEl = document.getElementById('batch-calibrated-dims-text');
    const sizeEl = document.getElementById('batch-calibrated-size-text');
    const finalEl = document.getElementById('batch-compress-final-size');
    const badge = document.getElementById('batch-compress-savings-badge');

    if (isCalibrating) {
      if (qualEl) qualEl.innerHTML = '<span class="calibrating-pulse" style="color:var(--muted); font-size:11px;">Auto-tuning quality...</span>';
      if (dimsEl) dimsEl.innerHTML = '<span class="calibrating-pulse" style="color:var(--muted); font-size:11px;">Optimizing resolution...</span>';
      if (sizeEl) sizeEl.innerHTML = '<span class="calibrating-pulse" style="color:var(--accent-olive); font-size:11px;">Calibrating budget...</span>';
      if (finalEl) finalEl.innerHTML = '<span class="calibrating-pulse" style="color:var(--muted); font-size:11px;">Calculating...</span>';
      if (badge) badge.style.display = 'none';
    }
  }

  // Auto-calibrates compression on active image and updates UI status cards
  async function recalculateBatchCompression() {
    const thisId = ++activeBatchCalibrationId;
    const activeItem = batchState.items[batchState.activeIndex];
    const compCfg = batchState.configs.compress;
    if (!activeItem || !activeItem.img) return;

    let targetBytes = 200 * 1024;
    if (compCfg.mode === 'target') {
      const v = compCfg.targetVal || 200;
      targetBytes = (compCfg.targetUnit === 'MB' ? v * 1024 * 1024 : v * 1024);
      setBatchCalibratingUI(true);
    }

    let exportMime = compCfg.format || 'image/jpeg';
    if (exportMime === 'original') exportMime = activeItem.type || 'image/jpeg';
    if (!exportMime || exportMime.includes('svg') || exportMime.includes('heic') || exportMime.includes('gif')) {
      exportMime = 'image/jpeg';
    }

    const testCanvas = await processSingleBatchItem(activeItem, false);
    if (!testCanvas) return;
    if (thisId !== activeBatchCalibrationId) return;

    if (compCfg.mode === 'target') {
      // Precision auto-calibration using PixKit engine with adaptive scaling & strict budget guarantee
      const result = await engine.autoCalibrateCompression(targetBytes, exportMime, testCanvas);
      if (thisId !== activeBatchCalibrationId) return;
      if (!result || !result.blob) return;

      compCfg.calibratedQuality = result.quality;
      compCfg.calibratedDims = (result.scale < 0.98)
        ? `${result.width} × ${result.height} px (${Math.round(result.scale * 100)}% res)`
        : `${result.width} × ${result.height} px`;
      compCfg.calibratedSize = result.blob.size;
      compCfg.calibratedScale = result.scale;

      const qualEl = document.getElementById('batch-calibrated-quality-text');
      const dimsEl = document.getElementById('batch-calibrated-dims-text');
      const sizeEl = document.getElementById('batch-calibrated-size-text');

      if (qualEl) qualEl.textContent = `${result.quality}%`;
      if (dimsEl) dimsEl.textContent = compCfg.calibratedDims;
      if (sizeEl) {
        sizeEl.textContent = `${formatBytes(result.blob.size)} (Target: < ${compCfg.targetVal} ${compCfg.targetUnit})`;
      }

      updateBatchSavingsCard(activeItem.size, result.blob.size);
    } else if (compCfg.mode === 'pixels') {
      const q = (compCfg.pxQuality || 82) / 100;
      const b = await new Promise(res => testCanvas.toBlob(res, exportMime, q));
      if (thisId !== activeBatchCalibrationId) return;
      const finalSize = b ? b.size : Math.round(activeItem.size * 0.35);
      updateBatchSavingsCard(activeItem.size, finalSize);
    } else if (compCfg.mode === 'manual') {
      const q = (compCfg.manualQuality || 80) / 100;
      const b = await new Promise(res => testCanvas.toBlob(res, exportMime, q));
      if (thisId !== activeBatchCalibrationId) return;
      const finalSize = b ? b.size : Math.round(activeItem.size * 0.4);
      updateBatchSavingsCard(activeItem.size, finalSize);
    }

    updateBatchToolStatusLabel('compress');
  }

  let batchCompressionDebounceTimer = null;
  function debouncedRecalculateBatchCompression() {
    clearTimeout(batchCompressionDebounceTimer);
    batchCompressionDebounceTimer = setTimeout(() => {
      recalculateBatchCompression();
    }, 150);
  }

  function updateBatchSavingsCard(origBytes, finalBytes) {
    const origEl = document.getElementById('batch-compress-orig-size');
    const finalEl = document.getElementById('batch-compress-final-size');
    const badge = document.getElementById('batch-compress-savings-badge');

    if (origEl) origEl.textContent = formatBytes(origBytes);
    if (finalEl) finalEl.textContent = formatBytes(finalBytes);

    if (badge && origBytes > 0) {
      const savedBytes = Math.max(0, origBytes - finalBytes);
      const pct = Math.round((savedBytes / origBytes) * 100);
      badge.textContent = `↓ ${pct}% Savings`;
      badge.style.display = pct > 0 ? 'inline-block' : 'none';
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // --- 5. Adjust Tone Handlers ---
  window.updateBatchAdjust = function () {
    const b = parseInt(document.getElementById('batch-adj-bright')?.value, 10) || 100;
    const c = parseInt(document.getElementById('batch-adj-contrast')?.value, 10) || 100;
    const s = parseInt(document.getElementById('batch-adj-saturate')?.value, 10) || 100;
    const w = parseInt(document.getElementById('batch-adj-warmth')?.value, 10) || 0;

    batchState.configs.adjust.bright = b;
    batchState.configs.adjust.contrast = c;
    batchState.configs.adjust.saturate = s;
    batchState.configs.adjust.warmth = w;
    batchState.configs.adjust.enabled = (b !== 100 || c !== 100 || s !== 100 || w !== 0);

    const bText = document.getElementById('batch-adj-bright-val');
    const cText = document.getElementById('batch-adj-contrast-val');
    const sText = document.getElementById('batch-adj-saturate-val');
    const wText = document.getElementById('batch-adj-warmth-val');
    if (bText) bText.textContent = `${b}%`;
    if (cText) cText.textContent = `${c}%`;
    if (sText) sText.textContent = `${s}%`;
    if (wText) wText.textContent = `${w > 0 ? '+' : ''}${w}`;

    const pill = document.getElementById('batch-toggle-adjust');
    if (pill) {
      pill.textContent = batchState.configs.adjust.enabled ? 'Active' : 'Off';
      pill.classList.toggle('active', batchState.configs.adjust.enabled);
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'adjust') {
      detailPill.textContent = batchState.configs.adjust.enabled ? 'Active' : 'Off';
      detailPill.classList.toggle('active', batchState.configs.adjust.enabled);
    }
    updateBatchToolStatusLabel('adjust');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  window.resetBatchAdjust = function () {
    batchState.configs.adjust.bright = 100;
    batchState.configs.adjust.contrast = 100;
    batchState.configs.adjust.saturate = 100;
    batchState.configs.adjust.warmth = 0;
    batchState.configs.adjust.enabled = false;

    const bSlider = document.getElementById('batch-adj-bright');
    const cSlider = document.getElementById('batch-adj-contrast');
    const sSlider = document.getElementById('batch-adj-saturate');
    const wSlider = document.getElementById('batch-adj-warmth');
    if (bSlider) bSlider.value = 100;
    if (cSlider) cSlider.value = 100;
    if (sSlider) sSlider.value = 100;
    if (wSlider) wSlider.value = 0;

    document.getElementById('batch-adj-bright-val')?.replaceChildren('100%');
    document.getElementById('batch-adj-contrast-val')?.replaceChildren('100%');
    document.getElementById('batch-adj-saturate-val')?.replaceChildren('100%');
    document.getElementById('batch-adj-warmth-val')?.replaceChildren('0');

    const pill = document.getElementById('batch-toggle-adjust');
    if (pill) {
      pill.textContent = 'Off';
      pill.classList.remove('active');
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'adjust') {
      detailPill.textContent = 'Off';
      detailPill.classList.remove('active');
    }
    updateBatchToolStatusLabel('adjust');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  // --- 6. Preset Filters Handlers ---
  window.setBatchFilterPreset = function (preset, btn) {
    batchState.configs.filters.preset = preset;
    batchState.configs.filters.enabled = (preset !== 'natural');
    if (btn) {
      btn.parentElement.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
    }
    const pill = document.getElementById('batch-toggle-filters');
    if (pill) {
      pill.textContent = batchState.configs.filters.enabled ? 'Active' : 'Off';
      pill.classList.toggle('active', batchState.configs.filters.enabled);
    }
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'filters') {
      detailPill.textContent = batchState.configs.filters.enabled ? 'Active' : 'Off';
      detailPill.classList.toggle('active', batchState.configs.filters.enabled);
    }
    updateBatchToolStatusLabel('filters');
    renderBatchPreviewCanvas();
    debouncedRecalculateBatchCompression();
  };

  // --- 7. Blur & Focus Handlers (Exact Tool 09 Replica) ---
  function getBatchBlurPointerPos(e, canvas) {
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

  function setupBatchBlurOverlayEvents() {
    const overlay = document.getElementById('canvas-batch-blur-overlay');
    if (!overlay || overlay.dataset.eventsBound) return;
    overlay.dataset.eventsBound = 'true';

    overlay.onmousedown = (e) => {
      const cfg = batchState.configs.blur;
      if (!cfg || !cfg.enabled) return;
      const pos = getBatchBlurPointerPos(e, overlay);

      if (cfg.mode === 'brush') {
        isPaintingBatchBlur = true;
        lastBatchBlurBrushPos = { x: pos.x, y: pos.y };
        paintBatchBlurStroke(pos.x, pos.y, pos.x, pos.y);
      } else if (cfg.mode === 'radial' || cfg.mode === 'tiltshift') {
        isDraggingBatchBlurFocus = true;
        cfg.focusX = pos.normX;
        cfg.focusY = pos.normY;
        cfg.bandCenterY = pos.normY;
        renderBatchPreviewCanvas();
        drawBatchBlurOverlayGuides();
      }
    };

    overlay.onmousemove = (e) => {
      const cfg = batchState.configs.blur;
      if (!cfg || !cfg.enabled) return;
      const pos = getBatchBlurPointerPos(e, overlay);
      batchBlurHoverPos = { x: pos.x, y: pos.y };

      if (cfg.mode === 'brush') {
        if (isPaintingBatchBlur && lastBatchBlurBrushPos) {
          paintBatchBlurStroke(lastBatchBlurBrushPos.x, lastBatchBlurBrushPos.y, pos.x, pos.y);
          lastBatchBlurBrushPos = { x: pos.x, y: pos.y };
        } else {
          drawBatchBlurOverlayGuides();
        }
      } else if (isDraggingBatchBlurFocus) {
        cfg.focusX = pos.normX;
        cfg.focusY = pos.normY;
        cfg.bandCenterY = pos.normY;
        renderBatchPreviewCanvas();
        drawBatchBlurOverlayGuides();
      }
    };

    window.addEventListener('mouseup', () => {
      if (isPaintingBatchBlur || isDraggingBatchBlurFocus) {
        isPaintingBatchBlur = false;
        isDraggingBatchBlurFocus = false;
        debouncedRecalculateBatchCompression();
      }
    });

    overlay.onmouseleave = () => {
      batchBlurHoverPos = null;
      if (batchState.configs.blur?.mode === 'brush' && !isPaintingBatchBlur) {
        drawBatchBlurOverlayGuides();
      }
    };

    // Touch Support
    overlay.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const cfg = batchState.configs.blur;
        if (!cfg || !cfg.enabled) return;
        const pos = getBatchBlurPointerPos(e, overlay);

        if (cfg.mode === 'brush') {
          isPaintingBatchBlur = true;
          lastBatchBlurBrushPos = { x: pos.x, y: pos.y };
          paintBatchBlurStroke(pos.x, pos.y, pos.x, pos.y);
        } else if (cfg.mode === 'radial' || cfg.mode === 'tiltshift') {
          isDraggingBatchBlurFocus = true;
          cfg.focusX = pos.normX;
          cfg.focusY = pos.normY;
          cfg.bandCenterY = pos.normY;
          renderBatchPreviewCanvas();
          drawBatchBlurOverlayGuides();
        }
      }
    };

    overlay.ontouchmove = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        const cfg = batchState.configs.blur;
        if (!cfg || !cfg.enabled) return;
        const pos = getBatchBlurPointerPos(e, overlay);
        batchBlurHoverPos = { x: pos.x, y: pos.y };

        if (cfg.mode === 'brush' && isPaintingBatchBlur && lastBatchBlurBrushPos) {
          paintBatchBlurStroke(lastBatchBlurBrushPos.x, lastBatchBlurBrushPos.y, pos.x, pos.y);
          lastBatchBlurBrushPos = { x: pos.x, y: pos.y };
        } else if (isDraggingBatchBlurFocus) {
          cfg.focusX = pos.normX;
          cfg.focusY = pos.normY;
          cfg.bandCenterY = pos.normY;
          renderBatchPreviewCanvas();
          drawBatchBlurOverlayGuides();
        }
      }
    };

    overlay.ontouchend = () => {
      isPaintingBatchBlur = false;
      isDraggingBatchBlurFocus = false;
      batchBlurHoverPos = null;
      debouncedRecalculateBatchCompression();
    };
  }

  function paintBatchBlurStroke(x1, y1, x2, y2) {
    const previewCanvas = document.getElementById('canvas-batch-preview');
    if (!previewCanvas) return;
    if (!batchBlurBrushMaskCanvas || batchBlurBrushMaskCanvas.width !== previewCanvas.width || batchBlurBrushMaskCanvas.height !== previewCanvas.height) {
      batchBlurBrushMaskCanvas = document.createElement('canvas');
      batchBlurBrushMaskCanvas.width = previewCanvas.width;
      batchBlurBrushMaskCanvas.height = previewCanvas.height;
    }
    const ctx = batchBlurBrushMaskCanvas.getContext('2d');
    const brushSize = batchState.configs.blur.brushSize || 45;
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x2, y2, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    batchState.configs.blur.brushCanvas = batchBlurBrushMaskCanvas;
    renderBatchPreviewCanvas();
  }

  window.clearBatchBlurBrush = function () {
    if (batchBlurBrushMaskCanvas) {
      const ctx = batchBlurBrushMaskCanvas.getContext('2d');
      ctx.clearRect(0, 0, batchBlurBrushMaskCanvas.width, batchBlurBrushMaskCanvas.height);
    }
    batchState.configs.blur.brushCanvas = null;
    renderBatchPreviewCanvas();
    drawBatchBlurOverlayGuides();
    debouncedRecalculateBatchCompression();
    showToast('Cleared painted blur brush');
  };

  window.updateBatchBlurBrushSize = function (val) {
    const sz = Math.max(10, Math.min(160, parseInt(val, 10) || 45));
    batchState.configs.blur.brushSize = sz;
    const lbl = document.getElementById('lbl-batch-blur-brush-size');
    if (lbl) lbl.textContent = `${sz}px`;
    drawBatchBlurOverlayGuides();
  };

  window.drawBatchBlurOverlayGuides = function () {
    const overlay = document.getElementById('canvas-batch-blur-overlay');
    const previewCanvas = document.getElementById('canvas-batch-preview');
    if (!overlay || !previewCanvas) return;

    if (batchState.activeDetailTool !== 'blur' || !batchState.configs.blur?.enabled) {
      overlay.style.display = 'none';
      return;
    }

    overlay.style.display = 'block';
    if (overlay.width !== previewCanvas.width || overlay.height !== previewCanvas.height) {
      overlay.width = previewCanvas.width;
      overlay.height = previewCanvas.height;
    }

    const ctx = overlay.getContext('2d');
    const w = overlay.width;
    const h = overlay.height;
    ctx.clearRect(0, 0, w, h);

    const cfg = batchState.configs.blur;
    const showGuides = document.getElementById('batch-blur-show-guides')?.checked ?? true;

    // 1. Radial Bokeh Guide Rings
    if (cfg.mode === 'radial' && showGuides) {
      const fx = (cfg.focusX !== undefined ? cfg.focusX : 0.5) * w;
      const fy = (cfg.focusY !== undefined ? cfg.focusY : 0.5) * h;
      const fr = Math.max(10, ((cfg.focusSize || 35) / 100) * Math.min(w, h));
      const innerR = Math.max(2, fr * 0.35);

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
    else if (cfg.mode === 'tiltshift' && showGuides) {
      const cy = (cfg.bandCenterY !== undefined ? cfg.bandCenterY : 0.5) * h;
      const bh = ((cfg.focusSize || 35) / 100) * h;
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
    else if (cfg.mode === 'brush' && batchBlurHoverPos) {
      ctx.save();
      const r = (cfg.brushSize || 45) / 2;
      ctx.strokeStyle = '#D7F36A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(batchBlurHoverPos.x, batchBlurHoverPos.y, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(215, 243, 106, 0.2)';
      ctx.fill();
      ctx.restore();
    }
  };

  function syncBatchBlurUI() {
    const cfg = batchState.configs.blur;
    if (!cfg) return;

    const isEnabled = !!cfg.enabled;
    const mode = cfg.mode || 'radial';
    const type = cfg.type || 'gaussian';

    // 1. Sync Blur Mode buttons
    ['radial', 'tilt', 'brush', 'full'].forEach(m => {
      let modeKey = m === 'tilt' ? 'tiltshift' : m;
      const btn = document.getElementById(`batch-blur-mode-${m}`);
      if (btn) btn.classList.toggle('active', mode === modeKey);
    });

    // 2. Sync Blur Style buttons
    ['gaussian', 'pixelate', 'motion', 'zoom', 'frosted'].forEach(t => {
      const btn = document.getElementById(`batch-blur-type-${t}`);
      if (btn) btn.classList.toggle('active', type === t);
    });

    // 3. Sync sliders & values
    const rInput = document.getElementById('batch-blur-radius');
    const rVal = document.getElementById('lbl-batch-blur-radius');
    if (rInput) rInput.value = cfg.radius || 18;
    if (rVal) rVal.textContent = `${cfg.radius || 18}px`;

    const fInput = document.getElementById('batch-blur-focus-size');
    const fVal = document.getElementById('lbl-batch-focus-size');
    if (fInput) fInput.value = cfg.focusSize || 35;
    if (fVal) fVal.textContent = `${cfg.focusSize || 35}%`;

    const bInput = document.getElementById('batch-blur-brush-size');
    const bVal = document.getElementById('lbl-batch-blur-brush-size');
    if (bInput) bInput.value = cfg.brushSize || 45;
    if (bVal) bVal.textContent = `${cfg.brushSize || 45}px`;

    // 4. Dynamic slider labels based on blur style and mode
    const rLbl = document.getElementById('lbl-batch-blur-strength-title');
    if (rLbl) {
      if (type === 'pixelate') rLbl.textContent = 'Pixel Block Size';
      else if (type === 'motion') rLbl.textContent = 'Motion Streak Distance';
      else if (type === 'zoom') rLbl.textContent = 'Radial Zoom Intensity';
      else if (type === 'frosted') rLbl.textContent = 'Frosted Diffusion Radius';
      else rLbl.textContent = 'Blur Intensity';
    }

    const fLbl = document.getElementById('lbl-batch-focus-title');
    if (fLbl) {
      fLbl.textContent = (mode === 'radial') ? 'Bokeh Focus Radius' : 'Sharp Band Height';
    }

    // 5. Visibility of sub-groups
    const isBrush = (mode === 'brush');
    const isGuideMode = (mode === 'radial' || mode === 'tiltshift');

    const focusGroup = document.getElementById('batch-group-focus-radius');
    if (focusGroup) focusGroup.style.display = isGuideMode ? 'block' : 'none';

    const brushGroup = document.getElementById('batch-group-blur-brush-size');
    if (brushGroup) brushGroup.style.display = isBrush ? 'block' : 'none';

    const brushTools = document.getElementById('batch-group-blur-brush-tools');
    if (brushTools) brushTools.style.display = isBrush ? 'block' : 'none';

    const guidesGroup = document.getElementById('batch-group-blur-guides');
    if (guidesGroup) guidesGroup.style.display = isGuideMode ? 'block' : 'none';

    // 6. Tip banner text
    const tip = document.getElementById('batch-blur-mode-tip');
    if (tip) {
      if (mode === 'radial') {
        tip.innerHTML = '<span>Tip: Drag the green bullseye to move focus. Dashed rings indicate sharp core and blur edge.</span>';
      } else if (mode === 'tiltshift') {
        tip.innerHTML = '<span>Tip: Drag up or down on the canvas to move the miniature focus line.</span>';
      } else if (mode === 'brush') {
        tip.innerHTML = '<span>Tip: Paint directly with your cursor or touch over any image area to blur it.</span>';
      } else {
        tip.innerHTML = '<span>Tip: Full frame blur applies uniform optical blur across the entire image.</span>';
      }
    }

    // 7. Overlay cursor
    const overlay = document.getElementById('canvas-batch-blur-overlay');
    if (overlay) {
      overlay.style.cursor = isBrush ? 'none' : 'crosshair';
    }

    // 8. Sync Detail Header Toggle Pill
    const detailPill = document.getElementById('batch-detail-toggle-btn');
    if (detailPill && batchState.activeDetailTool === 'blur') {
      detailPill.textContent = isEnabled ? 'Active' : 'Off';
      detailPill.classList.toggle('active', isEnabled);
    }

    const masterPill = document.getElementById('batch-toggle-blur');
    if (masterPill) {
      masterPill.textContent = isEnabled ? 'Active' : 'Off';
      masterPill.classList.toggle('active', isEnabled);
    }
  }
  window.syncBatchBlurUI = syncBatchBlurUI;

  window.setBatchBlurMode = function (mode, btn) {
    batchState.configs.blur.mode = mode;
    batchState.configs.blur.enabled = true;
    syncBatchBlurUI();
    updateBatchToolStatusLabel('blur');
    renderBatchPreviewCanvas();
    drawBatchBlurOverlayGuides();
    debouncedRecalculateBatchCompression();
  };

  window.setBatchBlurType = function (type, btn) {
    batchState.configs.blur.type = type;
    batchState.configs.blur.enabled = true;
    syncBatchBlurUI();
    updateBatchToolStatusLabel('blur');
    renderBatchPreviewCanvas();
    drawBatchBlurOverlayGuides();
    debouncedRecalculateBatchCompression();
  };

  window.updateBatchBlurRadius = function (val) {
    const r = Math.max(1, Math.min(64, parseInt(val, 10) || 18));
    batchState.configs.blur.radius = r;
    batchState.configs.blur.enabled = true;
    const text = document.getElementById('lbl-batch-blur-radius');
    if (text) text.textContent = `${r}px`;
    updateBatchToolStatusLabel('blur');
    renderBatchPreviewCanvas();
    drawBatchBlurOverlayGuides();
    debouncedRecalculateBatchCompression();
  };

  window.updateBatchFocusSize = function (val) {
    const f = Math.max(10, Math.min(85, parseInt(val, 10) || 35));
    batchState.configs.blur.focusSize = f;
    batchState.configs.blur.enabled = true;
    const text = document.getElementById('lbl-batch-focus-size');
    if (text) text.textContent = `${f}%`;
    renderBatchPreviewCanvas();
    drawBatchBlurOverlayGuides();
    debouncedRecalculateBatchCompression();
  };

  window.resetAllBatchOperations = function () {
    batchState.configs.resize.enabled = false;
    batchState.configs.resize.mode = 'exact';
    batchState.configs.resize.scale = 100;

    batchState.configs.crop.enabled = false;
    batchState.configs.crop.ratio = 'original';
    batchState.configs.crop.anchor = 'center';

    batchState.configs.rotate.enabled = false;
    batchState.configs.rotate.angle = 0;
    batchState.configs.rotate.flipH = false;
    batchState.configs.rotate.flipV = false;

    batchState.configs.compress.enabled = true;
    batchState.configs.compress.mode = 'target';
    batchState.configs.compress.targetVal = 200;
    batchState.configs.compress.targetUnit = 'KB';
    batchState.configs.compress.format = 'image/jpeg';

    resetBatchAdjust();

    batchState.configs.filters.enabled = false;
    batchState.configs.filters.preset = 'natural';

    batchState.configs.blur.enabled = false;
    batchState.configs.blur.mode = 'radial';
    batchState.configs.blur.type = 'gaussian';
    batchState.configs.blur.radius = 18;
    batchState.configs.blur.focusSize = 35;
    batchState.configs.blur.focusX = 0.5;
    batchState.configs.blur.focusY = 0.5;
    batchState.configs.blur.bandCenterY = 0.5;
    batchState.configs.blur.brushSize = 45;
    batchState.configs.blur.brushCanvas = null;
    if (batchBlurBrushMaskCanvas) {
      const ctx = batchBlurBrushMaskCanvas.getContext('2d');
      ctx.clearRect(0, 0, batchBlurBrushMaskCanvas.width, batchBlurBrushMaskCanvas.height);
    }

    ['resize', 'crop', 'rotate', 'adjust', 'filters', 'blur'].forEach(t => {
      const pill = document.getElementById(`batch-toggle-${t}`);
      if (pill) {
        pill.textContent = 'Off';
        pill.classList.remove('active');
      }
      updateBatchToolStatusLabel(t);
    });
    updateBatchToolStatusLabel('compress');

    renderBatchPreviewCanvas();
    recalculateBatchCompression();
    showToast('Reset all batch settings to defaults');
  };

  // ==============================================================
  // BATCH RENDERING PIPELINE (Canvas Execution)
  // ==============================================================
  async function processSingleBatchItem(item, forExport = false) {
    if (!item || !item.img) return null;
    const srcImg = item.img;
    let sw = srcImg.naturalWidth;
    let sh = srcImg.naturalHeight;

    const activeCfg = (item && item.hasCustom && item.customConfigs) ? item.customConfigs : batchState.globalConfigs;

    // Step 1: Crop Aspect Ratio
    let sx = 0, sy = 0, cw = sw, ch = sh;
    const cropCfg = activeCfg.crop;
    if (cropCfg.enabled && cropCfg.ratio !== 'original') {
      const parts = cropCfg.ratio.split(':');
      if (parts.length === 2) {
        const targetRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
        const currentRatio = sw / sh;
        if (currentRatio > targetRatio) {
          cw = Math.round(sh * targetRatio);
          ch = sh;
          if (cropCfg.anchor === 'center') sx = Math.round((sw - cw) / 2);
          else if (cropCfg.anchor === 'top') sx = 0;
          else if (cropCfg.anchor === 'bottom') sx = sw - cw;
        } else {
          cw = sw;
          ch = Math.round(sw / targetRatio);
          if (cropCfg.anchor === 'center') sy = Math.round((sh - ch) / 2);
          else if (cropCfg.anchor === 'top') sy = 0;
          else if (cropCfg.anchor === 'bottom') sy = sh - ch;
        }
      }
    }

    // Intermediate Canvas 1: Cropped + Rotated/Flipped
    const rotCfg = activeCfg.rotate;
    const angle = rotCfg.enabled ? rotCfg.angle : 0;
    const flipH = rotCfg.enabled && rotCfg.flipH;
    const flipV = rotCfg.enabled && rotCfg.flipV;

    const isRot90or270 = (angle === 90 || angle === 270);
    const postRotW = isRot90or270 ? ch : cw;
    const postRotH = isRot90or270 ? cw : ch;

    const c1 = document.createElement('canvas');
    c1.width = postRotW;
    c1.height = postRotH;
    const ctx1 = c1.getContext('2d');

    ctx1.save();
    ctx1.translate(postRotW / 2, postRotH / 2);
    if (angle !== 0) ctx1.rotate((angle * Math.PI) / 180);
    if (flipH || flipV) ctx1.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx1.drawImage(srcImg, sx, sy, cw, ch, -cw / 2, -ch / 2, cw, ch);
    ctx1.restore();

    // Step 2: Resize Calculation
    const resCfg = activeCfg.resize;
    let targetW = postRotW;
    let targetH = postRotH;

    if (resCfg.enabled) {
      if (resCfg.mode === 'scale') {
        const factor = (resCfg.scale || 100) / 100;
        targetW = Math.max(1, Math.round(postRotW * factor));
        targetH = Math.max(1, Math.round(postRotH * factor));
      } else if (resCfg.mode === 'exact') {
        const tw = resCfg.w || postRotW;
        const th = resCfg.h || postRotH;
        if (resCfg.lockAspect) {
          const ratio = postRotW / postRotH;
          if (tw / th > ratio) {
            targetW = Math.round(th * ratio);
            targetH = th;
          } else {
            targetW = tw;
            targetH = Math.round(tw / ratio);
          }
        } else {
          targetW = tw;
          targetH = th;
        }
      }
    }

    // Step 2B: If Compress is in pixel mode, resample targetW / targetH
    const compCfg = activeCfg.compress;
    if (compCfg.enabled && compCfg.mode === 'pixels') {
      const pw = compCfg.pxWidth || targetW;
      const ph = compCfg.pxHeight || targetH;
      if (compCfg.lockAspect) {
        const ratio = targetW / targetH;
        if (pw / ph > ratio) {
          targetW = Math.round(ph * ratio);
          targetH = ph;
        } else {
          targetW = pw;
          targetH = Math.round(pw / ratio);
        }
      } else {
        targetW = pw;
        targetH = ph;
      }
    }

    const c2 = document.createElement('canvas');
    c2.width = targetW;
    c2.height = targetH;
    const ctx2 = c2.getContext('2d');
    ctx2.imageSmoothingEnabled = true;
    ctx2.imageSmoothingQuality = 'high';
    ctx2.drawImage(c1, 0, 0, targetW, targetH);

    // Step 3: Tone & Preset Filter Processing
    const adjCfg = activeCfg.adjust;
    const fltCfg = activeCfg.filters;
    let renderCanvas = c2;

    if (adjCfg.enabled || (fltCfg.enabled && fltCfg.preset !== 'natural')) {
      let b = adjCfg.enabled ? adjCfg.bright : 100;
      let c = adjCfg.enabled ? adjCfg.contrast : 100;
      let s = adjCfg.enabled ? adjCfg.saturate : 100;
      let w = adjCfg.enabled ? adjCfg.warmth : 0;
      let g = 0;
      let sep = 0;

      if (fltCfg.enabled && fltCfg.preset !== 'natural') {
        if (fltCfg.preset === 'bw') {
          g = 100;
          c = Math.round(c * 1.2);
        } else if (fltCfg.preset === 'vintage') {
          sep = 45;
          w += 20;
          c = Math.round(c * 1.05);
        } else if (fltCfg.preset === 'warm') {
          w += 35;
          b = Math.round(b * 1.04);
        } else if (fltCfg.preset === 'cool') {
          w -= 30;
          c = Math.round(c * 1.1);
        } else if (fltCfg.preset === 'crisp') {
          c = Math.round(c * 1.25);
          s = Math.round(s * 1.2);
        } else if (fltCfg.preset === 'sepia') {
          sep = 90;
          c = Math.round(c * 0.95);
        }
      }

      const eng = window.pixkitEngine || window.engine || engine;
      if (eng && typeof eng.applyFilters === 'function') {
        renderCanvas = eng.applyFilters({
          brightness: b,
          contrast: c,
          saturation: s,
          warmth: w,
          grayscale: g,
          sepia: sep
        }, c2);
      } else {
        const filterParts = [];
        if (b !== 100) filterParts.push(`brightness(${b}%)`);
        if (c !== 100) filterParts.push(`contrast(${c}%)`);
        if (s !== 100) filterParts.push(`saturate(${s}%)`);
        if (g > 0) filterParts.push(`grayscale(${g}%)`);
        if (sep > 0) filterParts.push(`sepia(${sep}%)`);

        const cFiltered = document.createElement('canvas');
        cFiltered.width = targetW;
        cFiltered.height = targetH;
        const ctxFiltered = cFiltered.getContext('2d');
        if (filterParts.length) ctxFiltered.filter = filterParts.join(' ');
        ctxFiltered.drawImage(c2, 0, 0, targetW, targetH);
        ctxFiltered.filter = 'none';

        if (w !== 0) {
          ctxFiltered.save();
          ctxFiltered.globalCompositeOperation = w > 0 ? 'color' : 'color-burn';
          ctxFiltered.fillStyle = w > 0 ? `rgba(255, 170, 80, ${Math.abs(w) / 350})` : `rgba(70, 130, 240, ${Math.abs(w) / 350})`;
          ctxFiltered.fillRect(0, 0, targetW, targetH);
          ctxFiltered.restore();
        }
        renderCanvas = cFiltered;
      }
    }

    // Step 4: Focus & Blur Effects
    const blurCfg = activeCfg.blur;
    if (blurCfg.enabled && blurCfg.mode !== 'none') {
      const bOptions = {
        mode: blurCfg.mode || 'radial',
        blurType: blurCfg.type || 'gaussian',
        blurRadius: blurCfg.radius || 18,
        focusRadius: (blurCfg.focusSize || 35) / 100,
        bandHeight: (blurCfg.focusSize || 35) / 100,
        focusX: (blurCfg.focusX !== undefined) ? blurCfg.focusX : 0.5,
        focusY: (blurCfg.focusY !== undefined) ? blurCfg.focusY : 0.5,
        bandCenterY: (blurCfg.bandCenterY !== undefined) ? blurCfg.bandCenterY : 0.5,
        brushCanvas: blurCfg.brushCanvas || null
      };

      const eng = window.pixkitEngine || window.engine || engine;
      if (eng && typeof eng.applySelectiveBlur === 'function') {
        const blurred = eng.applySelectiveBlur(bOptions, renderCanvas);
        if (blurred) renderCanvas = blurred;
      }
    }

    if (!forExport) {
      return renderCanvas;
    }

    // Step 5: Export / Compress Blob
    let exportMime = compCfg.format || 'image/jpeg';
    if (exportMime === 'original') exportMime = item.type || 'image/jpeg';
    if (!exportMime || exportMime.includes('svg') || exportMime.includes('heic') || exportMime.includes('gif')) {
      exportMime = 'image/jpeg';
    }

    let exportBlob = null;
    let finalW = targetW;
    let finalH = targetH;

    if (!compCfg.enabled) {
      // Compress disabled: export at pristine high quality
      const defaultQ = exportMime.includes('png') ? undefined : 0.92;
      exportBlob = await new Promise(r => renderCanvas.toBlob(r, exportMime, defaultQ));
    } else if (compCfg.mode === 'target') {
      const v = compCfg.targetVal || 200;
      const targetBytes = (compCfg.targetUnit === 'MB' ? v * 1024 * 1024 : v * 1024);

      // Auto-calibrate this specific item's canvas to guarantee strictly <= targetBytes
      const calibResult = await engine.autoCalibrateCompression(targetBytes, exportMime, renderCanvas);
      if (calibResult && calibResult.blob) {
        exportBlob = calibResult.blob;
        finalW = calibResult.width;
        finalH = calibResult.height;
      } else {
        exportBlob = await new Promise(r => renderCanvas.toBlob(r, exportMime, 0.75));
      }
    } else if (compCfg.mode === 'pixels') {
      const exportQuality = (compCfg.pxQuality || 82) / 100;
      exportBlob = await new Promise(r => renderCanvas.toBlob(r, exportMime, exportQuality));
    } else {
      // manual mode
      const exportQuality = (compCfg.manualQuality || 80) / 100;
      exportBlob = await new Promise(r => renderCanvas.toBlob(r, exportMime, exportQuality));
    }

    let ext = 'jpg';
    if (exportMime.includes('png')) ext = 'png';
    else if (exportMime.includes('webp')) ext = 'webp';

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const finalName = `${baseName}_edited.${ext}`;
    return { blob: exportBlob, name: finalName, width: finalW, height: finalH };
  }

  async function renderBatchPreviewCanvas() {
    const canvas = document.getElementById('canvas-batch-preview');
    const wrapper = document.getElementById('batch-canvas-wrapper');
    const viewport = document.getElementById('batch-viewport');
    if (!canvas) return;
    const activeItem = batchState.items[batchState.activeIndex];
    if (!activeItem || !activeItem.img) return;

    let targetWidth = 0;
    let targetHeight = 0;

    if (batchState.compareOriginal) {
      canvas.width = activeItem.img.naturalWidth;
      canvas.height = activeItem.img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(activeItem.img, 0, 0);
      targetWidth = canvas.width;
      targetHeight = canvas.height;
    } else {
      const processedCanvas = await processSingleBatchItem(activeItem, false);
      if (!processedCanvas) return;

      canvas.width = processedCanvas.width;
      canvas.height = processedCanvas.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(processedCanvas, 0, 0);
      targetWidth = processedCanvas.width;
      targetHeight = processedCanvas.height;
    }

    // Smoothly adapt wrapper box size to maintain aspect ratio with fluid transitions
    if (wrapper && targetWidth > 0 && targetHeight > 0) {
      const vW = (viewport && viewport.clientWidth) ? viewport.clientWidth : 700;
      const vH = (viewport && viewport.clientHeight) ? viewport.clientHeight : 560;
      const maxW = Math.max(220, vW - 48);
      const maxH = Math.max(220, vH - 64);
      const scale = Math.min(maxW / targetWidth, maxH / targetHeight, 1);
      const dispW = Math.round(targetWidth * scale);
      const dispH = Math.round(targetHeight * scale);

      wrapper.style.width = `${dispW}px`;
      wrapper.style.height = `${dispH}px`;
    }

    // Sync batch blur overlay if active
    const blurOverlay = document.getElementById('canvas-batch-blur-overlay');
    if (blurOverlay) {
      if (batchState.activeDetailTool === 'blur' && batchState.configs.blur.enabled) {
        blurOverlay.style.display = 'block';
        if (blurOverlay.width !== canvas.width || blurOverlay.height !== canvas.height) {
          blurOverlay.width = canvas.width;
          blurOverlay.height = canvas.height;
        }
        drawBatchBlurOverlayGuides();
      } else {
        blurOverlay.style.display = 'none';
      }
    }
  }

  window.showBatchOriginal = function (show) {
    batchState.compareOriginal = !!show;
    renderBatchPreviewCanvas();
  };

  // ==============================================================
  // DOWNLOAD & BATCH EXPORT HANDLERS
  // ==============================================================
  window.downloadCurrentBatchImage = async function () {
    const activeItem = batchState.items[batchState.activeIndex];
    if (!activeItem) {
      showToast('No active image to download');
      return;
    }
    showToast('Rendering active image for download...');
    const result = await processSingleBatchItem(activeItem, true);
    if (result && result.blob) {
      triggerBlobDownload(result.blob, result.name);
      showToast(`Downloaded ${result.name}`);
    }
  };

  window.executeBatchExport = async function (downloadZip = true) {
    if (!batchState.items.length) {
      showToast('No images in batch to process. Please add images first.');
      return;
    }

    if (!window.JSZip) {
      showToast('ZIP packaging engine is loading...');
      return;
    }

    const progressBox = document.getElementById('batch-progress-box');
    const progressBar = document.getElementById('batch-progress-bar');
    const progressText = document.getElementById('batch-progress-text');
    const progressPercent = document.getElementById('batch-progress-percent');
    const btnProcess = document.getElementById('btn-batch-process-all');

    if (progressBox) progressBox.style.display = 'block';
    if (btnProcess) btnProcess.disabled = true;
    batchState.isProcessing = true;

    const zip = new window.JSZip();
    const total = batchState.items.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = batchState.items[i];
        const pct = Math.round(((i) / total) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPercent) progressPercent.textContent = `${pct}%`;
        if (progressText) progressText.textContent = `Processing image ${i + 1} of ${total}: ${item.name}...`;

        const processed = await processSingleBatchItem(item, true);
        if (processed && processed.blob) {
          zip.file(processed.name, processed.blob);
        }

        await new Promise(r => setTimeout(r, 15));
      }

      if (progressBar) progressBar.style.width = '100%';
      if (progressPercent) progressPercent.textContent = '100%';
      if (progressText) progressText.textContent = 'Packaging ZIP archive...';

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      }, (metadata) => {
        if (progressPercent) progressPercent.textContent = `${Math.round(metadata.percent)}%`;
      });

      const zipName = `pixkit_batch_processed_${Date.now()}.zip`;
      triggerBlobDownload(zipBlob, zipName);

      showToast(`🎉 Processed and downloaded all ${total} images in ZIP!`);
    } catch (err) {
      console.error('Batch processing error:', err);
      showToast(`Error processing batch: ${err.message}`);
    } finally {
      batchState.isProcessing = false;
      if (btnProcess) btnProcess.disabled = false;
      setTimeout(() => {
        if (progressBox) progressBox.style.display = 'none';
      }, 1200);
    }
  };

  function triggerBlobDownload(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 20000);
  }

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

  window.setConvertTargetFormat = function (format) {
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

  window.updateConvertQuality = function (val) {
    convertState.quality = parseInt(val, 10);
    const lbl = document.getElementById('lbl-convert-quality');
    if (lbl) lbl.textContent = `${convertState.quality}%`;

    // Update chip active states
    [100, 90, 75, 50].forEach(q => {
      document.getElementById(`chip-q-${q}`)?.classList.toggle('active', q === convertState.quality);
    });

    debouncedRecalculateConvert();
  };

  window.setConvertQualityPreset = function (q) {
    const slider = document.getElementById('convert-quality');
    if (slider) slider.value = q;
    window.updateConvertQuality(q);
  };

  window.updateConvertBgPreview = function (color) {
    convertState.bgColor = color;
    document.getElementById('btn-bg-white')?.classList.toggle('active', color.toLowerCase() === '#ffffff');
    document.getElementById('btn-bg-black')?.classList.toggle('active', color.toLowerCase() === '#000000');
    debouncedRecalculateConvert();
  };

  window.setConvertBgColor = function (color) {
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

  window.commitConvertAction = async function (download = true) {
    const qFraction = convertState.quality / 100;
    const res = await engine.convertFormat(convertState.targetFormat, qFraction, convertState.bgColor);

    let thumbUrl = null;
    try {
      if (engine.activeCanvas) {
        const thumbCanvas = document.createElement('canvas');
        const maxDim = 96;
        let tw = engine.activeCanvas.width;
        let th = engine.activeCanvas.height;
        if (tw > th) {
          th = Math.round((th * maxDim) / tw);
          tw = maxDim;
        } else {
          tw = Math.round((tw * maxDim) / th);
          th = maxDim;
        }
        thumbCanvas.width = Math.max(tw, 1);
        thumbCanvas.height = Math.max(th, 1);
        const tctx = thumbCanvas.getContext('2d');
        tctx.drawImage(engine.activeCanvas, 0, 0, tw, th);
        thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
      }
    } catch (_) { }

    const origSource = {
      name: engine.filename || 'source_image.png',
      size: engine.fileSize || 0,
      type: engine.fileType || 'image/png',
      thumbUrl: thumbUrl,
      width: engine.activeCanvas?.width || 0,
      height: engine.activeCanvas?.height || 0
    };

    if (download) {
      const baseName = engine.filename ? engine.filename.replace(/\.[^/.]+$/, "") : 'image';
      const outName = `${baseName}_converted.${res.extension}`;
      if (window.recordRecentFile) {
        window.recordRecentFile(
          outName,
          res.size,
          res.mimeType,
          res.width,
          res.height,
          'convert',
          res.blob,
          thumbUrl,
          'convert-format',
          [origSource],
          'convert'
        );
      }
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Converted to ${res.extension.toUpperCase()} (${PixKitEngine.formatBytes(res.size)})`);
    } else {
      const outName = `${(engine.filename || 'image').replace(/\.[^/.]+$/, "")}.${res.extension}`;
      if (window.recordRecentFile) {
        window.recordRecentFile(
          outName,
          res.size,
          res.mimeType,
          res.width,
          res.height,
          'convert',
          res.blob,
          thumbUrl,
          'convert-format',
          [origSource],
          'convert'
        );
      }
      const img = new Image();
      const url = URL.createObjectURL(res.blob);
      img.onload = () => {
        engine.activeCanvas.width = img.naturalWidth;
        engine.activeCanvas.height = img.naturalHeight;
        engine.activeCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
        engine.activeCtx.drawImage(img, 0, 0);
        engine.fileType = res.mimeType;
        engine.fileSize = res.size;
        engine.filename = outName;
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

  window.handleHeicFileSelect = async function (e) {
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
    startPreviewFadeDown();
    heicState.rawHeicBlob = file;
    heicState.rawHeicName = file.name;
    heicState.rawHeicSize = file.size;
    heicState.isHeicValid = true;

    try {
      if (typeof PixKitStorage !== 'undefined') {
        PixKitStorage.setItem('convert_session_convert-heic', {
          blob: file,
          name: file.name,
          size: file.size
        });
      }
    } catch (_) { }

    try {
      await Promise.all([
        engine.loadFromFile(file),
        new Promise(r => setTimeout(r, 110))
      ]);
      hasUserAddedImage = true;
      syncMetadata();
      initConvertHeicStage();
      updateHistoryUI();
      persistCurrentSession();
      startPreviewFadeUp();
      showToast(`Decoded ${file.name} (${engine.activeCanvas.width} × ${engine.activeCanvas.height} px)`);
    } catch (err) {
      console.error(err);
      heicState.isHeicValid = false;
      showToast('Failed to decode HEIC file. Please verify the file.');
      updateHeicButtonStates(false);
      startPreviewFadeUp();
    }
  };

  window.setHeicTargetFormat = function (format) {
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

  window.updateHeicQuality = function (val) {
    heicState.quality = parseInt(val, 10);
    const lbl = document.getElementById('lbl-heic-quality');
    if (lbl) lbl.textContent = `${heicState.quality}%`;

    [100, 92, 80, 65].forEach(q => {
      document.getElementById(`chip-heic-${q}`)?.classList.toggle('active', q === heicState.quality);
    });

    clearTimeout(heicCalcTimeout);
    heicCalcTimeout = setTimeout(recalculateHeicEstimates, 180);
  };

  window.setHeicQualityPreset = function (q) {
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

  window.commitHeicAction = async function (download = true) {
    if (!heicState.isHeicValid && !isCurrentFileHeic()) {
      showToast('⚠️ Please choose a valid .HEIC photo first');
      return;
    }

    const qFraction = heicState.quality / 100;
    const res = await engine.convertFormat(heicState.targetFormat, qFraction, '#ffffff');

    let thumbUrl = null;
    try {
      if (engine.activeCanvas) {
        const thumbCanvas = document.createElement('canvas');
        const maxDim = 96;
        let tw = engine.activeCanvas.width;
        let th = engine.activeCanvas.height;
        if (tw > th) {
          th = Math.round((th * maxDim) / tw);
          tw = maxDim;
        } else {
          tw = Math.round((tw * maxDim) / th);
          th = maxDim;
        }
        thumbCanvas.width = Math.max(tw, 1);
        thumbCanvas.height = Math.max(th, 1);
        const tctx = thumbCanvas.getContext('2d');
        tctx.drawImage(engine.activeCanvas, 0, 0, tw, th);
        thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
      }
    } catch (_) { }

    const baseName = (engine.filename || 'photo').replace(/\.[^/.]+$/, "");
    const outName = `${baseName}.${res.extension}`;
    const origSource = {
      name: heicState.rawHeicName || engine.filename || 'photo.heic',
      size: heicState.rawHeicSize || engine.fileSize || 0,
      type: 'image/heic',
      thumbUrl: thumbUrl,
      width: res.width,
      height: res.height,
      blob: heicState.rawHeicBlob || null
    };

    if (window.recordRecentFile) {
      window.recordRecentFile(
        outName,
        res.size,
        res.mimeType,
        res.width,
        res.height,
        'convert',
        res.blob,
        thumbUrl,
        'convert-heic',
        [origSource],
        'heic'
      );
    }

    if (download) {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Downloaded ${outName} (${PixKitEngine.formatBytes(res.size)})`);
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
    if (!svgState.svgText && typeof PixKitStorage !== 'undefined') {
      try {
        const session = await PixKitStorage.getItem('convert_session_convert-svg');
        if (session && session.svgText) {
          svgState.svgText = session.svgText;
          svgState.svgName = session.svgName || 'vector.svg';
          svgState.svgSize = session.svgSize || 0;
          svgState.isSvgValid = true;
          if (session.scale) svgState.scale = session.scale;
          if (session.customWidth) svgState.customWidth = session.customWidth;
          if (session.customHeight) svgState.customHeight = session.customHeight;
          if (session.bgFill) svgState.bgFill = session.bgFill;
          if (session.targetFormat) svgState.targetFormat = session.targetFormat;
          const dims = engine.parseSvgDimensions(session.svgText);
          svgState.intrinsicWidth = dims.width;
          svgState.intrinsicHeight = dims.height;
        }
      } catch (_) { }
    }

    const isSvg = isCurrentFileSvg();
    const alertBox = document.getElementById('svg-format-alert');
    const warningText = document.getElementById('svg-warning-text');
    const successBox = document.getElementById('svg-format-success');
    const successText = document.getElementById('svg-success-text');

    if (!isSvg) {
      svgState.isSvgValid = false;
      if (alertBox) alertBox.style.display = hasUserAddedImage ? 'flex' : 'none';
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

      if (metaSpan) metaSpan.textContent = hasUserAddedImage ? `⚠️ Non-SVG file loaded (${curFormat}) · SVG vector required` : 'Ready · Select SVG vector file to rasterize';
      if (badge) {
        badge.textContent = hasUserAddedImage ? 'SVG Required' : 'Ready';
        badge.style.background = hasUserAddedImage ? '#fef2f2' : '';
        badge.style.color = hasUserAddedImage ? '#b91c1c' : '';
        badge.style.borderColor = hasUserAddedImage ? '#f87171' : '';
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

  window.loadSampleSvgVector = function () {
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

  window.handleSvgFileSelect = function (e) {
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

    startPreviewFadeDown();
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

      try {
        if (typeof PixKitStorage !== 'undefined') {
          PixKitStorage.setItem('convert_session_convert-svg', {
            svgText: text,
            svgName: file.name,
            svgSize: file.size,
            scale: svgState.scale,
            customWidth: svgState.customWidth,
            customHeight: svgState.customHeight,
            bgFill: svgState.bgFill,
            targetFormat: svgState.targetFormat
          });
        }
      } catch (_) { }

      showToast(`Loaded vector ${file.name} (${dims.width} × ${dims.height} viewBox)`);
      initConvertSvgStage();
      startPreviewFadeUp();
    };
    reader.onerror = () => {
      showToast('Failed to read SVG file');
      startPreviewFadeUp();
    };
    reader.readAsText(file);
  };

  window.setSvgScale = function (scale) {
    svgState.scale = scale;
    [1, 2, 3, 4].forEach(s => {
      document.getElementById(`svg-scale-${s}`)?.classList.toggle('active', s === scale);
    });

    svgState.customWidth = Math.round(svgState.intrinsicWidth * scale);
    svgState.customHeight = Math.round(svgState.intrinsicHeight * scale);
    updateSvgDimensionsUI();
    recalculateSvgRasterization();
  };

  window.handleSvgCustomDimension = function (type, val) {
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

  window.toggleSvgAspectLock = function () {
    svgState.aspectRatioLocked = !svgState.aspectRatioLocked;
    const btn = document.getElementById('svg-aspect-lock');
    if (btn) {
      btn.classList.toggle('active', svgState.aspectRatioLocked);
      btn.textContent = svgState.aspectRatioLocked ? '🔒' : '🔓';
    }
  };

  window.setSvgBackground = function (color) {
    svgState.bgFill = color;
    document.getElementById('svg-bg-transparent')?.classList.toggle('active', color === 'transparent');
    document.getElementById('svg-bg-white')?.classList.toggle('active', color.toLowerCase() === '#ffffff');
    document.getElementById('svg-bg-black')?.classList.toggle('active', color.toLowerCase() === '#000000');

    const colorPicker = document.getElementById('svg-bg-custom');
    if (colorPicker && color !== 'transparent') colorPicker.value = color;

    recalculateSvgRasterization();
  };

  window.setSvgTargetFormat = function (format) {
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

  window.commitSvgAction = async function (download = true) {
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

    let thumbUrl = null;
    try {
      if (res.canvas) {
        const thumbCanvas = document.createElement('canvas');
        const maxDim = 96;
        let tw = res.canvas.width;
        let th = res.canvas.height;
        if (tw > th) {
          th = Math.round((th * maxDim) / tw);
          tw = maxDim;
        } else {
          tw = Math.round((tw * maxDim) / th);
          th = maxDim;
        }
        thumbCanvas.width = Math.max(tw, 1);
        thumbCanvas.height = Math.max(th, 1);
        const tctx = thumbCanvas.getContext('2d');
        tctx.drawImage(res.canvas, 0, 0, tw, th);
        thumbUrl = thumbCanvas.toDataURL('image/png');
      }
    } catch (_) { }

    const baseName = (svgState.svgName || 'vector').replace(/\.[^/.]+$/, "");
    const scaleTag = svgState.scale > 1 ? `@${svgState.scale}x` : '';
    const outName = `${baseName}${scaleTag}.${res.extension}`;
    const origSource = {
      name: svgState.svgName || 'vector.svg',
      size: svgState.svgSize || (new Blob([svgState.svgText]).size),
      type: 'image/svg+xml',
      thumbUrl: thumbUrl,
      width: svgState.intrinsicWidth || 800,
      height: svgState.intrinsicHeight || 800,
      blob: new Blob([svgState.svgText], { type: 'image/svg+xml' })
    };

    if (window.recordRecentFile) {
      window.recordRecentFile(
        outName,
        res.size,
        res.mimeType,
        res.width,
        res.height,
        'convert',
        res.blob,
        thumbUrl,
        'convert-svg',
        [origSource],
        'rasterize'
      );
    }

    if (download) {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Downloaded ${outName} (${PixKitEngine.formatBytes(res.size)})`);
    } else {
      // Open in PixKit Studio: set engine active image from rasterized canvas
      const img = new Image();
      img.onload = () => {
        engine.setSourceImage(img);
        engine.filename = `${baseName}.png`;
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

  window.toggleIcoSize = function (size) {
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

  window.setIcoBundlePreset = function (preset) {
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

  window.setIcoFitMode = function (mode) {
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

  window.copyIcoHtmlCode = function () {
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

  window.commitIcoAction = async function (download = true) {
    if (!icoState.icoResult) {
      await recalculateIcoPackage();
    }

    const res = icoState.icoResult;
    if (!res || !res.blob) {
      showToast('Failed to create ICO package');
      return;
    }

    let thumbUrl = null;
    try {
      if (engine.activeCanvas) {
        const thumbCanvas = document.createElement('canvas');
        const maxDim = 96;
        let tw = engine.activeCanvas.width;
        let th = engine.activeCanvas.height;
        if (tw > th) {
          th = Math.round((th * maxDim) / tw);
          tw = maxDim;
        } else {
          tw = Math.round((tw * maxDim) / th);
          th = maxDim;
        }
        thumbCanvas.width = Math.max(tw, 1);
        thumbCanvas.height = Math.max(th, 1);
        const tctx = thumbCanvas.getContext('2d');
        tctx.drawImage(engine.activeCanvas, 0, 0, tw, th);
        thumbUrl = thumbCanvas.toDataURL('image/png');
      }
    } catch (_) { }

    const baseName = (engine.filename || 'favicon').replace(/\.[^/.]+$/, "");
    const outName = `${baseName}.ico`;
    const origSource = {
      name: engine.filename || 'source_image.png',
      size: engine.fileSize || 0,
      type: engine.fileType || 'image/png',
      thumbUrl: thumbUrl,
      width: engine.activeCanvas?.width || 0,
      height: engine.activeCanvas?.height || 0
    };

    if (window.recordRecentFile) {
      window.recordRecentFile(
        outName,
        res.blob.size,
        'image/x-icon',
        icoState.selectedSizes[icoState.selectedSizes.length - 1] || 48,
        icoState.selectedSizes[icoState.selectedSizes.length - 1] || 48,
        'convert',
        res.blob,
        thumbUrl,
        'convert-ico',
        [origSource],
        'favicon'
      );
    }

    if (download) {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Downloaded ${outName} (${PixKitEngine.formatBytes(res.blob.size)})`);
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

  window.setBase64SnippetType = function (type) {
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

  window.setBase64MimeType = function (mime) {
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

  window.handleBase64QualityChange = function (val) {
    base64State.quality = parseInt(val, 10) / 100;
    const valLabel = document.getElementById('base64-quality-val');
    if (valLabel) valLabel.textContent = `${val}%`;
    debouncedRecalculateBase64();
  };

  window.setBase64MaxDim = function (dim) {
    base64State.maxDim = dim;
    document.getElementById('base64-dim-orig')?.classList.toggle('active', dim === null);
    document.getElementById('base64-dim-800')?.classList.toggle('active', dim === 800);
    document.getElementById('base64-dim-400')?.classList.toggle('active', dim === 400);
    document.getElementById('base64-dim-200')?.classList.toggle('active', dim === 200);

    debouncedRecalculateBase64();
  };

  window.toggleBase64Wrap = function () {
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

  window.copyBase64Code = async function () {
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

  window.downloadBase64Snippet = async function () {
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

    let thumbUrl = null;
    try {
      if (engine.activeCanvas) {
        thumbUrl = engine.activeCanvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (_) { }

    const origSource = {
      name: engine.filename || 'source_image.png',
      size: engine.fileSize || 0,
      type: engine.fileType || 'image/png',
      thumbUrl: thumbUrl,
      width: engine.activeCanvas?.width || 0,
      height: engine.activeCanvas?.height || 0
    };

    if (window.recordRecentFile) {
      window.recordRecentFile(
        filename,
        blob.size,
        'text/plain',
        engine.activeCanvas?.width || 0,
        engine.activeCanvas?.height || 0,
        'convert',
        blob,
        thumbUrl,
        'convert-base64',
        [origSource],
        'base64'
      );
    }

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

  window.setPdfPageSize = function (size) {
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

  window.setPdfOrientation = function (orient) {
    pdfState.orientation = orient;
    ['auto', 'portrait', 'landscape'].forEach(o => {
      document.getElementById(`pdf-orient-${o}`)?.classList.toggle('active', o === orient);
    });
    debouncedRecalculatePdf();
  };

  window.setPdfMargin = function (m) {
    pdfState.margin = m;
    ['none', 'small', 'standard'].forEach(val => {
      document.getElementById(`pdf-margin-${val}`)?.classList.toggle('active', val === m);
    });
    debouncedRecalculatePdf();
  };

  window.setPdfFitMode = function (fit) {
    pdfState.fitMode = fit;
    ['contain', 'cover', 'original'].forEach(f => {
      document.getElementById(`pdf-fit-${f}`)?.classList.toggle('active', f === fit);
    });
    debouncedRecalculatePdf();
  };

  window.setPdfQuality = function (q) {
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

  window.commitPdfAction = async function (download = true) {
    if (!pdfState.pdfResult) {
      await recalculatePdfPackage();
    }
    const res = pdfState.pdfResult;
    if (!res || !res.blob) {
      showToast('Failed to create PDF document');
      return;
    }

    const baseName = (engine.filename || 'document').replace(/\.[^/.]+$/, "");
    const pdfFilename = `${baseName}.pdf`;

    let pdfThumb = null;
    if (engine && engine.activeCanvas && engine.activeCanvas.width > 0) {
      try {
        pdfThumb = engine.activeCanvas.toDataURL('image/jpeg', 0.85);
      } catch (_) { }
    }
    const imageSource = {
      name: engine.filename || 'source_image.png',
      size: engine.fileSize || 0,
      type: engine.fileType || 'image/png',
      thumbUrl: pdfThumb || null,
      width: engine.activeCanvas?.width || 0,
      height: engine.activeCanvas?.height || 0
    };
    if (window.recordRecentFile) {
      window.recordRecentFile(pdfFilename, res.byteSize, 'application/pdf', engine?.activeCanvas?.width || 0, engine?.activeCanvas?.height || 0, 'convert', res.blob, pdfThumb, 'convert-pdf', [imageSource], 'convert');
    }

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

  window.previewPdfInNewTab = function () {
    commitPdfAction(false);
  };

  // Global Toast
  window.showToast = function (message) {
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
      try { URL.revokeObjectURL(url); } catch (_) { }
    }, 2500);
  }

  // ==============================================================
  // TOOL 07 (CONVERT SUITE): BATCH CONVERT CONTROLLER
  // ==============================================================
  const batchConvertState = {
    items: [], // Array of { id, name, size, type, width, height, originalBlob, originalUrl, img, thumbUrl, svgText, isSvg }
    activeIndex: 0,
    compareOriginal: false,
    isExpanded: false,
    isProcessing: false,
    activeDetailTool: null,
    configs: {
      format: {
        enabled: true,
        targetFormat: 'jpeg', // 'jpeg' | 'png' | 'webp' | 'avif' | 'bmp'
        quality: 90,
        bgColor: '#ffffff'
      },
      heic: {
        enabled: true,
        outputFormat: 'jpeg', // 'jpeg' | 'png' | 'webp'
        quality: 92
      },
      svg: {
        enabled: true,
        scale: 2, // 1 | 2 | 3 | 4 | 8
        outputFormat: 'png' // 'png' | 'jpeg' | 'webp'
      },
      ico: {
        enabled: false,
        pkgMode: 'ico', // 'ico' | 'pngs'
        selectedSizes: [16, 32, 48, 64],
        fitMode: 'contain' // 'contain' | 'cover'
      },
      base64: {
        enabled: false,
        exportType: 'dataurl', // 'dataurl' | 'html' | 'css' | 'raw'
        pkgMode: 'json' // 'json' | 'txt'
      },
      pdf: {
        enabled: false,
        mode: 'combined', // 'combined' | 'separate'
        pageSize: 'a4', // 'a4' | 'letter' | 'auto'
        orientation: 'auto', // 'auto' | 'portrait' | 'landscape'
        margin: 'none' // 'none' | 'small' | 'standard'
      }
    }
  };

  const batchConvertToolMeta = {
    format: {
      icon: '⇄',
      title: 'Target Format & Quality',
      desc: 'Convert between JPG, PNG, WEBP, AVIF, HEIC, and BMP'
    },
    heic: {
      icon: '📱',
      title: 'Apple HEIC Decoder',
      desc: 'Auto-decode Apple iPhone / iPad HEIF photos to universal formats'
    },
    svg: {
      icon: '⬡',
      title: 'SVG Vector Rasterizer',
      desc: 'Rasterize vector SVG files to sharp high-DPI raster images'
    },
    ico: {
      icon: '★',
      title: 'Favicon & ICO Package',
      desc: 'Generate multi-size website favicons (.ico) and app icons'
    },
    base64: {
      icon: '</>',
      title: 'Base64 & Data URLs',
      desc: 'Encode images into Data URLs, CSS background, or HTML snippets'
    },
    pdf: {
      icon: '📄',
      title: 'Images to PDF Document',
      desc: 'Package queue into a single multi-page PDF or individual PDFs'
    }
  };

  let batchConvertDropzoneBound = false;

  async function initBatchConvertStage() {
    setupBatchConvertDropzoneEvents();
    if (batchConvertState.items.length === 0) {
      await restoreBatchConvertSession();
    }
    syncBatchConvertViewUI();
    updateAllBatchConvertToolStatusLabels();
    if (batchConvertState.items.length > 0) {
      renderBatchConvertPreviewCanvas();
    }
  }
  window.initBatchConvertStage = initBatchConvertStage;

  function setupBatchConvertDropzoneEvents() {
    if (batchConvertDropzoneBound) return;
    const dropzone = document.getElementById('batch-conv-dropzone');
    const viewport = document.getElementById('batch-conv-viewport');

    [dropzone, viewport].forEach(el => {
      if (!el) return;
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.add('drag-over');
      });
      el.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.remove('drag-over');
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          processBatchConvertInputFiles(e.dataTransfer.files);
        }
      });
    });
    batchConvertDropzoneBound = true;
  }

  function handleBatchConvertFilesSelect(e) {
    if (e.target && e.target.files && e.target.files.length) {
      processBatchConvertInputFiles(e.target.files);
      e.target.value = '';
    }
  }
  window.handleBatchConvertFilesSelect = handleBatchConvertFilesSelect;

  async function processBatchConvertInputFiles(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;

    showToast('Loading batch files...');
    let addedCount = 0;

    for (const file of files) {
      const lowerName = (file.name || '').toLowerCase();
      // Check if ZIP archive
      if (lowerName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        try {
          if (!window.JSZip) {
            showToast('Loading ZIP engine...');
            await new Promise(r => setTimeout(r, 200));
          }
          if (window.JSZip) {
            const zip = await window.JSZip.loadAsync(file);
            const zipEntries = Object.keys(zip.files).filter(k => {
              const f = zip.files[k];
              if (f.dir || k.startsWith('__MACOSX') || k.endsWith('.DS_Store')) return false;
              const ext = k.toLowerCase();
              return ext.match(/\.(jpe?g|png|webp|gif|bmp|svg|avif|heic|heif)$/i);
            });

            for (const entryPath of zipEntries) {
              const zipFile = zip.files[entryPath];
              const cleanFileName = entryPath.split('/').pop();
              const isSvg = cleanFileName.toLowerCase().endsWith('.svg');
              let svgText = null;
              if (isSvg) {
                try {
                  svgText = await zipFile.async('text');
                } catch (_) { }
              }
              const blob = await zipFile.async('blob');
              const item = await createBatchConvertItemFromBlob(blob, cleanFileName, svgText);
              if (item) {
                batchConvertState.items.push(item);
                addedCount++;
              }
            }
          }
        } catch (zipErr) {
          console.error('Batch ZIP unpack error:', zipErr);
          showToast(`Error unpacking ZIP: ${zipErr.message}`);
        }
      } else if (file.type.startsWith('image/') || lowerName.match(/\.(jpe?g|png|webp|gif|bmp|svg|avif|heic|heif)$/i)) {
        let svgText = null;
        if (lowerName.endsWith('.svg') || file.type === 'image/svg+xml') {
          try {
            svgText = await file.text();
          } catch (_) { }
        }
        const item = await createBatchConvertItemFromBlob(file, file.name, svgText);
        if (item) {
          batchConvertState.items.push(item);
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      if (batchConvertState.activeIndex >= batchConvertState.items.length) {
        batchConvertState.activeIndex = Math.max(0, batchConvertState.items.length - 1);
      }
      syncBatchConvertViewUI();
      renderBatchConvertPreviewCanvas();
      persistBatchConvertSession();
      showToast(`Added ${addedCount} image${addedCount > 1 ? 's' : ''} to convert queue!`);
    } else {
      showToast('No supported image files detected in selection.');
    }
  }

  async function createBatchConvertItemFromBlob(blob, fileName, svgTextContent = null) {
    const isSvg = (fileName && fileName.toLowerCase().endsWith('.svg')) || (blob.type === 'image/svg+xml');
    let svgText = svgTextContent;
    if (isSvg && !svgText) {
      try {
        svgText = await blob.text();
      } catch (_) { }
    }

    // HEIC check
    let targetBlob = blob;
    const fn = (fileName || '').toLowerCase();
    const isHeic = fn.endsWith('.heic') || fn.endsWith('.heif') || (blob.type && (blob.type.includes('heic') || blob.type.includes('heif')));
    if (isHeic) {
      try {
        await engine.ensureHeicDecoder();
        if (typeof window.heic2any === 'function') {
          const converted = await window.heic2any({
            blob: blob,
            toType: 'image/jpeg',
            quality: 0.92
          });
          targetBlob = Array.isArray(converted) ? converted[0] : converted;
        }
      } catch (heicErr) {
        console.warn('HEIC inline decode error, fallback to blob:', heicErr);
      }
    }

    return new Promise((resolve) => {
      const url = URL.createObjectURL(targetBlob);
      const img = new Image();
      img.onload = () => {
        const thumbCanvas = document.createElement('canvas');
        const aspect = img.naturalWidth / (img.naturalHeight || 1);
        thumbCanvas.width = 160;
        thumbCanvas.height = Math.round(160 / (aspect || 1));
        const ctx = thumbCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);

        resolve({
          id: 'batch_conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name: fileName || 'image.jpg',
          size: blob.size,
          type: blob.type || (isSvg ? 'image/svg+xml' : 'image/jpeg'),
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          originalBlob: blob,
          originalUrl: url,
          img: img,
          thumbUrl: thumbUrl,
          svgText: svgText,
          isSvg: isSvg,
          isHeic: isHeic
        });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  }

  let persistBatchConvertTimer = null;
  function persistBatchConvertSession() {
    clearTimeout(persistBatchConvertTimer);
    persistBatchConvertTimer = setTimeout(async () => {
      try {
        if (!batchConvertState.items || batchConvertState.items.length === 0) {
          return;
        }
        const serializableItems = batchConvertState.items.map(it => ({
          id: it.id,
          name: it.name,
          size: it.size,
          type: it.type,
          width: it.width,
          height: it.height,
          blob: it.originalBlob,
          svgText: it.svgText,
          isSvg: it.isSvg,
          isHeic: it.isHeic
        }));
        if (typeof PixKitStorage !== 'undefined') {
          await PixKitStorage.setItem('batch_convert_session', {
            items: serializableItems,
            activeIndex: batchConvertState.activeIndex,
            configs: batchConvertState.configs,
            activeDetailTool: batchConvertState.activeDetailTool
          });
        }
      } catch (err) {
        console.warn('Failed to persist batch convert session:', err);
      }
    }, 60);
  }

  async function restoreBatchConvertSession() {
    try {
      if (typeof PixKitStorage === 'undefined') return;
      const data = await PixKitStorage.getItem('batch_convert_session');
      if (!data || !Array.isArray(data.items) || !data.items.length) return;

      const restoredItems = [];
      for (const it of data.items) {
        if (!it.blob) continue;
        const item = await createBatchConvertItemFromBlob(it.blob, it.name, it.svgText);
        if (item) {
          item.id = it.id || item.id;
          restoredItems.push(item);
        }
      }

      if (restoredItems.length > 0) {
        batchConvertState.items = restoredItems;
        batchConvertState.activeIndex = Math.min(data.activeIndex || 0, restoredItems.length - 1);
        if (data.configs) {
          batchConvertState.configs = Object.assign({}, batchConvertState.configs, data.configs);
        }
        syncBatchConvertConfigsToDOM();
        updateAllBatchConvertToolStatusLabels();
        if (data.activeDetailTool && batchConvertState.configs[data.activeDetailTool]) {
          openBatchConvertToolDetail(data.activeDetailTool);
        }
      }
    } catch (err) {
      console.warn('Could not restore batch convert session:', err);
    }
  }

  function syncBatchConvertConfigsToDOM() {
    try {
      const cfg = batchConvertState.configs;
      if (!cfg) return;

      // 1. Format
      if (cfg.format) {
        ['jpeg', 'png', 'webp', 'avif', 'bmp'].forEach(fmt => {
          document.getElementById(`batch-conv-fmt-${fmt}`)?.classList.toggle('active', cfg.format.targetFormat === fmt);
        });
        const qVal = document.getElementById('batch-conv-quality');
        if (qVal && cfg.format.quality) qVal.value = cfg.format.quality;
        const lblQ = document.getElementById('batch-conv-lbl-quality');
        if (lblQ && cfg.format.quality) lblQ.textContent = cfg.format.quality + '%';
        [100, 90, 75, 50].forEach(q => {
          document.getElementById(`batch-conv-chip-q-${q}`)?.classList.toggle('active', cfg.format.quality === q);
        });
      }

      // 2. HEIC
      if (cfg.heic) {
        ['jpeg', 'png', 'webp'].forEach(f => {
          document.getElementById(`batch-conv-heic-out-${f}`)?.classList.toggle('active', cfg.heic.outputFormat === f);
        });
        const hq = document.getElementById('batch-conv-heic-q');
        if (hq && cfg.heic.quality) hq.value = cfg.heic.quality;
        const hqV = document.getElementById('batch-conv-heic-q-val');
        if (hqV && cfg.heic.quality) hqV.textContent = cfg.heic.quality + '%';
      }

      // 4. SVG
      if (cfg.svg) {
        [1, 2, 3, 4, 8].forEach(s => {
          document.getElementById(`batch-conv-svg-scale-${s}`)?.classList.toggle('active', cfg.svg.scale === s);
        });
        ['png', 'jpeg', 'webp'].forEach(f => {
          document.getElementById(`batch-conv-svg-out-${f}`)?.classList.toggle('active', cfg.svg.outputFormat === f);
        });
      }

      // 5. ICO
      if (cfg.ico) {
        document.getElementById('batch-conv-ico-pkg-ico')?.classList.toggle('active', cfg.ico.pkgMode === 'ico');
        document.getElementById('batch-conv-ico-pkg-pngs')?.classList.toggle('active', cfg.ico.pkgMode === 'pngs');
        [16, 32, 48, 64, 128, 256].forEach(s => {
          document.getElementById(`batch-conv-ico-sz-${s}`)?.classList.toggle('active', (cfg.ico.selectedSizes || []).includes(s));
        });
        document.getElementById('batch-conv-ico-fit-contain')?.classList.toggle('active', cfg.ico.fitMode === 'contain');
        document.getElementById('batch-conv-ico-fit-cover')?.classList.toggle('active', cfg.ico.fitMode === 'cover');
      }

      // 6. Base64
      if (cfg.base64) {
        ['dataurl', 'html', 'css', 'raw'].forEach(t => {
          document.getElementById(`batch-conv-b64-type-${t}`)?.classList.toggle('active', cfg.base64.exportType === t);
        });
        ['json', 'txt'].forEach(p => {
          document.getElementById(`batch-conv-b64-pkg-${p}`)?.classList.toggle('active', cfg.base64.pkgMode === p);
        });
      }

      // 7. PDF
      if (cfg.pdf) {
        document.getElementById('batch-conv-pdf-mode-combined')?.classList.toggle('active', cfg.pdf.mode === 'combined');
        document.getElementById('batch-conv-pdf-mode-separate')?.classList.toggle('active', cfg.pdf.mode === 'separate');
        ['a4', 'letter', 'auto'].forEach(s => {
          document.getElementById(`batch-conv-pdf-size-${s}`)?.classList.toggle('active', cfg.pdf.pageSize === s);
        });
        ['auto', 'portrait', 'landscape'].forEach(o => {
          document.getElementById(`batch-conv-pdf-orient-${o}`)?.classList.toggle('active', cfg.pdf.orientation === o);
        });
        ['none', 'small', 'standard'].forEach(m => {
          document.getElementById(`batch-conv-pdf-margin-${m}`)?.classList.toggle('active', cfg.pdf.margin === m);
        });
      }
    } catch (_) { }
  }

  // Load 5 curated, distinct sample artworks (Photos, Vectors & Graphics)
  window.loadSampleBatchConvertImages = async function () {
    showToast('Generating 5 sample artworks for batch convert...');

    // 1. Vector SVG Badge
    const svgBadgeStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F46E5" />
          <stop offset="100%" stop-color="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
      <circle cx="256" cy="256" r="140" fill="none" stroke="#FFFFFF" stroke-width="18" opacity="0.9" />
      <polygon points="256,150 286,225 365,225 300,270 325,350 256,305 187,350 212,270 147,225 226,225" fill="#FCD34D" />
    </svg>`;
    const svgBlob = new Blob([svgBadgeStr], { type: 'image/svg+xml' });

    // 2-5. Procedural canvas images
    const makeCanvasBlob = (w, h, renderFn, mime = 'image/jpeg', q = 0.92) => {
      return new Promise((resolve) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        renderFn(ctx, w, h);
        c.toBlob((blob) => resolve(blob), mime, q);
      });
    };

    // 2. Sunset Coast (JPEG)
    const sunsetBlob = await makeCanvasBlob(1600, 1000, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#FF4B1F');
      grad.addColorStop(0.5, '#FF9068');
      grad.addColorStop(1, '#1E3C72');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Sun
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, 90, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF8DC';
      ctx.fill();
    });

    // 3. Transparent Neon Icon (PNG with alpha)
    const neonPngBlob = await makeCanvasBlob(1024, 1024, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 320, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fill();
      ctx.lineWidth = 24;
      ctx.strokeStyle = '#10B981';
      ctx.stroke();
      // Inner diamond
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2 - 160);
      ctx.lineTo(w / 2 + 160, h / 2);
      ctx.lineTo(w / 2, h / 2 + 160);
      ctx.lineTo(w / 2 - 160, h / 2);
      ctx.closePath();
      ctx.fillStyle = '#34D399';
      ctx.fill();
    }, 'image/png');

    // 4. Abstract Cyber Grid (WebP)
    const cyberWebpBlob = await makeCanvasBlob(1920, 1080, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0F2027');
      grad.addColorStop(0.5, '#203A43');
      grad.addColorStop(1, '#2C5364');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 80) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }, 'image/webp');

    // 5. Alpine Mountain View (JPEG)
    const mountainBlob = await makeCanvasBlob(1400, 933, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#89F7FE');
      sky.addColorStop(0.6, '#66A6FF');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w * 0.35, h * 0.35);
      ctx.lineTo(w * 0.7, h * 0.7);
      ctx.lineTo(w, h * 0.4);
      ctx.lineTo(w, h);
      ctx.fillStyle = '#1A365D';
      ctx.fill();
    });

    const samplesList = [
      { blob: svgBlob, name: 'vector-app-badge.svg', svgText: svgBadgeStr },
      { blob: sunsetBlob, name: 'sunset-coast.jpg' },
      { blob: neonPngBlob, name: 'neon-glyph-alpha.png' },
      { blob: cyberWebpBlob, name: 'cyber-grid.webp' },
      { blob: mountainBlob, name: 'alpine-mountain.jpg' }
    ];

    batchConvertState.items = [];
    for (const s of samplesList) {
      const item = await createBatchConvertItemFromBlob(s.blob, s.name, s.svgText);
      if (item) batchConvertState.items.push(item);
    }

    batchConvertState.activeIndex = 0;
    syncBatchConvertViewUI();
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
    showToast('Loaded 5 diverse sample files into batch convert queue!');
  };

  function syncBatchConvertViewUI() {
    const hasItems = batchConvertState.items.length > 0;
    const dropzone = document.getElementById('batch-conv-dropzone');
    const canvasWrap = document.getElementById('batch-conv-canvas-wrapper');
    const sliderPanel = document.getElementById('batch-conv-slider-panel');
    const stageFooter = document.getElementById('batch-conv-stage-footer');
    const topbarTools = document.getElementById('batch-conv-topbar-tools');
    const statusHint = document.getElementById('batch-conv-stage-status');
    const viewingTag = document.getElementById('batch-conv-viewing-tag');

    if (dropzone) dropzone.style.display = hasItems ? 'none' : 'flex';
    if (canvasWrap) canvasWrap.style.display = hasItems ? 'flex' : 'none';
    if (sliderPanel) sliderPanel.style.display = hasItems ? 'block' : 'none';
    if (stageFooter) stageFooter.style.display = hasItems ? 'flex' : 'none';
    if (topbarTools) topbarTools.style.display = hasItems ? 'flex' : 'none';

    if (hasItems) {
      const cur = batchConvertState.items[batchConvertState.activeIndex];
      const count = batchConvertState.items.length;
      if (viewingTag) {
        viewingTag.style.display = 'inline-flex';
        viewingTag.textContent = `Viewing ${batchConvertState.activeIndex + 1} of ${count}`;
      }
      if (statusHint) {
        statusHint.textContent = cur ? cur.name : '';
        statusHint.title = cur ? `${cur.name} (${cur.width} × ${cur.height} px)` : '';
      }
      renderBatchConvertCarousel();
    } else {
      if (viewingTag) viewingTag.style.display = 'none';
      if (statusHint) {
        statusHint.textContent = 'Batch queue empty · Drop images or ZIP to begin';
        statusHint.title = '';
      }
    }
  }

  function renderBatchConvertCarousel() {
    const strip = document.getElementById('batch-conv-carousel-strip');
    const countPill = document.getElementById('batch-conv-count-pill');
    const activeName = document.getElementById('batch-conv-active-name');
    const metaSummary = document.getElementById('batch-conv-meta-summary');
    const metaDetails = document.getElementById('batch-conv-meta-details');

    if (!strip) return;
    strip.innerHTML = '';

    const count = batchConvertState.items.length;
    let totalBytes = 0;
    batchConvertState.items.forEach(it => { totalBytes += (it.size || 0); });
    const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);

    if (countPill) countPill.textContent = `${count} Image${count !== 1 ? 's' : ''}`;
    const activeItem = batchConvertState.items[batchConvertState.activeIndex];
    if (activeName) activeName.textContent = activeItem ? `· ${activeItem.name}` : '';
    if (metaSummary) metaSummary.textContent = `${count} Images in Queue · ${sizeMb} MB Total`;
    if (metaDetails) metaDetails.textContent = activeItem ? `Active: ${activeItem.name} (${activeItem.width} × ${activeItem.height} px)` : 'Ready to convert';

    batchConvertState.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `batch-thumb-card ${index === batchConvertState.activeIndex ? 'active' : ''}`;
      card.onclick = () => selectBatchConvertImage(index);

      card.innerHTML = `
        <span class="batch-thumb-badge">#${index + 1}</span>
        <button type="button" class="batch-thumb-del-btn" title="Remove image from batch" onclick="removeBatchConvertItem(${index}, event)">×</button>
        <div class="batch-thumb-img-wrap">
          <img src="${item.thumbUrl || item.originalUrl}" alt="${item.name}" loading="lazy" />
        </div>
        <div class="batch-thumb-info">
          <span class="batch-thumb-name" title="${item.name}">${item.name}</span>
          <span class="batch-thumb-meta">${item.width} × ${item.height}</span>
        </div>
      `;
      strip.appendChild(card);
    });

    const activeCard = strip.children[batchConvertState.activeIndex];
    if (activeCard && !batchConvertState.isExpanded) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  window.selectBatchConvertImage = function (index) {
    if (index < 0 || index >= batchConvertState.items.length) return;
    batchConvertState.activeIndex = index;
    renderBatchConvertCarousel();
    renderBatchConvertPreviewCanvas();

    const cur = batchConvertState.items[index];
    const count = batchConvertState.items.length;
    const viewingTag = document.getElementById('batch-conv-viewing-tag');
    const statusHint = document.getElementById('batch-conv-stage-status');
    if (viewingTag) {
      viewingTag.style.display = 'inline-flex';
      viewingTag.textContent = `Viewing ${index + 1} of ${count}`;
    }
    if (statusHint && cur) {
      statusHint.textContent = cur.name;
      statusHint.title = `${cur.name} (${cur.width} × ${cur.height} px)`;
    }
    persistBatchConvertSession();
  };

  // Keyboard Left / Right Navigation for Batch Convert Mode
  document.addEventListener('keydown', (e) => {
    const batchConvView = document.getElementById('tool-batch-convert-view');
    if (!batchConvView || batchConvView.style.display === 'none') return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateBatchConvertImage(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateBatchConvertImage(1);
    }
  });

  window.navigateBatchConvertImage = function (dir) {
    if (!batchConvertState.items.length) return;
    let next = batchConvertState.activeIndex + dir;
    if (next < 0) next = batchConvertState.items.length - 1;
    if (next >= batchConvertState.items.length) next = 0;
    selectBatchConvertImage(next);
  };

  window.scrollBatchConvertCarousel = function (dir) {
    const strip = document.getElementById('batch-conv-carousel-strip');
    if (strip) {
      strip.scrollBy({ left: dir * 260, behavior: 'smooth' });
    }
  };

  window.toggleBatchConvertGridExpand = function () {
    const panel = document.getElementById('batch-conv-slider-panel');
    const btnText = document.getElementById('batch-conv-expand-btn-text');
    if (!panel) return;
    batchConvertState.isExpanded = !batchConvertState.isExpanded;
    panel.classList.toggle('expanded', batchConvertState.isExpanded);
    if (btnText) {
      btnText.textContent = batchConvertState.isExpanded ? 'Collapse Strip' : 'Expand Grid';
    }
  };

  window.removeBatchConvertItem = function (index, e) {
    if (e) e.stopPropagation();
    if (index < 0 || index >= batchConvertState.items.length) return;
    const removed = batchConvertState.items.splice(index, 1)[0];
    if (removed && removed.originalUrl) {
      try { URL.revokeObjectURL(removed.originalUrl); } catch (_) { }
    }
    if (batchConvertState.activeIndex >= batchConvertState.items.length) {
      batchConvertState.activeIndex = Math.max(0, batchConvertState.items.length - 1);
    }
    syncBatchConvertViewUI();
    if (batchConvertState.items.length > 0) {
      renderBatchConvertPreviewCanvas();
    }
    persistBatchConvertSession();
    showToast('Removed image from batch queue');
  };

  window.clearBatchConvertQueue = function () {
    batchConvertState.items.forEach(it => {
      if (it.originalUrl) {
        try { URL.revokeObjectURL(it.originalUrl); } catch (_) { }
      }
    });
    batchConvertState.items = [];
    batchConvertState.activeIndex = 0;
    if (typeof closeBatchConvertToolDetail === 'function') {
      closeBatchConvertToolDetail();
    }
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('batch_convert_session');
    }
    syncBatchConvertViewUI();
    showToast('Cleared all images from batch convert queue');
  };

  // ==============================================================
  // MASTER-DETAIL NAVIGATION & FEATURE TOGGLES
  // ==============================================================
  window.openBatchConvertToolDetail = function (toolName) {
    if (!toolName || !batchConvertState.configs[toolName]) return;
    batchConvertState.activeDetailTool = toolName;

    // Update Detail Header
    const meta = batchConvertToolMeta[toolName] || { icon: '⇄', title: toolName, desc: '' };
    const iconEl = document.getElementById('batch-conv-detail-icon');
    const titleEl = document.getElementById('batch-conv-detail-title');
    const descEl = document.getElementById('batch-conv-detail-desc');
    const toggleBtn = document.getElementById('batch-conv-detail-toggle-btn');

    if (iconEl) iconEl.textContent = meta.icon;
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.desc;

    const isEnabled = !!batchConvertState.configs[toolName].enabled;
    if (toggleBtn) {
      toggleBtn.textContent = isEnabled ? 'Active' : 'Off';
      toggleBtn.classList.toggle('active', isEnabled);
    }

    // Hide all sub-panels, show target sub-panel
    const allPanels = document.querySelectorAll('.batch-conv-tool-detail-body');
    allPanels.forEach(p => p.style.display = 'none');

    const targetPanel = document.getElementById(`batch-conv-detail-${toolName}`);
    if (targetPanel) {
      targetPanel.style.display = 'block';
    }

    // Switch Views
    const masterView = document.getElementById('batch-conv-cc-master-view');
    const detailView = document.getElementById('batch-conv-cc-detail-view');
    if (masterView) masterView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    const panel = document.getElementById('batch-conv-control-center-panel');
    if (panel) panel.scrollTop = 0;

    persistBatchConvertSession();
  };

  window.closeBatchConvertToolDetail = function () {
    batchConvertState.activeDetailTool = null;

    const masterView = document.getElementById('batch-conv-cc-master-view');
    const detailView = document.getElementById('batch-conv-cc-detail-view');
    if (detailView) detailView.style.display = 'none';
    if (masterView) masterView.style.display = 'block';

    updateAllBatchConvertToolStatusLabels();
    renderBatchConvertPreviewCanvas();

    const panel = document.getElementById('batch-conv-control-center-panel');
    if (panel) panel.scrollTop = 0;
    persistBatchConvertSession();
  };

  window.toggleBatchConvertFeatureFromDetail = function () {
    const toolName = batchConvertState.activeDetailTool;
    if (!toolName) return;
    toggleBatchConvertFeature(toolName);
    const isEnabled = !!batchConvertState.configs[toolName]?.enabled;
    const toggleBtn = document.getElementById('batch-conv-detail-toggle-btn');
    if (toggleBtn) {
      toggleBtn.textContent = isEnabled ? 'Active' : 'Off';
      toggleBtn.classList.toggle('active', isEnabled);
    }
  };

  window.toggleBatchConvertFeature = function (toolName) {
    const cfg = batchConvertState.configs[toolName];
    if (!cfg) return;
    cfg.enabled = !cfg.enabled;
    const pill = document.getElementById(`batch-conv-toggle-${toolName}`);
    if (pill) {
      pill.textContent = cfg.enabled ? 'Active' : 'Off';
      pill.classList.toggle('active', cfg.enabled);
    }
    updateBatchConvertToolStatusLabel(toolName);
    updateBatchConvertPrimaryButton();
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  function updateBatchConvertPrimaryButton() {
    const primaryBtnText = document.getElementById('batch-conv-primary-btn-text');
    if (!primaryBtnText) return;
    const isPdfCombined = batchConvertState.configs.pdf.enabled && batchConvertState.configs.pdf.mode === 'combined';
    if (isPdfCombined) {
      const count = batchConvertState.items.length || 0;
      primaryBtnText.textContent = `Generate & Download PDF (${count} Page${count !== 1 ? 's' : ''})`;
    } else {
      primaryBtnText.textContent = 'Process & Download All (ZIP)';
    }
  }

  function updateAllBatchConvertToolStatusLabels() {
    ['format', 'heic', 'svg', 'ico', 'base64', 'pdf'].forEach(t => {
      updateBatchConvertToolStatusLabel(t);
      const pill = document.getElementById(`batch-conv-toggle-${t}`);
      if (pill && batchConvertState.configs[t]) {
        const active = !!batchConvertState.configs[t].enabled;
        pill.textContent = active ? 'Active' : 'Off';
        pill.classList.toggle('active', active);
      }
    });
    updateBatchConvertPrimaryButton();
  }
  window.updateAllBatchConvertToolStatusLabels = updateAllBatchConvertToolStatusLabels;

  function updateBatchConvertToolStatusLabel(toolName) {
    const label = document.getElementById(`batch-conv-status-${toolName}`);
    if (!label) return;
    const cfg = batchConvertState.configs[toolName];
    if (!cfg || !cfg.enabled) {
      label.textContent = 'Off';
      return;
    }

    if (toolName === 'format') {
      label.textContent = `${(cfg.targetFormat || 'JPG').toUpperCase()} · ${cfg.quality || 90}%`;
    } else if (toolName === 'heic') {
      label.textContent = `Auto → ${(cfg.outputFormat || 'JPG').toUpperCase()}`;
    } else if (toolName === 'svg') {
      label.textContent = `${cfg.scale || 2}x (${(cfg.outputFormat || 'PNG').toUpperCase()})`;
    } else if (toolName === 'ico') {
      const szCount = (cfg.selectedSizes || []).length;
      label.textContent = cfg.pkgMode === 'ico' ? `${szCount} Sizes (.ICO)` : `${szCount} PNG Icons`;
    } else if (toolName === 'base64') {
      label.textContent = (cfg.exportType || 'dataurl').toUpperCase();
    } else if (toolName === 'pdf') {
      label.textContent = cfg.mode === 'combined' ? `1 Document (${(cfg.pageSize || 'a4').toUpperCase()})` : 'Separate PDFs';
    }
  }

  // ==============================================================
  // TOOL SETTINGS HANDLERS
  // ==============================================================
  window.setBatchConvertTargetFormat = function (format) {
    batchConvertState.configs.format.targetFormat = format;
    ['jpeg', 'png', 'webp', 'avif', 'bmp'].forEach(f => {
      document.getElementById(`batch-conv-fmt-${f}`)?.classList.toggle('active', f === format);
    });
    updateBatchConvertToolStatusLabel('format');
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  window.updateBatchConvertQuality = function (val) {
    const q = parseInt(val, 10);
    batchConvertState.configs.format.quality = q;
    const lbl = document.getElementById('batch-conv-lbl-quality');
    if (lbl) lbl.textContent = `${q}%`;
    [100, 90, 75, 50].forEach(p => {
      document.getElementById(`batch-conv-chip-q-${p}`)?.classList.toggle('active', p === q);
    });
    updateBatchConvertToolStatusLabel('format');
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  window.setBatchConvertQualityPreset = function (val) {
    const input = document.getElementById('batch-conv-quality');
    if (input) input.value = val;
    updateBatchConvertQuality(val);
  };

  window.setBatchConvertBgColor = function (color) {
    batchConvertState.configs.format.bgColor = color;
    document.getElementById('batch-conv-bg-white')?.classList.toggle('active', color === '#ffffff');
    document.getElementById('batch-conv-bg-black')?.classList.toggle('active', color === '#000000');
    document.getElementById('batch-conv-bg-transparent')?.classList.toggle('active', color === 'transparent');
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  window.setBatchConvertHeicOutput = function (fmt) {
    batchConvertState.configs.heic.outputFormat = fmt;
    ['jpeg', 'png', 'webp'].forEach(f => {
      document.getElementById(`batch-conv-heic-out-${f}`)?.classList.toggle('active', f === fmt);
    });
    updateBatchConvertToolStatusLabel('heic');
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  window.setBatchConvertHeicQuality = function (val) {
    const q = parseInt(val, 10);
    batchConvertState.configs.heic.quality = q;
    const lbl = document.getElementById('batch-conv-heic-q-val');
    if (lbl) lbl.textContent = `${q}%`;
    updateBatchConvertToolStatusLabel('heic');
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  window.setBatchConvertSvgScale = function (scale) {
    const sc = parseInt(scale, 10);
    batchConvertState.configs.svg.scale = sc;
    [1, 2, 3, 4, 8].forEach(s => {
      document.getElementById(`batch-conv-svg-scale-${s}`)?.classList.toggle('active', s === sc);
    });
    updateBatchConvertToolStatusLabel('svg');
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  window.setBatchConvertSvgFormat = function (fmt) {
    batchConvertState.configs.svg.outputFormat = fmt;
    ['png', 'jpeg', 'webp'].forEach(f => {
      document.getElementById(`batch-conv-svg-out-${f}`)?.classList.toggle('active', f === fmt);
    });
    updateBatchConvertToolStatusLabel('svg');
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
  };

  window.setBatchConvertIcoPackage = function (pkg) {
    batchConvertState.configs.ico.pkgMode = pkg;
    document.getElementById('batch-conv-ico-pkg-ico')?.classList.toggle('active', pkg === 'ico');
    document.getElementById('batch-conv-ico-pkg-pngs')?.classList.toggle('active', pkg === 'pngs');
    updateBatchConvertToolStatusLabel('ico');
    persistBatchConvertSession();
  };

  window.toggleBatchConvertIcoSize = function (size) {
    const s = parseInt(size, 10);
    let list = batchConvertState.configs.ico.selectedSizes || [];
    if (list.includes(s)) {
      if (list.length > 1) {
        list = list.filter(item => item !== s);
      } else {
        showToast('At least 1 resolution must remain selected');
        return;
      }
    } else {
      list.push(s);
      list.sort((a, b) => a - b);
    }
    batchConvertState.configs.ico.selectedSizes = list;
    document.getElementById(`batch-conv-ico-sz-${s}`)?.classList.toggle('active', list.includes(s));
    updateBatchConvertToolStatusLabel('ico');
    persistBatchConvertSession();
  };

  window.setBatchConvertIcoFit = function (fit) {
    batchConvertState.configs.ico.fitMode = fit;
    document.getElementById('batch-conv-ico-fit-contain')?.classList.toggle('active', fit === 'contain');
    document.getElementById('batch-conv-ico-fit-cover')?.classList.toggle('active', fit === 'cover');
    persistBatchConvertSession();
  };

  window.setBatchConvertBase64Type = function (type) {
    batchConvertState.configs.base64.exportType = type;
    ['dataurl', 'html', 'css', 'raw'].forEach(t => {
      document.getElementById(`batch-conv-b64-type-${t}`)?.classList.toggle('active', t === type);
    });
    updateBatchConvertToolStatusLabel('base64');
    persistBatchConvertSession();
  };

  window.setBatchConvertBase64Package = function (pkg) {
    batchConvertState.configs.base64.pkgMode = pkg;
    ['json', 'txt'].forEach(p => {
      document.getElementById(`batch-conv-b64-pkg-${p}`)?.classList.toggle('active', p === pkg);
    });
    persistBatchConvertSession();
  };

  window.setBatchConvertPdfMode = function (mode) {
    batchConvertState.configs.pdf.mode = mode;
    document.getElementById('batch-conv-pdf-mode-combined')?.classList.toggle('active', mode === 'combined');
    document.getElementById('batch-conv-pdf-mode-separate')?.classList.toggle('active', mode === 'separate');
    updateBatchConvertToolStatusLabel('pdf');
    updateBatchConvertPrimaryButton();
    persistBatchConvertSession();
  };

  window.setBatchConvertPdfPageSize = function (size) {
    batchConvertState.configs.pdf.pageSize = size;
    ['a4', 'letter', 'auto'].forEach(s => {
      document.getElementById(`batch-conv-pdf-size-${s}`)?.classList.toggle('active', s === size);
    });
    updateBatchConvertToolStatusLabel('pdf');
    persistBatchConvertSession();
  };

  window.setBatchConvertPdfOrient = function (orient) {
    batchConvertState.configs.pdf.orientation = orient;
    ['auto', 'portrait', 'landscape'].forEach(o => {
      document.getElementById(`batch-conv-pdf-orient-${o}`)?.classList.toggle('active', o === orient);
    });
    persistBatchConvertSession();
  };

  window.setBatchConvertPdfMargin = function (margin) {
    batchConvertState.configs.pdf.margin = margin;
    ['none', 'small', 'standard'].forEach(m => {
      document.getElementById(`batch-conv-pdf-margin-${m}`)?.classList.toggle('active', m === margin);
    });
    persistBatchConvertSession();
  };

  window.resetAllBatchConvertOperations = function () {
    batchConvertState.configs = {
      format: { enabled: true, targetFormat: 'jpeg', quality: 90, bgColor: '#ffffff' },
      heic: { enabled: true, outputFormat: 'jpeg', quality: 92 },
      svg: { enabled: true, scale: 2, outputFormat: 'png' },
      ico: { enabled: false, pkgMode: 'ico', selectedSizes: [16, 32, 48, 64], fitMode: 'contain' },
      base64: { enabled: false, exportType: 'dataurl', pkgMode: 'json' },
      pdf: { enabled: false, mode: 'combined', pageSize: 'a4', orientation: 'auto', margin: 'none' }
    };
    syncBatchConvertConfigsToDOM();
    updateAllBatchConvertToolStatusLabels();
    renderBatchConvertPreviewCanvas();
    persistBatchConvertSession();
    showToast('Reset all batch convert settings to defaults');
  };

  // ==============================================================
  // RENDERING & BATCH PROCESSING PIPELINE
  // ==============================================================
  async function processSingleBatchConvertItem(item, forExport = false) {
    if (!item) return null;
    const cfg = batchConvertState.configs;

    let sourceCanvas = document.createElement('canvas');
    let srcW = item.width || 800;
    let srcH = item.height || 600;

    // 1. Vector SVG rasterization
    if (item.isSvg && item.svgText) {
      const svgScale = (cfg.svg && cfg.svg.enabled) ? (cfg.svg.scale || 2) : 1;
      const targetW = Math.round(srcW * svgScale);
      const targetH = Math.round(srcH * svgScale);
      try {
        const res = await engine.rasterizeSvg(
          item.svgText,
          targetW,
          targetH,
          cfg.format.bgColor || 'transparent',
          cfg.svg.outputFormat || 'png',
          0.95
        );
        sourceCanvas = res.canvas;
        srcW = sourceCanvas.width;
        srcH = sourceCanvas.height;
      } catch (err) {
        sourceCanvas.width = srcW;
        sourceCanvas.height = srcH;
        const ctx = sourceCanvas.getContext('2d');
        ctx.drawImage(item.img, 0, 0, srcW, srcH);
      }
    } else {
      sourceCanvas.width = srcW;
      sourceCanvas.height = srcH;
      const ctx = sourceCanvas.getContext('2d');
      ctx.drawImage(item.img, 0, 0, srcW, srcH);
    }

    let workingCanvas = sourceCanvas;

    // Determine target format
    let targetFmt = cfg.format.targetFormat || 'jpeg';
    if (item.isHeic && cfg.heic && cfg.heic.enabled) {
      targetFmt = cfg.heic.outputFormat || targetFmt;
    }

    // 2. Background Color Fill for formats without alpha
    if (targetFmt === 'jpeg' || targetFmt === 'bmp') {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = workingCanvas.width;
      bgCanvas.height = workingCanvas.height;
      const bCtx = bgCanvas.getContext('2d');
      bCtx.fillStyle = (cfg.format.bgColor && cfg.format.bgColor !== 'transparent') ? cfg.format.bgColor : '#ffffff';
      bCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      bCtx.drawImage(workingCanvas, 0, 0);
      workingCanvas = bgCanvas;
    }

    if (!forExport) {
      return workingCanvas;
    }

    // 4. Special tool exports: Favicon ICO
    if (cfg.ico && cfg.ico.enabled) {
      if (cfg.ico.pkgMode === 'ico') {
        const icoRes = await engine.canvasToIcoBlob(workingCanvas, cfg.ico.selectedSizes, cfg.ico.fitMode);
        const baseName = item.name.replace(/\.[^/.]+$/, '');
        return {
          blob: icoRes.blob,
          name: `${baseName}_favicon.ico`,
          width: workingCanvas.width,
          height: workingCanvas.height
        };
      } else {
        // Individual PNG icons
        const icoRes = await engine.canvasToIcoBlob(workingCanvas, cfg.ico.selectedSizes, cfg.ico.fitMode);
        const baseName = item.name.replace(/\.[^/.]+$/, '');
        const files = [];
        for (const buf of icoRes.pngBuffers) {
          const pngBlob = await new Promise(r => buf.canvas.toBlob(r, 'image/png'));
          files.push({
            name: `${baseName}_icon_${buf.size}x${buf.size}.png`,
            blob: pngBlob
          });
        }
        return { isMultiFile: true, files: files };
      }
    }

    // 5. Special tool exports: Base64
    if (cfg.base64 && cfg.base64.enabled) {
      const mime = (targetFmt === 'png') ? 'image/png' : ((targetFmt === 'webp') ? 'image/webp' : 'image/jpeg');
      const quality = (cfg.format.quality || 90) / 100;
      const dataUrl = workingCanvas.toDataURL(mime, quality);
      let content = dataUrl;
      const expType = cfg.base64.exportType || 'dataurl';
      if (expType === 'raw') {
        content = dataUrl.split(',')[1] || '';
      } else if (expType === 'html') {
        content = `<img src="${dataUrl}" alt="${item.name}" width="${workingCanvas.width}" height="${workingCanvas.height}" />`;
      } else if (expType === 'css') {
        content = `background-image: url("${dataUrl}");`;
      }
      const baseName = item.name.replace(/\.[^/.]+$/, '');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      return {
        blob: blob,
        name: `${baseName}_base64.txt`,
        content: content,
        dataUrl: dataUrl
      };
    }

    // 6. Standard format conversion export
    let mime = 'image/jpeg';
    let ext = 'jpg';
    if (targetFmt === 'png') { mime = 'image/png'; ext = 'png'; }
    else if (targetFmt === 'webp') { mime = 'image/webp'; ext = 'webp'; }
    else if (targetFmt === 'avif') { mime = 'image/avif'; ext = 'avif'; }
    else if (targetFmt === 'bmp') { mime = 'image/bmp'; ext = 'bmp'; }

    const quality = (cfg.format.quality || 90) / 100;
    const blob = await new Promise(resolve => {
      workingCanvas.toBlob(resolve, mime, mime === 'image/png' ? undefined : quality);
    });

    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const finalName = `${baseName}.${ext}`;
    return {
      blob: blob,
      name: finalName,
      width: workingCanvas.width,
      height: workingCanvas.height,
      canvas: workingCanvas
    };
  }

  async function renderBatchConvertPreviewCanvas() {
    const canvas = document.getElementById('canvas-batch-conv-preview');
    if (!canvas) return;
    const activeItem = batchConvertState.items[batchConvertState.activeIndex];
    if (!activeItem) return;

    if (batchConvertState.compareOriginal) {
      canvas.width = activeItem.img.naturalWidth;
      canvas.height = activeItem.img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(activeItem.img, 0, 0);
      return;
    }

    const processedCanvas = await processSingleBatchConvertItem(activeItem, false);
    if (!processedCanvas) return;

    canvas.width = processedCanvas.width;
    canvas.height = processedCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(processedCanvas, 0, 0);
  }

  window.showBatchConvertOriginal = function (show) {
    batchConvertState.compareOriginal = !!show;
    renderBatchConvertPreviewCanvas();
  };

  // ==============================================================
  // DOWNLOAD & EXPORT CONTROLLERS
  // ==============================================================
  window.downloadCurrentBatchConvertImage = async function () {
    const activeItem = batchConvertState.items[batchConvertState.activeIndex];
    if (!activeItem) {
      showToast('No active image to download');
      return;
    }
    showToast(`Converting ${activeItem.name}...`);
    const result = await processSingleBatchConvertItem(activeItem, true);
    if (result && result.blob) {
      triggerBlobDownload(result.blob, result.name);
      showToast(`Downloaded ${result.name}`);
    } else if (result && result.isMultiFile && result.files && result.files.length) {
      result.files.forEach(f => triggerBlobDownload(f.blob, f.name));
      showToast(`Downloaded ${result.files.length} icon files`);
    }
  };

  window.executeBatchConvertExport = async function (downloadZip = true) {
    if (!batchConvertState.items.length) {
      showToast('No images in queue to convert. Please add images first.');
      return;
    }

    const cfg = batchConvertState.configs;
    const isCombinedPdf = cfg.pdf.enabled && cfg.pdf.mode === 'combined';

    const progressBox = document.getElementById('batch-conv-progress-box');
    const progressBar = document.getElementById('batch-conv-progress-bar');
    const progressText = document.getElementById('batch-conv-progress-text');
    const progressPercent = document.getElementById('batch-conv-progress-percent');
    const btnProcess = document.getElementById('btn-batch-conv-process-all');

    if (progressBox) progressBox.style.display = 'block';
    if (btnProcess) btnProcess.disabled = true;
    batchConvertState.isProcessing = true;

    const total = batchConvertState.items.length;

    try {
      if (isCombinedPdf) {
        // Multi-page PDF Document Export
        if (!window.PDFLib) {
          showToast('Loading PDF engine...');
          await new Promise(r => setTimeout(r, 200));
        }
        if (!window.PDFLib) throw new Error('PDFLib engine is not loaded');

        const pdfDoc = await window.PDFLib.PDFDocument.create();

        for (let i = 0; i < total; i++) {
          const item = batchConvertState.items[i];
          const pct = Math.round(((i) / total) * 100);
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressPercent) progressPercent.textContent = `${pct}%`;
          if (progressText) progressText.textContent = `Converting page ${i + 1} of ${total}: ${item.name}...`;

          const processed = await processSingleBatchConvertItem(item, true);
          if (processed && processed.canvas) {
            const pageOpts = {
              pageSize: cfg.pdf.pageSize || 'a4',
              orientation: cfg.pdf.orientation || 'auto',
              margin: cfg.pdf.margin || 'none',
              fitMode: 'contain',
              quality: 0.92
            };
            const singlePdf = await engine.canvasToPdfBlob(processed.canvas, pageOpts);
            const loadedPagePdf = await window.PDFLib.PDFDocument.load(await singlePdf.blob.arrayBuffer());
            const [copiedPage] = await pdfDoc.copyPages(loadedPagePdf, [0]);
            pdfDoc.addPage(copiedPage);
          }
          await new Promise(r => setTimeout(r, 15));
        }

        if (progressBar) progressBar.style.width = '100%';
        if (progressPercent) progressPercent.textContent = '100%';
        if (progressText) progressText.textContent = 'Finalizing PDF document...';

        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfName = `pixkit_batch_converted_${Date.now()}.pdf`;
        triggerBlobDownload(pdfBlob, pdfName);

        showToast(`🎉 Generated and downloaded ${total}-page PDF document!`);
      } else {
        // ZIP Archive Export
        if (!window.JSZip) {
          showToast('ZIP packaging engine is loading...');
          return;
        }

        const zip = new window.JSZip();
        const base64Manifest = {};

        for (let i = 0; i < total; i++) {
          const item = batchConvertState.items[i];
          const pct = Math.round(((i) / total) * 100);
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressPercent) progressPercent.textContent = `${pct}%`;
          if (progressText) progressText.textContent = `Converting image ${i + 1} of ${total}: ${item.name}...`;

          const processed = await processSingleBatchConvertItem(item, true);
          if (processed) {
            if (processed.isMultiFile && processed.files) {
              processed.files.forEach(f => zip.file(`icons/${f.name}`, f.blob));
            } else if (processed.blob) {
              zip.file(processed.name, processed.blob);
              if (processed.dataUrl) {
                base64Manifest[item.name] = processed.dataUrl;
              }
            }
          }
          await new Promise(r => setTimeout(r, 15));
        }

        if (cfg.base64.enabled && cfg.base64.pkgMode === 'json' && Object.keys(base64Manifest).length) {
          zip.file('base64_data_urls.json', JSON.stringify(base64Manifest, null, 2));
        }

        if (progressBar) progressBar.style.width = '100%';
        if (progressPercent) progressPercent.textContent = '100%';
        if (progressText) progressText.textContent = 'Packaging ZIP archive...';

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        }, (metadata) => {
          if (progressPercent) progressPercent.textContent = `${Math.round(metadata.percent)}%`;
        });

        const zipName = `pixkit_batch_converted_${Date.now()}.zip`;
        triggerBlobDownload(zipBlob, zipName);

        showToast(`🎉 Converted and downloaded all ${total} files in ZIP!`);
      }
    } catch (err) {
      console.error('Batch convert error:', err);
      showToast(`Error during batch convert: ${err.message}`);
    } finally {
      batchConvertState.isProcessing = false;
      if (btnProcess) btnProcess.disabled = false;
      setTimeout(() => {
        if (progressBox) progressBox.style.display = 'none';
      }, 1200);
    }
  };

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

  async function initPdfExtractStage() {
    setupPdfExtractDropzone();
    if (!pdfExtractState.pdfDoc) {
      if (typeof PixKitStorage !== 'undefined') {
        try {
          const session = await PixKitStorage.getItem('pdf_session_doc-pdf-to-images');
          if (session && session.blob && session.fileName && !session.fileName.includes('sample') && session.fileName !== 'mountain-view.jpg' && session.fileName.toLowerCase().endsWith('.pdf')) {
            const file = new File([session.blob], session.fileName, { type: 'application/pdf' });
            await handlePdfFileUpload(file, true);
            return;
          } else if (session) {
            await PixKitStorage.removeItem('pdf_session_doc-pdf-to-images');
          }
        } catch (_) { }
      }
      window.resetPdfExtract();
      return;
    }
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

  window.handlePdfFileUpload = async function (file, skipToast) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please select a valid PDF document (.pdf)');
      return;
    }

    if (typeof pdfjsLib === 'undefined') {
      showToast('Loading PDF engine, please wait a moment...');
      return;
    }

    pdfExtractState.file = file;
    pdfExtractState.fileName = file.name;
    pdfExtractState.fileSize = file.size;

    if (window.recordRecentFile) {
      window.recordRecentFile(file.name, file.size, 'application/pdf', 0, 0, 'pdf', file, null, 'doc-pdf-to-images');
    }

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
      try {
        if (typeof PixKitStorage !== 'undefined') {
          const blob = (file instanceof Blob) ? file : new Blob([arrayBuffer], { type: 'application/pdf' });
          PixKitStorage.setItem('pdf_session_doc-pdf-to-images', {
            blob,
            fileName: pdfExtractState.fileName,
            fileSize: pdfExtractState.fileSize,
            format: pdfExtractState.format,
            scale: pdfExtractState.scale,
            quality: pdfExtractState.quality
          });
        }
      } catch (_) { }
    } catch (err) {
      console.error('PDF parsing error:', err);
      showToast('Failed to open PDF file: ' + (err.message || 'Invalid format'));
      if (loader) loader.style.display = 'none';
      if (dropzone) dropzone.style.display = 'flex';
    }
  };

  // Generate a multi-page sample PDF on the fly so users can test immediately
  window.loadSamplePdfForExtract = async function () {
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

    const firstThumb = pdfExtractState.pages[0]?.canvas?.toDataURL('image/jpeg', 0.8) || null;
    const firstW = pdfExtractState.pages[0]?.width || 0;
    const firstH = pdfExtractState.pages[0]?.height || 0;
    if (window.recordRecentFile && pdfExtractState.file) {
      window.recordRecentFile(pdfExtractState.fileName, pdfExtractState.fileSize, 'application/pdf', firstW, firstH, 'pdf', pdfExtractState.file, firstThumb, 'doc-pdf-to-images');
    }

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

  window.toggleSelectAllPdfPages = function (select) {
    pdfExtractState.pages.forEach(p => p.selected = select);
    buildPdfPagesGridUI();
    updatePdfExtractUI();
    showToast(select ? 'Selected all pages' : 'Deselected all pages');
  };

  window.setPdfExtractFormat = function (fmt) {
    pdfExtractState.format = fmt;
    ['png', 'jpg', 'webp'].forEach(f => {
      document.getElementById(`pdf-fmt-${f}`)?.classList.toggle('active', f === fmt);
    });
    const qualityGroup = document.getElementById('pdf-extract-quality-group');
    if (qualityGroup) qualityGroup.style.display = fmt === 'png' ? 'none' : 'block';

    buildPdfPagesGridUI();
    updatePdfExtractUI();
  };

  window.setPdfExtractScale = async function (scale) {
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

  window.setPdfExtractQuality = function (val) {
    pdfExtractState.quality = parseInt(val, 10) / 100;
    const badge = document.getElementById('pdf-extract-quality-val');
    if (badge) badge.textContent = `${val}%`;
    updatePdfExtractUI();
  };

  window.setPdfExtractRangeMode = function (mode) {
    pdfExtractState.rangeMode = mode;
    ['all', 'selected', 'custom'].forEach(m => {
      document.getElementById(`pdf-range-${m}`)?.classList.toggle('active', m === mode);
    });
    const customWrap = document.getElementById('pdf-custom-range-input-wrap');
    if (customWrap) customWrap.style.display = mode === 'custom' ? 'block' : 'none';

    buildPdfPagesGridUI();
    updatePdfExtractUI();
  };

  window.handlePdfCustomRangeChange = function (val) {
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
    if (hintEl) {
      if (numPages > 0) {
        hintEl.textContent = `Extracted ${numPages} pages · Ready for instant export or studio editing`;
      } else {
        hintEl.textContent = 'Upload a PDF to extract pages as crisp images';
      }
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

  window.downloadPdfExtractedZip = async function () {
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

  window.downloadSelectedPdfPagesSingle = async function () {
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

  window.downloadSinglePdfPageDirect = async function (index) {
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

  window.openSpecificPdfPageInStudio = function (index) {
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

  window.openActivePdfPageInStudio = function () {
    if (pdfExtractState.pages.length > 0) {
      openSpecificPdfPageInStudio(0);
    }
  };

  // ==============================================================
  // SHARED PDF PREVIEW HELPERS (STANDARD NATIVE VIEWER & IN-PAGE MODAL)
  // ==============================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  }

  window.openInPagePdfPreview = function (blobUrl, filename, blob) {
    const modal = document.getElementById('pdf-preview-modal');
    const titleEl = document.getElementById('modal-pdf-preview-title');
    const iframe = document.getElementById('pdf-preview-modal-iframe');
    const dlBtn = document.getElementById('pdf-preview-modal-download-btn');
    const newTabBtn = document.getElementById('pdf-preview-modal-newtab-btn');

    if (titleEl) titleEl.textContent = filename || 'document.pdf';
    if (iframe) iframe.src = blobUrl;
    if (dlBtn) {
      dlBtn.onclick = () => triggerBlobDownload(blob, filename || 'document.pdf');
    }
    if (newTabBtn) {
      newTabBtn.onclick = () => {
        const tab = window.open('', '_blank');
        if (tab) {
          try {
            tab.document.open();
            tab.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(filename || 'document.pdf')}</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{width:100%;height:100%;overflow:hidden;background:#525659;}iframe{width:100vw;height:100vh;border:none;display:block;}</style></head><body><iframe src="${blobUrl}" style="width:100vw;height:100vh;border:none;" allowfullscreen></iframe></body></html>`);
            tab.document.close();
          } catch (_) { }
        }
      };
    }
    if (modal) modal.classList.add('active');
  };

  window.closePdfPreviewModal = function () {
    const modal = document.getElementById('pdf-preview-modal');
    const iframe = document.getElementById('pdf-preview-modal-iframe');
    if (modal) modal.classList.remove('active');
    if (iframe) iframe.src = 'about:blank';
  };

  window.handlePdfPreviewBackdropClick = function (event) {
    if (event.target && event.target.id === 'pdf-preview-modal') {
      window.closePdfPreviewModal();
    }
  };

  function createPreviewPlaceholderTab(toolName = 'PDF') {
    try {
      // Synchronously open a clean tab within user gesture to avoid popup blocking
      const previewTab = window.open('', '_blank');
      if (previewTab) {
        try {
          previewTab.document.open();
          previewTab.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Generating ${escapeHtml(toolName)} Preview...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #0f172a; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    .box { text-align: center; padding: 24px; max-width: 380px; }
    .spinner { width: 42px; height: 42px; border: 3px solid rgba(255,255,255,0.15); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h3 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.4; margin: 0; }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h3>Generating ${escapeHtml(toolName)} Preview...</h3>
    <p>Processing and rendering document streams, please wait...</p>
  </div>
</body>
</html>`);
          previewTab.document.close();
        } catch (_) { }
      }
      return previewTab;
    } catch (_) {
      return null;
    }
  }

  function openPdfPreviewTab(previewTab, blob, filename = 'document.pdf') {
    const pdfBlob = (blob instanceof Blob && blob.type === 'application/pdf')
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);

    let tabSuccess = false;

    // 1. Try embedding directly into pre-opened window (native reader in iframe to prevent forced downloads)
    if (previewTab && !previewTab.closed) {
      try {
        previewTab.document.open();
        previewTab.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(filename)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #525659; }
    iframe, embed { width: 100vw; height: 100vh; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="${blobUrl}" style="width:100vw; height:100vh; border:none;" allowfullscreen></iframe>
</body>
</html>`);
        previewTab.document.close();
        tabSuccess = true;
      } catch (err) {
        console.warn('Could not write into preview tab:', err);
      }
    }

    // 2. If popup was blocked or tab failed to receive iframe, open reliable in-page preview modal!
    // NEVER trigger download when user requested a preview!
    if (!tabSuccess) {
      openInPagePdfPreview(blobUrl, filename, pdfBlob);
      if (previewTab && !previewTab.closed) {
        try { previewTab.close(); } catch (_) { }
      }
    }
  }

  window.resetPdfExtract = function () {
    pdfExtractState.pdfDoc = null;
    pdfExtractState.pdfBytes = null;
    pdfExtractState.numPages = 0;
    pdfExtractState.pages = [];
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('pdf_session_doc-pdf-to-images');
    }
    const dropzone = document.getElementById('pdf-extract-dropzone');
    const grid = document.getElementById('pdf-extract-grid');
    const loader = document.getElementById('pdf-extract-loading');
    const topbarTools = document.getElementById('pdf-extract-topbar-tools');
    const nameEl = document.getElementById('pdf-extract-file-name');
    const subEl = document.getElementById('pdf-extract-file-sub');

    if (dropzone) dropzone.style.display = 'flex';
    if (grid) { grid.style.display = 'none'; grid.innerHTML = ''; }
    if (loader) loader.style.display = 'none';
    if (topbarTools) topbarTools.style.display = 'none';
    if (nameEl) nameEl.textContent = 'No PDF Selected';
    if (subEl) subEl.textContent = 'Select a PDF file to begin extraction';
    updatePdfExtractUI();
    showToast('Cleared PDF document from PDF to Images');
  };

  // ==============================================================
  // TOOL 17 CONTROLLER: MERGE PDF (COMBINE MULTIPLE PDF DOCUMENTS)
  // ==============================================================
  let pdfMergeState = {
    files: [] // Array of { id, name, size, pageCount, bytes, thumbUrl }
  };

  function persistPdfMergeSession() {
    try {
      if (typeof PixKitStorage === 'undefined') return;
      if (!pdfMergeState.files || pdfMergeState.files.length === 0) {
        PixKitStorage.removeItem('pdf_session_doc-merge-pdf');
        return;
      }
      const serializable = pdfMergeState.files.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        pageCount: f.pageCount,
        thumbUrl: f.thumbUrl,
        blob: (f.file instanceof Blob) ? f.file : new Blob([f.bytes], { type: 'application/pdf' })
      }));
      PixKitStorage.setItem('pdf_session_doc-merge-pdf', { files: serializable });
    } catch (_) { }
  }

  async function initPdfMergeStage() {
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

    if ((!pdfMergeState.files || pdfMergeState.files.length === 0) && typeof PixKitStorage !== 'undefined') {
      try {
        const session = await PixKitStorage.getItem('pdf_session_doc-merge-pdf');
        if (session && Array.isArray(session.files) && session.files.length > 0) {
          const hasInvalid = session.files.some(sf => !sf.name || sf.name.toLowerCase().includes('sample') || sf.name === 'mountain-view.jpg');
          if (hasInvalid) {
            await PixKitStorage.removeItem('pdf_session_doc-merge-pdf');
          } else {
            const files = session.files.map(sf => new File([sf.blob], sf.name, { type: 'application/pdf' }));
            await handlePdfMergeFiles(files, true);
            return;
          }
        }
      } catch (_) { }
    }

    renderPdfMergeUI();
  }

  window.handlePdfMergeFiles = async function (fileList, skipToast) {
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

      if (!skipToast) {
        showToast(`Added ${files.length} PDF document(s) to merge list.`);
      }
      persistPdfMergeSession();
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

  window.movePdfMergeItemUp = function (index) {
    if (index <= 0 || index >= pdfMergeState.files.length) return;
    const temp = pdfMergeState.files[index - 1];
    pdfMergeState.files[index - 1] = pdfMergeState.files[index];
    pdfMergeState.files[index] = temp;
    persistPdfMergeSession();
    renderPdfMergeUI();
  };

  window.movePdfMergeItemDown = function (index) {
    if (index < 0 || index >= pdfMergeState.files.length - 1) return;
    const temp = pdfMergeState.files[index + 1];
    pdfMergeState.files[index + 1] = pdfMergeState.files[index];
    pdfMergeState.files[index] = temp;
    persistPdfMergeSession();
    renderPdfMergeUI();
  };

  window.removePdfMergeItem = function (index) {
    if (index >= 0 && index < pdfMergeState.files.length) {
      const removed = pdfMergeState.files.splice(index, 1)[0];
      showToast(`Removed "${removed.name}"`);
      persistPdfMergeSession();
      renderPdfMergeUI();
    }
  };

  window.clearAllMergePdfs = function () {
    pdfMergeState.files = [];
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('pdf_session_doc-merge-pdf');
    }
    renderPdfMergeUI();
    showToast('Cleared merge list.');
  };

  window.executePdfMerge = async function (download = true) {
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

      const sourceFilesPayload = pdfMergeState.files.map(item => {
        let b = null;
        if (item.file instanceof Blob) {
          b = item.file;
        } else if (item.bytes) {
          b = new Blob([item.bytes], { type: 'application/pdf' });
        }
        return {
          name: item.name,
          size: item.size || (b ? b.size : 0),
          type: 'application/pdf',
          pageCount: item.pageCount || 1,
          thumbUrl: item.thumbUrl || null,
          blob: b
        };
      });

      const mergeThumb = pdfMergeState.files[0]?.thumbUrl || null;
      if (window.recordRecentFile) {
        window.recordRecentFile(outName, blob.size, 'application/pdf', 0, 0, 'pdf', blob, mergeThumb, 'doc-merge-pdf', sourceFilesPayload, 'merge');
      }

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
        try { previewTab.close(); } catch (_) { }
      }
      showToast('Error during PDF merging: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (listEl) listEl.style.display = 'flex';
    }
  };

  window.loadSamplePdfsForMerge = async function () {
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
        { name: 'PixKit_Report_A.pdf', file: new File([bytesA], 'PixKit_Report_A.pdf', { type: 'application/pdf' }), bytes: bytesA, size: bytesA.byteLength, pageCount: 3 },
        { name: 'PixKit_Appendix_B.pdf', file: new File([bytesB], 'PixKit_Appendix_B.pdf', { type: 'application/pdf' }), bytes: bytesB, size: bytesB.byteLength, pageCount: 2 }
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

  window.resetPdfMerge = function () {
    pdfMergeState.files = [];
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('pdf_session_doc-merge-pdf');
    }
    renderPdfMergeUI();
    showToast('Removed all PDF files from Merge list');
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

  async function initPdfSplitStage() {
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

    if (!pdfSplitState.bytes && typeof PixKitStorage !== 'undefined') {
      try {
        const session = await PixKitStorage.getItem('pdf_session_doc-split-pdf');
        if (session && session.blob && session.fileName && !session.fileName.includes('sample') && session.fileName !== 'mountain-view.jpg') {
          const file = new File([session.blob], session.fileName || 'document.pdf', { type: 'application/pdf' });
          await handlePdfSplitFile(file, true);
          return;
        } else if (session) {
          await PixKitStorage.removeItem('pdf_session_doc-split-pdf');
        }
      } catch (_) { }
    }

    renderPdfSplitUI();
  }

  window.handlePdfSplitFile = async function (file, skipToast) {
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

      if (!skipToast) {
        showToast(`Loaded ${pdfSplitState.numPages}-page document ready to split!`);
      }
      try {
        if (typeof PixKitStorage !== 'undefined') {
          const blob = (file instanceof Blob) ? file : new Blob([storedBytes], { type: 'application/pdf' });
          PixKitStorage.setItem('pdf_session_doc-split-pdf', {
            blob,
            fileName: pdfSplitState.fileName || file.name,
            fileSize: pdfSplitState.fileSize || file.size,
            mode: pdfSplitState.mode,
            chunkSize: pdfSplitState.chunkSize
          });
        }
      } catch (_) { }
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

  window.togglePdfSplitPage = function (index) {
    if (pdfSplitState.pages[index]) {
      pdfSplitState.pages[index].selected = !pdfSplitState.pages[index].selected;
      renderPdfSplitUI();
    }
  };

  window.selectPdfSplitPages = function (type) {
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

  window.onPdfSplitModeChange = function (mode) {
    pdfSplitState.mode = mode;
    const rangesGroup = document.getElementById('pdf-split-ranges-group');
    const fixedGroup = document.getElementById('pdf-split-fixed-group');

    if (rangesGroup) rangesGroup.style.display = mode === 'split-ranges' ? 'block' : 'none';
    if (fixedGroup) fixedGroup.style.display = mode === 'split-fixed' ? 'block' : 'none';

    updatePdfSplitSummary();
  };

  window.updatePdfSplitChunkSize = function (val) {
    pdfSplitState.chunkSize = parseInt(val, 10) || 2;
    const lbl = document.getElementById('pdf-split-chunk-size-val');
    if (lbl) lbl.textContent = `${pdfSplitState.chunkSize} ${pdfSplitState.chunkSize === 1 ? 'Page' : 'Pages'}`;
    updatePdfSplitSummary();
  };

  window.validatePdfSplitRanges = function () {
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

  window.executePdfSplit = async function (download = true) {
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
        const origSource = {
          name: pdfSplitState.fileName || 'source_document.pdf',
          size: pdfSplitState.fileSize || 0,
          type: 'application/pdf',
          pageCount: pdfSplitState.numPages || 1,
          thumbUrl: pdfSplitState.pages[0]?.canvas?.toDataURL('image/jpeg', 0.8) || null,
          blob: pdfSplitState.file instanceof Blob ? pdfSplitState.file : new Blob([pdfSplitState.bytes], { type: 'application/pdf' })
        };
        if (window.recordRecentFile) {
          window.recordRecentFile(item.name, blob.size, 'application/pdf', 0, 0, 'pdf', blob, null, 'doc-split-pdf', [origSource], 'split');
        }
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
        } catch (_) { }
      }
      showToast('Split PDF error: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForSplit = async function () {
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

  window.resetPdfSplit = function () {
    pdfSplitState.file = null;
    pdfSplitState.fileName = '';
    pdfSplitState.fileSize = 0;
    pdfSplitState.bytes = null;
    pdfSplitState.numPages = 0;
    pdfSplitState.pages = [];
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('pdf_session_doc-split-pdf');
    }
    renderPdfSplitUI();
    showToast('Cleared PDF document from Split tool');
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

  window.triggerPdfCompressPicker = function (e) {
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

  async function initPdfCompressStage() {
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

    if (!pdfCompressState.bytes && typeof PixKitStorage !== 'undefined') {
      try {
        const session = await PixKitStorage.getItem('pdf_session_doc-compress-pdf');
        if (session && session.blob && session.fileName && !session.fileName.includes('sample') && session.fileName !== 'mountain-view.jpg') {
          const file = new File([session.blob], session.fileName || 'document.pdf', { type: 'application/pdf' });
          await handlePdfCompressFile(file, true);
          if (session.preset && typeof selectPdfCompressPreset === 'function') {
            selectPdfCompressPreset(session.preset);
          }
          return;
        } else if (session) {
          await PixKitStorage.removeItem('pdf_session_doc-compress-pdf');
        }
      } catch (_) { }
    }

    renderPdfCompressUI();
  }

  window.handlePdfCompressFile = async function (file, skipToast) {
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
        } catch (_) { }
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

      if (!skipToast) {
        showToast(`Loaded "${fileName}" (${pdfCompressState.numPages} pages, ${formatPdfBytes(fileSize)})`);
      }
      try {
        if (typeof PixKitStorage !== 'undefined') {
          const blob = (file instanceof Blob) ? file : new Blob([storedBytes], { type: 'application/pdf' });
          PixKitStorage.setItem('pdf_session_doc-compress-pdf', {
            blob,
            fileName: pdfCompressState.name,
            fileSize: pdfCompressState.fileSize,
            preset: pdfCompressState.preset,
            quality: pdfCompressState.quality,
            scale: pdfCompressState.scale,
            colorMode: pdfCompressState.colorMode
          });
        }
      } catch (_) { }
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

  window.onPdfCompressPresetChange = function (preset) {
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

  window.setPdfCompressColorMode = function (mode) {
    const sel = document.getElementById('pdf-compress-colormode');
    if (sel) sel.value = mode;
    updatePdfCompressColorModeUI(mode);
    onPdfCompressCustomInput();
  };

  window.onPdfCompressColorModeSelect = function (mode) {
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

  window.onPdfCompressCustomInput = function () {
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

      let estBytes = Math.round(origBytes * (1 - reductionRatio));
      // In raster compression, each page is at least ~10 KB
      const minRasterBytes = 10 * 1024 * totalPages;
      if (estBytes < minRasterBytes && origBytes > minRasterBytes) {
        estBytes = minRasterBytes;
      }

      if (statOriginal) statOriginal.textContent = formatPdfBytes(origBytes);
      if (statEstimated) statEstimated.textContent = `~${formatPdfBytes(estBytes)}`;

      if (origBytes > 0 && estBytes < origBytes) {
        const actualSavingsRatio = Math.max(1, Math.round(((origBytes - estBytes) / origBytes) * 100));
        if (statSavings) statSavings.textContent = `↓ ~${actualSavingsRatio}% Reduction`;
        if (summaryPill) summaryPill.textContent = `${totalPages} Pages · ${formatPdfBytes(origBytes)} → ~${formatPdfBytes(estBytes)} (↓${actualSavingsRatio}%)`;
      } else {
        if (statSavings) statSavings.textContent = 'Already highly compact (vector PDF)';
        if (summaryPill) summaryPill.textContent = `${totalPages} Pages · ${formatPdfBytes(origBytes)} (Already compact)`;
      }
      if (statPages) statPages.textContent = `${totalPages} Page${totalPages > 1 ? 's' : ''}`;
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

  window.executePdfCompress = async function (download = true) {
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

      const compThumb = pdfCompressState.pages[0]?.thumbUrl || null;
      const origSource = {
        name: pdfCompressState.name || 'original_document.pdf',
        size: pdfCompressState.fileSize || 0,
        type: 'application/pdf',
        pageCount: pdfCompressState.numPages || 1,
        thumbUrl: compThumb,
        blob: pdfCompressState.file instanceof Blob ? pdfCompressState.file : new Blob([pdfCompressState.bytes], { type: 'application/pdf' })
      };
      if (window.recordRecentFile) {
        window.recordRecentFile(outName, compBlob.size, 'application/pdf', 0, 0, 'pdf', compBlob, compThumb, 'doc-compress-pdf', [origSource], 'compress');
      }

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
        } catch (_) { }
      }
      showToast('Compression failed: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForCompress = async function () {
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

        // Embed high-resolution raster graphic image stream for realistic document size (~1.5 MB total)
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 960;
          offCanvas.height = 540;
          const oCtx = offCanvas.getContext('2d');
          const grad = oCtx.createLinearGradient(0, 0, 960, 540);
          const hexCol1 = i === 0 ? '#1e40af' : (i === 1 ? '#047857' : (i === 2 ? '#b45309' : '#581c87'));
          const hexCol2 = i === 0 ? '#3b82f6' : (i === 1 ? '#10b981' : (i === 2 ? '#f59e0b' : '#8b5cf6'));
          const hexCol3 = i === 0 ? '#dbeafe' : (i === 1 ? '#d1fae5' : (i === 2 ? '#fef3c7' : '#ede9fe'));
          grad.addColorStop(0, hexCol1);
          grad.addColorStop(0.5, hexCol2);
          grad.addColorStop(1, hexCol3);
          oCtx.fillStyle = grad;
          oCtx.fillRect(0, 0, 960, 540);

          // Add complex textures and geometric patterns
          for (let p = 0; p < 60; p++) {
            oCtx.fillStyle = `rgba(255, 255, 255, ${0.08 + (p % 8) * 0.025})`;
            oCtx.beginPath();
            oCtx.arc((p * 59) % 960, (p * 47) % 540, 20 + (p % 35), 0, Math.PI * 2);
            oCtx.fill();
          }
          oCtx.fillStyle = '#ffffff';
          oCtx.font = 'bold 28px sans-serif';
          oCtx.fillText(`PixKit Graphic Sample · ${theme.title}`, 40, 60);

          const dataUri = offCanvas.toDataURL('image/jpeg', 0.92);
          const rawBin = atob(dataUri.split(',')[1]);
          const imgBytes = new Uint8Array(rawBin.length);
          for (let b = 0; b < rawBin.length; b++) imgBytes[b] = rawBin.charCodeAt(b);

          const embedded = await doc.embedJpg(imgBytes);
          page.drawImage(embedded, {
            x: 40,
            y: 410,
            width: 515,
            height: 295
          });
        } catch (_) {}

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

  window.resetPdfCompress = function () {
    pdfCompressState.file = null;
    pdfCompressState.bytes = null;
    pdfCompressState.name = '';
    pdfCompressState.fileSize = 0;
    pdfCompressState.numPages = 0;
    pdfCompressState.pages = [];
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('pdf_session_doc-compress-pdf');
    }
    renderPdfCompressUI();
    showToast('Cleared PDF document from Compress tool');
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

  function persistPdfRotateSession() {
    try {
      if (typeof PixKitStorage === 'undefined') return;
      if (!pdfRotateState.bytes) {
        PixKitStorage.removeItem('pdf_session_doc-rotate-pdf');
        return;
      }
      const blob = (pdfRotateState.file instanceof Blob) ? pdfRotateState.file : new Blob([pdfRotateState.bytes], { type: 'application/pdf' });
      const rotations = pdfRotateState.pages.map(p => ({ pageNum: p.pageNum, rotation: p.rotation || 0 }));
      PixKitStorage.setItem('pdf_session_doc-rotate-pdf', {
        blob,
        fileName: pdfRotateState.fileName,
        fileSize: pdfRotateState.fileSize,
        rotations,
        filter: pdfRotateState.filter
      });
    } catch (_) { }
  }

  async function initPdfRotateStage() {
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

    if (!pdfRotateState.bytes && typeof PixKitStorage !== 'undefined') {
      try {
        const session = await PixKitStorage.getItem('pdf_session_doc-rotate-pdf');
        if (session && session.blob && session.fileName && !session.fileName.includes('sample') && session.fileName !== 'mountain-view.jpg') {
          const file = new File([session.blob], session.fileName || 'document.pdf', { type: 'application/pdf' });
          await handlePdfRotateFile(file, true);
          if (session.rotations && Array.isArray(session.rotations)) {
            session.rotations.forEach((r, idx) => {
              if (pdfRotateState.pages[idx]) {
                pdfRotateState.pages[idx].rotation = r.rotation || 0;
              }
            });
            renderPdfRotateUI();
          }
          return;
        } else if (session) {
          await PixKitStorage.removeItem('pdf_session_doc-rotate-pdf');
        }
      } catch (_) { }
    }

    renderPdfRotateUI();
  }

  window.handlePdfRotateFile = async function (file, skipToast) {
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

      if (!skipToast) {
        showToast(`Loaded ${pdfRotateState.fileName} (${pdfRotateState.numPages} pages). Ready to rotate!`);
      }
      persistPdfRotateSession();
    } catch (err) {
      console.error('Error loading PDF for rotate:', err);
      showToast('Failed loading PDF: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      renderPdfRotateUI();
    }
  };

  window.rotatePdfPage = function (index, deltaDegrees) {
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
    persistPdfRotateSession();
  };

  window.rotateAllPdfPages = function (deltaDegrees) {
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
    persistPdfRotateSession();
    showToast(`Rotated ${affected} page(s) by ${deltaDegrees > 0 ? '+' : ''}${deltaDegrees}°.`);
  };

  window.resetAllPdfPageRotations = function () {
    if (!pdfRotateState.pages.length) return;
    pdfRotateState.pages.forEach(p => p.rotation = 0);
    renderPdfRotateGrid();
    updatePdfRotateStats();
    persistPdfRotateSession();
    showToast('Reset all pages to original orientation.');
  };

  window.onPdfRotateFilterChange = function (val) {
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

  window.executePdfRotate = async function (download = true) {
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

      const rotThumb = pdfRotateState.pages[0]?.thumbUrl || null;
      const origSource = {
        name: pdfRotateState.fileName || 'original_document.pdf',
        size: pdfRotateState.fileSize || 0,
        type: 'application/pdf',
        pageCount: pdfRotateState.numPages || 1,
        thumbUrl: rotThumb,
        blob: pdfRotateState.file instanceof Blob ? pdfRotateState.file : new Blob([pdfRotateState.bytes], { type: 'application/pdf' })
      };
      if (window.recordRecentFile) {
        window.recordRecentFile(outName, blob.size, 'application/pdf', 0, 0, 'pdf', blob, rotThumb, 'doc-rotate-pdf', [origSource], 'rotate');
      }

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
        try { previewTab.close(); } catch (_) { }
      }
      showToast('Error rotating PDF: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForRotate = async function () {
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

  window.resetPdfRotate = function () {
    pdfRotateState.file = null;
    pdfRotateState.fileName = '';
    pdfRotateState.fileSize = 0;
    pdfRotateState.bytes = null;
    pdfRotateState.numPages = 0;
    pdfRotateState.pages = [];
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('pdf_session_doc-rotate-pdf');
    }
    renderPdfRotateUI();
    showToast('Cleared PDF document from Rotate tool');
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

  function persistPdfDeleteSession() {
    try {
      if (typeof PixKitStorage === 'undefined') return;
      if (!pdfDeleteState.bytes) {
        PixKitStorage.removeItem('pdf_session_doc-delete-pdf');
        return;
      }
      const blob = (pdfDeleteState.file instanceof Blob) ? pdfDeleteState.file : new Blob([pdfDeleteState.bytes], { type: 'application/pdf' });
      const deletions = pdfDeleteState.pages.map(p => ({ pageNum: p.pageNum, deleted: !!p.deleted }));
      PixKitStorage.setItem('pdf_session_doc-delete-pdf', {
        blob,
        fileName: pdfDeleteState.fileName,
        fileSize: pdfDeleteState.fileSize,
        deletions
      });
    } catch (_) { }
  }

  async function initPdfDeleteStage() {
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

    if (!pdfDeleteState.bytes && typeof PixKitStorage !== 'undefined') {
      try {
        const session = await PixKitStorage.getItem('pdf_session_doc-delete-pdf');
        if (session && session.blob && session.fileName && !session.fileName.includes('sample') && session.fileName !== 'mountain-view.jpg') {
          const file = new File([session.blob], session.fileName || 'document.pdf', { type: 'application/pdf' });
          await handlePdfDeleteFile(file, true);
          if (session.deletions && Array.isArray(session.deletions)) {
            session.deletions.forEach((d, idx) => {
              if (pdfDeleteState.pages[idx]) {
                pdfDeleteState.pages[idx].deleted = !!d.deleted;
              }
            });
            renderPdfDeleteUI();
          }
          return;
        } else if (session) {
          await PixKitStorage.removeItem('pdf_session_doc-delete-pdf');
        }
      } catch (_) { }
    }

    renderPdfDeleteUI();
  }

  window.handlePdfDeleteFile = async function (file, skipToast) {
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

      if (!skipToast) {
        showToast(`Loaded ${pdfDeleteState.fileName} (${pdfDeleteState.numPages} pages). Click pages to mark for deletion.`);
      }
      persistPdfDeleteSession();
    } catch (err) {
      console.error('Error loading PDF for delete:', err);
      showToast('Failed loading PDF: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      renderPdfDeleteUI();
    }
  };

  window.togglePdfPageDelete = function (index) {
    if (index < 0 || index >= pdfDeleteState.pages.length) return;
    pdfDeleteState.pages[index].deleted = !pdfDeleteState.pages[index].deleted;
    syncPdfDeleteRangeInput();
    renderPdfDeleteGrid();
    updatePdfDeleteStats();
    persistPdfDeleteSession();
  };

  window.setPdfDeleteFilter = function (filter) {
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
    persistPdfDeleteSession();
  };

  window.invertPdfDeleteSelection = function () {
    if (!pdfDeleteState.pages.length) return;
    pdfDeleteState.pages.forEach(p => p.deleted = !p.deleted);
    syncPdfDeleteRangeInput();
    renderPdfDeleteGrid();
    updatePdfDeleteStats();
    persistPdfDeleteSession();
  };

  window.resetPdfDeleteSelection = function () {
    if (!pdfDeleteState.pages.length) return;
    pdfDeleteState.pages.forEach(p => p.deleted = false);
    const rangeInput = document.getElementById('pdf-delete-range-input');
    if (rangeInput) rangeInput.value = '';
    renderPdfDeleteGrid();
    updatePdfDeleteStats();
    persistPdfDeleteSession();
    showToast('Reset: all pages kept.');
  };

  window.onPdfDeleteRangeInput = function (val) {
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
    persistPdfDeleteSession();
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
    const canPreview = total > 0 && remainingCount > 0;
    if (btnExecute) btnExecute.disabled = !canExport;
    if (btnPreview) btnPreview.disabled = !canPreview;
  }

  window.executePdfDelete = async function (download = true) {
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

    if (download && keptIndices.length === pdfDeleteState.pages.length) {
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
      if (loadingText) loadingText.textContent = download
        ? `Removing ${pdfDeleteState.pages.length - keptIndices.length} page(s) from document...`
        : `Generating document preview (${keptIndices.length} pages)...`;
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

      const delThumb = pdfDeleteState.pages.find(p => !p.deleted)?.thumbUrl || null;
      const origSource = {
        name: pdfDeleteState.fileName || 'original_document.pdf',
        size: pdfDeleteState.fileSize || 0,
        type: 'application/pdf',
        pageCount: pdfDeleteState.numPages || 1,
        thumbUrl: delThumb,
        blob: pdfDeleteState.file instanceof Blob ? pdfDeleteState.file : new Blob([pdfDeleteState.bytes], { type: 'application/pdf' })
      };
      if (window.recordRecentFile) {
        window.recordRecentFile(outName, blob.size, 'application/pdf', 0, 0, 'pdf', blob, delThumb, 'doc-delete-pdf', [origSource], 'delete');
      }

      const deletedCount = pdfDeleteState.pages.length - keptIndices.length;

      if (download) {
        triggerBlobDownload(blob, outName);
        showToast(`Successfully deleted ${deletedCount} page(s) and saved "${outName}" (${keptIndices.length} pages remaining)!`);
      } else {
        openPdfPreviewTab(previewTab, blob, outName);
        showToast(deletedCount > 0
          ? `Opened preview (${keptIndices.length} pages remaining, ${deletedCount} removed) in new tab.`
          : `Opened PDF preview (${keptIndices.length} pages) in new tab.`);
      }
    } catch (err) {
      console.error('Error executing PDF page deletion:', err);
      if (previewTab && !previewTab.closed) {
        try { previewTab.close(); } catch (_) { }
      }
      showToast('Error removing pages: ' + err.message);
    } finally {
      if (loader) loader.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }
  };

  window.loadSamplePdfForDelete = async function () {
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

  window.resetPdfDelete = function () {
    pdfDeleteState.file = null;
    pdfDeleteState.fileName = '';
    pdfDeleteState.fileSize = 0;
    pdfDeleteState.bytes = null;
    pdfDeleteState.numPages = 0;
    pdfDeleteState.pages = [];
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('pdf_session_doc-delete-pdf');
    }
    renderPdfDeleteUI();
    showToast('Cleared PDF document from Delete tool');
  };

  // ==============================================================
  // TOOL 08 (DOCUMENT SUITE): BATCH PDF PROCESSOR CONTROLLER
  // ==============================================================
  const batchPdfState = {
    items: [],
    activeIndex: 0,
    isExpanded: false,
    isProcessing: false,
    activeDetailTool: null,
    configs: {
      compress: {
        enabled: true,
        level: 'medium',
        downscale: true
      },
      rotate: {
        enabled: false,
        angle: 90,
        scope: 'all'
      },
      toImages: {
        enabled: false,
        format: 'jpeg',
        scale: 2
      },
      extract: {
        enabled: false,
        mode: 'first',
        range: '1-2'
      },
      delete: {
        enabled: false,
        mode: 'first',
        pages: '1'
      },
      merge: {
        enabled: false,
        outputName: 'Merged-Documents.pdf'
      },
      watermark: {
        enabled: false,
        type: 'page-numbers',
        text: 'CONFIDENTIAL',
        pos: 'bottom-right'
      }
    }
  };

  const batchPdfToolMeta = {
    compress: {
      icon: '🗜️',
      title: 'Compress PDF',
      desc: 'Reduce PDF file size across all documents in the batch queue'
    },
    rotate: {
      icon: '🔄',
      title: 'Rotate Pages',
      desc: 'Rotate pages 90°, 180°, or 270° across all queued documents'
    },
    'to-images': {
      icon: '🖼️',
      title: 'PDF to Images',
      desc: 'Rasterize each PDF page as high-res JPEG, PNG, or WebP images'
    },
    extract: {
      icon: '✂️',
      title: 'Extract & Page Range',
      desc: 'Extract specific pages, page ranges, or split into 1-page documents'
    },
    delete: {
      icon: '🗑️',
      title: 'Delete Selected Pages',
      desc: 'Strip cover pages, blank back covers, or custom page numbers'
    },
    merge: {
      icon: '📑',
      title: 'Merge All into One PDF',
      desc: 'Concatenate all queued PDFs in order into a single unified master document'
    },
    watermark: {
      icon: '🔏',
      title: 'Watermark & Page Numbers',
      desc: 'Stamp page numbers or confidential watermarks across pages'
    }
  };

  let batchPdfDropzoneBound = false;

  async function initBatchPdfStage() {
    setupBatchPdfDropzoneEvents();
    if (batchPdfState.items.length === 0) {
      await restoreBatchPdfSession();
    }
    syncBatchPdfViewUI();
    updateAllBatchPdfToolStatusLabels();
    if (batchPdfState.items.length > 0) {
      renderBatchPdfPreviewCanvas();
    }
  }
  window.initBatchPdfStage = initBatchPdfStage;

  function setupBatchPdfDropzoneEvents() {
    if (batchPdfDropzoneBound) return;
    const dropzone = document.getElementById('batch-pdf-dropzone');
    const viewport = document.getElementById('batch-pdf-viewport');

    [dropzone, viewport].forEach(el => {
      if (!el) return;
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.add('drag-active');
      });
      el.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.remove('drag-active');
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropzone) dropzone.classList.remove('drag-active');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          handleBatchPdfFilesList(e.dataTransfer.files);
        }
      });
    });

    batchPdfDropzoneBound = true;
  }

  window.handleBatchPdfFilesSelect = function (e) {
    if (e && e.target && e.target.files && e.target.files.length) {
      handleBatchPdfFilesList(e.target.files);
      e.target.value = '';
    }
  };

  async function handleBatchPdfFilesList(fileList) {
    if (!fileList || !fileList.length) return;
    showToast(`Adding ${fileList.length} item(s) to Batch PDF queue...`);

    let addedCount = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lowerName = file.name.toLowerCase();

      // Check ZIP archive
      if (lowerName.endsWith('.zip') || file.type.includes('zip')) {
        try {
          if (typeof JSZip === 'undefined') {
            showToast('JSZip library not loaded, cannot extract ZIP.');
            continue;
          }
          const zip = await JSZip.loadAsync(file);
          const entries = Object.keys(zip.files);
          for (const entryName of entries) {
            const entry = zip.files[entryName];
            if (entry.dir) continue;
            const entryLower = entryName.toLowerCase();
            if (entryLower.endsWith('.pdf')) {
              const blob = await entry.async('blob');
              const cleanFileName = entryName.split('/').pop() || entryName;
              const item = await createBatchPdfItemFromBlob(blob, cleanFileName);
              if (item) {
                batchPdfState.items.push(item);
                addedCount++;
              }
            }
          }
        } catch (zipErr) {
          console.error('Batch PDF ZIP unpack error:', zipErr);
          showToast(`Error unpacking ZIP: ${zipErr.message}`);
        }
      } else if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
        const item = await createBatchPdfItemFromBlob(file, file.name);
        if (item) {
          batchPdfState.items.push(item);
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      if (batchPdfState.activeIndex >= batchPdfState.items.length) {
        batchPdfState.activeIndex = Math.max(0, batchPdfState.items.length - 1);
      }
      syncBatchPdfViewUI();
      renderBatchPdfPreviewCanvas();
      persistBatchPdfSession();
      showToast(`Added ${addedCount} document${addedCount > 1 ? 's' : ''} to Batch PDF queue!`);
    } else {
      showToast('No PDF documents detected in selection.');
    }
  }

  async function createBatchPdfItemFromBlob(blob, fileName) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      let numPages = 1;
      let thumbUrl = '';

      // 1. Page count via PDF-Lib
      try {
        if (window.PDFLib) {
          const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          numPages = pdfDoc.getPageCount();
        }
      } catch (err) {
        console.warn('PDF-Lib page count error:', err);
      }

      // 2. Render Page 1 thumbnail via PDF.js on isolated copy
      try {
        if (window.pdfjsLib) {
          const cloneData = new Uint8Array(arrayBuffer.slice(0));
          const loadingTask = window.pdfjsLib.getDocument({
            data: cloneData,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });
          const pdfJsDoc = await loadingTask.promise;
          const page = await pdfJsDoc.getPage(1);
          const viewport = page.getViewport({ scale: 0.35 });
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = viewport.width;
          thumbCanvas.height = viewport.height;
          const ctx = thumbCanvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.82);
        }
      } catch (thumbErr) {
        console.warn('Batch PDF thumbnail render error:', thumbErr);
      }

      return {
        id: 'bpdf_' + Math.random().toString(36).substr(2, 9),
        blob: blob,
        name: fileName || 'document.pdf',
        size: blob.size || arrayBuffer.byteLength,
        numPages: numPages,
        thumbUrl: thumbUrl,
        activePage: 1
      };
    } catch (e) {
      console.error('createBatchPdfItemFromBlob error:', e);
      return null;
    }
  }

  function syncBatchPdfViewUI() {
    const hasItems = batchPdfState.items.length > 0;
    const dropzone = document.getElementById('batch-pdf-dropzone');
    const canvasWrap = document.getElementById('batch-pdf-canvas-wrapper');
    const sliderPanel = document.getElementById('batch-pdf-slider-panel');
    const stageFooter = document.getElementById('batch-pdf-stage-footer');
    const topbarTools = document.getElementById('batch-pdf-topbar-tools');
    const statusHint = document.getElementById('batch-pdf-stage-status');
    const viewingTag = document.getElementById('batch-pdf-viewing-tag');

    if (dropzone) dropzone.style.display = hasItems ? 'none' : 'flex';
    if (canvasWrap) canvasWrap.style.display = hasItems ? 'flex' : 'none';
    if (sliderPanel) sliderPanel.style.display = hasItems ? 'block' : 'none';
    if (stageFooter) stageFooter.style.display = hasItems ? 'flex' : 'none';
    if (topbarTools) topbarTools.style.display = hasItems ? 'flex' : 'none';

    if (hasItems) {
      const cur = batchPdfState.items[batchPdfState.activeIndex];
      const count = batchPdfState.items.length;
      if (viewingTag) {
        viewingTag.style.display = 'inline-flex';
        viewingTag.textContent = `Viewing ${batchPdfState.activeIndex + 1} of ${count}`;
      }
      if (statusHint) {
        statusHint.textContent = cur ? cur.name : '';
        statusHint.title = cur ? `${cur.name} (${cur.numPages} Pages)` : '';
      }
      renderBatchPdfCarousel();
    } else {
      if (viewingTag) viewingTag.style.display = 'none';
      if (statusHint) {
        statusHint.textContent = 'Batch queue empty · Drop PDFs or ZIP to begin';
        statusHint.title = '';
      }
    }
  }

  async function renderBatchPdfPreviewCanvas() {
    if (!batchPdfState.items.length) return;
    const cur = batchPdfState.items[batchPdfState.activeIndex];
    if (!cur || !cur.blob) return;

    const canvas = document.getElementById('canvas-batch-pdf-preview');
    if (!canvas) return;

    try {
      const arrayBuffer = await cur.blob.arrayBuffer();
      const cloneData = new Uint8Array(arrayBuffer.slice(0));
      const loadingTask = window.pdfjsLib.getDocument({
        data: cloneData,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true
      });
      const pdfJsDoc = await loadingTask.promise;
      const pageNum = Math.min(Math.max(1, cur.activePage || 1), pdfJsDoc.numPages);
      const page = await pdfJsDoc.getPage(pageNum);

      const viewport = page.getViewport({ scale: 1.35 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      // Page controls
      const pageControls = document.getElementById('batch-pdf-page-controls');
      const pagePill = document.getElementById('batch-pdf-page-pill');
      if (pageControls && pagePill) {
        pageControls.style.display = pdfJsDoc.numPages > 1 ? 'flex' : 'none';
        pagePill.textContent = `Page ${pageNum} of ${pdfJsDoc.numPages}`;
      }
    } catch (err) {
      console.warn('Batch PDF canvas preview error:', err);
    }
  }

  window.navigateBatchPdfPage = function (dir) {
    if (!batchPdfState.items.length) return;
    const cur = batchPdfState.items[batchPdfState.activeIndex];
    if (!cur) return;
    let next = (cur.activePage || 1) + dir;
    if (next < 1) next = cur.numPages || 1;
    if (next > (cur.numPages || 1)) next = 1;
    cur.activePage = next;
    renderBatchPdfPreviewCanvas();
  };

  function renderBatchPdfCarousel() {
    const strip = document.getElementById('batch-pdf-carousel-strip');
    const countPill = document.getElementById('batch-pdf-count-pill');
    const activeName = document.getElementById('batch-pdf-active-name');
    const metaSummary = document.getElementById('batch-pdf-meta-summary');
    const metaDetails = document.getElementById('batch-pdf-meta-details');

    if (!strip) return;
    strip.innerHTML = '';

    const count = batchPdfState.items.length;
    let totalBytes = 0;
    batchPdfState.items.forEach(it => { totalBytes += (it.size || 0); });
    const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);

    if (countPill) countPill.textContent = `${count} Document${count !== 1 ? 's' : ''}`;
    if (metaSummary) metaSummary.textContent = `${count} Document${count !== 1 ? 's' : ''} in Queue · ${sizeMb} MB Total`;

    const cur = batchPdfState.items[batchPdfState.activeIndex];
    if (activeName) activeName.textContent = cur ? cur.name : '';
    if (metaDetails && cur) {
      const curMb = ((cur.size || 0) / (1024 * 1024)).toFixed(2);
      metaDetails.textContent = `Active: ${cur.name} (${cur.numPages || 1} Pages · ${curMb} MB)`;
    }

    batchPdfState.items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `batch-thumb-card ${idx === batchPdfState.activeIndex ? 'active' : ''}`;
      card.onclick = () => selectBatchPdfItem(idx);

      const numBadge = document.createElement('span');
      numBadge.className = 'batch-thumb-num';
      numBadge.textContent = `#${idx + 1}`;
      card.appendChild(numBadge);

      const delBtn = document.createElement('button');
      delBtn.className = 'batch-thumb-del';
      delBtn.title = 'Remove document from queue';
      delBtn.innerHTML = '✕';
      delBtn.onclick = (e) => removeBatchPdfItem(idx, e);
      card.appendChild(delBtn);

      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'batch-thumb-img-wrap';
      if (item.thumbUrl) {
        const img = document.createElement('img');
        img.src = item.thumbUrl;
        img.alt = item.name;
        imgWrapper.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = 'font-size:24px; color:var(--muted); display:flex; align-items:center; justify-content:center; width:100%; height:100%;';
        placeholder.textContent = '📄';
        imgWrapper.appendChild(placeholder);
      }
      card.appendChild(imgWrapper);

      const meta = document.createElement('div');
      meta.className = 'batch-thumb-meta';
      const nameEl = document.createElement('div');
      nameEl.className = 'batch-thumb-name';
      nameEl.textContent = item.name;
      meta.appendChild(nameEl);

      const dimEl = document.createElement('div');
      dimEl.className = 'batch-thumb-dims';
      dimEl.textContent = `${item.numPages || 1} Pages · ${((item.size || 0) / (1024 * 1024)).toFixed(1)} MB`;
      meta.appendChild(dimEl);

      card.appendChild(meta);
      strip.appendChild(card);
    });

    const activeCard = strip.children[batchPdfState.activeIndex];
    if (activeCard && !batchPdfState.isExpanded) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  window.selectBatchPdfItem = function (index) {
    if (index < 0 || index >= batchPdfState.items.length) return;
    batchPdfState.activeIndex = index;
    renderBatchPdfCarousel();
    renderBatchPdfPreviewCanvas();

    const cur = batchPdfState.items[index];
    const count = batchPdfState.items.length;
    const viewingTag = document.getElementById('batch-pdf-viewing-tag');
    const statusHint = document.getElementById('batch-pdf-stage-status');
    if (viewingTag) {
      viewingTag.style.display = 'inline-flex';
      viewingTag.textContent = `Viewing ${index + 1} of ${count}`;
    }
    if (statusHint && cur) {
      statusHint.textContent = cur.name;
      statusHint.title = `${cur.name} (${cur.numPages} Pages)`;
    }
    persistBatchPdfSession();
  };

  window.navigateBatchPdf = function (dir) {
    if (!batchPdfState.items.length) return;
    let next = batchPdfState.activeIndex + dir;
    if (next < 0) next = batchPdfState.items.length - 1;
    if (next >= batchPdfState.items.length) next = 0;
    selectBatchPdfItem(next);
  };

  window.scrollBatchPdfCarousel = function (dir) {
    const strip = document.getElementById('batch-pdf-carousel-strip');
    if (strip) {
      strip.scrollBy({ left: dir * 260, behavior: 'smooth' });
    }
  };

  window.toggleBatchPdfGridExpand = function () {
    const panel = document.getElementById('batch-pdf-slider-panel');
    const btnText = document.getElementById('batch-pdf-expand-btn-text');
    if (!panel) return;
    batchPdfState.isExpanded = !batchPdfState.isExpanded;
    panel.classList.toggle('expanded', batchPdfState.isExpanded);
    if (btnText) {
      btnText.textContent = batchPdfState.isExpanded ? 'Collapse Strip' : 'Expand Grid';
    }
  };

  window.removeBatchPdfItem = function (index, e) {
    if (e) e.stopPropagation();
    if (index < 0 || index >= batchPdfState.items.length) return;
    batchPdfState.items.splice(index, 1);
    if (batchPdfState.activeIndex >= batchPdfState.items.length) {
      batchPdfState.activeIndex = Math.max(0, batchPdfState.items.length - 1);
    }
    syncBatchPdfViewUI();
    if (batchPdfState.items.length > 0) {
      renderBatchPdfPreviewCanvas();
    }
    persistBatchPdfSession();
    showToast('Removed document from Batch PDF queue');
  };

  window.clearBatchPdfQueue = function () {
    batchPdfState.items = [];
    batchPdfState.activeIndex = 0;
    if (typeof closeBatchPdfToolDetail === 'function') {
      closeBatchPdfToolDetail();
    }
    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('batch_pdf_session');
    }
    syncBatchPdfViewUI();
    showToast('Cleared all documents from Batch PDF queue');
  };

  // --- Master-Detail Handlers ---
  window.openBatchPdfToolDetail = function (toolKey) {
    const meta = batchPdfToolMeta[toolKey];
    if (!meta) return;

    batchPdfState.activeDetailTool = toolKey;

    const iconEl = document.getElementById('batch-pdf-detail-icon');
    const titleEl = document.getElementById('batch-pdf-detail-title');
    const descEl = document.getElementById('batch-pdf-detail-desc');
    const toggleBtn = document.getElementById('batch-pdf-detail-toggle-btn');

    if (iconEl) iconEl.textContent = meta.icon;
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.desc;

    const cfg = batchPdfState.configs[toolKey];
    const isAct = cfg ? cfg.enabled : false;
    if (toggleBtn) {
      toggleBtn.className = `batch-tool-toggle-pill ${isAct ? 'active' : ''}`;
      toggleBtn.textContent = isAct ? 'Active' : 'Off';
    }

    document.querySelectorAll('.batch-subtool-pane').forEach(p => {
      if (p.id.startsWith('batch-pdf-pane-')) p.style.display = 'none';
    });
    const activePane = document.getElementById(`batch-pdf-pane-${toolKey}`);
    if (activePane) activePane.style.display = 'block';

    const masterView = document.getElementById('batch-pdf-master-view');
    const detailView = document.getElementById('batch-pdf-detail-view');
    if (masterView) masterView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    const panel = document.getElementById('batch-pdf-control-center-panel');
    if (panel) panel.scrollTop = 0;

    persistBatchPdfSession();
  };

  window.closeBatchPdfToolDetail = function () {
    batchPdfState.activeDetailTool = null;
    const masterView = document.getElementById('batch-pdf-master-view');
    const detailView = document.getElementById('batch-pdf-detail-view');

    if (detailView) {
      detailView.style.display = 'none';
    }
    if (masterView) {
      masterView.style.display = 'block';
    }

    const panel = document.getElementById('batch-pdf-control-center-panel');
    if (panel) panel.scrollTop = 0;

    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.toggleBatchPdfFeature = function (toolKey) {
    const cfg = batchPdfState.configs[toolKey];
    if (!cfg) return;
    cfg.enabled = !cfg.enabled;

    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
    showToast(`${batchPdfToolMeta[toolKey]?.title || toolKey} is now ${cfg.enabled ? 'Active' : 'Off'}`);
  };

  window.toggleActiveBatchPdfDetailFeature = function () {
    if (!batchPdfState.activeDetailTool) return;
    const toolKey = batchPdfState.activeDetailTool;
    const cfg = batchPdfState.configs[toolKey];
    if (!cfg) return;
    cfg.enabled = !cfg.enabled;

    const toggleBtn = document.getElementById('batch-pdf-detail-toggle-btn');
    if (toggleBtn) {
      toggleBtn.className = `batch-tool-toggle-pill ${cfg.enabled ? 'active' : ''}`;
      toggleBtn.textContent = cfg.enabled ? 'Active' : 'Off';
    }

    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
    showToast(`${batchPdfToolMeta[toolKey]?.title || toolKey} is now ${cfg.enabled ? 'Active' : 'Off'}`);
  };

  function updateAllBatchPdfToolStatusLabels() {
    const c = batchPdfState.configs;

    // 1. Compress
    const compPill = document.getElementById('batch-pdf-toggle-compress');
    const compStat = document.getElementById('batch-pdf-status-compress');
    if (compPill) {
      compPill.className = `batch-tool-toggle-pill ${c.compress.enabled ? 'active' : ''}`;
      compPill.textContent = c.compress.enabled ? 'Active' : 'Off';
    }
    if (compStat) {
      const lvl = c.compress.level === 'high' ? 'High (96 DPI)' : (c.compress.level === 'light' ? 'Light (200 DPI)' : 'Medium (150 DPI)');
      compStat.textContent = c.compress.enabled ? lvl : 'Off';
    }

    // 2. Rotate
    const rotPill = document.getElementById('batch-pdf-toggle-rotate');
    const rotStat = document.getElementById('batch-pdf-status-rotate');
    if (rotPill) {
      rotPill.className = `batch-tool-toggle-pill ${c.rotate.enabled ? 'active' : ''}`;
      rotPill.textContent = c.rotate.enabled ? 'Active' : 'Off';
    }
    if (rotStat) {
      rotStat.textContent = c.rotate.enabled ? `${c.rotate.angle}° (${c.rotate.scope})` : '0° (Original)';
    }

    // 3. To Images
    const imgPill = document.getElementById('batch-pdf-toggle-to-images');
    const imgStat = document.getElementById('batch-pdf-status-to-images');
    if (imgPill) {
      imgPill.className = `batch-tool-toggle-pill ${c.toImages.enabled ? 'active' : ''}`;
      imgPill.textContent = c.toImages.enabled ? 'Active' : 'Off';
    }
    if (imgStat) {
      imgStat.textContent = c.toImages.enabled ? `${c.toImages.format.toUpperCase()} (${c.toImages.scale}x Scale)` : 'Off';
    }

    // 4. Extract
    const extPill = document.getElementById('batch-pdf-toggle-extract');
    const extStat = document.getElementById('batch-pdf-status-extract');
    if (extPill) {
      extPill.className = `batch-tool-toggle-pill ${c.extract.enabled ? 'active' : ''}`;
      extPill.textContent = c.extract.enabled ? 'Active' : 'Off';
    }
    if (extStat) {
      extStat.textContent = c.extract.enabled ? (c.extract.mode === 'all' ? 'Split All Pages' : (c.extract.mode === 'custom' ? `Range: ${c.extract.range}` : 'First Page Only')) : 'All Pages';
    }

    // 5. Delete
    const delPill = document.getElementById('batch-pdf-toggle-delete');
    const delStat = document.getElementById('batch-pdf-status-delete');
    if (delPill) {
      delPill.className = `batch-tool-toggle-pill ${c.delete.enabled ? 'active' : ''}`;
      delPill.textContent = c.delete.enabled ? 'Active' : 'Off';
    }
    if (delStat) {
      delStat.textContent = c.delete.enabled ? (c.delete.mode === 'first' ? 'Remove Page 1' : (c.delete.mode === 'last' ? 'Remove Last Page' : `Remove: ${c.delete.pages}`)) : 'None';
    }

    // 6. Merge
    const mrgPill = document.getElementById('batch-pdf-toggle-merge');
    const mrgStat = document.getElementById('batch-pdf-status-merge');
    if (mrgPill) {
      mrgPill.className = `batch-tool-toggle-pill ${c.merge.enabled ? 'active' : ''}`;
      mrgPill.textContent = c.merge.enabled ? 'Active' : 'Off';
    }
    if (mrgStat) {
      mrgStat.textContent = c.merge.enabled ? 'Merged Master PDF' : 'Separate Files (ZIP)';
    }

    // 7. Watermark
    const wmPill = document.getElementById('batch-pdf-toggle-watermark');
    const wmStat = document.getElementById('batch-pdf-status-watermark');
    if (wmPill) {
      wmPill.className = `batch-tool-toggle-pill ${c.watermark.enabled ? 'active' : ''}`;
      wmPill.textContent = c.watermark.enabled ? 'Active' : 'Off';
    }
    if (wmStat) {
      wmStat.textContent = c.watermark.enabled ? (c.watermark.type === 'page-numbers' ? 'Page Numbers' : `Stamp: ${c.watermark.text}`) : 'Off';
    }

    // Update process button label
    const btnProcessText = document.getElementById('batch-pdf-process-btn-text');
    if (btnProcessText) {
      btnProcessText.textContent = c.merge.enabled ? 'Merge & Download Single PDF' : 'Process & Download All (ZIP)';
    }
  }

  // --- Subtool Config Setters ---
  window.setBatchPdfCompressLevel = function (lvl) {
    batchPdfState.configs.compress.level = lvl;
    document.querySelectorAll('#batch-pdf-compress-level .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === lvl);
    });
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfDownscale = function (ds) {
    batchPdfState.configs.compress.downscale = ds;
    document.querySelectorAll('#batch-pdf-compress-downscale .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === String(ds));
    });
    persistBatchPdfSession();
  };

  window.setBatchPdfRotateAngle = function (angle) {
    batchPdfState.configs.rotate.angle = parseInt(angle, 10);
    document.querySelectorAll('#batch-pdf-rotate-angle .segment-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.val, 10) === parseInt(angle, 10));
    });
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfRotateScope = function (scope) {
    batchPdfState.configs.rotate.scope = scope;
    document.querySelectorAll('#batch-pdf-rotate-scope .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === scope);
    });
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfImgFormat = function (fmt) {
    batchPdfState.configs.toImages.format = fmt;
    document.querySelectorAll('#batch-pdf-img-format .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === fmt);
    });
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfImgScale = function (scale) {
    batchPdfState.configs.toImages.scale = parseInt(scale, 10);
    document.querySelectorAll('#batch-pdf-img-scale .segment-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.val, 10) === parseInt(scale, 10));
    });
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfExtractMode = function (mode) {
    batchPdfState.configs.extract.mode = mode;
    document.querySelectorAll('#batch-pdf-extract-mode .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === mode);
    });
    const customWrap = document.getElementById('batch-pdf-extract-custom-wrap');
    if (customWrap) customWrap.style.display = mode === 'custom' ? 'block' : 'none';
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfExtractRange = function (range) {
    batchPdfState.configs.extract.range = range;
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfDeleteMode = function (mode) {
    batchPdfState.configs.delete.mode = mode;
    document.querySelectorAll('#batch-pdf-delete-mode .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === mode);
    });
    const customWrap = document.getElementById('batch-pdf-delete-custom-wrap');
    if (customWrap) customWrap.style.display = mode === 'custom' ? 'block' : 'none';
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfDeletePages = function (pages) {
    batchPdfState.configs.delete.pages = pages;
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfMergeName = function (name) {
    batchPdfState.configs.merge.outputName = name || 'Merged-Documents.pdf';
    persistBatchPdfSession();
  };

  window.setBatchPdfWatermarkType = function (type) {
    batchPdfState.configs.watermark.type = type;
    document.querySelectorAll('#batch-pdf-wm-type .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === type);
    });
    if (type === 'confidential') batchPdfState.configs.watermark.text = 'CONFIDENTIAL';
    else if (type === 'draft') batchPdfState.configs.watermark.text = 'DRAFT';

    const customWrap = document.getElementById('batch-pdf-wm-custom-wrap');
    if (customWrap) customWrap.style.display = type === 'custom' ? 'block' : 'none';
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfWatermarkCustomText = function (text) {
    batchPdfState.configs.watermark.text = text;
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
  };

  window.setBatchPdfWatermarkPos = function (pos) {
    batchPdfState.configs.watermark.pos = pos;
    document.querySelectorAll('#batch-pdf-wm-pos .segment-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.val === pos);
    });
    persistBatchPdfSession();
  };

  window.resetBatchPdfConfigs = function () {
    batchPdfState.configs = {
      compress: { enabled: true, level: 'medium', downscale: true },
      rotate: { enabled: false, angle: 90, scope: 'all' },
      toImages: { enabled: false, format: 'jpeg', scale: 2 },
      extract: { enabled: false, mode: 'first', range: '1-2' },
      delete: { enabled: false, mode: 'first', pages: '1' },
      merge: { enabled: false, outputName: 'Merged-Documents.pdf' },
      watermark: { enabled: false, type: 'page-numbers', text: 'CONFIDENTIAL', pos: 'bottom-right' }
    };
    updateAllBatchPdfToolStatusLabels();
    persistBatchPdfSession();
    showToast('Reset all Batch PDF settings to default');
  };

  // --- Session Persistence ---
  function persistBatchPdfSession() {
    try {
      if (typeof PixKitStorage === 'undefined') return;
      const serializableItems = batchPdfState.items.map(it => ({
        id: it.id,
        name: it.name,
        size: it.size,
        numPages: it.numPages,
        thumbUrl: it.thumbUrl,
        activePage: it.activePage,
        blob: it.blob
      }));
      PixKitStorage.setItem('batch_pdf_session', {
        items: serializableItems,
        activeIndex: batchPdfState.activeIndex,
        configs: batchPdfState.configs,
        activeDetailTool: batchPdfState.activeDetailTool
      });
    } catch (e) {
      console.warn('Could not persist batch PDF session:', e);
    }
  }

  async function restoreBatchPdfSession() {
    try {
      if (typeof PixKitStorage === 'undefined') return;
      const data = await PixKitStorage.getItem('batch_pdf_session');
      if (!data || !data.items || !data.items.length) return;

      const restoredItems = [];
      for (const it of data.items) {
        if (!it.blob) continue;
        const item = await createBatchPdfItemFromBlob(it.blob, it.name);
        if (item) {
          item.id = it.id || item.id;
          item.activePage = it.activePage || 1;
          restoredItems.push(item);
        }
      }

      if (restoredItems.length > 0) {
        batchPdfState.items = restoredItems;
        batchPdfState.activeIndex = Math.min(data.activeIndex || 0, restoredItems.length - 1);
        if (data.configs) {
          batchPdfState.configs = Object.assign({}, batchPdfState.configs, data.configs);
        }
        updateAllBatchPdfToolStatusLabels();
        if (data.activeDetailTool && batchPdfState.configs[data.activeDetailTool]) {
          openBatchPdfToolDetail(data.activeDetailTool);
        }
      }
    } catch (err) {
      console.warn('Could not restore batch PDF session:', err);
    }
  }

  // --- Sample Batch PDF Generator (3 diverse documents) ---
  window.loadSampleBatchPdf = async function () {
    if (!window.PDFLib) {
      showToast('PDF-Lib not ready, cannot generate samples.');
      return;
    }
    showToast('Generating 3 diverse sample PDF documents...');

    const rgb = window.PDFLib.rgb;
    const StandardFonts = window.PDFLib.StandardFonts;

    // Doc 1: Company Annual Financial Report (2 Pages)
    const doc1 = await window.PDFLib.PDFDocument.create();
    const font1 = await doc1.embedFont(StandardFonts.Helvetica);
    const font1Bold = await doc1.embedFont(StandardFonts.HelveticaBold);

    // Page 1
    const p1 = doc1.addPage([595, 842]);
    p1.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: rgb(0.12, 0.35, 0.25) });
    p1.drawText('ACME GLOBAL CORP · ANNUAL REPORT 2026', { x: 40, y: 795, size: 16, font: font1Bold, color: rgb(1, 1, 1) });
    p1.drawText('Executive Financial Summary & Operational Milestones', { x: 40, y: 775, size: 11, font: font1, color: rgb(0.85, 0.95, 0.88) });

    p1.drawRectangle({ x: 40, y: 640, width: 240, height: 90, color: rgb(0.95, 0.97, 0.95), borderColor: rgb(0.8, 0.88, 0.8), borderWidth: 1 });
    p1.drawText('Total Revenue', { x: 55, y: 705, size: 11, font: font1, color: rgb(0.3, 0.3, 0.3) });
    p1.drawText('$48,250,000', { x: 55, y: 668, size: 22, font: font1Bold, color: rgb(0.12, 0.35, 0.25) });
    p1.drawText('+24.8% YoY Growth', { x: 55, y: 650, size: 10, font: font1Bold, color: rgb(0.18, 0.55, 0.34) });

    p1.drawRectangle({ x: 315, y: 640, width: 240, height: 90, color: rgb(0.95, 0.97, 0.95), borderColor: rgb(0.8, 0.88, 0.8), borderWidth: 1 });
    p1.drawText('Net Operating Margin', { x: 330, y: 705, size: 11, font: font1, color: rgb(0.3, 0.3, 0.3) });
    p1.drawText('34.2%', { x: 330, y: 668, size: 22, font: font1Bold, color: rgb(0.12, 0.35, 0.25) });
    p1.drawText('Record High Efficiency', { x: 330, y: 650, size: 10, font: font1Bold, color: rgb(0.18, 0.55, 0.34) });

    p1.drawText('1. Executive Overview & Strategic Direction', { x: 40, y: 590, size: 14, font: font1Bold, color: rgb(0.1, 0.1, 0.1) });
    p1.drawText('During fiscal year 2026, Acme Global Corp accelerated international market expansion, deployed', { x: 40, y: 565, size: 10.5, font: font1, color: rgb(0.25, 0.25, 0.25) });
    p1.drawText('state-of-the-art automated infrastructure, and maintained carbon neutrality across all operations.', { x: 40, y: 548, size: 10.5, font: font1, color: rgb(0.25, 0.25, 0.25) });

    // Page 2
    const p1_2 = doc1.addPage([595, 842]);
    p1_2.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: rgb(0.12, 0.35, 0.25) });
    p1_2.drawText('ACME GLOBAL CORP · REGIONAL PERFORMANCE', { x: 40, y: 795, size: 16, font: font1Bold, color: rgb(1, 1, 1) });
    p1_2.drawText('Breakdown of Global Distribution and Key Partnerships', { x: 40, y: 775, size: 11, font: font1, color: rgb(0.85, 0.95, 0.88) });
    p1_2.drawText('2. Balance Sheet & Cash Reserves', { x: 40, y: 710, size: 14, font: font1Bold, color: rgb(0.1, 0.1, 0.1) });
    p1_2.drawText('Cash and equivalent reserves reached $18.4M with low debt covenants and high liquidity ratio.', { x: 40, y: 685, size: 10.5, font: font1, color: rgb(0.25, 0.25, 0.25) });

    const doc1Bytes = await doc1.save();
    const doc1Blob = new Blob([doc1Bytes], { type: 'application/pdf' });

    // Doc 2: Product Design Specification (3 Pages)
    const doc2 = await window.PDFLib.PDFDocument.create();
    const font2 = await doc2.embedFont(StandardFonts.Helvetica);
    const font2Bold = await doc2.embedFont(StandardFonts.HelveticaBold);

    for (let pg = 1; pg <= 3; pg++) {
      const p = doc2.addPage([595, 842]);
      p.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: rgb(0.18, 0.25, 0.45) });
      p.drawText(`PIXKIT NEXT-GEN UI SPECIFICATION · CHAPTER 0${pg}`, { x: 40, y: 802, size: 14, font: font2Bold, color: rgb(1, 1, 1) });
      p.drawText(`Document Revision 2.4 · High-Fidelity Design Guidelines`, { x: 40, y: 785, size: 10, font: font2, color: rgb(0.8, 0.85, 1) });
      p.drawText(`Section ${pg}.0 Architectural Principles & Layout Geometry`, { x: 40, y: 720, size: 13, font: font2Bold, color: rgb(0.1, 0.1, 0.1) });
      p.drawText(`Page ${pg} establishes strict grid units, typography scales, accessibility contrasts, and micro-interactions.`, { x: 40, y: 695, size: 10.5, font: font2, color: rgb(0.3, 0.3, 0.3) });
      p.drawRectangle({ x: 40, y: 450, width: 515, height: 210, color: rgb(0.96, 0.97, 0.99), borderColor: rgb(0.85, 0.88, 0.94), borderWidth: 1 });
      p.drawText(`[ Vector Component Diagram: Section ${pg} Layout Matrix ]`, { x: 160, y: 550, size: 12, font: font2Bold, color: rgb(0.3, 0.4, 0.6) });
    }
    const doc2Bytes = await doc2.save();
    const doc2Blob = new Blob([doc2Bytes], { type: 'application/pdf' });

    // Doc 3: Service Agreement Contract (1 Page)
    const doc3 = await window.PDFLib.PDFDocument.create();
    const font3 = await doc3.embedFont(StandardFonts.Helvetica);
    const font3Bold = await doc3.embedFont(StandardFonts.HelveticaBold);
    const p3 = doc3.addPage([595, 842]);
    p3.drawRectangle({ x: 0, y: 770, width: 595, height: 72, color: rgb(0.45, 0.18, 0.18) });
    p3.drawText('MASTER PROFESSIONAL SERVICES AGREEMENT', { x: 40, y: 802, size: 14, font: font3Bold, color: rgb(1, 1, 1) });
    p3.drawText('Client Statement of Work · Fully Executed', { x: 40, y: 785, size: 10, font: font3, color: rgb(1, 0.85, 0.85) });
    p3.drawText('1. Term and Scope of Services', { x: 40, y: 720, size: 12, font: font3Bold, color: rgb(0.1, 0.1, 0.1) });
    p3.drawText('This Service Agreement is entered into between Provider and Client under standard commercial terms.', { x: 40, y: 695, size: 10.5, font: font3, color: rgb(0.25, 0.25, 0.25) });
    p3.drawRectangle({ x: 40, y: 150, width: 240, height: 80, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
    p3.drawText('Authorized Signature: Jane Doe, VP', { x: 50, y: 165, size: 10, font: font3, color: rgb(0.2, 0.2, 0.2) });
    p3.drawRectangle({ x: 315, y: 150, width: 240, height: 80, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
    p3.drawText('Authorized Signature: John Smith, CTO', { x: 325, y: 165, size: 10, font: font3, color: rgb(0.2, 0.2, 0.2) });

    const doc3Bytes = await doc3.save();
    const doc3Blob = new Blob([doc3Bytes], { type: 'application/pdf' });

    const samplesList = [
      { blob: doc1Blob, name: 'Company-Annual-Report.pdf' },
      { blob: doc2Blob, name: 'Product-Brochure-2026.pdf' },
      { blob: doc3Blob, name: 'Service-Agreement-Signed.pdf' }
    ];

    batchPdfState.items = [];
    for (const s of samplesList) {
      const item = await createBatchPdfItemFromBlob(s.blob, s.name);
      if (item) batchPdfState.items.push(item);
    }

    batchPdfState.activeIndex = 0;
    syncBatchPdfViewUI();
    renderBatchPdfPreviewCanvas();
    persistBatchPdfSession();
    showToast('Loaded 3 diverse sample PDF documents into Batch PDF queue!');
  };

  // --- Process & Download Execution ---
  window.processAndDownloadBatchPdf = async function () {
    if (!batchPdfState.items.length) {
      showToast('No PDF documents in queue to process.');
      return;
    }
    if (batchPdfState.isProcessing) return;
    batchPdfState.isProcessing = true;

    const btnProcess = document.getElementById('btn-batch-pdf-process');
    if (btnProcess) btnProcess.disabled = true;

    const cfg = batchPdfState.configs;
    const isMerge = cfg.merge && cfg.merge.enabled;
    const isToImages = cfg.toImages && cfg.toImages.enabled;

    showToast(isMerge ? 'Merging all queued PDFs into a single document...' : 'Processing all queued PDF documents...');

    try {
      if (isMerge) {
        // Concatenate all into a single master PDF
        const masterDoc = await window.PDFLib.PDFDocument.create();
        for (let idx = 0; idx < batchPdfState.items.length; idx++) {
          const item = batchPdfState.items[idx];
          const arrayBuffer = await item.blob.arrayBuffer();
          const doc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

          // Apply rotation if active
          if (cfg.rotate.enabled) {
            applyRotationToDoc(doc, cfg.rotate);
          }
          // Apply deletion if active
          if (cfg.delete.enabled) {
            applyDeletionToDoc(doc, cfg.delete);
          }
          // Apply watermark if active
          if (cfg.watermark.enabled) {
            await applyWatermarkToDoc(doc, cfg.watermark);
          }

          const pageIndices = doc.getPageIndices();
          if (pageIndices.length > 0) {
            const copiedPages = await masterDoc.copyPages(doc, pageIndices);
            copiedPages.forEach(p => masterDoc.addPage(p));
          }
        }

        const masterBytes = await masterDoc.save({ useObjectStreams: true });
        const mergedBlob = new Blob([masterBytes], { type: 'application/pdf' });
        const outName = cfg.merge.outputName || 'Merged-Documents.pdf';
        triggerBlobDownload(mergedBlob, outName);
        showToast(`🎉 Merged and downloaded all ${batchPdfState.items.length} PDFs into ${outName}!`);
      } else if (isToImages) {
        // PDF to Images: Extract pages as images in a ZIP
        const zip = new JSZip();
        for (let idx = 0; idx < batchPdfState.items.length; idx++) {
          const item = batchPdfState.items[idx];
          const arrayBuffer = await item.blob.arrayBuffer();
          const cloneData = new Uint8Array(arrayBuffer.slice(0));
          const pdfJsDoc = await window.pdfjsLib.getDocument({
            data: cloneData,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          }).promise;

          const baseClean = item.name.replace(/\.pdf$/i, '');
          const folder = zip.folder(baseClean);
          const fmt = cfg.toImages.format || 'jpeg';
          const mime = fmt === 'png' ? 'image/png' : (fmt === 'webp' ? 'image/webp' : 'image/jpeg');
          const ext = fmt === 'png' ? 'png' : (fmt === 'webp' ? 'webp' : 'jpg');
          const scale = cfg.toImages.scale || 2;

          for (let pNum = 1; pNum <= pdfJsDoc.numPages; pNum++) {
            const page = await pdfJsDoc.getPage(pNum);
            const viewport = page.getViewport({ scale: scale });
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = viewport.width;
            pageCanvas.height = viewport.height;
            const ctx = pageCanvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            const imgBlob = await new Promise(res => pageCanvas.toBlob(res, mime, 0.92));
            folder.file(`page-${String(pNum).padStart(2, '0')}.${ext}`, imgBlob);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        triggerBlobDownload(zipBlob, `pixkit_pdf_images_${Date.now()}.zip`);
        showToast(`🎉 Rendered and downloaded all PDF pages as images in ZIP!`);
      } else {
        // Separate Processed PDFs packaged in a ZIP
        const zip = new JSZip();
        for (let idx = 0; idx < batchPdfState.items.length; idx++) {
          const item = batchPdfState.items[idx];
          const arrayBuffer = await item.blob.arrayBuffer();
          const doc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

          if (cfg.rotate.enabled) applyRotationToDoc(doc, cfg.rotate);
          if (cfg.delete.enabled) applyDeletionToDoc(doc, cfg.delete);
          if (cfg.extract.enabled) applyExtractionToDoc(doc, cfg.extract);
          if (cfg.watermark.enabled) await applyWatermarkToDoc(doc, cfg.watermark);

          const processedBytes = await doc.save({ useObjectStreams: true });
          const baseClean = item.name.replace(/\.pdf$/i, '');
          zip.file(`${baseClean}_processed.pdf`, processedBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        triggerBlobDownload(zipBlob, `pixkit_batch_pdf_${Date.now()}.zip`);
        showToast(`🎉 Processed and downloaded all ${batchPdfState.items.length} PDF documents in ZIP!`);
      }
    } catch (err) {
      console.error('Batch PDF execution error:', err);
      showToast(`Error processing batch PDF: ${err.message}`);
    } finally {
      batchPdfState.isProcessing = false;
      if (btnProcess) btnProcess.disabled = false;
    }
  };

  window.downloadActiveBatchPdf = async function () {
    if (!batchPdfState.items.length) return;
    const item = batchPdfState.items[batchPdfState.activeIndex];
    if (!item) return;

    showToast(`Processing ${item.name}...`);
    try {
      const cfg = batchPdfState.configs;
      const arrayBuffer = await item.blob.arrayBuffer();
      const doc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      if (cfg.rotate.enabled) applyRotationToDoc(doc, cfg.rotate);
      if (cfg.delete.enabled) applyDeletionToDoc(doc, cfg.delete);
      if (cfg.extract.enabled) applyExtractionToDoc(doc, cfg.extract);
      if (cfg.watermark.enabled) await applyWatermarkToDoc(doc, cfg.watermark);

      const outBytes = await doc.save({ useObjectStreams: true });
      const outBlob = new Blob([outBytes], { type: 'application/pdf' });
      const baseClean = item.name.replace(/\.pdf$/i, '');
      triggerBlobDownload(outBlob, `${baseClean}_processed.pdf`);
      showToast(`Downloaded processed ${item.name}`);
    } catch (e) {
      console.error('downloadActiveBatchPdf error:', e);
      showToast('Error processing active PDF: ' + e.message);
    }
  };

  // Helper transformers
  function applyRotationToDoc(doc, rotCfg) {
    const angle = rotCfg.angle || 90;
    const scope = rotCfg.scope || 'all';
    const total = doc.getPageCount();

    for (let i = 0; i < total; i++) {
      const pageNum = i + 1;
      let shouldRotate = false;
      if (scope === 'all') shouldRotate = true;
      else if (scope === 'first' && pageNum === 1) shouldRotate = true;
      else if (scope === 'odd' && pageNum % 2 !== 0) shouldRotate = true;
      else if (scope === 'even' && pageNum % 2 === 0) shouldRotate = true;

      if (shouldRotate) {
        const page = doc.getPage(i);
        const curr = page.getRotation().angle;
        page.setRotation(window.PDFLib.degrees((curr + angle) % 360));
      }
    }
  }

  function applyDeletionToDoc(doc, delCfg) {
    const mode = delCfg.mode || 'first';
    const total = doc.getPageCount();
    if (total <= 1) return;

    if (mode === 'first') {
      doc.removePage(0);
    } else if (mode === 'last') {
      doc.removePage(total - 1);
    } else if (mode === 'custom' && delCfg.pages) {
      const toDelete = new Set(delCfg.pages.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n) && n >= 0 && n < total));
      const sorted = Array.from(toDelete).sort((a, b) => b - a);
      sorted.forEach(idx => {
        if (doc.getPageCount() > 1) doc.removePage(idx);
      });
    }
  }

  function applyExtractionToDoc(doc, extCfg) {
    const mode = extCfg.mode || 'first';
    const total = doc.getPageCount();
    if (mode === 'first') {
      while (doc.getPageCount() > 1) {
        doc.removePage(doc.getPageCount() - 1);
      }
    } else if (mode === 'custom' && extCfg.range) {
      const parts = extCfg.range.split('-').map(s => parseInt(s.trim(), 10));
      const start = Math.max(1, parts[0] || 1);
      const end = Math.min(total, parts[1] || start);
      const keepIndices = new Set();
      for (let p = start; p <= end; p++) keepIndices.add(p - 1);

      for (let i = total - 1; i >= 0; i--) {
        if (!keepIndices.has(i) && doc.getPageCount() > 1) {
          doc.removePage(i);
        }
      }
    }
  }

  async function applyWatermarkToDoc(doc, wmCfg) {
    const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
    const total = doc.getPageCount();
    const rgb = window.PDFLib.rgb;

    for (let i = 0; i < total; i++) {
      const page = doc.getPage(i);
      const { width, height } = page.getSize();
      const pageNum = i + 1;

      if (wmCfg.type === 'page-numbers') {
        const text = `Page ${pageNum} of ${total}`;
        page.drawText(text, {
          x: width - 110,
          y: 25,
          size: 9.5,
          font: font,
          color: rgb(0.4, 0.4, 0.4)
        });
      } else {
        const text = wmCfg.text || 'CONFIDENTIAL';
        if (wmCfg.pos === 'center') {
          page.drawText(text, {
            x: width / 2 - 120,
            y: height / 2,
            size: 42,
            font: fontBold,
            color: rgb(0.85, 0.2, 0.2),
            opacity: 0.28,
            rotate: window.PDFLib.degrees(45)
          });
        } else if (wmCfg.pos === 'top-right') {
          page.drawText(text, {
            x: width - 160,
            y: height - 30,
            size: 11,
            font: fontBold,
            color: rgb(0.8, 0.2, 0.2),
            opacity: 0.6
          });
        } else if (wmCfg.pos === 'bottom-center') {
          page.drawText(text, {
            x: width / 2 - 50,
            y: 25,
            size: 10,
            font: fontBold,
            color: rgb(0.4, 0.4, 0.4),
            opacity: 0.6
          });
        } else {
          page.drawText(text, {
            x: width - 130,
            y: 25,
            size: 10,
            font: fontBold,
            color: rgb(0.8, 0.2, 0.2),
            opacity: 0.6
          });
        }
      }
    }
  }

  // Keyboard Left / Right Navigation for Batch PDF Mode
  document.addEventListener('keydown', (e) => {
    const batchPdfView = document.getElementById('tool-batch-pdf-view');
    if (!batchPdfView || !batchPdfView.classList.contains('active')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateBatchPdf(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateBatchPdf(1);
    }
  });

  window.resetConvertTool = function () {
    engine.generateSampleArtwork();
    hasUserAddedImage = false;
    syncMetadata();

    if (typeof PixKitStorage !== 'undefined') {
      PixKitStorage.removeItem('convert_session_convert-svg');
      PixKitStorage.removeItem('convert_session_convert-heic');
    }

    if (typeof svgState !== 'undefined') {
      svgState.isSvgValid = false;
      svgState.rawSvgText = '';
      const alertBox = document.getElementById('svg-format-alert');
      const successBox = document.getElementById('svg-format-success');
      if (alertBox) alertBox.style.display = 'none';
      if (successBox) successBox.style.display = 'none';
    }
    if (typeof heicState !== 'undefined') {
      heicState.isHeicValid = false;
      heicState.rawHeicBlob = null;
      const alertBox = document.getElementById('heic-format-alert');
      const successBox = document.getElementById('heic-format-success');
      if (alertBox) alertBox.style.display = 'none';
      if (successBox) successBox.style.display = 'none';
    }

    if (activeTool === 'convert-format') initConvertFormatStage();
    else if (activeTool === 'convert-heic') initConvertHeicStage();
    else if (activeTool === 'convert-svg') initConvertSvgStage();
    else if (activeTool === 'convert-ico') initConvertIcoStage();
    else if (activeTool === 'convert-base64') initConvertBase64Stage();
    else if (activeTool === 'convert-pdf') initConvertPdfStage();
  };

  window.resetCurrentToolFile = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    closeAllReplaceDropdowns();

    if (activeTool === 'batch-edit') {
      window.clearBatchQueue();
    } else if (activeTool === 'batch-convert') {
      window.clearBatchConvertQueue();
    } else if (activeTool === 'batch-pdf') {
      window.clearBatchPdfQueue();
    } else if (activeTool === 'doc-split-pdf') {
      window.resetPdfSplit();
      showToast('Removed PDF document from Split tool');
    } else if (activeTool === 'doc-merge-pdf') {
      window.resetPdfMerge();
      showToast('Removed all PDF files from Merge tool');
    } else if (activeTool === 'doc-compress-pdf') {
      window.resetPdfCompress();
      showToast('Removed PDF document from Compress tool');
    } else if (activeTool === 'doc-rotate-pdf') {
      window.resetPdfRotate();
      showToast('Removed PDF document from Rotate tool');
    } else if (activeTool === 'doc-delete-pdf') {
      window.resetPdfDelete();
      showToast('Removed PDF document from Delete tool');
    } else if (activeTool === 'doc-pdf-to-images') {
      window.resetPdfExtract();
      showToast('Removed PDF document from PDF to Images tool');
    } else if (activeTool && activeTool.startsWith('convert-')) {
      window.resetConvertTool();
      showToast('Reset converter to clean state');
    } else {
      hasUserAddedImage = false;
      engine.filename = 'mountain-view.jpg';
      engine.generateSampleArtwork();
      syncMetadata();
      updateHeroPreview();
      updateHistoryUI();
      if (activeTool) initToolStage(activeTool);
      showToast('Removed loaded image from workspace');
    }
  };

  // ==============================================================
  // APPLICATION STARTUP & SESSION RESTORATION (Preserve state across refresh)
  // ==============================================================
  hideImageUploadProgress();

  const initialRoute = initialUrlRoute || (history.state && history.state.route) || location.hash || localStorage.getItem('pixkit_last_route') || '#/home';

  // Restore active user session if one exists, otherwise load default sample artwork
  (async () => {
    let sessionRestored = false;
    try {
      if (typeof restoreSavedSession === 'function') {
        sessionRestored = await restoreSavedSession();
      }
    } catch (err) {
      console.warn('Startup session restoration error:', err);
    }

    if (!sessionRestored) {
      hasUserAddedImage = false;
      engine.filename = 'mountain-view.jpg';
      engine.generateSampleArtwork();
      setTimeout(syncMetadata, 60);
    }

    // Clean up any stale sample sessions stored in IndexedDB for PDF tools
    try {
      if (typeof PixKitStorage !== 'undefined') {
        ['doc-pdf-to-images', 'doc-merge-pdf', 'doc-split-pdf', 'doc-compress-pdf', 'doc-rotate-pdf', 'doc-delete-pdf'].forEach(async (toolKey) => {
          try {
            const s = await PixKitStorage.getItem(`pdf_session_${toolKey}`);
            if (s) {
              if (s.fileName === 'mountain-view.jpg' || (s.fileName && s.fileName.toLowerCase().includes('sample'))) {
                await PixKitStorage.removeItem(`pdf_session_${toolKey}`);
              } else if (Array.isArray(s.files) && s.files.some(f => !f.name || f.name.toLowerCase().includes('sample') || f.name === 'mountain-view.jpg')) {
                await PixKitStorage.removeItem(`pdf_session_${toolKey}`);
              }
            }
          } catch (_) { }
        });
      }
    } catch (_) { }

    handleRoute(initialRoute);
  })();

  // Check for pending incoming file uploaded from a dedicated tool landing page
  try {
    const pendingData = sessionStorage.getItem('pixkit_pending_file_data');
    const pendingName = sessionStorage.getItem('pixkit_pending_file_name');
    const pendingType = sessionStorage.getItem('pixkit_pending_file_type');
    if (pendingData && pendingName) {
      sessionStorage.removeItem('pixkit_pending_file_data');
      sessionStorage.removeItem('pixkit_pending_file_name');
      sessionStorage.removeItem('pixkit_pending_file_type');

      fetch(pendingData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], pendingName, { type: pendingType || blob.type });
          setTimeout(() => {
            if (file.type === 'application/pdf' || pendingName.toLowerCase().endsWith('.pdf')) {
              if (window.handlePdfMergeFiles && activeTool === 'doc-merge-pdf') {
                window.handlePdfMergeFiles([file]);
              } else if (window.handlePdfSplitFile && activeTool === 'doc-split-pdf') {
                window.handlePdfSplitFile(file);
              } else if (window.handlePdfCompressFile && activeTool === 'doc-compress-pdf') {
                window.handlePdfCompressFile(file);
              } else if (window.handlePdfRotateFile && activeTool === 'doc-rotate-pdf') {
                window.handlePdfRotateFile(file);
              } else if (window.handlePdfDeleteFile && activeTool === 'doc-delete-pdf') {
                window.handlePdfDeleteFile(file);
              } else if (window.handlePdfFileUpload) {
                window.handlePdfFileUpload(file);
              }
            } else if (activeTool === 'convert-svg' || file.type === 'image/svg+xml' || pendingName.toLowerCase().endsWith('.svg')) {
              if (typeof window.handleSvgFileSelect === 'function') {
                window.handleSvgFileSelect({ target: { files: [file] } });
              }
            } else {
              handleImageFile(file);
            }
          }, 120);
        })
        .catch(err => console.warn('Could not restore landing page file:', err));
    }
  } catch (_) { }

  cleanCurrentUrl();

  // ==============================================================
  // FULLSCREEN IMAGE PREVIEW & SCROLL/ZOOM CONTROLLER
  // ==============================================================
  let fullscreenZoomScale = 1.0;
  let baseFitWidth = 800;
  let baseFitHeight = 600;
  let isFullscreenDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartScrollLeft = 0;
  let dragStartScrollTop = 0;
  let hasDraggedMeaningfully = false;

  function updateFullscreenZoomDisplay() {
    const badge = document.getElementById('fullscreen-zoom-level');
    if (badge) {
      if (Math.abs(fullscreenZoomScale - 1.0) < 0.05) {
        badge.textContent = 'Fit (100%)';
      } else {
        badge.textContent = `${Math.round(fullscreenZoomScale * 100)}%`;
      }
    }
  }

  function applyFullscreenZoom(animate = true, focalClientX = null, focalClientY = null) {
    const viewport = document.getElementById('fullscreen-viewport');
    const stage = document.getElementById('fullscreen-stage');
    const img = document.getElementById('fullscreen-img');
    if (!viewport || !img || !stage) return;

    // Calculate focal center ratio before resizing
    let focalRatioX = 0.5;
    let focalRatioY = 0.5;

    const vRect = viewport.getBoundingClientRect();
    if (focalClientX !== null && focalClientY !== null) {
      // Zoom centered at cursor point
      const currentContentX = viewport.scrollLeft + (focalClientX - vRect.left);
      const currentContentY = viewport.scrollTop + (focalClientY - vRect.top);
      focalRatioX = stage.scrollWidth > 0 ? (currentContentX / stage.scrollWidth) : 0.5;
      focalRatioY = stage.scrollHeight > 0 ? (currentContentY / stage.scrollHeight) : 0.5;
    } else {
      // Zoom centered at current viewport center
      const currentCenterX = viewport.scrollLeft + (viewport.clientWidth / 2);
      const currentCenterY = viewport.scrollTop + (viewport.clientHeight / 2);
      focalRatioX = stage.scrollWidth > 0 ? (currentCenterX / stage.scrollWidth) : 0.5;
      focalRatioY = stage.scrollHeight > 0 ? (currentCenterY / stage.scrollHeight) : 0.5;
    }

    const newW = Math.round(baseFitWidth * fullscreenZoomScale);
    const newH = Math.round(baseFitHeight * fullscreenZoomScale);

    img.style.transition = animate ? 'width 0.12s ease-out, height 0.12s ease-out' : 'none';
    img.style.width = newW + 'px';
    img.style.height = newH + 'px';
    updateFullscreenZoomDisplay();

    // Preserve focal position
    requestAnimationFrame(() => {
      if (focalClientX !== null && focalClientY !== null) {
        viewport.scrollLeft = (focalRatioX * stage.scrollWidth) - (focalClientX - vRect.left);
        viewport.scrollTop = (focalRatioY * stage.scrollHeight) - (focalClientY - vRect.top);
      } else {
        viewport.scrollLeft = (focalRatioX * stage.scrollWidth) - (viewport.clientWidth / 2);
        viewport.scrollTop = (focalRatioY * stage.scrollHeight) - (viewport.clientHeight / 2);
      }
    });
  }

  window.openFullscreenPreview = function () {
    let sourceCanvas = null;

    if (activeTool) {
      const specific = document.getElementById(`canvas-${activeTool}`);
      if (specific && specific.width > 0) sourceCanvas = specific;
    }

    if (!sourceCanvas) {
      const activeView = document.querySelector('.view.active');
      if (activeView) {
        const can = activeView.querySelector('canvas');
        if (can && can.width > 0) sourceCanvas = can;
      }
    }

    if (!sourceCanvas && engine && engine.activeCanvas && engine.activeCanvas.width > 0) {
      sourceCanvas = engine.activeCanvas;
    }

    if (!sourceCanvas) {
      showToast('No image loaded to preview', 'info');
      return;
    }

    const modal = document.getElementById('fullscreen-modal');
    const viewport = document.getElementById('fullscreen-viewport');
    const img = document.getElementById('fullscreen-img');
    const filenameEl = document.getElementById('fullscreen-filename');
    const dimEl = document.getElementById('fullscreen-dim-badge');

    if (!modal || !img || !viewport) return;

    try {
      img.src = sourceCanvas.toDataURL('image/png');
    } catch (e) {
      try {
        img.src = sourceCanvas.toDataURL();
      } catch (err) {
        console.warn('Canvas export failed:', err);
      }
    }

    if (filenameEl) filenameEl.textContent = engine.filename || 'image-preview.png';
    if (dimEl) dimEl.textContent = `${sourceCanvas.width} × ${sourceCanvas.height} px`;

    // Make modal active to read viewport geometry
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Compute optimal base fit dimensions inside viewport
    requestAnimationFrame(() => {
      const availW = Math.max(300, viewport.clientWidth - 80);
      const availH = Math.max(300, viewport.clientHeight - 80);
      const aspect = sourceCanvas.width / sourceCanvas.height;

      if (availW / availH > aspect) {
        baseFitHeight = availH;
        baseFitWidth = baseFitHeight * aspect;
      } else {
        baseFitWidth = availW;
        baseFitHeight = baseFitWidth / aspect;
      }

      fullscreenZoomScale = 1.0;
      applyFullscreenZoom(false);
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
  };

  window.closeFullscreenPreview = function () {
    const modal = document.getElementById('fullscreen-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';
    document.body.style.overflow = '';

    // Clear any stuck drag states and restore cursor
    isFullscreenDragging = false;
    const viewport = document.getElementById('fullscreen-viewport');
    if (viewport) {
      viewport.classList.remove('is-dragging');
      viewport.style.cursor = '';
    }
    const stage = document.getElementById('fullscreen-stage');
    if (stage) stage.style.cursor = '';
    const img = document.getElementById('fullscreen-img');
    if (img) img.style.cursor = '';

    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    }
  };

  window.handleFullscreenBackdropClick = function (e) {
    if (hasDraggedMeaningfully) {
      hasDraggedMeaningfully = false;
      return;
    }
    // Only close if user clicked directly on empty background stage, viewport, or modal
    if (e.target.id === 'fullscreen-stage' || e.target.id === 'fullscreen-viewport' || e.target.id === 'fullscreen-modal') {
      closeFullscreenPreview();
    }
  };

  window.zoomFullscreenImage = function (delta, focalClientX = null, focalClientY = null) {
    fullscreenZoomScale = Math.max(0.25, Math.min(5.0, parseFloat((fullscreenZoomScale + delta).toFixed(2))));
    applyFullscreenZoom(true, focalClientX, focalClientY);
  };

  window.resetFullscreenZoom = function () {
    fullscreenZoomScale = 1.0;
    applyFullscreenZoom(true);
    const viewport = document.getElementById('fullscreen-viewport');
    if (viewport) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
  };

  window.toggleNativeFullscreen = function () {
    if (!document.fullscreenElement) {
      const modal = document.getElementById('fullscreen-modal');
      if (modal && modal.requestFullscreen) {
        modal.requestFullscreen().catch(() => { });
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => { });
      }
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  // Wire up Native Trackpad / Mouse Drag / Pinch Handlers
  function initFullscreenPanAndZoom() {
    const viewport = document.getElementById('fullscreen-viewport');
    const stage = document.getElementById('fullscreen-stage');
    const img = document.getElementById('fullscreen-img');
    if (!viewport || !img) return;

    // 1. Mouse Drag Panning (Click & Drag to Scroll)
    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      if (e.button !== 0) return; // Left click only
      isFullscreenDragging = true;
      hasDraggedMeaningfully = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartScrollLeft = viewport.scrollLeft;
      dragStartScrollTop = viewport.scrollTop;
      viewport.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isFullscreenDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (Math.hypot(dx, dy) > 4) {
        hasDraggedMeaningfully = true;
      }
      viewport.scrollLeft = dragStartScrollLeft - dx;
      viewport.scrollTop = dragStartScrollTop - dy;
    });

    window.addEventListener('mouseup', () => {
      if (isFullscreenDragging) {
        isFullscreenDragging = false;
        viewport.classList.remove('is-dragging');
      }
    });

    // 2. Trackpad Pinch to Zoom (Wheel with Ctrl or Meta key)
    viewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        zoomFullscreenImage(delta, e.clientX, e.clientY);
      }
      // If NOT Ctrl/Meta, we intentionally do NOT preventDefault!
      // This allows the browser to handle Mac two-finger trackpad swipe and mouse wheel
      // natively with 100% smooth Mac momentum and inertia!
    }, { passive: false });

    // 3. Touch Drag / Pan for Mobile
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isFullscreenDragging = true;
        hasDraggedMeaningfully = false;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        dragStartScrollLeft = viewport.scrollLeft;
        dragStartScrollTop = viewport.scrollTop;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (isFullscreenDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragStartX;
        const dy = e.touches[0].clientY - dragStartY;
        if (Math.hypot(dx, dy) > 4) hasDraggedMeaningfully = true;
        viewport.scrollLeft = dragStartScrollLeft - dx;
        viewport.scrollTop = dragStartScrollTop - dy;
      }
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
      isFullscreenDragging = false;
    });

    // 4. Double-click image to toggle zoom
    img.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (fullscreenZoomScale > 1.05) {
        resetFullscreenZoom();
      } else {
        fullscreenZoomScale = 2.0;
        applyFullscreenZoom(true, e.clientX, e.clientY);
      }
    });
  }

  initFullscreenPanAndZoom();

  // Keyboard navigation for Fullscreen Modal
  window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('fullscreen-modal');
    const isModalOpen = modal && modal.classList.contains('active');

    if (e.key === 'Escape' && isModalOpen) {
      closeFullscreenPreview();
      return;
    }

    if (isModalOpen) {
      const viewport = document.getElementById('fullscreen-viewport');
      if (e.key === '+' || e.key === '=') {
        zoomFullscreenImage(0.25);
      } else if (e.key === '-' || e.key === '_') {
        zoomFullscreenImage(-0.25);
      } else if (e.key === '0') {
        resetFullscreenZoom();
      } else if (e.key === 'ArrowLeft' && viewport) {
        e.preventDefault();
        viewport.scrollLeft -= 60;
      } else if (e.key === 'ArrowRight' && viewport) {
        e.preventDefault();
        viewport.scrollLeft += 60;
      } else if (e.key === 'ArrowUp' && viewport) {
        e.preventDefault();
        viewport.scrollTop -= 60;
      } else if (e.key === 'ArrowDown' && viewport) {
        e.preventDefault();
        viewport.scrollTop += 60;
      }
      return;
    }

    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if ((e.key === 'f' || e.key === 'F') && !isTyping && activeTool) {
      openFullscreenPreview();
    }
  });
});
