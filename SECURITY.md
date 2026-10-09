# Security Policy

## Reporting a security or privacy issue

If you discover a security or privacy issue, avoid including secrets, authentication data, private ChatGPT conversations, or other sensitive material in a public issue.

For ordinary non-sensitive security concerns, you may open a GitHub issue with a minimal reproduction.

## Security model

ChatGPT RTL Fix is intentionally small:

- no background script or service worker
- no analytics or telemetry
- no remote code
- no network requests
- no browser storage
- no privileged WebExtension permissions
- content script scope limited to `https://chatgpt.com/*`

The extension reads visible page text locally only to decide whether a semantic text surface should be rendered RTL or LTR.
