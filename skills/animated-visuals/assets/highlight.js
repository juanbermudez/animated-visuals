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
