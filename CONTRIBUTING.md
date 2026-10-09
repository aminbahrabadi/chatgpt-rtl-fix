# Contributing

Thanks for helping improve ChatGPT RTL Fix.

## Before opening an issue

Please check that:

- you are using the latest extension version
- the issue reproduces on `https://chatgpt.com/`
- another RTL-related extension or custom CSS is not causing the behavior

## Bug reports

For rendering bugs, include:

- Firefox version
- extension version
- a minimal example of the affected Persian/English text
- the type of UI surface: paragraph, list, table, code block, Writing Block, or composer
- relevant sanitized HTML/DOM when possible
- a screenshot with private content removed

Do **not** post private conversations, authentication data, cookies, tokens, or personally sensitive content.

## Development

Load the extension temporarily:

1. Open `about:debugging#/runtime/this-firefox`
2. Choose **Load Temporary Add-on...**
3. Select `manifest.json`

Validate before submitting a pull request:

```bash
web-ext lint
node --check content.js
```

## Design principles

Changes should preserve these rules:

1. Direction belongs to the smallest semantic text surface that can be classified safely.
2. Do not force the entire ChatGPT UI or assistant-message wrapper to RTL.
3. Programming code, math, URLs, editors, and UI controls should remain isolated from surrounding RTL prose.
4. Avoid generated ChatGPT class names when a stable semantic/data attribute is available.
5. Keep runtime work incremental; do not rescan the entire conversation for every streamed token.
6. Do not add analytics, remote code, unnecessary permissions, or network calls.

## Pull requests

Keep pull requests focused. Explain the edge case being fixed and how you verified it.
