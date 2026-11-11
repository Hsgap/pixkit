/**
 * PixKit Studio — Community Supporters Leaderboard System
 * Handles persistent supporter storage, dynamic ranking physics, timeframe filtering (Weekly, Monthly, Yearly),
 * Total Collection calculations, and full-screen slide animation physics.
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'pixkit_leaderboard_supporters_v2';
  let activeTimeframe = 'monthly';

  // Firebase Realtime Database Config
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
  let supportersRef = null;

  function initFirebaseRTDB() {
    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(FIREBASE_CONFIG);
        }
        rtdbInstance = firebase.database();
        supportersRef = rtdbInstance.ref('supporters');

        // Listen in real time to new supporters across the globe
        supportersRef.on('value', snapshot => {
          const val = snapshot.val();
          if (val) {
            const list = Array.isArray(val) ? val : Object.values(val);
            if (list.length > 0) {
              saveSupporters(list);
              renderLeaderboardView();
            }
          }
        });
      }
    } catch (_) {}
  }

  // Clean up legacy v1 mock seed data if present
  try {
    localStorage.removeItem('pixkit_leaderboard_supporters_v1');
  } catch (_) {}

  // Exchange rate normalization to USD for universal ranking
  function toUSD(amount, currency) {
    const num = Number(amount) || 0;
    if (currency === 'INR') return num / 85;
    if (currency === 'EUR') return num / 0.92;
    if (currency === 'GBP') return num / 0.78;
    return num;
  }

  // Retrieve actual supporters list from localStorage (Starts empty: 0 mockups)
  function getAllSupporters() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (_) {}
    return [];
  }

  // Save supporters list to localStorage
  function saveSupporters(supporters) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supporters));
    } catch (_) {}
  }

  // Add a new supporter from checkout flow
  window.addLeaderboardSupporter = function (data) {
    if (!data) return;
    const supporters = getAllSupporters();

    const name = data.name && data.name.trim() ? data.name.trim() : 'Anonymous Supporter';
    const amount = Number(data.amount) || 5;
    const currency = data.currency || 'USD';
    const note = data.note ? data.note.trim() : '';

    const newSupporter = {
      id: 'sup_' + Date.now(),
      name: name,
      amount: amount,
      currency: currency,
      note: note,
      timestamp: Date.now(),
      badge: amount >= 50 ? 'Patron' : (amount >= 15 ? 'Backer' : 'Supporter'),
      verified: true,
      hidden: false
    };

    supporters.unshift(newSupporter);
    saveSupporters(supporters);
    renderLeaderboardView();

    // Push live to Firebase RTDB in real time!
    try {
      if (supportersRef) {
        supportersRef.set(supporters);
      }
    } catch (_) {}
  };

  // Timeframe filtering: Weekly (last 7d), Monthly (last 30d), Yearly (all)
  function getSupportersForTimeframe(timeframe) {
    const all = getAllSupporters();
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    let filtered = all;
    if (timeframe === 'weekly') {
      filtered = all.filter(s => (now - s.timestamp) <= weekMs);
    } else if (timeframe === 'monthly') {
      filtered = all.filter(s => (now - s.timestamp) <= monthMs);
    }

    // Sort descending by normalized USD value (highest supporter on top)
    return filtered.sort((a, b) => toUSD(b.amount, b.currency) - toUSD(a.amount, a.currency));
  }

  // Calculate total collection across all supporters
  function calculateTotalCollection(all) {
    let totalUSD = 0;
    all.forEach(s => {
      totalUSD += toUSD(s.amount, s.currency);
    });
    return totalUSD;
  }

  // Relative time helper (e.g. "2 hours ago", "Yesterday")
  function formatRelativeTime(timestamp) {
    const diffMs = Date.now() - timestamp;
    const mins = Math.floor(diffMs / (60 * 1000));
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (mins < 5) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  // Generate avatar gradient and initials
  function getAvatarDetails(name) {
    const clean = (name || 'Anonymous').trim();
    const parts = clean.split(' ').filter(Boolean);
    let initials = 'A';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }

    const palettes = [
      'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
      'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)',
      'linear-gradient(135deg, #D7F36A 0%, #a4e82b 100%)'
    ];
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = palettes[Math.abs(hash) % palettes.length];
    const textColor = color.includes('#D7F36A') ? '#121310' : '#FFFFFF';

    return { initials, gradient: color, textColor };
  }

  // Render the entire leaderboard view into the DOM
  function renderLeaderboardView() {
    const listEl = document.getElementById('supportersRankedList');
    if (!listEl) return;

    const all = getAllSupporters();
    const ranked = getSupportersForTimeframe(activeTimeframe);
    const totalUSD = calculateTotalCollection(all);

    // 1. Update Total Collection Display (Purely total collection, zero mockups)
    const totalEl = document.getElementById('collectionTotalAmountDisplay');
    if (totalEl) {
      const formattedTotal = totalUSD > 0
        ? `$${Number(totalUSD).toFixed(2)}`
        : '$0.00';
      totalEl.innerHTML = `${formattedTotal} <span class="collection-currency-code">USD</span>`;
    }

    // 2. Render Ranked Supporter Cards
    if (ranked.length === 0) {
      listEl.innerHTML = `
        <div class="leaderboard-empty-state">
          <span class="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#F59E0B">
              <path d="M19 5h-2V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v2H5a3 3 0 0 0-3 3v1a5 5 0 0 0 4.5 4.96A6.002 6.002 0 0 0 11 17.92V20H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.08a6.002 6.002 0 0 0 4.5-4.96A5 5 0 0 0 22 9V8a3 3 0 0 0-3-3zM4 9V8a1 1 0 0 1 1-1h2v4.54A3 3 0 0 1 4 9zm16 0a3 3 0 0 1-3 2.54V7h2a1 1 0 0 1 1 1v1z"/>
            </svg>
          </span>
          <h4>No supporters yet for this period</h4>
          <p>Be the first supporter to take the #1 spot on the leaderboard!</p>
          <button type="button" class="leaderboard-support-btn" onclick="openSupportFromLeaderboard()" style="margin: 0 auto;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
            </svg>
            <span>Support Now</span>
          </button>
        </div>
      `;
      return;
    }

    let html = '';
    ranked.forEach((item, index) => {
      const rank = index + 1;
      const avatar = getAvatarDetails(item.name);
      const rankBadge = rank === 1
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="#F59E0B" style="vertical-align:middle; display:inline-block;"><circle cx="12" cy="14" r="6" fill="#F59E0B"/><path d="M9 2l3 5 3-5M12 7v1" stroke="#F59E0B" stroke-width="2"/><text x="12" y="16.5" font-size="7.5" font-weight="900" fill="#121310" text-anchor="middle" font-family="sans-serif">1</text></svg>'
        : (rank === 2
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="#94A3B8" style="vertical-align:middle; display:inline-block;"><circle cx="12" cy="14" r="6" fill="#94A3B8"/><path d="M9 2l3 5 3-5M12 7v1" stroke="#94A3B8" stroke-width="2"/><text x="12" y="16.5" font-size="7.5" font-weight="900" fill="#121310" text-anchor="middle" font-family="sans-serif">2</text></svg>'
          : (rank === 3
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="#CD7F32" style="vertical-align:middle; display:inline-block;"><circle cx="12" cy="14" r="6" fill="#CD7F32"/><path d="M9 2l3 5 3-5M12 7v1" stroke="#CD7F32" stroke-width="2"/><text x="12" y="16.5" font-size="7.5" font-weight="900" fill="#FFFFFF" text-anchor="middle" font-family="sans-serif">3</text></svg>'
            : `#${rank}`));
      const rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : 'rank-normal'));

      const formattedAmount = item.currency === 'INR'
        ? `₹${Number(item.amount).toLocaleString('en-IN')}`
        : `$${Number(item.amount).toFixed(2)}`;

      html += `
        <div class="supporter-rank-card ${rankClass}" data-rank="${rank}">
          <div class="card-left-group">
            <div class="rank-badge-wrap">
              <span class="rank-badge-symbol">${rankBadge}</span>
            </div>
            <div class="supporter-avatar-circle" style="background: ${avatar.gradient}; color: ${avatar.textColor};">
              ${avatar.initials}
            </div>
            <div class="supporter-info-col">
              <div class="supporter-name-row">
                <span class="supporter-display-name">${escapeHTML(item.name)}</span>
                ${item.badge ? `<span class="supporter-tier-tag">${escapeHTML(item.badge)}</span>` : ''}
              </div>
              ${item.note ? `<p class="supporter-note-quote">“${escapeHTML(item.note)}”</p>` : ''}
            </div>
          </div>

          <div class="card-right-group">
            <div class="supporter-amount-pill">${formattedAmount}</div>
            <span class="supporter-time-ago">${formatRelativeTime(item.timestamp)}</span>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Switch timeframe tabs (weekly, monthly, yearly)
  window.setLeaderboardTimeframe = function (timeframe, tabBtn) {
    activeTimeframe = timeframe;
    document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
    if (tabBtn) tabBtn.classList.add('active');

    const metaTag = document.getElementById('leaderboardMetaTag');
    if (metaTag) {
      const labels = {
        weekly: 'Top supporters this week',
        monthly: 'Top supporters this month',
        yearly: 'All-time top supporters'
      };
      metaTag.innerHTML = `<span>${labels[timeframe] || 'Arranged by highest amount'}</span>`;
    }

    renderLeaderboardView();
  };

  // Full-Screen Slide Animation Controls
  window.openLeaderboardScreen = function () {
    if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
      if (!window.PixKitRemote.isFeatureEnabled('community', 'leaderboard')) {
        if (typeof window.showToast === 'function') {
          window.showToast('⚠️ Community Leaderboard is temporarily paused for maintenance.');
        } else {
          alert('Community Leaderboard is temporarily paused for maintenance.');
        }
        return;
      }
    }

    document.body.classList.add('leaderboard-active');
    renderLeaderboardView();

    // Scroll to top of leaderboard container smoothly
    const screen = document.getElementById('leaderboard-screen');
    if (screen) screen.scrollTop = 0;
  };

  window.closeLeaderboardScreen = function () {
    document.body.classList.remove('leaderboard-active');
  };

  window.openSupportFromLeaderboard = function () {
    window.location.href = 'support';
  };

  // Opt-in name input toggle helpers
  window.toggleModalLeaderboardName = function (isChecked) {
    const wrap = document.getElementById('supportModalLeaderboardNameWrap');
    if (wrap) wrap.style.display = isChecked ? 'block' : 'none';
  };

  window.togglePageLeaderboardName = function (isChecked) {
    const wrap = document.getElementById('pageLeaderboardNameWrap');
    if (wrap) wrap.style.display = isChecked ? 'block' : 'none';
  };

  // Global Escape key handler to close Leaderboard
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('leaderboard-active')) {
      window.closeLeaderboardScreen();
    }
  });

  // Auto-open if query param ?view=leaderboard is present
  function checkUrlParamAutoOpen() {
    if (window.location.search.includes('view=leaderboard')) {
      if (window.PixKitRemote && typeof window.PixKitRemote.isFeatureEnabled === 'function') {
        if (!window.PixKitRemote.isFeatureEnabled('community', 'leaderboard')) return;
      }
      setTimeout(() => {
        window.openLeaderboardScreen();
      }, 350);
    }
  }

  // Export functions to global scope
  window.renderLeaderboardView = renderLeaderboardView;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFirebaseRTDB();
      renderLeaderboardView();
      checkUrlParamAutoOpen();
    });
  } else {
    initFirebaseRTDB();
    renderLeaderboardView();
    checkUrlParamAutoOpen();
  }

})(window);
