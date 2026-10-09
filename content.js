(() => {
  "use strict";

  /*
   * ChatGPT RTL Fix v3.3.0
   *
   * Direction is owned by the smallest semantic text surface. Message roots are
   * context only; they are never styled directly, so embedded UI controls do
   * not accidentally inherit RTL.
   */

  const ROOT_ATTR = "data-chatgpt-bidi-root";
  const USER_ATTR = "data-chatgpt-bidi-user";
  const SURFACE_ATTR = "data-chatgpt-bidi-surface";
  const SURFACE_CONTENT_ATTR = "data-chatgpt-bidi-surface-content";
  const BLOCK_ATTR = "data-chatgpt-bidi-block";
  const LIST_ATTR = "data-chatgpt-bidi-list";
  const LIST_ITEM_ATTR = "data-chatgpt-bidi-list-item";
  const TABLE_ATTR = "data-chatgpt-bidi-table";
  const INLINE_ATTR = "data-chatgpt-bidi-inline";
  const CODE_BODY_ATTR = "data-chatgpt-bidi-code-body";
  const COMPOSER_ATTR = "data-chatgpt-bidi-composer";

  const PRIMARY_ASSISTANT_SELECTOR = '[data-markdown-text-style="assistant-message"]';
  const FALLBACK_ASSISTANT_SELECTOR = [
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="assistant"]'
  ].join(",");

  // Current ChatGPT no longer always exposes data-message-author-role on user
  // bubbles. The search-unit key is stable in the current DOM and ends in :user.
  const USER_TEXT_SELECTOR = [
    '[data-content-search-unit-key$=":user"] .whitespace-pre-wrap',
    '[data-chatgpt-search-unit-key$=":user"] .whitespace-pre-wrap',
    '[data-message-author-role="user"] .whitespace-pre-wrap',
    '[data-testid="user-message"]',
    '[data-markdown-text-tone="user-message"]'
  ].join(",");

  const ALL_ROOT_SELECTOR = [
    PRIMARY_ASSISTANT_SELECTOR,
    FALLBACK_ASSISTANT_SELECTOR,
    USER_TEXT_SELECTOR
  ].join(",");

  const INDEPENDENT_SURFACE_SELECTOR = '[data-testid="chatgpt-writing-block"]';
  const SURFACE_CONTENT_SELECTOR = [
    '[contenteditable="true"][role="textbox"][aria-multiline="true"]',
    '[contenteditable="true"][role="textbox"]'
  ].join(",");

  const BLOCK_SELECTOR = [
    "p",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote",
    "dt", "dd",
    "figcaption",
    "summary",
    "th", "td"
  ].join(",");

  const LIST_SELECTOR = "ul,ol";
  const TABLE_SELECTOR = "table";
  const TABLE_WIDGET_SELECTOR = '[data-markdown-table="true"]';
  const INLINE_SELECTOR = 'a[href]';
  const CODE_BLOCK_SELECTOR = '[data-markdown-copy="code-block"]';
  const CODE_BODY_SELECTOR = '.chatgpt-code-scrollport';

  const PRIMARY_COMPOSER_SELECTOR = [
    "#prompt-textarea",
    '[data-testid="composer-text-input"]',
    '[data-testid="prompt-textarea"]',
    'textarea[data-testid*="prompt"]',
    'textarea[name="prompt"]',
    '[contenteditable="true"][role="textbox"][aria-label="Ask ChatGPT"]'
  ].join(",");

  const EXCLUDED_TEXT_ANCESTOR_SELECTOR = [
    "pre",
    CODE_BLOCK_SELECTOR,
    "math",
    ".katex",
    ".cm-editor",
    "button",
    "script",
    "style",
    "noscript",
    "template",
    "grammarly-extension",
    "superhuman-go-underlines",
    '[data-grammarly-shadow-root="true"]',
    '[data-testid="grammarly-vbars-field-mirror"]',
    '[data-testid="superhuman-go-underlines-scroll-mirror-container"]',
    '[data-markdown-copy="exclude"]',
    '[data-block-actions="true"]',
    '[aria-hidden="true"]',
    '[data-testid="chatgpt-citation"]',
    "[hidden]"
  ].join(",");

  const CODE_CONTEXT_SELECTOR = [
    "pre",
    CODE_BLOCK_SELECTOR,
    ".chatgpt-code-scrollport",
    ".cm-editor",
    ".cm-content",
    '[aria-label="Edit code"]'
  ].join(",");

  const RTL_CHAR = /(?:\p{Script=Arabic}|\p{Script=Hebrew})/u;
  const RTL_CHARS = /(?:\p{Script=Arabic}|\p{Script=Hebrew})/gu;
  const LATIN_CHAR = /\p{Script=Latin}/u;
  const LATIN_CHARS = /\p{Script=Latin}/gu;

  // Persian connective/grammar words are a better signal than the first
  // character for technical prose such as "Dijkstra و negative weight".
  const PERSIAN_GRAMMAR = /(?:^|[\s\u200c])(?:است|هست|هستم|هستی|هستیم|هستند|بود|باشد|باشه|باید|نباید|برای|که|را|در|از|به|با|این|اون|اگر|ولی|پس|چرا|چیه|چیست|کن|کنم|کنه|کنید|میشه|می\u200cشه|می‌شود|می\u200cشود|دارم|داره|داریم|دارند|و|یا|نه|روی|زیر|تا|هم|هر|یک|چند|وقتی|بعد|قبل)(?=$|[\s\u200c،؛,.!?؟:])/u;

  const URL_LIKE = /^(?:https?:\/\/|www\.|mailto:|tel:)/i;
  const URL_IN_TEXT = /(?:https?:\/\/|www\.)\S+|\b[\w.+-]+@[\w.-]+\.\w+\b/giu;
  const ASCII_DIAGRAM = /[│├└┬┼┤┐┘┌─]{2,}/u;

  const pendingRoots = new Set();
  const pendingSurfaces = new Set();
  const pendingBlocks = new Set();
  const pendingLists = new Set();
  const pendingTables = new Set();
  const pendingInlines = new Set();
  const pendingCodeBlocks = new Set();
  let rafId = 0;

  function countMatches(text, regex) {
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  function normalizeForDirection(text) {
    return (text || "")
      .replace(URL_IN_TEXT, " ")
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function firstStrongDirection(text) {
    for (const char of text) {
      if (RTL_CHAR.test(char)) return "rtl";
      if (LATIN_CHAR.test(char)) return "ltr";
    }
    return null;
  }

  function detectDirection(rawText, contextDirection = null) {
    const text = normalizeForDirection(rawText);
    if (!text) return contextDirection || "ltr";

    const rtl = countMatches(text, RTL_CHARS);
    if (rtl === 0) return "ltr";

    const latin = countMatches(text, LATIN_CHARS);
    if (latin === 0) return "rtl";

    const first = firstStrongDirection(text);
    const ratio = rtl / (rtl + latin);

    if (first === "rtl") return "rtl";
    if (PERSIAN_GRAMMAR.test(text)) return "rtl";
    if (ratio >= 0.35) return "rtl";
    if (rtl >= 4 && ratio >= 0.12) return "rtl";
    if (contextDirection === "rtl" && rtl >= 2 && ratio >= 0.08) return "rtl";

    return "ltr";
  }

  function isIndependentSurface(element) {
    return element?.matches?.(INDEPENDENT_SURFACE_SELECTOR) || false;
  }

  function closestIndependentSurface(node) {
    const element = node instanceof Element ? node : node?.parentElement;
    return element?.closest?.(INDEPENDENT_SURFACE_SELECTOR) || null;
  }

  function shouldIgnoreTextNode(node, boundary) {
    let element = node.parentElement;
    while (element && element !== boundary) {
      if (element.matches?.(EXCLUDED_TEXT_ANCESTOR_SELECTOR)) return true;
      if (element.matches?.(INDEPENDENT_SURFACE_SELECTOR)) return true;
      element = element.parentElement;
    }
    return false;
  }

  function collectDirectionalText(element, limit = 12000) {
    if (!(element instanceof Element)) return "";
    const chunks = [];
    let size = 0;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      if (shouldIgnoreTextNode(node, element)) continue;
      const value = node.nodeValue?.trim();
      if (!value) continue;
      chunks.push(value);
      size += value.length;
      if (size >= limit) break;
    }
    return chunks.join(" ");
  }

  function collectSurfaceText(element, limit = 20000) {
    if (!(element instanceof Element)) return "";
    const chunks = [];
    let size = 0;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      let ancestor = node.parentElement;
      let excluded = false;
      while (ancestor && ancestor !== element) {
        if (ancestor.matches?.(EXCLUDED_TEXT_ANCESTOR_SELECTOR)) {
          excluded = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (excluded) continue;
      const value = node.nodeValue?.trim();
      if (!value) continue;
      chunks.push(value);
      size += value.length;
      if (size >= limit) break;
    }
    return chunks.join(" ");
  }

  function canonicalRootFrom(node) {
    const element = node instanceof Element ? node : node?.parentElement;
    if (!element) return null;

    const primary = element.closest(PRIMARY_ASSISTANT_SELECTOR);
    if (primary) return primary;

    const user = element.closest(USER_TEXT_SELECTOR);
    if (user) return user;

    return element.closest(FALLBACK_ASSISTANT_SELECTOR);
  }

  function isNestedFallbackRoot(root) {
    return root.matches(FALLBACK_ASSISTANT_SELECTOR) &&
      root.querySelector(PRIMARY_ASSISTANT_SELECTOR) !== null;
  }

  function rootDirection(root) {
    const detected = detectDirection(collectDirectionalText(root));
    root.setAttribute(ROOT_ATTR, detected);
    return detected;
  }

  function surfaceContent(surface) {
    if (!(surface instanceof Element)) return null;
    return surface.querySelector(SURFACE_CONTENT_SELECTOR) || surface;
  }

  function surfaceDirection(surface) {
    const content = surfaceContent(surface);
    return detectDirection(collectSurfaceText(content || surface));
  }

  function semanticContextFor(element) {
    const surface = closestIndependentSurface(element);
    if (surface) {
      return surface.getAttribute(SURFACE_ATTR) || surfaceDirection(surface);
    }
    const root = canonicalRootFrom(element);
    return root?.getAttribute(ROOT_ATTR) || (root ? rootDirection(root) : "ltr");
  }

  function isInsideCodeContext(element) {
    return element.closest(CODE_CONTEXT_SELECTOR) !== null;
  }

  function processBlock(block, contextDirection = null) {
    if (!(block instanceof HTMLElement) || !block.isConnected) return;
    if (isInsideCodeContext(block)) return;
    const context = contextDirection || semanticContextFor(block);
    const dir = detectDirection(collectDirectionalText(block, 4000), context);
    block.setAttribute(BLOCK_ATTR, dir);
  }

  function directListItems(list) {
    return Array.from(list.children).filter((child) => child.tagName === "LI");
  }

  function processList(list, contextDirection = null) {
    if (!(list instanceof HTMLElement) || !list.isConnected) return;
    if (isInsideCodeContext(list)) return;

    const context = contextDirection || semanticContextFor(list);
    const items = directListItems(list);
    const itemDirections = items.map((item) => {
      const text = collectDirectionalText(item, 3000);
      return { item, text, dir: detectDirection(text, context) };
    });

    let dir;
    if (!itemDirections.length) {
      dir = detectDirection(collectDirectionalText(list, 5000), context);
    } else {
      const dirs = new Set(itemDirections.map((entry) => entry.dir));
      dir = dirs.size === 1 ? itemDirections[0].dir : context;
    }

    list.setAttribute(LIST_ATTR, dir);

    // Preserve one marker side for the whole list. If an item's own base
    // direction differs, plaintext fixes English punctuation/order without
    // moving its bullet to the opposite side. When first-strong disagrees with
    // semantic direction, force the item direction as a rare fallback.
    for (const { item, text, dir: itemDir } of itemDirections) {
      item.removeAttribute(LIST_ATTR); // cleanup from v3.1
      item.removeAttribute(LIST_ITEM_ATTR);
      if (itemDir === dir) continue;
      const first = firstStrongDirection(normalizeForDirection(text));
      item.setAttribute(LIST_ITEM_ATTR, first === itemDir ? "plaintext" : itemDir);
    }
  }

  function processTable(table, contextDirection = null) {
    if (!(table instanceof HTMLElement) || !table.isConnected) return;
    if (isInsideCodeContext(table)) return;
    const context = contextDirection || semanticContextFor(table);
    const dir = detectDirection(collectDirectionalText(table, 8000), context);
    table.setAttribute(TABLE_ATTR, dir);
  }

  function processInline(anchor) {
    if (!(anchor instanceof HTMLElement) || !anchor.isConnected) return;
    if (isInsideCodeContext(anchor)) return;
    const text = (anchor.textContent || "").trim();
    if (!text) {
      anchor.removeAttribute(INLINE_ATTR);
      return;
    }
    const href = anchor.getAttribute("href") || "";
    const looksLikeURL = URL_LIKE.test(text) || URL_LIKE.test(href);
    anchor.setAttribute(INLINE_ATTR, looksLikeURL ? "ltr" : detectDirection(text));
  }

  function codeHeaderLabel(codeBlock) {
    const header = codeBlock.querySelector(':scope > [data-markdown-copy="exclude"]');
    return (header?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function codeBody(codeBlock) {
    return codeBlock.querySelector(CODE_BODY_SELECTOR);
  }

  function processCodeBlock(codeBlock) {
    if (!(codeBlock instanceof HTMLElement) || !codeBlock.isConnected) return;
    const body = codeBody(codeBlock);
    if (!(body instanceof HTMLElement)) return;

    const label = codeHeaderLabel(codeBlock);
    const isPlainText = /^Plain text$/i.test(label);
    const text = (body.textContent || "").trim();

    // Programming-language blocks and editable CodeMirror panes are always LTR.
    // Only ChatGPT's "Plain text" block is allowed to become RTL.
    let dir = "ltr";
    if (isPlainText && RTL_CHAR.test(text) && !ASCII_DIAGRAM.test(text)) {
      dir = detectDirection(text, semanticContextFor(codeBlock));
    }
    body.setAttribute(CODE_BODY_ATTR, dir);
  }

  function belongsToSurface(element, surface) {
    return closestIndependentSurface(element) === surface;
  }

  function processSurface(surface) {
    if (!(surface instanceof HTMLElement) || !surface.isConnected) return;
    const content = surfaceContent(surface);
    const context = surfaceDirection(surface);
    surface.setAttribute(SURFACE_ATTR, context);
    if (content instanceof HTMLElement) content.setAttribute(SURFACE_CONTENT_ATTR, context);

    surface.querySelectorAll(BLOCK_SELECTOR).forEach((block) => {
      if (belongsToSurface(block, surface)) processBlock(block, context);
    });
    surface.querySelectorAll(LIST_SELECTOR).forEach((list) => {
      if (belongsToSurface(list, surface)) processList(list, context);
    });
    surface.querySelectorAll(TABLE_SELECTOR).forEach((table) => {
      if (belongsToSurface(table, surface)) processTable(table, context);
    });
    surface.querySelectorAll(INLINE_SELECTOR).forEach((inline) => {
      if (belongsToSurface(inline, surface)) processInline(inline);
    });
    surface.querySelectorAll(CODE_BLOCK_SELECTOR).forEach((block) => {
      if (belongsToSurface(block, surface)) processCodeBlock(block);
    });
  }

  function processRoot(root) {
    if (!(root instanceof HTMLElement) || !root.isConnected) return;
    if (isNestedFallbackRoot(root)) return;

    const context = rootDirection(root);

    if (root.matches(USER_TEXT_SELECTOR)) {
      root.setAttribute(USER_ATTR, context);
      root.querySelectorAll(INLINE_SELECTOR).forEach(processInline);
      return;
    }

    root.querySelectorAll(INDEPENDENT_SURFACE_SELECTOR).forEach(processSurface);

    root.querySelectorAll(BLOCK_SELECTOR).forEach((block) => {
      if (!closestIndependentSurface(block)) processBlock(block, context);
    });
    root.querySelectorAll(LIST_SELECTOR).forEach((list) => {
      if (!closestIndependentSurface(list)) processList(list, context);
    });
    root.querySelectorAll(TABLE_SELECTOR).forEach((table) => {
      if (!closestIndependentSurface(table)) processTable(table, context);
    });
    root.querySelectorAll(INLINE_SELECTOR).forEach((inline) => {
      if (!closestIndependentSurface(inline)) processInline(inline);
    });
    root.querySelectorAll(CODE_BLOCK_SELECTOR).forEach((block) => {
      if (!closestIndependentSurface(block)) processCodeBlock(block);
    });
  }

  function queueFlush() {
    if (!rafId) rafId = requestAnimationFrame(flush);
  }
  function queue(set, element) {
    if (!(element instanceof HTMLElement)) return;
    set.add(element);
    queueFlush();
  }
  const queueRoot = (x) => queue(pendingRoots, x);
  const queueSurface = (x) => queue(pendingSurfaces, x);
  const queueBlock = (x) => queue(pendingBlocks, x);
  const queueList = (x) => queue(pendingLists, x);
  const queueTable = (x) => queue(pendingTables, x);
  const queueInline = (x) => queue(pendingInlines, x);
  const queueCodeBlock = (x) => queue(pendingCodeBlocks, x);

  function flush() {
    rafId = 0;
    for (const root of pendingRoots) processRoot(root);
    pendingRoots.clear();
    for (const surface of pendingSurfaces) processSurface(surface);
    pendingSurfaces.clear();
    for (const block of pendingBlocks) processBlock(block);
    pendingBlocks.clear();
    for (const list of pendingLists) processList(list);
    pendingLists.clear();
    for (const table of pendingTables) processTable(table);
    pendingTables.clear();
    for (const inline of pendingInlines) processInline(inline);
    pendingInlines.clear();
    for (const block of pendingCodeBlocks) processCodeBlock(block);
    pendingCodeBlocks.clear();
  }

  function closest(node, selector) {
    const element = node instanceof Element ? node : node?.parentElement;
    return element?.closest(selector) || null;
  }

  function inspectChangedNode(node) {
    const surface = closestIndependentSurface(node);
    if (surface) {
      queueSurface(surface);
      return;
    }

    const root = canonicalRootFrom(node);
    if (!root) {
      if (node instanceof Element) {
        if (node.matches(ALL_ROOT_SELECTOR)) queueRoot(node);
        node.querySelectorAll?.(ALL_ROOT_SELECTOR).forEach((candidate) => {
          if (!isNestedFallbackRoot(candidate)) queueRoot(candidate);
        });
        if (node.matches(INDEPENDENT_SURFACE_SELECTOR)) queueSurface(node);
        node.querySelectorAll?.(INDEPENDENT_SURFACE_SELECTOR).forEach(queueSurface);
      }
      return;
    }

    if (node instanceof Element) {
      if (node.matches(INDEPENDENT_SURFACE_SELECTOR)) queueSurface(node);
      node.querySelectorAll?.(INDEPENDENT_SURFACE_SELECTOR).forEach(queueSurface);

      if (node.matches(BLOCK_SELECTOR)) queueBlock(node);
      node.querySelectorAll?.(BLOCK_SELECTOR).forEach((block) => {
        if (!closestIndependentSurface(block)) queueBlock(block);
      });

      if (node.matches(LIST_SELECTOR)) queueList(node);
      node.querySelectorAll?.(LIST_SELECTOR).forEach((list) => {
        if (!closestIndependentSurface(list)) queueList(list);
      });

      if (node.matches(TABLE_SELECTOR)) queueTable(node);
      node.querySelectorAll?.(TABLE_SELECTOR).forEach((table) => {
        if (!closestIndependentSurface(table)) queueTable(table);
      });

      if (node.matches(INLINE_SELECTOR)) queueInline(node);
      node.querySelectorAll?.(INLINE_SELECTOR).forEach((inline) => {
        if (!closestIndependentSurface(inline)) queueInline(inline);
      });

      if (node.matches(CODE_BLOCK_SELECTOR)) queueCodeBlock(node);
      node.querySelectorAll?.(CODE_BLOCK_SELECTOR).forEach((block) => {
        if (!closestIndependentSurface(block)) queueCodeBlock(block);
      });
    }

    const block = closest(node, BLOCK_SELECTOR);
    if (block && !closestIndependentSurface(block)) queueBlock(block);
    const list = closest(node, LIST_SELECTOR);
    if (list && !closestIndependentSurface(list)) queueList(list);
    const table = closest(node, TABLE_SELECTOR);
    if (table && !closestIndependentSurface(table)) queueTable(table);
    const inline = closest(node, INLINE_SELECTOR);
    if (inline && !closestIndependentSurface(inline)) queueInline(inline);
    const codeBlock = closest(node, CODE_BLOCK_SELECTOR);
    if (codeBlock && !closestIndependentSurface(codeBlock)) queueCodeBlock(codeBlock);

    // Re-scan the whole message only while an LTR/unknown streaming root may
    // still become RTL. Once the root is RTL, block-level updates are enough.
    const rootDir = root.getAttribute(ROOT_ATTR);
    const changedText = node?.nodeType === Node.TEXT_NODE
      ? (node.nodeValue || "")
      : (node instanceof Element ? (node.textContent || "") : "");
    if (!rootDir || (rootDir !== "rtl" && RTL_CHAR.test(changedText))) {
      queueRoot(root);
    }
  }

  function cleanupExistingState() {
    const attrs = [
      ROOT_ATTR, USER_ATTR, SURFACE_ATTR, SURFACE_CONTENT_ATTR, BLOCK_ATTR,
      LIST_ATTR, LIST_ITEM_ATTR, TABLE_ATTR, INLINE_ATTR, CODE_BODY_ATTR,
      COMPOSER_ATTR,
      "data-chatgpt-rtl-root", "data-chatgpt-rtl-fix", "data-chatgpt-rtl",
      "data-chatgpt-rtl-composer", "data-chatgpt-ltr-isolate"
    ];
    const selectors = attrs.map((attr) => `[${attr}]`).join(",");

    document.querySelectorAll(selectors).forEach((element) => {
      const hadLegacyDirMarker =
        element.hasAttribute("data-chatgpt-rtl-root") ||
        element.hasAttribute("data-chatgpt-rtl-fix") ||
        element.hasAttribute("data-chatgpt-rtl") ||
        element.hasAttribute("data-chatgpt-rtl-composer");

      if (hadLegacyDirMarker && element.getAttribute("dir") === "rtl") {
        element.setAttribute("dir", "auto");
      }
      for (const attr of attrs) element.removeAttribute(attr);
    });
  }

  function scanExistingMessages() {
    document.querySelectorAll(PRIMARY_ASSISTANT_SELECTOR).forEach(queueRoot);
    document.querySelectorAll(FALLBACK_ASSISTANT_SELECTOR).forEach((root) => {
      if (!isNestedFallbackRoot(root)) queueRoot(root);
    });
    document.querySelectorAll(USER_TEXT_SELECTOR).forEach(queueRoot);
    document.querySelectorAll(INDEPENDENT_SURFACE_SELECTOR).forEach(queueSurface);
  }

  function getElementText(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return element.value || "";
    }
    return element.textContent || "";
  }

  function isCodeEditor(element) {
    return Boolean(
      element.closest(CODE_CONTEXT_SELECTOR) ||
      element.matches(".cm-content") ||
      /edit code/i.test(element.getAttribute("aria-label") || "")
    );
  }

  function findComposer(target) {
    if (!(target instanceof Element)) return null;
    if (target.closest(INDEPENDENT_SURFACE_SELECTOR)) return null;

    const primary = target.matches(PRIMARY_COMPOSER_SELECTOR)
      ? target
      : target.closest(PRIMARY_COMPOSER_SELECTOR);
    if (primary && !isCodeEditor(primary)) return primary;

    const editable = target.matches('[contenteditable="true"][role="textbox"],textarea')
      ? target
      : target.closest('[contenteditable="true"][role="textbox"],textarea');
    if (!editable || isCodeEditor(editable)) return null;
    if (editable.closest(INDEPENDENT_SURFACE_SELECTOR)) return null;
    if (!editable.closest("form")) return null;
    return editable;
  }

  function updateComposer(composer) {
    if (!(composer instanceof HTMLElement) || !composer.isConnected) return;
    const dir = detectDirection(getElementText(composer));
    if (dir === "rtl") composer.setAttribute(COMPOSER_ATTR, "rtl");
    else composer.removeAttribute(COMPOSER_ATTR);
  }

  function scanComposers() {
    const candidates = new Set(document.querySelectorAll(PRIMARY_COMPOSER_SELECTOR));
    document.querySelectorAll('form [contenteditable="true"][role="textbox"], form textarea')
      .forEach((element) => candidates.add(element));
    for (const composer of candidates) {
      if (!isCodeEditor(composer) && !composer.closest(INDEPENDENT_SURFACE_SELECTOR)) {
        updateComposer(composer);
      }
    }
  }

  cleanupExistingState();
  scanExistingMessages();
  scanComposers();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") {
        inspectChangedNode(record.target);
        continue;
      }
      for (const node of record.addedNodes) inspectChangedNode(node);
    }
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true
  });

  document.addEventListener("input", (event) => {
    const surface = closestIndependentSurface(event.target);
    if (surface) {
      queueSurface(surface);
      return;
    }
    const composer = findComposer(event.target);
    if (composer) updateComposer(composer);
  }, true);

  document.addEventListener("focusin", (event) => {
    const composer = findComposer(event.target);
    if (composer) updateComposer(composer);
  }, true);
})();
