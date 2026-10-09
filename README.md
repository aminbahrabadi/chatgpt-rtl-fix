# ChatGPT RTL Fix

A lightweight Firefox extension that fixes Persian/English bidirectional text rendering on ChatGPT.

ChatGPT RTL Fix is built for Persian and other RTL users who frequently mix RTL prose with English technical terms, URLs, code, lists, tables, and Writing Blocks.

## Features

- Corrects Persian/English mixed sentences
- Handles RTL sentences that start with English technical terms
- Keeps pure-English paragraphs LTR
- Fixes mixed-language lists while preserving marker placement
- Fixes mixed-language tables with per-cell direction handling
- Keeps URLs and citations isolated as LTR
- Preserves inline code, code blocks, math, CodeMirror editors, and ASCII diagrams as LTR
- Handles ChatGPT **Plain text** blocks containing Persian prose
- Treats embedded Writing Blocks as independent bidirectional surfaces
- Fixes direction in the ChatGPT composer
- Supports streamed and dynamically inserted responses
- Avoids changing unrelated ChatGPT UI controls

## Privacy

All direction detection happens locally in the browser.

The extension does **not**:

- collect user data
- transmit conversation content
- store conversation content
- use analytics or telemetry
- make network requests
- load remote code
- use a background script

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Scope

The content script runs only on:

```text
https://chatgpt.com/*
```

No optional or privileged WebExtension permissions are requested.

## Install for development

1. Clone this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Click **Load Temporary Add-on...**
4. Select `manifest.json`.
5. Open or hard-refresh ChatGPT.

To validate with Mozilla's tooling:

```bash
npm install --global web-ext
web-ext lint
```

## Project structure

```text
.
├── manifest.json
├── content.js
├── styles.css
├── icons/
│   └── icon.svg
├── CHANGELOG.md
├── CONTRIBUTING.md
├── PRIVACY.md
├── SECURITY.md
└── LICENSE
```

## Contributing

Bug reports and focused pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Because ChatGPT's DOM can change, please include the affected DOM/HTML structure or a reproducible example when reporting a rendering bug. Do not include private conversation content.

## License

MIT — see [LICENSE](LICENSE).

## Disclaimer

This is an independent, unofficial extension and is not affiliated with or endorsed by OpenAI.
