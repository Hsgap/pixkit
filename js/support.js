/**
 * PixKit Studio - Support Navigation & Notification Toast Engine
 * Directly navigates users to the dedicated Support Page (no modal popup),
 * and manages the 5-minute recurring 30s bottom-right support reminder toast.
 */

(function (window) {
  'use strict';

  // Navigate directly to the dedicated Support Page
  window.toggleSupportModal = function () {
    if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
      if (!window.PixKitRemote.isFeatureEnabled('community', 'supportModal')) {
        if (typeof window.showToast === 'function') {
          window.showToast('Support contributions are temporarily paused for maintenance.');
        }
        return;
      }
    }
    window.dismissSupportToast();
    window.location.href = 'support';
  };

  // =========================================================================
  // 5-Minute Recurring Support Toast Popup (Bottom-Right, 30s Countdown Slider)
  // =========================================================================
  let toastTimerInterval = null;
  let toastRemainingSeconds = 30;
  let isToastHovered = false;

  function createSupportToastDOM() {
    let toast = document.getElementById('support-toast-card');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'support-toast-card';
    toast.className = 'support-toast-card';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="support-toast-header">
        <div class="support-toast-brand">
          <span class="support-toast-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
            </svg>
          </span>
          <h4 class="support-toast-title">Support PixKit Studio</h4>
        </div>
        <button type="button" class="support-toast-close" onclick="dismissSupportToast()" title="Dismiss popup">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <p class="support-toast-body">
        PixKit is 100% private, client-side &amp; community fueled. If our studio saved you time, consider fueling us with a coffee!
      </p>
      <div class="support-toast-actions">
        <button type="button" class="support-toast-btn-primary" onclick="handleToastSupportClick()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
          </svg>
          <span>Support Us</span>
        </button>
        <button type="button" class="support-toast-btn-dismiss" onclick="dismissSupportToast()">
          Dismiss
        </button>
      </div>
      <div class="support-toast-slider-track">
        <div class="support-toast-slider-fill" id="supportToastSliderFill"></div>
      </div>
    `;

    document.body.appendChild(toast);

    // Hover pause: hovering pauses the 30-second countdown and slider animation
    toast.addEventListener('mouseenter', () => {
      isToastHovered = true;
      toast.classList.add('paused');
    });

    toast.addEventListener('mouseleave', () => {
      isToastHovered = false;
      toast.classList.remove('paused');
    });

    return toast;
  }

  window.showSupportToast = function () {
    if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
      if (!window.PixKitRemote.isFeatureEnabled('community', 'supportModal')) {
        return;
      }
    }

    const toast = createSupportToastDOM();
    if (!toast) return;

    // Reset countdown state
    clearInterval(toastTimerInterval);
    toastRemainingSeconds = 30;
    isToastHovered = false;

    toast.classList.remove('paused', 'animating');
    // Force reflow to restart CSS animation
    void toast.offsetWidth;

    // Slide in from right to left smoothly
    toast.classList.add('visible', 'animating');
    document.body.classList.add('has-support-toast');
    const measuredHeight = toast.offsetHeight;
    if (measuredHeight > 0) {
      document.documentElement.style.setProperty('--support-toast-height', `${measuredHeight}px`);
    }

    // 30-second timer countdown
    toastTimerInterval = setInterval(() => {
      if (!isToastHovered) {
        toastRemainingSeconds -= 1;
        if (toastRemainingSeconds <= 0) {
          clearInterval(toastTimerInterval);
          window.dismissSupportToast();
        }
      }
    }, 1000);
  };

  window.dismissSupportToast = function () {
    clearInterval(toastTimerInterval);
    const toast = document.getElementById('support-toast-card');
    if (toast) {
      // Slide out smoothly
      toast.classList.remove('visible');
    }
    document.body.classList.remove('has-support-toast');
    document.documentElement.style.removeProperty('--support-toast-height');
  };

  window.handleToastSupportClick = function () {
    window.dismissSupportToast();
    window.location.href = 'support';
  };

  // Start 5-Minute Recurring Cycle in Studio
  function initSupportToastCycle() {
    // Only activate inside studio workspace
    const isStudio = document.querySelector('.shell') || window.location.pathname.includes('studio');
    if (!isStudio) return;

    // First appearance after 10s on page load for easy review
    setTimeout(() => {
      if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
        if (!window.PixKitRemote.isFeatureEnabled('community', 'supportModal')) return;
      }
      window.showSupportToast();
    }, 10000);

    // Then recurring every 5 minutes (300,000 ms)
    setInterval(() => {
      if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
        if (!window.PixKitRemote.isFeatureEnabled('community', 'supportModal')) return;
      }
      window.showSupportToast();
    }, 5 * 60 * 1000);
  }

  // Global Escape key handler
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      window.dismissSupportToast();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupportToastCycle);
  } else {
    initSupportToastCycle();
  }

})(window);
