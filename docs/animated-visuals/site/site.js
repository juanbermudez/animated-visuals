/* Docs site chrome: the theme picker, code blocks (highlight, copy, live source), small helpers.
   Themes are applied the same way the runtime's FS.setTheme / FS.setMode do (attributes on <html>), so
   this file also works on pages that load no figures. */
(() => {
  const root = document.documentElement;
  const KEY = "av-theme";
  const THEMES = window.AV_THEMES || [];
  const byId = new Map(THEMES.map((t) => [t.id, t]));

  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(id) { try { localStorage.setItem(KEY, id); } catch { /* private mode: the choice lasts this page only */ } },
  };
  const systemLight = matchMedia("(prefers-color-scheme: light)");

  /** The theme in effect: the stored choice, or Default in the system's mode. */
  function currentId() {
    const id = store.get();
    if (id && byId.has(id)) return id;
    return systemLight.matches ? "default-light" : "default";
  }

  function apply(id) {
    // Mode and palette change in the same task, so one tween carries both.
    if (id === "default" || id === "default-light") {
      delete root.dataset.fsTheme;
      root.dataset.fsMode = id === "default-light" ? "light" : "dark";
    } else {
      delete root.dataset.fsMode;
      root.dataset.fsTheme = id;
    }
    store.set(id);
    syncButton();
    document.dispatchEvent(new CustomEvent("av:theme", { detail: id }));
  }
  window.AV = Object.assign(window.AV || {}, { applyTheme: apply, currentTheme: currentId, themes: THEMES });

  const ICON = {
    sun: '<svg class="ico ico-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
    moon: '<svg class="ico ico-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    check: '<svg class="tp-check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    copy: '<svg class="ico ico-copy" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>',
    done: '<svg class="ico ico-done" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  };

  // ---------- theme button ----------
  const button = document.querySelector(".theme-btn");
  function modeOf(id) { return byId.get(id)?.mode || (getComputedStyle(root).colorScheme.includes("light") ? "light" : "dark"); }
  function syncButton() {
    if (!button) return;
    const id = currentId();
    const mode = modeOf(id);
    button.dataset.mode = mode;
    const name = byId.get(id)?.name || "Default";
    button.setAttribute("aria-label", `Theme: ${name}, ${mode}. Change theme`);
    button.title = `Theme: ${name}`;
  }
  systemLight.addEventListener("change", () => { if (!store.get()) syncButton(); });

  // ---------- picker: a combobox over a grouped listbox ----------
  let panel = null;
  let input = null;
  let list = null;
  let options = [];
  let active = -1;
  const native = typeof HTMLElement.prototype.showPopover === "function";

  function build() {
    panel = document.createElement("div");
    panel.className = "theme-panel";
    panel.id = "theme-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Choose a theme");
    if (native) panel.popover = "auto";
    panel.innerHTML = `<label class="tp-search">${ICON.search}<span class="sr-only">Search themes</span><input type="text" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="tp-list" autocomplete="off" spellcheck="false" placeholder="Search ${THEMES.length} themes"></label><div class="tp-list" id="tp-list" role="listbox" aria-label="Themes"></div><div class="tp-foot">↑ ↓ to move, Enter to choose, Esc to close</div>`;
    input = panel.querySelector("input");
    list = panel.querySelector(".tp-list");
    const groups = [
      ["Light themes", THEMES.filter((t) => t.mode === "light")],
      ["Dark themes", THEMES.filter((t) => t.mode === "dark")],
    ];
    for (const [label, items] of groups) {
      const group = document.createElement("div");
      group.setAttribute("role", "group");
      const gid = `tp-g-${label.toLowerCase().replace(/\W+/g, "-")}`;
      group.setAttribute("aria-labelledby", gid);
      group.innerHTML = `<div class="tp-group" id="${gid}">${label}</div>`;
      for (const t of items) {
        const o = document.createElement("div");
        o.className = "tp-option";
        o.id = `tp-o-${t.id}`;
        o.setAttribute("role", "option");
        o.dataset.id = t.id;
        o.dataset.search = `${t.name} ${t.id} ${t.mode} ${t.family}`.toLowerCase();
        o.innerHTML = `<span class="swatch" data-fs-theme="${t.attr}" aria-hidden="true"><i></i><i></i><i></i></span><span class="tp-name">${t.name}</span>${ICON.check}`;
        o.addEventListener("pointermove", () => setActive(options.indexOf(o), false));
        o.addEventListener("click", () => choose(t.id));
        group.append(o);
      }
      list.append(group);
    }
    const empty = document.createElement("div");
    empty.className = "tp-empty";
    empty.hidden = true;
    empty.textContent = "No theme matches.";
    list.append(empty);
    document.body.append(panel);

    input.addEventListener("input", filter);
    input.addEventListener("keydown", onKey);
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); close(true); } });
    if (native) panel.addEventListener("toggle", (e) => { if (e.newState === "closed") closed(); });
    else document.addEventListener("pointerdown", (e) => { if (isOpen() && !panel.contains(e.target) && !button.contains(e.target)) close(false); });
    panel.addEventListener("focusout", (e) => { if (isOpen() && e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== button) close(false); });
  }

  const visible = () => options.filter((o) => !o.hidden);
  function setActive(i, scroll = true) {
    const shown = visible();
    options.forEach((o) => o.removeAttribute("data-active"));
    active = i;
    const o = options[i];
    if (!o || o.hidden) { input.removeAttribute("aria-activedescendant"); active = -1; return; }
    o.dataset.active = "";
    input.setAttribute("aria-activedescendant", o.id);
    if (scroll) o.scrollIntoView({ block: "nearest" });
    if (!shown.length) active = -1;
  }
  function filter() {
    const q = input.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    for (const o of options) o.hidden = !words.every((w) => o.dataset.search.includes(w));
    for (const g of list.querySelectorAll('[role="group"]')) g.hidden = !g.querySelector(".tp-option:not([hidden])");
    const shown = visible();
    list.querySelector(".tp-empty").hidden = shown.length > 0;
    const keep = shown.indexOf(options[active]);
    setActive(keep >= 0 && !q ? active : options.indexOf(shown[0]));
  }
  function onKey(e) {
    const shown = visible();
    const at = shown.indexOf(options[active]);
    let next = null;
    if (e.key === "ArrowDown") next = shown[Math.min(shown.length - 1, at + 1)];
    else if (e.key === "ArrowUp") next = shown[Math.max(0, at - 1)];
    else if (e.key === "PageDown") next = shown[Math.min(shown.length - 1, at + 8)];
    else if (e.key === "PageUp") next = shown[Math.max(0, at - 8)];
    else if ((e.key === "Home" || e.key === "End") && e.altKey) next = e.key === "Home" ? shown[0] : shown[shown.length - 1];
    else if (e.key === "Enter") {
      e.preventDefault();
      if (options[active] && !options[active].hidden) choose(options[active].dataset.id);
      return;
    } else if (e.key === "Tab") { close(false); return; }
    if (next) { e.preventDefault(); setActive(options.indexOf(next)); }
  }
  function choose(id) {
    apply(id);
    markSelected();
    close(true);
  }
  function markSelected() {
    const id = currentId();
    for (const o of options) o.setAttribute("aria-selected", String(o.dataset.id === id));
  }
  const isOpen = () => !!panel && (native ? panel.matches(":popover-open") : panel.classList.contains("is-open"));
  function place() {
    const r = button.getBoundingClientRect();
    const w = panel.offsetWidth || 312;
    panel.style.top = `${Math.round(r.bottom + 8)}px`;
    panel.style.left = `${Math.round(Math.max(12, Math.min(r.right - w, innerWidth - w - 12)))}px`;
  }
  function open() {
    if (!panel) { build(); options = [...panel.querySelectorAll(".tp-option")]; }
    input.value = "";
    filter();
    markSelected();
    if (native) panel.showPopover();
    else panel.classList.add("is-open");
    place();
    setActive(options.findIndex((o) => o.dataset.id === currentId()));
    button.setAttribute("aria-expanded", "true");
    input.focus({ preventScroll: true });
    addEventListener("resize", place);
  }
  function closed() {
    button.setAttribute("aria-expanded", "false");
    removeEventListener("resize", place);
  }
  function close(returnFocus) {
    if (!isOpen()) return;
    if (native) panel.hidePopover();
    else panel.classList.remove("is-open");
    closed();
    if (returnFocus) button.focus({ preventScroll: true });
  }
  if (button) {
    button.innerHTML = ICON.sun + ICON.moon;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "theme-panel");
    button.setAttribute("aria-expanded", "false");
    // pointerdown on the button would light-dismiss the popover before click reopens it; ignore that close.
    let wasOpen = false;
    button.addEventListener("pointerdown", () => { wasOpen = isOpen(); });
    button.addEventListener("click", () => {
      if (wasOpen || isOpen()) { wasOpen = false; close(true); return; }
      open();
    });
    syncButton();
  }

  // ---------- code blocks: live source, highlighting, copy ----------
  // highlight:start (injected from skills/animated-visuals/assets/highlight.js by sync.mjs; do not edit here)
  /* Dependency-free syntax highlighting for code blocks, shared by the docs site and by guides built on the skill.
     AV.highlight(src, lang) returns HTML with <span class="tok-k|s|n|c|p"> tokens (keyword, string, number, comment,
     property). AV.enhanceCode(root) highlights every <pre><code class="language-*"> under root, wraps it in a .code
     block and adds a copy button. Languages: js, ts, tsx, python, shell, json, html, css; anything else is plain. */
  (function (global) {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const JS_KEYWORDS = new Set("const let var function return new if else for of in while do switch case break continue true false null undefined this typeof instanceof await async import export from default class extends try catch finally throw yield delete void with get set static".split(" "));
    const TS_KEYWORDS = new Set([...JS_KEYWORDS, ..."interface type enum namespace declare implements private protected public readonly abstract as satisfies keyof infer unknown never any boolean number string object symbol bigint override".split(" ")]);
    const PY_KEYWORDS = new Set("and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield match case".split(" "));
    const SH_KEYWORDS = new Set("if then else elif fi for while until do done case esac function in select time coproc true false".split(" "));
    const token = (kind, text) => '<span class="tok-' + kind + '">' + esc(text) + "</span>";

    function scan(src, rules) {
      let out = "";
      let i = 0;
      while (i < src.length) {
        const rest = src.slice(i);
        let found = false;
        for (const [pattern, kind] of rules) {
          const match = pattern.exec(rest);
          if (!match) continue;
          const next = src.slice(i + match[0].length);
          const resolved = typeof kind === "function" ? kind(match[0], next, i, src) : kind;
          out += resolved ? token(resolved, match[0]) : esc(match[0]);
          i += match[0].length;
          found = true;
          break;
        }
        if (!found) {
          out += esc(src[i]);
          i += 1;
        }
      }
      return out;
    }

    /** Small, dependency-free tokenizers. Unknown languages use escaped plain text. */
    function highlight(src, lang) {
      const name = ({ javascript: "js", typescript: "ts", py: "python", bash: "shell", sh: "shell" })[lang] || lang;
      const number = [/^(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i, "n"];
      const quoted = [/^(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/, "s"];
      if (name === "html") return scan(src, [
        [/^<!--[\s\S]*?(?:-->|$)/, "c"],
        [/^<!doctype[^>]*>/i, "k"],
        [/^<\/?[A-Za-z][\w:-]*/, "k"],
        [/^[A-Za-z_:][\w:.-]*(?=\s*=)/, "p"],
        quoted,
        number,
      ]);
      if (name === "css") return scan(src, [
        [/^\/\*[\s\S]*?(?:\*\/|$)/, "c"],
        quoted,
        [/^@[A-Za-z-]+/, "k"],
        [/^--[\w-]+/, "p"],
        [/^[A-Za-z-]+(?=\s*:)/, "p"],
        [/^#[\da-f]{3,8}\b/i, "n"],
        number,
      ]);
      if (name === "json") return scan(src, [
        [/^"(?:[^"\\\n]|\\.)*"/, (_, next) => /^\s*:/.test(next) ? "p" : "s"],
        [/^(?:true|false|null)\b/, "k"],
        [/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i, "n"],
      ]);
      if (name === "python") return scan(src, [
        [/^#[^\n]*/, "c"],
        [/^(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/, "s"],
        quoted,
        [/^@[A-Za-z_][\w.]*/, "p"],
        number,
        [/^[A-Za-z_]\w*/, (word) => PY_KEYWORDS.has(word) ? "k" : null],
      ]);
      if (name === "shell") return scan(src, [
        [/^#[^\n]*/, "c"],
        quoted,
        [/^\$(?:\{[^}]+\}|[A-Za-z_]\w*|[?#@*!$0-9-])/, "p"],
        [/^--?[\w-]+/, "p"],
        number,
        [/^[A-Za-z_][\w-]*/, (word, _, at, source) =>
          SH_KEYWORDS.has(word) || /(?:^|[\n;|&]\s*)$/.test(source.slice(0, at)) ? "k" : null
        ],
      ]);
      if (name === "js" || name === "ts" || name === "tsx") {
        const words = name === "js" ? JS_KEYWORDS : TS_KEYWORDS;
        return scan(src, [
          [/^\/\*[\s\S]*?(?:\*\/|$)/, "c"],
          [/^\/\/[^\n]*/, "c"],
          [/^(?:"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\x60(?:[^\x60\\]|\\.)*\x60)/, "s"],
          number,
          [/^[A-Za-z_$][\w$]*/, (word) => words.has(word) ? "k" : (name !== "js" && /^[A-Z]/.test(word) ? "p" : null)],
        ]);
      }
      return esc(src);
    }

    const ICON_COPY = '<svg class="ico ico-copy" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></svg>';
    const ICON_DONE = '<svg class="ico ico-done" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
    function enhanceCode(root) {
      (root || document).querySelectorAll("pre > code").forEach((code) => {
        let lang = /language-([^\s]+)/.exec(code.className)?.[1];
        if (!lang) { lang = "plain"; code.classList.add("language-plain"); }
        code.innerHTML = highlight(code.textContent, lang);
        const pre = code.parentElement;
        if (pre.parentElement.classList.contains("code")) return;
        const wrap = document.createElement("div");
        wrap.className = "code";
        pre.before(wrap);
        wrap.append(pre);
        const copy = document.createElement("button");
        copy.type = "button";
        copy.className = "icon-btn copy-btn";
        copy.setAttribute("aria-label", "Copy code");
        copy.innerHTML = ICON_COPY + ICON_DONE;
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(code.textContent);
            copy.dataset.copied = "";
            copy.setAttribute("aria-label", "Copied");
            setTimeout(() => { delete copy.dataset.copied; copy.setAttribute("aria-label", "Copy code"); }, 1400);
          } catch { copy.setAttribute("aria-label", "Copy failed: select the text instead"); }
        });
        wrap.append(copy);
      });
    }
    const AV = (global.AV = global.AV || {});
    AV.highlight = highlight;
    AV.enhanceCode = enhanceCode;
  })(typeof window !== "undefined" ? window : globalThis);
  // highlight:end
  function dedent(text) {
    const lines = text.replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
    const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)[0].length));
    return lines.map((l) => l.slice(indent)).join("\n");
  }
  // <pre data-source="id"> shows the text of the <script data-show="id"> or <style data-show="id"> that runs on this page.
  document.querySelectorAll("pre[data-source]").forEach((pre) => {
    const node = document.querySelector(`[data-show="${pre.dataset.source}"]`);
    if (!node) return;
    let text = dedent(node.textContent);
    // Demos are wrapped in a block for scope; the reader doesn't need the braces.
    if (node.tagName === "SCRIPT" && /^\{\n[\s\S]*\n\}$/.test(text)) text = dedent(text.slice(2, -2));
    const code = document.createElement("code");
    code.className = node.tagName === "STYLE" ? "language-css" : "language-js";
    code.textContent = text;
    pre.replaceChildren(code);
  });
  AV.enhanceCode();

  // Current page in the nav.
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach((a) => { if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page"); });
})();
