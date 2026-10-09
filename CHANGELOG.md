# Changelog

All notable changes to ChatGPT RTL Fix are documented here.

## 3.3.0 — 2026-10-09

Public-ready release.

- Added public extension metadata and icon.
- Added privacy and project documentation.
- Preserved the v3.2 bidirectional rendering engine and edge-case fixes.
- Supports current ChatGPT user and assistant DOM structures.
- Handles mixed Persian/English paragraphs, lists, tables, and table cells.
- Keeps table action controls independent from content direction.
- Handles Persian prose inside ChatGPT Plain Text blocks while preserving real code and ASCII diagrams as LTR.
- Preserves independent direction for Writing Blocks.
- Supports the current ChatGPT composer and streamed responses.
- No data collection, storage, analytics, background scripts, third-party libraries, or network requests.

## 3.2.0 — 2026-10-06

- Moved direction ownership to the smallest semantic text surface instead of forcing the entire assistant message to RTL.
- Added mixed-list handling with stable bullet placement.
- Added mixed-table and per-cell direction handling.
- Added current user-message DOM fallbacks.
- Added current inline-code handling.
- Added Plain Text block classification.
- Added safeguards for ChatGPT UI chrome and third-party editing overlays.

## 3.1.0 — 2026-10-03

- Added Writing Block isolation.
- Prevented English Writing Blocks embedded in Persian answers from inheriting RTL.
- Improved English paragraph and list handling inside RTL conversations.

## 2.2.0 — 2026-09-28

- Switched to the current ChatGPT assistant-message root.
- Fixed mixed technical Persian sentences and URL isolation.
- Improved streaming performance with targeted MutationObserver updates.
