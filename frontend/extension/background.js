// TrustPulse Manifest V3 Background Service Worker

const DEFAULT_API_BASE = 'http://localhost:8000';
const DEFAULT_WEB_BASE = 'http://localhost:3000';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
const REQUEST_TIMEOUT_MS = 20000; // 20s timeout

const BADGE_MAP = {
  low_risk: { text: 'LOW', color: '#16a34a' },
  suspicious: { text: 'SUS', color: '#d97706' },
  high_risk: { text: 'HIGH', color: '#dc2626' },
  confirmed_malicious: { text: 'MAL', color: '#991b1b' },
  inconclusive: { text: '?', color: '#6b7280' },
  error: { text: '?', color: '#6b7280' }
};

function defangUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return rawUrl
    .replace(/^https?:\/\//i, (match) => match.toLowerCase().startsWith('https') ? 'hxxps://' : 'hxxp://')
    .replace(/\./g, '[.]');
}

function updateBadge(classification) {
  const config = BADGE_MAP[classification] || BADGE_MAP.error;
  chrome.action.setBadgeText({ text: config.text });
  chrome.action.setBadgeBackgroundColor({ color: config.color });
}

async function getStoredConfig() {
  const data = await chrome.storage.local.get(['apiBase', 'webBase', 'scan_cache', 'history']);
  return {
    apiBase: (data.apiBase || DEFAULT_API_BASE).replace(/\/+$/, ''),
    webBase: (data.webBase || DEFAULT_WEB_BASE).replace(/\/+$/, ''),
    cache: data.scan_cache || {},
    history: Array.isArray(data.history) ? data.history : []
  };
}

async function addToHistory(item) {
  try {
    const data = await chrome.storage.local.get(['history']);
    const list = Array.isArray(data.history) ? data.history : [];
    const updated = [item, ...list].slice(0, 20);
    await chrome.storage.local.set({ history: updated });
  } catch {
    // Fail silently without crashing
  }
}

async function saveToCache(url, report) {
  try {
    const data = await chrome.storage.local.get(['scan_cache']);
    const cache = data.scan_cache || {};
    const now = Date.now();
    // Prune entries older than TTL
    const cleanCache = {};
    for (const [k, v] of Object.entries(cache)) {
      if (v && now - v.timestamp < CACHE_TTL_MS) {
        cleanCache[k] = v;
      }
    }
    cleanCache[url] = { report, timestamp: now };
    await chrome.storage.local.set({ scan_cache: cleanCache });
  } catch {
    // Fail silently without crashing
  }
}

async function scanUrl(url) {
  if (!url || typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    updateBadge('error');
    return { success: false, error: 'Only HTTP and HTTPS URLs can be checked.' };
  }

  const { apiBase, cache } = await getStoredConfig();

  // Check 10-minute cache
  const cached = cache[url];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.report) {
    const classification = cached.report.risk?.classification || 'inconclusive';
    updateBadge(classification);
    await addToHistory({
      target: defangUrl(url),
      class: classification,
      score: cached.report.risk?.score ?? null,
      id: cached.report.id || null,
      time: new Date().toISOString()
    });
    return { success: true, report: cached.report, cached: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiBase}/api/v1/scan/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.status === 429) {
      updateBadge('error');
      await addToHistory({
        target: defangUrl(url),
        class: 'error',
        score: null,
        id: null,
        time: new Date().toISOString()
      });
      return { success: false, error: 'Too many requests, try again shortly' };
    }

    if (!response.ok) {
      let message = `Server error (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson?.error?.message) {
          message = errorJson.error.message;
        } else if (errorJson?.error?.code) {
          message = `Error: ${errorJson.error.code}`;
        }
      } catch {
        // use default message
      }
      updateBadge('error');
      await addToHistory({
        target: defangUrl(url),
        class: 'error',
        score: null,
        id: null,
        time: new Date().toISOString()
      });
      return { success: false, error: message };
    }

    const report = await response.json();
    const classification = report?.risk?.classification || 'inconclusive';
    updateBadge(classification);

    await saveToCache(url, report);
    await addToHistory({
      target: defangUrl(url),
      class: classification,
      score: report.risk?.score ?? null,
      id: report.id || null,
      time: new Date().toISOString()
    });

    return { success: true, report };
  } catch (err) {
    clearTimeout(timeoutId);
    let errorMsg = 'Backend unreachable. Please ensure the TrustPulse server is running.';
    if (err && err.name === 'AbortError') {
      errorMsg = 'Request timed out after 20 seconds.';
    }
    updateBadge('error');
    await addToHistory({
      target: defangUrl(url),
      class: 'error',
      score: null,
      id: null,
      time: new Date().toISOString()
    });
    return { success: false, error: errorMsg };
  }
}

// Setup Context Menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'check-link-trustpulse',
      title: 'Check link with TrustPulse',
      contexts: ['link']
    });
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'check-link-trustpulse' && info.linkUrl) {
    await scanUrl(info.linkUrl);
  }
});

// Handle messages from popup or options
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.action === 'scanUrl') {
    scanUrl(message.url).then(sendResponse);
    return true; // asynchronous response
  }
  if (message && message.action === 'getCachedOrScan') {
    scanUrl(message.url).then(sendResponse);
    return true;
  }
  return false;
});
