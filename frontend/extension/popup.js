// TrustPulse Extension Popup Script

const DEFAULT_WEB_BASE = 'http://localhost:3000';
const CACHE_TTL_MS = 10 * 60 * 1000;

const SEVERITY_ORDER = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

const RISK_CONFIG = {
  low_risk: {
    icon: '🛡️',
    text: 'Low Risk',
    badgeClass: 'badge-low'
  },
  suspicious: {
    icon: '⚠️',
    text: 'Suspicious',
    badgeClass: 'badge-sus'
  },
  high_risk: {
    icon: '🚨',
    text: 'High Risk',
    badgeClass: 'badge-high'
  },
  confirmed_malicious: {
    icon: '🛑',
    text: 'Confirmed Malicious',
    badgeClass: 'badge-mal'
  },
  inconclusive: {
    icon: '❓',
    text: 'Inconclusive',
    badgeClass: 'badge-inconclusive'
  }
};

function defangUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  return rawUrl
    .replace(/^https?:\/\//i, (match) => match.toLowerCase().startsWith('https') ? 'hxxps://' : 'hxxp://')
    .replace(/\./g, '[.]');
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const currentUrlEl = document.getElementById('current-url');
  const checkPageBtn = document.getElementById('check-page-btn');
  const openOptionsBtn = document.getElementById('open-options-btn');
  const statusContainer = document.getElementById('status-container');
  const resultCard = document.getElementById('result-card');
  const riskBadge = document.getElementById('risk-badge');
  const riskScoreEl = document.getElementById('risk-score');
  const evidenceCoverageEl = document.getElementById('evidence-coverage');
  const indicatorsContainer = document.getElementById('indicators-container');
  const checksFailedNote = document.getElementById('checks-failed-note');
  const lowRiskNote = document.getElementById('low-risk-note');
  const viewReportBtn = document.getElementById('view-report-btn');
  const historyContainer = document.getElementById('history-container');

  let activeTabUrl = null;
  let webBase = DEFAULT_WEB_BASE;

  // Retrieve stored settings
  try {
    const stored = await chrome.storage.local.get(['webBase']);
    if (stored.webBase) {
      webBase = stored.webBase.replace(/\/+$/, '');
    }
  } catch {
    // ignore
  }

  // Open settings page
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Query active tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      activeTabUrl = tab.url;
      const isHttp = activeTabUrl.startsWith('http://') || activeTabUrl.startsWith('https://');
      currentUrlEl.textContent = defangUrl(activeTabUrl);

      if (isHttp) {
        checkPageBtn.disabled = false;
        // Check if there is an existing valid cached result
        const cacheData = await chrome.storage.local.get(['scan_cache']);
        const cached = cacheData.scan_cache && cacheData.scan_cache[activeTabUrl];
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.report) {
          renderResultCard(cached.report);
        }
      } else {
        checkPageBtn.disabled = true;
        showStatus('Only HTTP and HTTPS pages can be checked.', 'info');
      }
    } else {
      currentUrlEl.textContent = 'No active page found.';
      checkPageBtn.disabled = true;
    }
  } catch {
    currentUrlEl.textContent = 'Unable to read active tab.';
    checkPageBtn.disabled = true;
  }

  // Load and render history
  await renderHistory();

  // Check this page button click
  checkPageBtn.addEventListener('click', async () => {
    if (!activeTabUrl) return;

    checkPageBtn.disabled = true;
    checkPageBtn.textContent = 'Checking...';
    showStatus('Analyzing page...', 'loading');
    resultCard.classList.add('hidden');

    try {
      chrome.runtime.sendMessage({ action: 'scanUrl', url: activeTabUrl }, async (response) => {
        checkPageBtn.disabled = false;
        checkPageBtn.textContent = 'Check this page';

        if (chrome.runtime.lastError) {
          showStatus('Error communicating with extension background worker.', 'error');
          return;
        }

        if (response && response.success && response.report) {
          hideStatus();
          renderResultCard(response.report);
          await renderHistory();
        } else {
          const errMsg = response?.error || 'An error occurred during scanning.';
          showStatus(errMsg, 'error');
          await renderHistory();
        }
      });
    } catch {
      checkPageBtn.disabled = false;
      checkPageBtn.textContent = 'Check this page';
      showStatus('An unexpected error occurred.', 'error');
    }
  });

  function showStatus(text, type) {
    clearChildren(statusContainer);
    statusContainer.className = `status-box status-${type}`;
    const p = document.createElement('p');
    p.textContent = text;
    statusContainer.appendChild(p);
    statusContainer.classList.remove('hidden');
  }

  function hideStatus() {
    statusContainer.classList.add('hidden');
    clearChildren(statusContainer);
  }

  function renderResultCard(report) {
    if (!report || !report.risk) return;

    const classification = report.risk.classification || 'inconclusive';
    const config = RISK_CONFIG[classification] || RISK_CONFIG.inconclusive;

    // 1. Risk Class
    riskBadge.textContent = `${config.icon} ${config.text}`;
    riskBadge.className = `risk-badge ${config.badgeClass}`;

    // 2. Score
    const scoreVal = report.risk.score !== undefined && report.risk.score !== null ? report.risk.score : 'N/A';
    riskScoreEl.textContent = `Score: ${scoreVal}/100`;

    // 3. Evidence Coverage from Confidence
    const confidenceVal = typeof report.risk.confidence === 'number' ? report.risk.confidence : 0;
    const coveragePct = Math.round(confidenceVal * 100);
    evidenceCoverageEl.textContent = `Evidence coverage: ${coveragePct}%`;

    // 4. Up to 3 top indicators by severity
    clearChildren(indicatorsContainer);
    const indicators = Array.isArray(report.indicators) ? report.indicators : [];
    const sortedIndicators = [...indicators].sort((a, b) => {
      const rankA = SEVERITY_ORDER[a.severity] || 0;
      const rankB = SEVERITY_ORDER[b.severity] || 0;
      return rankB - rankA;
    }).slice(0, 3);

    if (sortedIndicators.length > 0) {
      sortedIndicators.forEach((ind) => {
        const item = document.createElement('div');
        item.className = 'indicator-item';

        const badge = document.createElement('span');
        const sev = (ind.severity || 'info').toLowerCase();
        badge.className = `indicator-severity severity-${sev}`;
        badge.textContent = sev.toUpperCase();

        const title = document.createElement('span');
        title.className = 'indicator-title';
        title.textContent = ind.title || 'Indicator';

        item.appendChild(badge);
        item.appendChild(title);
        indicatorsContainer.appendChild(item);
      });
      indicatorsContainer.classList.remove('hidden');
    } else {
      indicatorsContainer.classList.add('hidden');
    }

    // 5. Checks failed note: "N checks could not be completed"
    const failedChecks = report.risk.checks_failed;
    if (Array.isArray(failedChecks) && failedChecks.length > 0) {
      checksFailedNote.textContent = `${failedChecks.length} checks could not be completed`;
      checksFailedNote.classList.remove('hidden');
    } else {
      checksFailedNote.classList.add('hidden');
      clearChildren(checksFailedNote);
    }

    // 6. Low risk note: "No significant indicators found in the available checks." (never "safe")
    if (classification === 'low_risk') {
      lowRiskNote.textContent = 'No significant indicators found in the available checks.';
      lowRiskNote.classList.remove('hidden');
    } else {
      lowRiskNote.classList.add('hidden');
      clearChildren(lowRiskNote);
    }

    // 7. View full report button
    if (report.id) {
      viewReportBtn.classList.remove('hidden');
      viewReportBtn.onclick = () => {
        chrome.tabs.create({ url: `${webBase}/report/${encodeURIComponent(report.id)}` });
      };
    } else {
      viewReportBtn.classList.add('hidden');
    }

    resultCard.classList.remove('hidden');
  }

  async function renderHistory() {
    clearChildren(historyContainer);
    try {
      const data = await chrome.storage.local.get(['history', 'webBase']);
      const currentWebBase = (data.webBase || DEFAULT_WEB_BASE).replace(/\/+$/, '');
      const list = Array.isArray(data.history) ? data.history.slice(0, 5) : [];

      if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'history-empty';
        empty.textContent = 'No recent checks yet.';
        historyContainer.appendChild(empty);
        return;
      }

      list.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'history-item';

        const topRow = document.createElement('div');
        topRow.className = 'history-top-row';

        const badge = document.createElement('span');
        const classification = item.class || 'inconclusive';
        const conf = RISK_CONFIG[classification] || { text: classification, badgeClass: 'badge-inconclusive' };
        badge.className = `history-badge ${conf.badgeClass}`;
        badge.textContent = conf.text;

        const time = document.createElement('span');
        time.className = 'history-time';
        time.textContent = formatRelativeTime(item.time);

        topRow.appendChild(badge);
        topRow.appendChild(time);

        const targetEl = document.createElement('div');
        targetEl.className = 'history-target defanged-text';
        targetEl.textContent = item.target || '';

        const bottomRow = document.createElement('div');
        bottomRow.className = 'history-bottom-row';

        const scoreEl = document.createElement('span');
        scoreEl.className = 'history-score';
        scoreEl.textContent = item.score !== null && item.score !== undefined ? `Score: ${item.score}` : '';

        bottomRow.appendChild(scoreEl);

        if (item.id) {
          const reportLinkBtn = document.createElement('button');
          reportLinkBtn.className = 'history-report-btn';
          reportLinkBtn.textContent = 'Report ↗';
          reportLinkBtn.title = 'View full report';
          reportLinkBtn.onclick = () => {
            chrome.tabs.create({ url: `${currentWebBase}/report/${encodeURIComponent(item.id)}` });
          };
          bottomRow.appendChild(reportLinkBtn);
        }

        row.appendChild(topRow);
        row.appendChild(targetEl);
        row.appendChild(bottomRow);
        historyContainer.appendChild(row);
      });
    } catch {
      const errEl = document.createElement('div');
      errEl.className = 'history-empty';
      errEl.textContent = 'Unable to load history.';
      historyContainer.appendChild(errEl);
    }
  }
});
