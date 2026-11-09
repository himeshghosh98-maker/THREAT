# TrustPulse Browser Extension (Manifest V3)

A minimal, secure browser extension for Chrome, Brave, and Microsoft Edge that integrates with your TrustPulse backend for URL threat analysis.

## Features

- **Context Menu Inspection**: Right-click any hyperlink on a webpage and select **"Check link with TrustPulse"** to immediately scan the URL without navigating to it.
- **Dynamic Toolbar Badge**: Displays live risk classifications directly on the extension toolbar icon:
  - `LOW` (Green): Low risk
  - `SUS` (Amber): Suspicious
  - `HIGH` (Red): High risk
  - `MAL` (Dark Red): Confirmed malicious
  - `?` (Grey): Inconclusive scan or network error
- **Page Scanner Popup**: Click the toolbar icon to view the defanged URL of the current active tab and trigger an on-demand analysis.
- **Detailed Result Cards**: View risk score, evidence coverage confidence, top 3 indicators sorted by severity, and uncompleted check notices.
- **Full Report Navigation**: One-click button to jump directly to `{webBase}/report/<id>` in your TrustPulse web dashboard.
- **Recent Checks History**: Stores the last 20 checked URLs in local extension storage; the popup displays the 5 most recent checks.
- **In-Memory & Storage Cache**: Caches URL scan results locally for 10 minutes to minimize redundant backend queries.

---

## Installation & Loading Steps

1. Open your Chromium-based browser's extension management page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Microsoft Edge**: `edge://extensions`
2. Enable **Developer mode** using the toggle switch (typically in the top-right corner).
3. Click the **Load unpacked** button.
4. In the file picker, select the `frontend/extension/` directory of this repository.
5. The **TrustPulse** extension icon will now appear in your browser toolbar (pin it for quick access).

---

## Configuration

1. Right-click the TrustPulse icon in the toolbar and select **Options** (or click the ⚙️ gear icon inside the popup).
2. Configure the endpoints:
   - **API Base URL**: Address of your TrustPulse API backend (default: `http://localhost:8000`).
   - **Web Portal URL**: Address of your web interface for viewing full reports (default: `http://localhost:3000`).
3. Click **Test Connection** to verify reachability via `GET /api/v1/health`.
4. Click **Save Settings**. If using a custom remote API origin outside localhost, your browser will prompt you to grant host permission at runtime.

---

## Privacy Statement

TrustPulse is built with strict privacy and security principles:
- **Zero Background Tracking**: The extension never tracks, logs, or intercepts your background browsing activity.
- **Explicit User Action Only**: Network requests are dispatched *only* when you explicitly right-click a link and choose "Check link with TrustPulse" or click the "Check this page" button in the popup.
- **Self-Hosted / Direct**: Scan requests and health checks are sent exclusively to your own configured backend API. No third-party servers or telemetry services are ever contacted.
- **No Page Content Access**: The extension does not inject content scripts or read DOM contents, cookies, form fields, or local storage.
- **Safe Rendering**: All displayed URLs are defanged (e.g. `hxxps://example[.]com`) and rendered exclusively as plain text (`textContent`).

---

## Limitations

- **Not a Safety Guarantee**: Results reflect automated checks performed against available threat intelligence, heuristics, and DNS/TLS records. Low risk results indicate that no significant indicators were found in the performed checks, but do not guarantee that a site or link is entirely safe.
- **Protocol Scope**: Supports HTTP and HTTPS links only. Internal browser schemes (`chrome://`, `brave://`, `about:`, `file:`) cannot be scanned.
- **Network Dependency**: URL scanning requires connectivity to your configured TrustPulse API service.
- **Manual Checking**: Automatic background link inspection is not active.
