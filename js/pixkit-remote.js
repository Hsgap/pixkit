/**
 * PixKit Ecosystem Remote SDK (pixkit-remote.js)
 * Live connector between admin.pixkit.site and pixkit.site / pixkit-mobile.
 * Subscribes to real-time Firebase ecosystem state (kill switches, maintenance, feature flags, broadcasts).
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
    configUrl: DEFAULT_CONFIG_URL,
    listeners: [],

    detectPlatform: function () {
      if (window.Capacitor) {
        return 'mobile';
      }
      return 'web';
    },

    init: async function (options = {}) {
      this.platform = options.platform || this.detectPlatform();
      this.configUrl = options.configUrl || DEFAULT_CONFIG_URL;

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

    // Check if a specific tool feature flag is enabled for current platform
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

    // Helper: Map studio toolId to category and tool key
    checkToolAccess: function (toolId) {
      const toolMap = {
        'resize': { cat: 'editTools', key: 'resize', name: 'Resize Tool' },
        'crop': { cat: 'editTools', key: 'crop', name: 'Crop Tool' },
        'rotate': { cat: 'editTools', key: 'rotateFlip', name: 'Rotate & Flip' },
        'compress': { cat: 'editTools', key: 'compress', name: 'Compress Image' },
        'adjust': { cat: 'editTools', key: 'adjust', name: 'Adjust Tones' },
        'filters': { cat: 'editTools', key: 'filters', name: 'Preset Filters' },
        'draw': { cat: 'editTools', key: 'drawShapes', name: 'Draw & Shapes' },
        'text': { cat: 'editTools', key: 'addText', name: 'Add Text' },
        'convert-format': { cat: 'convertTools', key: 'formatConverter', name: 'Format Converter' },
        'convert-svg': { cat: 'convertTools', key: 'svgToPng', name: 'SVG to PNG Converter' },
        'convert-heic': { cat: 'convertTools', key: 'heicToJpg', name: 'HEIC to JPG Converter' },
        'convert-pdf': { cat: 'convertTools', key: 'imageToPdf', name: 'Image to PDF' },
        'convert-ico': { cat: 'convertTools', key: 'imageToIco', name: 'Image to ICO' },
        'convert-base64': { cat: 'convertTools', key: 'imageToBase64', name: 'Image to Base64' },
        'doc-merge-pdf': { cat: 'pdfTools', key: 'mergePdf', name: 'Merge PDF' },
        'doc-split-pdf': { cat: 'pdfTools', key: 'splitPdf', name: 'Split PDF' },
        'doc-compress-pdf': { cat: 'pdfTools', key: 'compressPdf', name: 'Compress PDF' },
        'doc-pdf-to-images': { cat: 'pdfTools', key: 'pdfToImages', name: 'PDF to Images' },
        'doc-images-to-pdf': { cat: 'pdfTools', key: 'imagesToPdf', name: 'Images to PDF' },
        'doc-rotate-pdf': { cat: 'pdfTools', key: 'rotatePdf', name: 'Rotate PDF' },
        'doc-delete-pdf': { cat: 'pdfTools', key: 'deletePdfPages', name: 'Delete PDF Pages' }
      };

      const mapped = toolMap[toolId];
      if (!mapped) return true; // Unmapped tools default to enabled

      const isEnabled = this.isFeatureEnabled(mapped.cat, mapped.key);
      if (!isEnabled) {
        this.showToolDisabledToast(mapped.name);
        return false;
      }
      return true;
    },

    showToolDisabledToast: function (toolName) {
      let toast = document.getElementById('pixkit-tool-disabled-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pixkit-tool-disabled-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          z-index: 99999999;
          background: #1A1C16;
          color: #F2F3EC;
          border: 1px solid #3D4034;
          padding: 14px 24px;
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        `;
        document.body.appendChild(toast);
      }

      toast.innerHTML = `
        <span style="color: #F59E0B; font-size: 18px;">⚠️</span>
        <span><strong>${toolName}</strong> is temporarily paused for scheduled maintenance. Back shortly!</span>
      `;

      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';

      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
      }, 4000);
    },

    // Evaluate ecosystem state and render maintenance overlay or broadcast banner if required
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
      let banner = document.getElementById('pixkit-broadcast-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pixkit-broadcast-banner';
        banner.style.cssText = `
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999999;
          background: #D7F36A;
          color: #121310;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          font-size: 13px;
          font-weight: 700;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 4px 18px rgba(0,0,0,0.18);
        `;
        document.body.prepend(banner);
      }

      banner.innerHTML = `
        <span><strong>${b.headline || 'Announcement'}:</strong> ${b.message || ''}</span>
        ${b.actionUrl ? `<a href="${b.actionUrl}" style="background: #121310; color: #FFFFFF; padding: 4px 14px; border-radius: 999px; text-decoration: none; font-size: 11.5px; font-weight: 800;">${b.actionLabel || 'Learn More'}</a>` : ''}
        ${b.dismissible ? `<button onclick="document.getElementById('pixkit-broadcast-banner').remove()" style="background:none;border:none;cursor:pointer;font-weight:900;font-size:16px;margin-left:8px;line-height:1;color:inherit;" title="Dismiss">&times;</button>` : ''}
      `;
    },

    removeBroadcastBanner: function () {
      const banner = document.getElementById('pixkit-broadcast-banner');
      if (banner) banner.remove();
    }
  };

  window.PixKitRemote = PixKitRemote;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PixKitRemote.init());
  } else {
    PixKitRemote.init();
  }
})(window);
