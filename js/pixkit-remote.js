/**
 * PixKit Ecosystem Remote SDK (pixkit-remote.js)
 * Live connector between admin.pixkit.site and pixkit.site / pixkit-mobile.
 * Subscribes to real-time Firebase ecosystem state (kill switches, maintenance, feature flags, broadcasts).
 * Enforces dynamic feature flags (tools, community options like leaderboard and support modal),
 * and automatically evicts active users from any tool that gets paused or disabled remotely.
 */

(function (window) {
  'use strict';

  const DEFAULT_CONFIG_URL = 'https://admin.pixkit.site/config/ecosystem-state.json';
  const STORAGE_KEY = 'pixkit_remote_ecosystem_cache';

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDCueyN5HjZWuCFuXbVcV5v27QhM3jC0vw",
    authDomain: "pixkit-a7862.firebaseapp.com",
    databaseURL: "https://pixkit-a7862-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pixkit-a7862",
    storageBucket: "pixkit-a7862.firebasestorage.app",
    messagingSenderId: "704646920606",
    appId: "1:704646920606:web:f50077d6ab0a913bb2fe8f"
  };

  let rtdbInstance = null;
  function getRTDB() {
    if (rtdbInstance) return rtdbInstance;
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }
        rtdbInstance = firebase.database();
        return rtdbInstance;
      }
    } catch (_) {}
    return null;
  }

  const PixKitRemote = {
    state: null,
    platform: 'web', // 'web' | 'mobile'
    appVersion: '1.0.0',
    configUrl: DEFAULT_CONFIG_URL,
    listeners: [],
    _toastTimer: null,
    _evictToastTimer: null,

    detectPlatform: function () {
      if (window.Capacitor) {
        return 'mobile';
      }
      return 'web';
    },

    init: async function (options = {}) {
      this.platform = options.platform || this.detectPlatform();
      this.appVersion = options.appVersion || window.PIXKIT_APP_VERSION || '1.0.0';
      this.configUrl = options.configUrl || DEFAULT_CONFIG_URL;

      this.injectStyles();

      // 1. Load cached state first for immediate UI
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          this.state = JSON.parse(cached);
          this.evaluateState();
        }
      } catch (_) {}

      // 2. Connect to Realtime Firebase Stream
      this.connectRealtimeStream();

      // 3. Initial sync from Cloud
      await this.sync();

      // 4. Poll periodically (every 60s) or when returning to foreground
      setInterval(() => this.sync(), 60000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.sync();
      });
    },

    injectStyles: function () {
      if (document.getElementById('pixkit-remote-styles')) return;
      const style = document.createElement('style');
      style.id = 'pixkit-remote-styles';
      style.textContent = `
        /* Disabled feature & tool card styling: Keep icons visible, calm greyscale with zero badge collision */
        .pixkit-tool-card-disabled,
        .pixkit-feature-disabled,
        body.pixkit-no-recent .floating-dock-item#dock-btn-recent,
        body.pixkit-no-support [data-community="supportModal"],
        body.pixkit-no-support a[href*="support"]:not(.support-back-btn),
        body.pixkit-no-support .leaderboard-support-btn,
        body.pixkit-no-leaderboard .leaderboard-bottom-arrow-wrap,
        body.pixkit-no-leaderboard .leaderboard-trigger,
        body.pixkit-no-leaderboard [data-community="leaderboard"] {
          opacity: 0.38 !important;
          filter: grayscale(1) !important;
          cursor: not-allowed !important;
          position: relative !important;
          pointer-events: auto !important;
          transition: opacity 0.25s ease, filter 0.25s ease;
        }

        /* Clean Minimal Pop-In Animations for Maintenance Modal */
        @keyframes pixkitFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pixkitPopIn {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    },

    connectRealtimeStream: function () {
      try {
        const db = getRTDB();
        if (db) {
          db.ref('ecosystem').on('value', snapshot => {
            const fresh = snapshot.val();
            if (fresh && typeof fresh === 'object') {
              this.state = fresh;
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
              } catch (_) {}
              this.evaluateState();
              this.notifyListeners();
            }
          });
        }
      } catch (err) {
        console.warn('[PixKitRemote] Realtime stream notice:', err);
      }
    },

    sync: async function () {
      let loaded = false;

      // Try Firebase once
      try {
        const db = getRTDB();
        if (db) {
          const snap = await db.ref('ecosystem').once('value');
          const val = snap.val();
          if (val && typeof val === 'object') {
            this.state = val;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
            this.evaluateState();
            this.notifyListeners();
            loaded = true;
          }
        }
      } catch (_) {}

      if (loaded) return;

      // Fallback: HTTP fetch from admin.pixkit.site
      try {
        const res = await fetch(this.configUrl + '?t=' + Date.now());
        if (res.ok) {
          const fresh = await res.json();
          this.state = fresh;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
          } catch (_) {}
          this.evaluateState();
          this.notifyListeners();
        }
      } catch (err) {
        // Fallback silently to cached state if network offline
      }
    },

    onUpdate: function (cb) {
      if (typeof cb === 'function') this.listeners.push(cb);
    },

    notifyListeners: function () {
      this.listeners.forEach(cb => {
        try { cb(this.state); } catch (_) {}
      });
    },

    // Check if current platform is under maintenance
    isMaintenanceActive: function () {
      if (!this.state || !this.state.maintenance) return false;
      const m = this.state.maintenance;
      if (m.global) return true;
      if (m.platforms && m.platforms[this.platform]) return true;
      return false;
    },

    // Check if a specific tool or community feature flag is enabled for current platform
    isFeatureEnabled: function (category, toolKey) {
      if (!this.state || !this.state.featureFlags) return true;
      const flags = this.state.featureFlags;
      if (flags[this.platform] && flags[this.platform][category] && flags[this.platform][category][toolKey] !== undefined) {
        return !!flags[this.platform][category][toolKey];
      }
      if (flags[category] && flags[category][toolKey] !== undefined) {
        return !!flags[category][toolKey];
      }
      return true;
    },

    // Map studio toolId to ecosystem category and tool key
    getToolInfo: function (toolId) {
      if (!toolId) return null;
      const id = String(toolId).toLowerCase().trim();

      const toolMap = {
        // Edit Tools
        'resize': { cat: 'editTools', key: 'resize', name: 'Resize' },
        'resize-image': { cat: 'editTools', key: 'resize', name: 'Resize' },
        'crop': { cat: 'editTools', key: 'crop', name: 'Crop' },
        'crop-image': { cat: 'editTools', key: 'crop', name: 'Crop' },
        'rotate': { cat: 'editTools', key: 'rotateFlip', name: 'Rotate & Flip' },
        'rotate-image': { cat: 'editTools', key: 'rotateFlip', name: 'Rotate & Flip' },
        'rotateflip': { cat: 'editTools', key: 'rotateFlip', name: 'Rotate & Flip' },
        'compress': { cat: 'editTools', key: 'compress', name: 'Compress Image' },
        'compress-image': { cat: 'editTools', key: 'compress', name: 'Compress Image' },
        'adjust': { cat: 'editTools', key: 'adjust', name: 'Adjust Tones' },
        'adjust-image': { cat: 'editTools', key: 'adjust', name: 'Adjust Tones' },
        'filters': { cat: 'editTools', key: 'filters', name: 'Preset Filters' },
        'filter': { cat: 'editTools', key: 'filters', name: 'Preset Filters' },
        'draw': { cat: 'editTools', key: 'drawShapes', name: 'Draw & Shapes' },
        'drawshapes': { cat: 'editTools', key: 'drawShapes', name: 'Draw & Shapes' },
        'text': { cat: 'editTools', key: 'addText', name: 'Add Text' },
        'addtext': { cat: 'editTools', key: 'addText', name: 'Add Text' },
        'blur': { cat: 'editTools', key: 'adjust', name: 'Blur Tool' },
        'blur-image': { cat: 'editTools', key: 'adjust', name: 'Blur Tool' },

        // Convert Tools
        'convert-format': { cat: 'convertTools', key: 'formatConverter', name: 'Format Converter' },
        'convert': { cat: 'convertTools', key: 'formatConverter', name: 'Format Converter' },
        'convert-image': { cat: 'convertTools', key: 'formatConverter', name: 'Format Converter' },
        'formatconverter': { cat: 'convertTools', key: 'formatConverter', name: 'Format Converter' },
        'convert-svg': { cat: 'convertTools', key: 'svgToPng', name: 'SVG to PNG Converter' },
        'svg-to-png': { cat: 'convertTools', key: 'svgToPng', name: 'SVG to PNG Converter' },
        'svgtopng': { cat: 'convertTools', key: 'svgToPng', name: 'SVG to PNG Converter' },
        'convert-heic': { cat: 'convertTools', key: 'heicToJpg', name: 'HEIC to JPG Converter' },
        'heic-to-jpg': { cat: 'convertTools', key: 'heicToJpg', name: 'HEIC to JPG Converter' },
        'heic': { cat: 'convertTools', key: 'heicToJpg', name: 'HEIC to JPG Converter' },
        'heictojpg': { cat: 'convertTools', key: 'heicToJpg', name: 'HEIC to JPG Converter' },
        'convert-pdf': { cat: 'convertTools', key: 'imageToPdf', name: 'Image to PDF' },
        'imagetopdf': { cat: 'convertTools', key: 'imageToPdf', name: 'Image to PDF' },
        'convert-ico': { cat: 'convertTools', key: 'imageToIco', name: 'Image to ICO' },
        'png-to-ico': { cat: 'convertTools', key: 'imageToIco', name: 'Image to ICO' },
        'image-to-ico': { cat: 'convertTools', key: 'imageToIco', name: 'Image to ICO' },
        'favicon-generator': { cat: 'convertTools', key: 'imageToIco', name: 'Favicon Generator' },
        'convert-base64': { cat: 'convertTools', key: 'imageToBase64', name: 'Image to Base64' },
        'image-to-base64': { cat: 'convertTools', key: 'imageToBase64', name: 'Image to Base64' },

        // PDF Tools
        'doc-merge-pdf': { cat: 'pdfTools', key: 'mergePdf', name: 'Merge PDF' },
        'merge-pdf': { cat: 'pdfTools', key: 'mergePdf', name: 'Merge PDF' },
        'mergepdf': { cat: 'pdfTools', key: 'mergePdf', name: 'Merge PDF' },
        'doc-split-pdf': { cat: 'pdfTools', key: 'splitPdf', name: 'Split PDF' },
        'split-pdf': { cat: 'pdfTools', key: 'splitPdf', name: 'Split PDF' },
        'splitpdf': { cat: 'pdfTools', key: 'splitPdf', name: 'Split PDF' },
        'doc-compress-pdf': { cat: 'pdfTools', key: 'compressPdf', name: 'Compress PDF' },
        'compress-pdf': { cat: 'pdfTools', key: 'compressPdf', name: 'Compress PDF' },
        'compresspdf': { cat: 'pdfTools', key: 'compressPdf', name: 'Compress PDF' },
        'doc-pdf-to-images': { cat: 'pdfTools', key: 'pdfToImages', name: 'PDF to Images' },
        'pdf-to-images': { cat: 'pdfTools', key: 'pdfToImages', name: 'PDF to Images' },
        'pdf-to-jpg': { cat: 'pdfTools', key: 'pdfToImages', name: 'PDF to Images' },
        'pdf-to-image': { cat: 'pdfTools', key: 'pdfToImages', name: 'PDF to Images' },
        'pdftoimages': { cat: 'pdfTools', key: 'pdfToImages', name: 'PDF to Images' },
        'doc-images-to-pdf': { cat: 'pdfTools', key: 'imagesToPdf', name: 'Images to PDF' },
        'images-to-pdf': { cat: 'pdfTools', key: 'imagesToPdf', name: 'Images to PDF' },
        'jpg-to-pdf': { cat: 'pdfTools', key: 'imagesToPdf', name: 'Images to PDF' },
        'imagestopdf': { cat: 'pdfTools', key: 'imagesToPdf', name: 'Images to PDF' },
        'doc-rotate-pdf': { cat: 'pdfTools', key: 'rotatePdf', name: 'Rotate PDF' },
        'rotate-pdf': { cat: 'pdfTools', key: 'rotatePdf', name: 'Rotate PDF' },
        'rotatepdf': { cat: 'pdfTools', key: 'rotatePdf', name: 'Rotate PDF' },
        'doc-delete-pdf': { cat: 'pdfTools', key: 'deletePdfPages', name: 'Delete PDF Pages' },
        'delete-pdf-pages': { cat: 'pdfTools', key: 'deletePdfPages', name: 'Delete PDF Pages' },
        'deletepdfpages': { cat: 'pdfTools', key: 'deletePdfPages', name: 'Delete PDF Pages' }
      };

      return toolMap[id] || null;
    },

    // Check if tool access is allowed before opening workspace
    checkToolAccess: function (toolId, suppressToast = false) {
      const mapped = this.getToolInfo(toolId);
      if (!mapped) return true; // Unmapped tools default to enabled

      const isEnabled = this.isFeatureEnabled(mapped.cat, mapped.key);
      if (!isEnabled) {
        if (!suppressToast) {
          this.showToolDisabledToast(mapped.name);
        }
        return false;
      }
      return true;
    },

    // Identify currently active tool across app state, DOM view, and URL hash
    getCurrentActiveTool: function () {
      if (typeof window.getActiveTool === 'function') {
        const tool = window.getActiveTool();
        if (tool) return tool;
      }
      if (window.activeTool) return window.activeTool;

      // Check DOM for active tool workspace section
      const activeSection = document.querySelector('.view.active[id^="tool-"]');
      if (activeSection) {
        return activeSection.id.replace(/^tool-/, '').replace(/-view$/, '');
      }

      // Check URL hash (#/tool/crop)
      const hash = window.location.hash || '';
      const match = hash.match(/^#\/tool\/([^/?#]+)/);
      if (match && match[1]) {
        return match[1];
      }

      // Check SEO tool landing page pathname (/crop-image -> crop)
      const pathname = window.location.pathname || '';
      const pathMatch = pathname.match(/\/([a-zA-Z0-9_-]+)(?:\.html)?$/);
      if (pathMatch && pathMatch[1]) {
        const page = pathMatch[1].toLowerCase();
        if (page !== 'index' && page !== 'studio' && page !== 'support' && page !== 'privacy-policy') {
          return page;
        }
      }

      return null;
    },

    // Enforce Active Tool Eviction: Kick out user if currently in a disabled tool
    enforceActiveToolAccess: function () {
      const currentTool = this.getCurrentActiveTool();
      if (!currentTool) return;

      const toolInfo = this.getToolInfo(currentTool);
      if (!toolInfo) return;

      const isEnabled = this.isFeatureEnabled(toolInfo.cat, toolInfo.key);
      if (!isEnabled) {
        console.warn(`[PixKitRemote] Tool "${toolInfo.name}" (${currentTool}) has been disabled remotely by admin. Evicting user to studio home.`);
        
        this.showToolEvictedToast(toolInfo.name);

        // Check if on dedicated SEO tool page
        const pathname = window.location.pathname || '';
        if (pathname.includes(currentTool)) {
          setTimeout(() => {
            window.location.href = 'studio';
          }, 1200);
          return;
        }

        // Safely exit the tool workspace to home
        if (typeof window.showView === 'function') {
          window.showView('home');
        } else if (typeof window.renderViewDirect === 'function') {
          window.renderViewDirect('home');
        } else {
          window.location.hash = '#/home';
        }

        // Reset active tool references
        if (typeof window.activeTool !== 'undefined') window.activeTool = null;
        try { localStorage.setItem('pixkit_last_route', '#/home'); } catch (_) {}
        try { localStorage.removeItem('pixkit_target_route'); } catch (_) {}
      }
    },

    // Check if an entire category is completely disabled
    isCategoryAllDisabled: function (category) {
      if (!this.state || !this.state.featureFlags) return false;
      const flags = this.state.featureFlags;
      const catFlags = (flags.web && flags.web[category]) || flags[category];
      if (!catFlags || typeof catFlags !== 'object') return false;
      const values = Object.values(catFlags);
      if (values.length === 0) return false;
      return values.every(v => v === false);
    },

    // Clean, Minimal App-Themed Modal Popup
    showMaintenanceModal: function (title, message, icon = '🛠️') {
      const existing = document.getElementById('pixkit-maintenance-modal-backdrop');
      if (existing) existing.remove();

      const backdrop = document.createElement('div');
      backdrop.id = 'pixkit-maintenance-modal-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999999;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        animation: pixkitFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      `;

      backdrop.innerHTML = `
        <div id="pixkit-maintenance-modal-card" style="width: 100%; max-width: 350px; background: var(--paper, #161713); border: 1px solid var(--line-strong, rgba(255, 255, 255, 0.12)); border-radius: 20px; padding: 28px 24px 22px; text-align: center; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.05); position: relative; box-sizing: border-box; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif; animation: pixkitPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
          <button type="button" onclick="window.closePixKitMaintenanceModal()" aria-label="Close" style="position: absolute; top: 14px; right: 14px; width: 28px; height: 28px; border-radius: 8px; background: var(--soft, rgba(255, 255, 255, 0.05)); border: 1px solid var(--line, rgba(255, 255, 255, 0.08)); color: var(--muted, #85877F); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease;" onmouseover="this.style.color='var(--ink, #fff)'; this.style.borderColor='var(--line-strong, #fff)';" onmouseout="this.style.color='var(--muted, #85877F)'; this.style.borderColor='var(--line, rgba(255, 255, 255, 0.08))';">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--soft, rgba(255, 255, 255, 0.05)); border: 1px solid var(--line, rgba(255, 255, 255, 0.1)); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 20px;">
            ${icon}
          </div>
          <h3 style="font: 700 16.5px/1.3 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; color: var(--ink, #FFFFFF); margin: 0 0 8px; letter-spacing: -0.015em;">
            ${this.escapeHtml(title)}
          </h3>
          <p style="font-size: 13.5px; line-height: 1.55; color: var(--muted, #8B8D85); margin: 0 0 22px; font-weight: 400;">
            ${this.escapeHtml(message)}
          </p>
          <button type="button" onclick="window.closePixKitMaintenanceModal()" style="width: 100%; padding: 11px 16px; border-radius: 10px; background: var(--lime, #D7F36A); color: #121310; font: 700 13px/1 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif; border: none; cursor: pointer; transition: transform 0.15s ease, filter 0.15s ease; box-shadow: 0 2px 8px rgba(215, 243, 106, 0.25);" onmouseover="this.style.filter='brightness(1.06)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.filter='none'; this.style.transform='none';">
            Understood
          </button>
        </div>
      `;

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          window.closePixKitMaintenanceModal();
        }
      });

      document.body.appendChild(backdrop);
    },

    showToolDisabledToast: function (toolName) {
      this.showMaintenanceModal(
        (toolName || 'Tool') + ' Paused',
        'This feature is temporarily paused for scheduled maintenance. Back shortly!',
        '🛠️'
      );
    },

    showToolEvictedToast: function (toolName) {
      this.showMaintenanceModal(
        (toolName || 'Feature') + ' Notice',
        'This feature was temporarily paused for scheduled maintenance. Safely returned to home.',
        '🛠️'
      );
    },

    // Enforce Community Feature Flags (Leaderboard, Support Modal, and Recent Files & History)
    applyCommunityFeatureFlags: function () {
      const isLeaderboard = this.isFeatureEnabled('community', 'leaderboard');
      const isSupport = this.isFeatureEnabled('community', 'supportModal');
      const isRecent = this.isFeatureEnabled('community', 'recentFiles');

      // Toggle CSS root flags on body
      if (document.body) {
        document.body.classList.toggle('pixkit-no-leaderboard', !isLeaderboard);
        document.body.classList.toggle('pixkit-no-support', !isSupport);
        document.body.classList.toggle('pixkit-no-recent', !isRecent);
      }

      // 1. Leaderboard: Keep icon visible, grey out and intercept clicks if paused
      const lbElements = document.querySelectorAll(
        '.leaderboard-bottom-arrow-wrap, .leaderboard-bottom-arrow-btn, #leaderboard-floating-trigger, .leaderboard-trigger, [data-community="leaderboard"], a[href*="view=leaderboard"]'
      );
      lbElements.forEach(el => {
        if (!isLeaderboard) {
          el.classList.add('pixkit-feature-disabled');
          if (!el._pixkitLbHandler) {
            el._pixkitLbHandler = (e) => {
              if (!PixKitRemote.isFeatureEnabled('community', 'leaderboard')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                PixKitRemote.showMaintenanceModal(
                  'Leaderboard Paused',
                  'The Supporter Leaderboard is temporarily paused for routine moderation.',
                  '🏆'
                );
                return false;
              }
            };
            el.addEventListener('click', el._pixkitLbHandler, true);
          }
        } else {
          el.classList.remove('pixkit-feature-disabled');
          if (el._pixkitLbHandler) {
            el.removeEventListener('click', el._pixkitLbHandler, true);
            el._pixkitLbHandler = null;
          }
        }
      });

      // If user is currently looking at leaderboard, close it immediately
      if (!isLeaderboard && document.body && document.body.classList.contains('leaderboard-active')) {
        if (typeof window.closeLeaderboardScreen === 'function') {
          window.closeLeaderboardScreen();
        } else {
          document.body.classList.remove('leaderboard-active');
        }
      }

      // 2. Support Modal & Page: Keep icons visible, grey out and intercept clicks if paused
      const supportToast = document.getElementById('support-toast-card');
      if (!isSupport) {
        if (typeof window.dismissSupportToast === 'function') {
          window.dismissSupportToast();
        }
        if (supportToast) {
          supportToast.classList.remove('visible');
        }
      }

      const supportElements = document.querySelectorAll(
        '[data-community="supportModal"], a[href*="support"]:not(.support-back-btn), .leaderboard-support-btn'
      );
      supportElements.forEach(el => {
        if (!isSupport) {
          el.classList.add('pixkit-feature-disabled');
          if (!el._pixkitSupportHandler) {
            el._pixkitSupportHandler = (e) => {
              if (!PixKitRemote.isFeatureEnabled('community', 'supportModal')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                PixKitRemote.showMaintenanceModal(
                  'Support Contributions Paused',
                  'Community contributions & donations are temporarily paused for maintenance. Back shortly!',
                  '☕'
                );
                return false;
              }
            };
            el.addEventListener('click', el._pixkitSupportHandler, true);
          }
        } else {
          el.classList.remove('pixkit-feature-disabled');
          if (el._pixkitSupportHandler) {
            el.removeEventListener('click', el._pixkitSupportHandler, true);
            el._pixkitSupportHandler = null;
          }
        }
      });

      // In-page handling if user visits support.html directly
      if (window.location.pathname.includes('support')) {
        let banner = document.getElementById('pixkit-support-paused-banner');
        if (!isSupport) {
          if (!banner) {
            banner = document.createElement('div');
            banner.id = 'pixkit-support-paused-banner';
            banner.style.cssText = `
              position: sticky;
              top: 0;
              z-index: 999999;
              background: #78350F;
              color: #FEF3C7;
              padding: 14px 24px;
              text-align: center;
              font-weight: 700;
              font-size: 13.5px;
              border-bottom: 2px solid #D97706;
              box-shadow: 0 4px 20px rgba(0,0,0,0.5);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            `;
            banner.innerHTML = `
              ⚠️ <strong>Support Contributions Paused:</strong> Voluntary donations and sponsorships are temporarily closed for scheduled maintenance. All image & PDF tools remain 100% free and functional!
            `;
            document.body.prepend(banner);
          }
          const checkoutElements = document.querySelectorAll('.checkout-hero-btn, .gateway-tab, .currency-btn, #customAmountInput');
          checkoutElements.forEach(btn => {
            btn.style.opacity = '0.4';
            btn.style.pointerEvents = 'none';
          });
        } else {
          if (banner) banner.remove();
          const checkoutElements = document.querySelectorAll('.checkout-hero-btn, .gateway-tab, .currency-btn, #customAmountInput');
          checkoutElements.forEach(btn => {
            btn.style.removeProperty('opacity');
            btn.style.removeProperty('pointer-events');
          });
        }
      }

      // 3. Recent Files & History: Keep dock icon visible, grey out and intercept clicks if paused
      const dockBtn = document.getElementById('dock-btn-recent');
      if (dockBtn) {
        if (!isRecent) {
          dockBtn.classList.add('pixkit-tool-card-disabled');
          const tooltip = dockBtn.querySelector('.dock-tooltip');
          if (tooltip) tooltip.textContent = 'Recent Files (Temporarily Paused)';
          if (!dockBtn._pixkitRecentHandler) {
            dockBtn._pixkitRecentHandler = (e) => {
              if (!PixKitRemote.isFeatureEnabled('community', 'recentFiles')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                PixKitRemote.showMaintenanceModal(
                  'Recent Files Paused',
                  'Recent Files & History is temporarily paused for routine maintenance.',
                  '📁'
                );
                return false;
              }
            };
            dockBtn.addEventListener('click', dockBtn._pixkitRecentHandler, true);
          }
        } else {
          dockBtn.classList.remove('pixkit-tool-card-disabled');
          const tooltip = dockBtn.querySelector('.dock-tooltip');
          if (tooltip) tooltip.textContent = 'Recent Files';
          if (dockBtn._pixkitRecentHandler) {
            dockBtn.removeEventListener('click', dockBtn._pixkitRecentHandler, true);
            dockBtn._pixkitRecentHandler = null;
          }
        }
      }

      // If user is currently looking at Recent Files and the flag gets turned off, evict back to home!
      if (!isRecent) {
        const hash = window.location.hash || '';
        const isCurrentRecent = hash.includes('recent') ||
          (typeof window.getActiveTool === 'function' && window.getActiveTool() === 'recent') ||
          document.getElementById('recent-view')?.classList.contains('active');

        if (isCurrentRecent) {
          if (typeof window.showView === 'function') {
            window.showView('home');
          } else {
            window.location.hash = '#/home';
          }
          this.showMaintenanceModal(
            'Recent Files Unavailable',
            'Recent Files & History is currently disabled for maintenance. Returned to home.',
            '📁'
          );
        }
      }
    },

    // Visually update tool cards and buttons in Home/Edit/Convert/Doc suites and landing pages
    applyToolCardsState: function () {
      const toolCards = document.querySelectorAll(
        '[onclick*="openToolWorkspace"], .tool-row-card, .shortcut-pill, .seo-tool-card, a[href*="resize-image"], a[href*="crop-image"], a[href*="merge-pdf"], a[href*="split-pdf"], a[href*="compress-"], a[href*="convert-"]'
      );

      toolCards.forEach(card => {
        let toolId = null;
        const onclickAttr = card.getAttribute('onclick') || '';
        const match = onclickAttr.match(/openToolWorkspace\(['"]([^'"]+)['"]\)/);
        if (match && match[1]) {
          toolId = match[1];
        } else {
          const href = card.getAttribute('href') || '';
          const hrefMatch = href.match(/([a-zA-Z0-9_-]+)(?:\.html)?$/);
          if (hrefMatch && hrefMatch[1]) {
            toolId = hrefMatch[1];
          }
        }

        if (!toolId) return;
        const toolInfo = this.getToolInfo(toolId);
        if (!toolInfo) return;

        const isEnabled = this.isFeatureEnabled(toolInfo.cat, toolInfo.key);
        if (!isEnabled) {
          card.classList.add('pixkit-tool-card-disabled');
          card.setAttribute('data-disabled-notice', toolInfo.name + ' is paused for maintenance');

          // Intercept click in capturing phase before workspace or navigation can fire
          if (!card._pixkitDisabledHandler) {
            card._pixkitDisabledHandler = (e) => {
              const currentEnabled = PixKitRemote.isFeatureEnabled(toolInfo.cat, toolInfo.key);
              if (!currentEnabled) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                PixKitRemote.showToolDisabledToast(toolInfo.name);
                return false;
              }
            };
            card.addEventListener('click', card._pixkitDisabledHandler, true);
          }
        } else {
          card.classList.remove('pixkit-tool-card-disabled');
          card.removeAttribute('data-disabled-notice');
          if (card._pixkitDisabledHandler) {
            card.removeEventListener('click', card._pixkitDisabledHandler, true);
            card._pixkitDisabledHandler = null;
          }
        }
      });
    },

    // Evaluate ecosystem state and render maintenance overlay, broadcast banner, and flag rules
    evaluateState: function () {
      if (!this.state) return;

      // 1. Maintenance Check
      if (this.isMaintenanceActive()) {
        this.renderMaintenanceOverlay();
      } else {
        this.removeMaintenanceOverlay();
      }

      // 2. Broadcast Announcement Check
      if (this.state.broadcast && this.state.broadcast.enabled) {
        this.renderBroadcastBanner(this.state.broadcast);
      } else {
        this.removeBroadcastBanner();
      }

      // 3. Community Feature Flags Check (Leaderboard & Support Modal)
      this.applyCommunityFeatureFlags();

      // 4. Tool Cards Visual State (Paused/Active Badging)
      this.applyToolCardsState();

      // 5. Active Tool Eviction Check (Kick out if tool was closed while in use)
      this.enforceActiveToolAccess();

      // 6. App Version Control & Fleet Policy Enforcement
      this.enforceVersionPolicy();
    },

    semverCompare: function (v1, v2) {
      if (!v1 || !v2) return 0;
      const p1 = String(v1).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
      const p2 = String(v2).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
      const len = Math.max(p1.length, p2.length);
      for (let i = 0; i < len; i++) {
        const a = p1[i] || 0;
        const b = p2[i] || 0;
        if (a > b) return 1;
        if (a < b) return -1;
      }
      return 0;
    },

    enforceVersionPolicy: function () {
      if (!this.state) return;

      const clientVersion = this.appVersion || '1.0.2';
      const isMobile = this.platform === 'mobile';

      // 1. Check Version Registry (Per-Version Controls)
      const registry = this.state.versionRegistry ? (this.state.versionRegistry[this.platform] || []) : [];
      const versionEntry = Array.isArray(registry) ? registry.find(v => v.versionName === clientVersion) : null;

      // Apply Per-Version Feature Overrides (if any)
      if (versionEntry && versionEntry.featureOverrides && typeof versionEntry.featureOverrides === 'object') {
        try {
          for (const [toolKey, isEnabled] of Object.entries(versionEntry.featureOverrides)) {
            if (isEnabled === false) {
              const toolEl = document.querySelector(`[data-tool="${toolKey}"], #tool-${toolKey}, .tool-${toolKey}`);
              if (toolEl) {
                toolEl.style.opacity = '0.4';
                toolEl.style.filter = 'grayscale(1)';
                toolEl.style.pointerEvents = 'none';
                toolEl.setAttribute('title', 'Tool temporarily disabled on this version. Please update on Google Play.');
              }
            }
          }
        } catch (_) {}
      }

      // Check Per-Version Targeted Banner
      if (versionEntry && versionEntry.customMessage && versionEntry.customMessage.enabled && versionEntry.customMessage.text) {
        this.renderVersionCustomBanner(versionEntry.customMessage.text);
      } else {
        this.removeVersionCustomBanner();
      }

      // Check Per-Version Master Kill-Switch
      if (versionEntry && versionEntry.disabled) {
        this.renderForceUpdateOverlay({
          latestVersion: this.state.versionControl?.mobile?.latestVersion || '1.0.2',
          updateUrl: versionEntry.updatePrompt?.updateUrl || this.state.versionControl?.mobile?.updateUrl || 'https://play.google.com/store/apps/details?id=com.pixkit.studio',
          notes: versionEntry.disabledMessage || `Version ${clientVersion} has been retired. Please update to continue creating.`
        }, clientVersion, 'Version Retired');
        return;
      }

      // Check Per-Version Update Prompt
      if (versionEntry && versionEntry.updatePrompt && versionEntry.updatePrompt.enabled) {
        const prompt = versionEntry.updatePrompt;
        const targetVer = prompt.targetVersion || this.state.versionControl?.mobile?.latestVersion || '1.0.2';
        const isForce = prompt.type === 'force';

        if (isForce) {
          this.renderForceUpdateOverlay({
            latestVersion: targetVer,
            updateUrl: prompt.updateUrl || 'https://play.google.com/store/apps/details?id=com.pixkit.studio',
            notes: Array.isArray(prompt.notes) ? prompt.notes.join('\n') : (prompt.notes || 'Performance enhancements and bug fixes.')
          }, clientVersion, prompt.title || 'Mandatory Update Required');
          return;
        } else {
          // Optional update: check 24hr cooldown
          const cooldownKey = 'pixkit_update_cooldown_' + targetVer;
          let isCooling = false;
          try {
            const until = parseInt(localStorage.getItem(cooldownKey) || '0', 10);
            if (Date.now() < until) isCooling = true;
          } catch (_) {}

          if (!isCooling) {
            this.renderMobileUpdateDialog({
              title: prompt.title || `PixKit ${targetVer} Available!`,
              notes: prompt.notes || ['Performance improvements', 'Bug fixes'],
              targetVersion: targetVer,
              updateUrl: prompt.updateUrl || 'https://play.google.com/store/apps/details?id=com.pixkit.studio'
            });
            return;
          }
        }
      } else {
        this.removeMobileUpdateDialog();
      }

      // Fallback: General Version Policy (Fleet Wide Policy)
      const policy = this.state.versionControl ? this.state.versionControl[this.platform] : null;
      if (!policy) return;

      const minVer = policy.minSupportedVersion || '1.0.0';
      const latestVer = policy.latestVersion || '1.0.0';
      const forceUpdate = !!policy.forceUpdate;

      const isBelowMin = this.semverCompare(clientVersion, minVer) < 0;
      const isBelowLatest = this.semverCompare(clientVersion, latestVer) < 0;

      // Hard Force Update Gate
      if (isBelowMin && forceUpdate) {
        this.renderForceUpdateOverlay(policy, clientVersion);
        return;
      } else {
        this.removeForceUpdateOverlay();
      }

      // Soft Update Notification for Web/Desktop
      if (!isMobile && isBelowLatest) {
        const dismissedKey = 'pixkit_dismissed_update_' + latestVer;
        try {
          if (!sessionStorage.getItem(dismissedKey)) {
            this.renderSoftUpdateToast(policy, clientVersion);
          }
        } catch (_) {}
      } else if (!isMobile) {
        this.removeSoftUpdateToast();
      }
    },

    renderMobileUpdateDialog: function (config) {
      let modal = document.getElementById('pixkit-mobile-update-modal');
      const targetVer = config.targetVersion || '1.0.2';
      const title = config.title || `PixKit ${targetVer} is Available!`;
      const updateUrl = config.updateUrl || 'https://play.google.com/store/apps/details?id=com.pixkit.studio';
      const notesList = Array.isArray(config.notes) ? config.notes : [config.notes || 'Bug fixes and improvements'];

      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pixkit-mobile-update-modal';
        modal.style.cssText = `
          position: fixed;
          inset: 0;
          z-index: 9999999;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "DM Sans", "Segoe UI", Roboto, sans-serif;
          animation: modalFadeIn 0.22s ease-out;
        `;
        document.body.appendChild(modal);
      }

      const notesHtml = notesList.map(n => `
        <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; font-size: 11.5px; color: #b5b8aa; line-height: 1.45;">
          <span style="color: #d7f36a; font-weight: 800; line-height: 1.2;">✓</span>
          <span>${this.escapeHtml(n)}</span>
        </li>
      `).join('');

      modal.innerHTML = `
        <div style="width: 100%; max-width: 440px; background: linear-gradient(180deg, #1f2119 0%, #13140e 100%); border: 1px solid #36392c; border-top: 1px solid rgba(255, 255, 255, 0.16); border-radius: 26px 26px 0 0; padding: 24px 20px 32px; box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6); box-sizing: border-box;">
          <div style="width: 40px; height: 4px; background: #3c4033; border-radius: 999px; margin: 0 auto 18px;"></div>
          
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 10px; background: #d7f36a; color: #101204; display: grid; place-items: center; font-size: 20px; font-weight: 800;">
              ✳
            </div>
            <div>
              <span style="font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; color: #d7f36a; font-weight: 800; display: block;">NEW RELEASE AVAILABLE</span>
              <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #ffffff; letter-spacing: -0.4px;">${this.escapeHtml(title)}</h3>
            </div>
          </div>

          <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid #282a20; border-radius: 14px; padding: 12px 14px; margin-bottom: 18px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #d7f36a; letter-spacing: 0.5px; margin-bottom: 8px;">What's New in v${this.escapeHtml(targetVer)}:</div>
            <ul style="margin: 0; padding: 0; list-style: none;">
              ${notesHtml}
            </ul>
          </div>

          <div style="display: flex; flex-direction: column; gap: 9px;">
            <a href="${this.escapeHtml(updateUrl)}" target="_blank" onclick="PixKitRemote.handleOpenStore('${this.escapeHtml(updateUrl)}')" style="display: block; text-align: center; background: linear-gradient(180deg, #e4fb7c 0%, #d7f36a 55%, #c0de4d 100%); color: #15170d; font-weight: 800; font-size: 13.5px; padding: 13px 20px; border-radius: 14px; text-decoration: none; border: 1px solid #a8c838; border-top: 1px solid #f2ffd0; box-shadow: 0 4px 18px rgba(215, 243, 106, 0.38); cursor: pointer;">
              Update on Google Play &rarr;
            </a>
            <button type="button" onclick="PixKitRemote.dismissMobileUpdate('${this.escapeHtml(targetVer)}')" style="background: rgba(255, 255, 255, 0.04); border: 1px solid #2d3025; color: #9fa197; font-weight: 700; font-size: 12px; padding: 10px 18px; border-radius: 12px; cursor: pointer;">
              Remind Me Later
            </button>
          </div>
        </div>
      `;
    },

    dismissMobileUpdate: function (targetVer) {
      try {
        // Set 24 hour cooldown in localStorage
        const cooldownKey = 'pixkit_update_cooldown_' + targetVer;
        localStorage.setItem(cooldownKey, String(Date.now() + 86400000));
      } catch (_) {}
      this.removeMobileUpdateDialog();
    },

    removeMobileUpdateDialog: function () {
      const modal = document.getElementById('pixkit-mobile-update-modal');
      if (modal) modal.remove();
    },

    handleOpenStore: function (url) {
      try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
          window.Capacitor.Plugins.Browser.open({ url: url });
        }
      } catch (_) {}
    },

    renderVersionCustomBanner: function (text) {
      let banner = document.getElementById('pixkit-version-custom-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pixkit-version-custom-banner';
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999990;
          background: linear-gradient(90deg, #1b2e10 0%, #15220c 100%);
          border-bottom: 1px solid #36501c;
          color: #d7f36a;
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 700;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, "DM Sans", sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        `;
        document.body.appendChild(banner);
      }
      banner.innerHTML = `<span>⚡</span> <span>${this.escapeHtml(text)}</span>`;
    },

    removeVersionCustomBanner: function () {
      const banner = document.getElementById('pixkit-version-custom-banner');
      if (banner) banner.remove();
    },

    renderForceUpdateOverlay: function (policy, clientVersion, customTitle) {
      let overlay = document.getElementById('pixkit-force-update-screen');
      const latestVer = policy.latestVersion || '1.0.2';
      const updateUrl = policy.updateUrl || 'https://play.google.com/store/apps/details?id=com.pixkit.studio';
      const notes = policy.notes || 'Critical security update and performance enhancements.';
      const heading = customTitle || 'Update to Continue';

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pixkit-force-update-screen';
        overlay.style.cssText = `
          position: fixed;
          inset: 0;
          z-index: 999999999;
          background: rgba(18, 19, 16, 0.98);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          color: #F2F3EC;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        document.body.appendChild(overlay);
      }

      overlay.innerHTML = `
        <div style="max-width: 440px; background: #1A1C16; border: 1px solid #292B23; padding: 36px 30px; border-radius: 24px; box-shadow: 0 24px 70px rgba(0,0,0,0.8);">
          <div style="width: 58px; height: 58px; border-radius: 18px; background: rgba(239, 68, 68, 0.15); color: #EF4444; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px; border: 1px solid rgba(239, 68, 68, 0.35);">
            ⚡
          </div>
          <div style="display:inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); font-size: 11px; font-weight: 800; color: #EF4444; text-transform: uppercase; margin-bottom: 12px;">
            Mandatory Update Required
          </div>
          <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #FFFFFF; letter-spacing: -0.02em;">${this.escapeHtml(heading)}</h2>
          <p style="font-size: 13.5px; line-height: 1.5; color: #9FA197; margin: 0 0 18px;">
            Your installed version (<strong>v${this.escapeHtml(clientVersion)}</strong>) is no longer supported. Please update to <strong>v${this.escapeHtml(latestVer)}</strong> to safely continue using PixKit.
          </p>
          <div style="background: #121310; border: 1px solid #262920; border-radius: 12px; padding: 12px 16px; text-align: left; font-size: 12px; color: #B5B7AC; line-height: 1.5; margin-bottom: 22px;">
            <div style="font-weight: 800; color: #D7F36A; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">What's New:</div>
            <div>${this.escapeHtml(notes)}</div>
          </div>
          <div>
            <a href="${this.escapeHtml(updateUrl)}" target="_blank" onclick="PixKitRemote.handleOpenStore('${this.escapeHtml(updateUrl)}')" style="display: block; width: 100%; box-sizing: border-box; padding: 13px 24px; border-radius: 14px; background: #D7F36A; color: #121310; font-size: 14px; font-weight: 800; text-decoration: none; transition: transform 0.15s ease;">
              Update via Google Play &rarr;
            </a>
          </div>
        </div>
      `;
      document.body.style.overflow = 'hidden';
    },

    removeForceUpdateOverlay: function () {
      const overlay = document.getElementById('pixkit-force-update-screen');
      if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
      }
    },

    renderSoftUpdateToast: function (policy, clientVersion) {
      let toast = document.getElementById('pixkit-soft-update-toast');
      const latestVer = policy.latestVersion || '1.2.0';
      const updateUrl = policy.updateUrl || 'https://play.google.com/store/apps/details?id=com.pixkit.studio';

      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pixkit-soft-update-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999998;
          background: #1A1C16;
          color: #F2F3EC;
          border: 1px solid #38BDF8;
          padding: 14px 18px;
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 16px 40px rgba(0,0,0,0.65);
          display: flex;
          align-items: center;
          gap: 14px;
          max-width: 420px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        document.body.appendChild(toast);
      }

      toast.innerHTML = `
        <span style="font-size: 20px;">🚀</span>
        <div style="flex: 1; line-height: 1.35;">
          <div style="font-weight: 800; color: #FFFFFF;">PixKit v${this.escapeHtml(latestVer)} Available</div>
          <div style="font-size: 11.5px; color: #9FA197;">Update now for improved performance.</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <a href="${this.escapeHtml(updateUrl)}" target="_blank" style="background: #38BDF8; color: #0F172A; padding: 6px 14px; border-radius: 999px; text-decoration: none; font-size: 11.5px; font-weight: 800; white-space: nowrap;">Update</a>
          <button onclick="PixKitRemote.dismissSoftUpdate('${this.escapeHtml(latestVer)}')" style="background:none; border:none; color:#71717A; cursor:pointer; font-size:16px; font-weight:800; padding:2px 6px;">&times;</button>
        </div>
      `;
    },

    dismissSoftUpdate: function (latestVer) {
      if (latestVer) {
        try { sessionStorage.setItem('pixkit_dismissed_update_' + latestVer, 'true'); } catch (_) {}
      }
      this.removeSoftUpdateToast();
    },

    removeSoftUpdateToast: function () {
      const toast = document.getElementById('pixkit-soft-update-toast');
      if (toast) toast.remove();
    },

    renderMaintenanceOverlay: function () {
      let overlay = document.getElementById('pixkit-maintenance-screen');
      const msg = this.state.maintenance?.message || {
        headline: 'PixKit is undergoing scheduled maintenance',
        body: 'Our studio is undergoing a quick cloud & engine upgrade. All your local files remain 100% private and safe on your device.',
        estimatedUptime: 'A few moments'
      };

      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pixkit-maintenance-screen';
        overlay.style.cssText = `
          position: fixed;
          inset: 0;
          z-index: 99999999;
          background: rgba(18, 19, 16, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: #F2F3EC;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        document.body.appendChild(overlay);
      }

      overlay.innerHTML = `
        <div style="max-width: 500px; background: #1A1C16; border: 1px solid #292B23; padding: 42px 36px; border-radius: 24px; box-shadow: 0 24px 70px rgba(0,0,0,0.7);">
          <div style="width: 58px; height: 58px; border-radius: 18px; background: rgba(215, 243, 106, 0.12); color: #D7F36A; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 22px; border: 1px solid rgba(215, 243, 106, 0.25);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h2 style="font-size: 22px; font-weight: 800; margin: 0 0 12px; color: #FFFFFF; letter-spacing: -0.02em;">${msg.headline}</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #9FA197; margin: 0 0 24px;">${msg.body}</p>
          ${msg.estimatedUptime ? `<div style="display: inline-block; padding: 6px 16px; border-radius: 999px; background: #22241D; border: 1px solid #3D4034; font-size: 12px; font-weight: 700; color: #D7F36A; margin-bottom: 24px;">Estimated return: ${msg.estimatedUptime}</div>` : ''}
          <div>
            <button onclick="PixKitRemote.sync()" style="padding: 11px 24px; border-radius: 12px; background: #D7F36A; color: #121310; font-size: 13.5px; font-weight: 800; border: none; cursor: pointer; transition: transform 0.15s ease;">
              Check Again
            </button>
          </div>
        </div>
      `;
      document.body.style.overflow = 'hidden';
    },

    removeMaintenanceOverlay: function () {
      const overlay = document.getElementById('pixkit-maintenance-screen');
      if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
      }
    },

    renderBroadcastBanner: function (b) {
      if (!b || !b.enabled) {
        this.removeBroadcastBanner();
        return;
      }

      // Platform targeting check: all, web, mobile
      if (b.targetPlatform && b.targetPlatform !== 'all' && b.targetPlatform !== this.platform) {
        this.removeBroadcastBanner();
        return;
      }

      // Dismissal memory check for this specific broadcast
      const broadcastKey = b.id || ((b.headline || '') + '_' + (b.message ? b.message.slice(0, 15) : ''));
      if (b.dismissible !== false) {
        try {
          if (sessionStorage.getItem('pixkit_dismissed_bc_' + broadcastKey)) {
            this.removeBroadcastBanner();
            return;
          }
        } catch (_) {}
      }

      // Theme styling and defaults
      const themes = {
        announcement: { bg: '#D7F36A', color: '#121310', btnBg: '#121310', btnColor: '#FFFFFF', icon: '✨' },
        info:         { bg: '#38BDF8', color: '#0F172A', btnBg: '#0F172A', btnColor: '#FFFFFF', icon: 'ℹ️' },
        warning:      { bg: '#F59E0B', color: '#18181B', btnBg: '#18181B', btnColor: '#FFFFFF', icon: '🛠️' },
        urgent:       { bg: '#EF4444', color: '#FFFFFF', btnBg: '#FFFFFF', btnColor: '#EF4444', icon: '🚨' },
        purple:       { bg: '#A855F7', color: '#FFFFFF', btnBg: '#FFFFFF', btnColor: '#A855F7', icon: '💜' }
      };

      const theme = themes[b.type] || themes.announcement;
      const displayIcon = b.icon || theme.icon;

      let banner = document.getElementById('pixkit-broadcast-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pixkit-broadcast-banner';
        document.body.prepend(banner);
      }

      banner.style.cssText = `
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        z-index: 999999;
        background: ${theme.bg};
        color: ${theme.color};
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 13px;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 4px 18px rgba(0,0,0,0.18);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        flex-wrap: wrap;
      `;

      const safeHeadline = this.escapeHtml(b.headline || '');
      const safeMessage = this.escapeHtml(b.message || '');
      const safeLabel = this.escapeHtml(b.actionLabel || 'Learn More');
      const safeUrl = b.actionUrl ? this.escapeHtml(b.actionUrl) : '';

      banner.innerHTML = `
        <span style="font-size: 15px; line-height: 1;">${displayIcon}</span>
        <span style="line-height: 1.4;">
          ${safeHeadline ? `<strong style="font-weight: 800; margin-right: 4px;">${safeHeadline}:</strong>` : ''}
          <span>${safeMessage}</span>
        </span>
        ${safeUrl ? `
          <a href="${safeUrl}" style="background: ${theme.btnBg}; color: ${theme.btnColor}; padding: 4px 14px; border-radius: 999px; text-decoration: none; font-size: 11.5px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: opacity 0.15s ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            ${safeLabel} &rarr;
          </a>
        ` : ''}
        ${b.dismissible !== false ? `
          <button onclick="PixKitRemote.dismissBroadcast('${broadcastKey}')" style="background: none; border: none; cursor: pointer; font-weight: 900; font-size: 18px; margin-left: 6px; line-height: 1; color: inherit; opacity: 0.75; padding: 0 4px;" title="Dismiss">&times;</button>
        ` : ''}
      `;
    },

    dismissBroadcast: function (key) {
      if (key) {
        try { sessionStorage.setItem('pixkit_dismissed_bc_' + key, 'true'); } catch (_) {}
      }
      this.removeBroadcastBanner();
    },

    escapeHtml: function (str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    removeBroadcastBanner: function () {
      const banner = document.getElementById('pixkit-broadcast-banner');
      if (banner) banner.remove();
    }
  };

  window.closePixKitMaintenanceModal = function () {
    const backdrop = document.getElementById('pixkit-maintenance-modal-backdrop');
    if (backdrop) {
      backdrop.style.opacity = '0';
      backdrop.style.transition = 'opacity 0.18s ease';
      const card = document.getElementById('pixkit-maintenance-modal-card');
      if (card) {
        card.style.transform = 'scale(0.92) translateY(10px)';
        card.style.opacity = '0';
        card.style.transition = 'all 0.18s ease';
      }
      setTimeout(() => {
        if (backdrop.parentNode) backdrop.remove();
      }, 190);
    }
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closePixKitMaintenanceModal();
    }
  });

  window.PixKitRemote = PixKitRemote;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PixKitRemote.init());
  } else {
    PixKitRemote.init();
  }
})(window);
