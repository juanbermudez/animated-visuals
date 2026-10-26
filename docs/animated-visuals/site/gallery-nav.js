/* Gallery sidebar: every diagram type, grouped. The link for the section in view is marked with
   aria-current and a sliding indicator; links jump straight to their section. Below 1000px the list
   collapses behind a toggle in a sticky bar. */
(() => {
  const aside = document.querySelector(".types-aside");
  const nav = document.getElementById("types-nav");
  if (!aside || !nav) return;
  const toggle = aside.querySelector(".types-toggle");
  const current = aside.querySelector(".types-current");
  const indicator = nav.querySelector(".types-indicator");
  const links = [...nav.querySelectorAll("a[href^='#']")];
  const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
  const head = document.querySelector(".site-head");
  const narrow = matchMedia("(max-width: 999px)");
  let active = null;

  // Sticky offsets depend on the header's real height, which wraps on phones.
  function offsets() {
    const h = head ? head.offsetHeight : 60;
    document.documentElement.style.setProperty("--head-h", `${h}px`);
    const bar = narrow.matches ? aside.offsetHeight : 0;
    document.documentElement.style.scrollPaddingTop = `${h + bar + 16}px`;
  }

  function place() {
    if (!active) { indicator.style.opacity = "0"; return; }
    indicator.style.opacity = "1";
    indicator.style.height = `${active.offsetHeight}px`;
    indicator.style.transform = `translateY(${active.offsetTop}px)`;
  }

  function setActive(link) {
    if (link === active) return;
    active?.removeAttribute("aria-current");
    active = link;
    if (!link) { place(); current.textContent = ""; return; }
    link.setAttribute("aria-current", "location");
    current.textContent = link.textContent;
    place();
    // Keep the active link visible inside the sidebar's own scroll, without scrolling the page.
    if (!narrow.matches && nav.scrollHeight > nav.clientHeight) {
      const top = link.offsetTop - nav.clientHeight / 3;
      nav.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    }
  }

  // The section in view: the last one whose top has passed a line a third of the way down the viewport.
  let ticking = false;
  function spy() {
    ticking = false;
    const line = innerHeight * 0.33;
    let pick = null;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= line) pick = links[i]; });
    setActive(pick || links[0]);
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });

  function open(on) {
    toggle.setAttribute("aria-expanded", String(on));
    aside.toggleAttribute("data-open", on);
    if (on) { place(); active?.focus({ preventScroll: true }); }
  }
  toggle.addEventListener("click", () => open(toggle.getAttribute("aria-expanded") !== "true"));
  aside.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && narrow.matches && aside.hasAttribute("data-open")) { open(false); toggle.focus(); }
  });
  document.addEventListener("pointerdown", (e) => { if (narrow.matches && aside.hasAttribute("data-open") && !aside.contains(e.target)) open(false); });

  links.forEach((link) => link.addEventListener("click", () => {
    setActive(link);
    if (narrow.matches) open(false);
    // Move focus to the section so keyboard users continue from there.
    const target = document.getElementById(link.hash.slice(1));
    if (target) { target.tabIndex = -1; requestAnimationFrame(() => target.focus({ preventScroll: true })); }
  }));

  addEventListener("resize", () => { offsets(); place(); });
  narrow.addEventListener("change", () => { open(false); offsets(); place(); });
  document.fonts?.ready.then(() => { offsets(); place(); });
  offsets();
  spy();
  // Slide only after the first placement, so the page does not open with a sweep.
  requestAnimationFrame(() => nav.classList.add("is-ready"));
})();
