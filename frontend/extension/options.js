// TrustPulse Extension Options Script

const DEFAULT_API_BASE = 'http://localhost:8000';
const DEFAULT_WEB_BASE = 'http://localhost:3000';
const HEALTH_TIMEOUT_MS = 20000;

function isValidHttpUrl(string) {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isDefaultHost(urlStr) {
  try {
    const url = new URL(urlStr);
    return (
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      url.port === '8000' &&
      url.protocol === 'http:'
    );
  } catch {
    return false;
  }
}

async function ensureHostPermission(urlStr) {
  if (isDefaultHost(urlStr)) {
    return true; // Already covered by manifest host_permissions
  }

  try {
    const url = new URL(urlStr);
    const originPattern = `${url.origin}/*`;
    const hasPermission = await chrome.permissions.contains({
      origins: [originPattern]
    });

    if (hasPermission) {
      return true;
    }

    const granted = await chrome.permissions.request({
      origins: [originPattern]
    });

    return Boolean(granted);
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const apiBaseInput = document.getElementById('api-base-input');
  const webBaseInput = document.getElementById('web-base-input');
  const testConnectionBtn = document.getElementById('test-connection-btn');
  const saveBtn = document.getElementById('save-btn');
  const statusAlert = document.getElementById('status-alert');

  function showStatus(message, type) {
    statusAlert.textContent = message;
    statusAlert.className = `status-alert visible status-${type}`;
  }

  function hideStatus() {
    statusAlert.textContent = '';
    statusAlert.className = 'status-alert';
  }

  // Load existing settings
  try {
    const stored = await chrome.storage.local.get(['apiBase', 'webBase']);
    apiBaseInput.value = stored.apiBase || DEFAULT_API_BASE;
    webBaseInput.value = stored.webBase || DEFAULT_WEB_BASE;
  } catch {
    apiBaseInput.value = DEFAULT_API_BASE;
    webBaseInput.value = DEFAULT_WEB_BASE;
  }

  // Test Connection
  testConnectionBtn.addEventListener('click', async () => {
    const rawApi = apiBaseInput.value.trim();
    if (!isValidHttpUrl(rawApi)) {
      showStatus('Please enter a valid HTTP or HTTPS API Base URL (e.g., http://localhost:8000).', 'error');
      return;
    }

    const cleanApi = rawApi.replace(/\/+$/, '');
    const hasPerm = await ensureHostPermission(cleanApi);
    if (!hasPerm) {
      showStatus('Permission to connect to this API host was not granted. Please allow the browser permission prompt.', 'error');
      return;
    }

    testConnectionBtn.disabled = true;
    showStatus('Testing connection to backend...', 'loading');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      const response = await fetch(`${cleanApi}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        showStatus('Too many requests, try again shortly', 'error');
      } else if (response.ok) {
        showStatus('Connection successful! Backend is reachable and healthy.', 'success');
      } else {
        let msg = `Backend returned status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            msg = errData.error.message;
          }
        } catch {
          // ignore
        }
        showStatus(msg, 'error');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err && err.name === 'AbortError') {
        showStatus('Connection timed out after 20 seconds.', 'error');
      } else {
        showStatus('Backend unreachable. Please verify the URL and ensure the server is running.', 'error');
      }
    } finally {
      testConnectionBtn.disabled = false;
    }
  });

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    const rawApi = apiBaseInput.value.trim();
    const rawWeb = webBaseInput.value.trim();

    if (!isValidHttpUrl(rawApi)) {
      showStatus('Please enter a valid HTTP or HTTPS API Base URL (e.g., http://localhost:8000).', 'error');
      return;
    }

    if (!isValidHttpUrl(rawWeb)) {
      showStatus('Please enter a valid HTTP or HTTPS Web Portal URL (e.g., http://localhost:3000).', 'error');
      return;
    }

    const cleanApi = rawApi.replace(/\/+$/, '');
    const cleanWeb = rawWeb.replace(/\/+$/, '');

    const hasPerm = await ensureHostPermission(cleanApi);
    if (!hasPerm) {
      showStatus('Permission to connect to this API host was not granted. Cannot save until permission is granted.', 'error');
      return;
    }

    try {
      await chrome.storage.local.set({
        apiBase: cleanApi,
        webBase: cleanWeb
      });
      showStatus('Settings saved successfully.', 'success');
    } catch {
      showStatus('Failed to save settings to extension storage.', 'error');
    }
  });
});
