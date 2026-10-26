(() => {
  const CONFIG = /*__THEME_CONFIG__*/;
  const root = document.documentElement;
  const KEY = "av-theme";
  const themes = [...CONFIG.themes, ...(Array.isArray(window.GUIDE_THEMES) ? window.GUIDE_THEMES : [])];
  const byId = new Map(themes.map((theme) => [theme.id, theme]));
  const systemLight = matchMedia("(prefers-color-scheme: light)");
  let active = null;
  let liveBb = false;
  let renderPicker = null;

  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(id) { try { localStorage.setItem(KEY, id); } catch { /* The choice lasts for this page in private mode. */ } },
  };

  function fallbackTheme() {
    return CONFIG.defaultTheme || (systemLight.matches ? "default-light" : "default");
  }

  function applyAttributes(id) {
    if (id === "default" || id === "default-light") {
      delete root.dataset.fsTheme;
      root.dataset.fsMode = id === "default-light" ? "light" : "dark";
    } else {
      delete root.dataset.fsMode;
      root.dataset.fsTheme = id;
    }
    active = id;
  }

  function applyTheme(id, persist = true) {
    const next = byId.has(id) ? id : fallbackTheme();
    applyAttributes(next);
    if (persist) store.set(next);
    renderPicker?.();
    document.dispatchEvent(new CustomEvent("av:theme", { detail: next }));
    return next;
  }

  const savedAtLoad = store.get();
  applyAttributes(savedAtLoad && byId.has(savedAtLoad) ? savedAtLoad : fallbackTheme());
  window.AV_THEMES = themes;
  window.AV = {
    applyTheme: (id) => applyTheme(id, true),
    currentTheme: () => active,
    themes,
  };

  function liveBridgeCss(mode) {
    const sign = mode === "light" ? "-" : "+";
    const toward = mode === "light" ? "black" : "white";
    return `[data-fs-theme="bb"] {
  color-scheme: ${mode};
  --fs-bg: var(--canvas);
  --fs-surface: var(--card);
  --fs-surface-2: var(--popover);
  --fs-block: color-mix(in oklch, var(--canvas) 88%, ${toward});
  --fs-block: oklch(from var(--canvas) calc(l ${sign} 0.057) c h);
  --fs-node: color-mix(in oklch, var(--card) 88%, ${toward});
  --fs-node: oklch(from var(--card) calc(l ${sign} 0.047) c h);
  --fs-line: color-mix(in oklch, var(--card) 86%, var(--ink));
  --fs-line-strong: color-mix(in oklch, var(--card) 74%, var(--ink));
  --fs-faint: color-mix(in oklch, var(--card) 52%, var(--ink));
  --fs-muted: var(--muted-foreground, var(--subtle-foreground));
  --fs-fg: var(--ink);
  --fs-strong: var(--heading-foreground, var(--ink));
  --fs-accent: var(--primary);
  --fs-link: var(--link-foreground, var(--primary));
  --fs-link-underline: var(--ring, var(--primary));
  --fs-c1: var(--ansi-2, var(--primary));
  --fs-c2: var(--ansi-3, var(--link-foreground, var(--primary)));
  --fs-c3: var(--ansi-4, var(--primary));
  --fs-c4: var(--ansi-5, var(--link-foreground, var(--primary)));
  --fs-c5: var(--ansi-6, var(--primary));
  --fs-c6: var(--ansi-7, var(--ink));
  --fs-good: var(--success, var(--diff-added, var(--primary)));
  --fs-bad: var(--destructive-text, var(--destructive, var(--ansi-1)));
}`;
  }

  function ensureLiveBb(mode) {
    let style = document.getElementById("guide-live-bb-theme");
    if (!style) {
      style = document.createElement("style");
      style.id = "guide-live-bb-theme";
      document.head.append(style);
    }
    style.textContent = liveBridgeCss(mode);
    if (!byId.has("bb")) {
      const theme = { id: "bb", name: "bb (current)", mode, family: "bb" };
      themes.push(theme);
      byId.set(theme.id, theme);
      renderPicker?.(true);
    } else {
      byId.get("bb").mode = mode;
    }
  }

  function probeBb() {
    const computed = getComputedStyle(root);
    if (!computed.getPropertyValue("--canvas").trim()) return;
    const mode = computed.colorScheme.includes("light") ? "light" : "dark";
    ensureLiveBb(mode);
    liveBb = true;
    const saved = store.get();
    if (saved && byId.has(saved)) {
      if (active !== saved) applyTheme(saved, false);
      return;
    }
    if (active !== "bb") applyTheme("bb", false);
  }

  function wirePicker() {
    const wrapper = document.querySelector("[data-guide-theme-picker]");
    const trigger = wrapper?.querySelector("[data-guide-theme-trigger]");
    const menu = wrapper?.querySelector("[data-guide-theme-menu]");
    if (!wrapper || !trigger || !menu) return;
    const check = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
    let items = [];

    renderPicker = (rebuild = false) => {
      if (rebuild || !menu.children.length) {
        menu.replaceChildren();
        ["dark", "light"].forEach((mode, groupIndex) => {
          const choices = themes.filter((theme) => theme.mode === mode);
          if (!choices.length) return;
          if (menu.children.length) {
            const separator = document.createElement("div");
            separator.className = "guide-theme-separator";
            separator.setAttribute("role", "separator");
            menu.append(separator);
          }
          const group = document.createElement("div");
          const labelId = `guide-theme-group-${groupIndex}`;
          group.setAttribute("role", "group");
          group.setAttribute("aria-labelledby", labelId);
          group.innerHTML = `<div class="guide-theme-label" id="${labelId}">${mode === "dark" ? "Dark" : "Light"}</div>`;
          for (const theme of choices) {
            const item = document.createElement("div");
            item.className = "guide-theme-item";
            item.setAttribute("role", "menuitemradio");
            item.tabIndex = -1;
            item.dataset.theme = theme.id;
            item.innerHTML = check;
            item.append(theme.name);
            group.append(item);
          }
          menu.append(group);
        });
        items = [...menu.querySelectorAll(".guide-theme-item")];
      }
      for (const item of items) item.setAttribute("aria-checked", String(item.dataset.theme === active));
      const theme = byId.get(active);
      trigger.setAttribute("aria-label", `Theme: ${theme?.name || active}. Change theme`);
      trigger.title = `Theme: ${theme?.name || active}`;
    };
    renderPicker(true);

    const isOpen = () => !menu.hidden;
    function open() {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      (items.find((item) => item.dataset.theme === active) ?? items[0])?.focus();
    }
    function close(refocus) {
      if (!isOpen()) return;
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (refocus) trigger.focus();
    }
    function choose(item) {
      applyTheme(item.dataset.theme, true);
      close(true);
    }

    trigger.addEventListener("click", () => (isOpen() ? close(true) : open()));
    trigger.addEventListener("keydown", (event) => {
      if (!["Enter", " ", "ArrowDown"].includes(event.key) || isOpen()) return;
      event.preventDefault();
      open();
    });
    menu.addEventListener("click", (event) => {
      const item = event.target.closest(".guide-theme-item");
      if (item) choose(item);
    });
    menu.addEventListener("pointermove", (event) => {
      const item = event.target.closest(".guide-theme-item");
      if (item && item !== document.activeElement) item.focus({ preventScroll: true });
    });
    document.addEventListener("pointerdown", (event) => {
      if (isOpen() && !event.target.closest("[data-guide-theme-picker]")) close(false);
    });

    let typed = "";
    let typedAt = 0;
    menu.addEventListener("keydown", (event) => {
      const at = items.indexOf(document.activeElement);
      const move = (index) => items[Math.max(0, Math.min(items.length - 1, index))]?.focus();
      if (event.key === "ArrowDown") move(at + 1);
      else if (event.key === "ArrowUp") move(at < 0 ? items.length - 1 : at - 1);
      else if (event.key === "Home") move(0);
      else if (event.key === "End") move(items.length - 1);
      else if (event.key === "Enter" || event.key === " ") { if (at >= 0) choose(items[at]); }
      else if (event.key === "Escape" || event.key === "Tab") close(true);
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        typed = event.timeStamp - typedAt > 500 ? event.key.toLowerCase() : typed + event.key.toLowerCase();
        typedAt = event.timeStamp;
        const query = /^(.)\1*$/.test(typed) ? typed[0] : typed;
        const start = query.length > 1 ? Math.max(at, 0) : at + 1;
        [...items.slice(start), ...items.slice(0, start)]
          .find((item) => item.textContent.trim().toLowerCase().startsWith(query))?.focus();
      } else return;
      event.preventDefault();
      event.stopPropagation();
    });
  }

  function start() {
    wirePicker();
    probeBb();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  new MutationObserver(probeBb).observe(root, { attributes: true, attributeFilter: ["style", "class"] });
  systemLight.addEventListener("change", () => {
    if (!store.get() && !CONFIG.defaultTheme && !liveBb) applyTheme(systemLight.matches ? "default-light" : "default", false);
  });
})();
