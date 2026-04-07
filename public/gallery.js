(function () {
  "use strict";

  /**
   * Google often returns 403 for drive.google.com/uc and usercontent download URLs when
   * embedding in a third-party site. Try lh3 (usercontent CDN) first, then thumbnail API.
   */
  function driveFullImageUrlCandidates(fileId) {
    const id = fileId.trim();
    const enc = encodeURIComponent(id);
    return [
      `https://lh3.googleusercontent.com/d/${id}=w2560`,
      `https://lh3.googleusercontent.com/d/${id}`,
      `https://drive.google.com/thumbnail?id=${enc}&sz=w2000`,
      `https://drive.google.com/thumbnail?id=${enc}&sz=w1000`,
    ];
  }

  /** Visible bitmap rect for an <img> with object-fit: contain (letterbox-aware). */
  function getObjectFitContainRect(img) {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const cr = img.getBoundingClientRect();
    if (!nw || !nh) return cr;
    const er = cr.width / cr.height;
    const ir = nw / nh;
    let rw;
    let rh;
    let left;
    let top;
    if (ir > er) {
      rw = cr.width;
      rh = cr.width / ir;
      left = cr.left;
      top = cr.top + (cr.height - rh) / 2;
    } else {
      rh = cr.height;
      rw = cr.height * ir;
      left = cr.left + (cr.width - rw) / 2;
      top = cr.top;
    }
    return new DOMRect(left, top, rw, rh);
  }

  function pointInRect(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function loadImageFromUrls(urls, onLoaded, onFailed) {
    let i = 0;
    function tryNext() {
      if (i >= urls.length) {
        onFailed();
        return;
      }
      const url = urls[i];
      i += 1;
      const probe = new Image();
      probe.onload = () => onLoaded(url);
      probe.onerror = tryNext;
      probe.referrerPolicy = "no-referrer";
      probe.src = url;
    }
    tryNext();
  }

  function createLightbox() {
    const root = document.createElement("div");
    root.id = "galerie-lightbox";
    root.className =
      "fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm pt-3 pb-[min(5vh,2rem)] px-[min(5vw,1.5rem)] opacity-0 pointer-events-none transition-opacity duration-200";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Detail fotografie");
    root.hidden = true;

    root.innerHTML = `
      <div class="galerie-lb-main flex flex-1 flex-col items-center justify-center min-h-0 min-w-0 w-full pt-2">
        <div class="galerie-lb-frame relative w-[min(90vw,100%)] h-[min(85dvh,calc(100svh-10rem))] max-h-[min(85vh,calc(100vh-10rem))] mx-auto shrink-0 cursor-default">
          <img class="galerie-lb-thumb absolute inset-0 h-full w-full object-contain rounded-lg shadow-2xl" alt="" decoding="async" />
          <img class="galerie-lb-full invisible absolute inset-0 h-full w-full object-contain rounded-lg shadow-2xl opacity-0 transition-opacity duration-300 pointer-events-none" alt="" decoding="async" />
        </div>
      </div>
      <div class="galerie-lb-toolbar relative z-[110] flex w-full shrink-0 items-stretch gap-0 px-[min(5vw,1.5rem)] pb-[min(3vh,1.25rem)] pt-2">
        <div class="galerie-lb-dismiss-side flex-1 min-h-12 min-w-[3rem]" role="presentation"></div>
        <div class="galerie-lb-controls flex shrink-0 items-center justify-center gap-2 self-center px-2 py-1">
          <button type="button" class="galerie-lb-prev inline-flex items-center justify-center w-11 h-11 rounded-lg bg-surface-container-high text-on-surface border border-outline/20 hover:bg-primary-container hover:text-white hover:border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container" aria-label="Předchozí fotografie">
            <span class="material-symbols-outlined text-xl" aria-hidden="true">chevron_left</span>
          </button>
          <button type="button" class="galerie-lb-next inline-flex items-center justify-center w-11 h-11 rounded-lg bg-surface-container-high text-on-surface border border-outline/20 hover:bg-primary-container hover:text-white hover:border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container" aria-label="Další fotografie">
            <span class="material-symbols-outlined text-xl" aria-hidden="true">chevron_right</span>
          </button>
          <button type="button" class="galerie-lb-close inline-flex items-center justify-center w-11 h-11 rounded-lg bg-surface-container-high text-on-surface border border-outline/20 hover:bg-primary-container hover:text-white hover:border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container" aria-label="Zavřít">
            <span class="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>
        <div class="galerie-lb-dismiss-side flex-1 min-h-12 min-w-[3rem]" role="presentation"></div>
      </div>
      <p class="galerie-lb-status pointer-events-none empty:hidden absolute left-1/2 top-1/2 z-[105] w-[min(calc(100vw-3rem),28rem)] max-w-md -translate-x-1/2 -translate-y-1/2 text-center text-sm font-medium leading-snug text-[#e5e2e1] [text-shadow:0_2px_12px_rgba(0,0,0,0.85)]" role="status" aria-live="polite"></p>
    `;

    document.body.appendChild(root);
    return root;
  }

  function getFocusables(container) {
    return [
      ...container.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  async function init() {
    const mount = document.getElementById("galerie-mount");
    const errEl = document.getElementById("galerie-error");
    if (!mount) return;

    let data;
    try {
      const res = await fetch("/gallery-data.json", { credentials: "same-origin" });
      if (!res.ok) throw new Error(String(res.status));
      data = await res.json();
    } catch {
      if (errEl) {
        errEl.textContent = "Galerii se nepodařilo načíst. Zkuste obnovit stránku.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    const fullFlat = [];
    for (const album of data.albums || []) {
      for (const item of album.items || []) {
        fullFlat.push(item);
      }
    }

    if (fullFlat.length === 0) {
      if (errEl) {
        errEl.textContent = "V galerii nejsou žádné fotografie.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    let compactFlat = (Array.isArray(data.compact) ? data.compact : [])
      .filter((x) => x && typeof x.thumb === "string")
      .slice(0, 4);
    if (compactFlat.length < 4) {
      const seen = new Set(compactFlat.map((x) => x.thumb));
      for (const it of fullFlat) {
        if (compactFlat.length >= 4) break;
        if (!seen.has(it.thumb)) {
          seen.add(it.thumb);
          compactFlat.push({ thumb: it.thumb, driveId: it.driveId || "", alt: it.alt || "" });
        }
      }
    }
    compactFlat = compactFlat.slice(0, 4);

    const leadEl = document.getElementById("galerie-lead");
    const hintEl = document.getElementById("galerie-hint");
    const galerieSection = document.getElementById("galerie");

    let flat = compactFlat;

    const THUMB_BTN_EXPANDED_CLASS =
      "group relative aspect-[4/3] rounded-lg overflow-hidden border border-outline/10 bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container shrink-0 w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-2.25rem)/4)] max-w-[18rem]";

    const THUMB_BTN_COMPACT_CLASS =
      "group relative aspect-[4/3] w-full min-w-0 rounded-lg overflow-hidden border border-outline/10 bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

    const lb = createLightbox();
    const lbThumb = lb.querySelector(".galerie-lb-thumb");
    const lbFull = lb.querySelector(".galerie-lb-full");
    const lbStatus = lb.querySelector(".galerie-lb-status");
    const btnClose = lb.querySelector(".galerie-lb-close");
    const btnPrev = lb.querySelector(".galerie-lb-prev");
    const btnNext = lb.querySelector(".galerie-lb-next");

    let current = 0;
    let lastFocus = null;
    let trapHandler = null;
    /** Bumped on every slide change so stale async image loads cannot update the UI. */
    let fullLoadGeneration = 0;

    function updateNavButtons() {
      btnPrev.hidden = flat.length <= 1;
      btnNext.hidden = flat.length <= 1;
    }

    function revealFullLayer(url, item, gen) {
      if (gen !== fullLoadGeneration) return;
      lbFull.referrerPolicy = "no-referrer";
      lbFull.alt = "";
      lbFull.classList.add("opacity-0", "invisible");
      lbFull.src = url;

      const show = () => {
        if (gen !== fullLoadGeneration) return;
        lbFull.alt = item.alt || "";
        lbFull.classList.remove("invisible", "opacity-0");
        lbStatus.textContent = "";
      };

      if (typeof lbFull.decode === "function") {
        lbFull.decode().then(show).catch(() => {
          if (gen !== fullLoadGeneration) return;
          if (lbFull.complete && lbFull.naturalWidth > 0) show();
          else {
            lbFull.onload = () => {
              lbFull.onload = null;
              show();
            };
          }
        });
      } else if (lbFull.complete && lbFull.naturalWidth > 0) {
        show();
      } else {
        lbFull.onload = () => {
          lbFull.onload = null;
          show();
        };
      }
    }

    function loadFull(item) {
      fullLoadGeneration += 1;
      const gen = fullLoadGeneration;

      lbFull.onload = null;
      lbFull.classList.add("opacity-0", "invisible");
      lbFull.removeAttribute("src");
      lbFull.alt = "";
      lbStatus.textContent = "";

      if (!item.driveId || !item.driveId.trim()) {
        return;
      }

      lbStatus.textContent = "Načítám plné rozlišení…";
      const urls = driveFullImageUrlCandidates(item.driveId);
      loadImageFromUrls(
        urls,
        (url) => {
          if (gen !== fullLoadGeneration) return;
          revealFullLayer(url, item, gen);
        },
        () => {
          if (gen !== fullLoadGeneration) return;
          lbFull.classList.add("invisible", "opacity-0");
          lbFull.removeAttribute("src");
          lbFull.alt = "";
          lbStatus.textContent =
            `Fotografii "${item.alt}" se nepodařilo načíst (403).`;
        },
      );
    }

    function openAt(index) {
      current = (index + flat.length) % flat.length;
      const item = flat[current];
      lastFocus = document.activeElement;

      if (trapHandler) {
        lb.removeEventListener("keydown", trapHandler);
      }

      lb.hidden = false;
      requestAnimationFrame(() => {
        lb.classList.remove("opacity-0", "pointer-events-none");
      });

      document.documentElement.classList.add("overflow-hidden");

      lbThumb.src = item.thumb;
      lbThumb.alt = item.alt || "";
      loadFull(item);
      updateNavButtons();

      btnClose.focus();

      trapHandler = (e) => {
        if (e.key !== "Tab") return;
        const nodes = getFocusables(lb);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      lb.addEventListener("keydown", trapHandler);
    }

    function close() {
      fullLoadGeneration += 1;
      lb.classList.add("opacity-0", "pointer-events-none");
      document.documentElement.classList.remove("overflow-hidden");
      if (trapHandler) {
        lb.removeEventListener("keydown", trapHandler);
        trapHandler = null;
      }
      const done = () => {
        lb.hidden = true;
        lbFull.onload = null;
        lbFull.classList.add("invisible", "opacity-0");
        lbFull.removeAttribute("src");
        lbFull.alt = "";
        lbThumb.removeAttribute("src");
        lbStatus.textContent = "";
      };
      setTimeout(done, 200);
      if (lastFocus && typeof lastFocus.focus === "function") {
        lastFocus.focus();
      }
      lastFocus = null;
    }

    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", () => openAt(current - 1));
    btnNext.addEventListener("click", () => openAt(current + 1));

    function makeThumbButton(item, idx, layout) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = layout === "compact" ? THUMB_BTN_COMPACT_CLASS : THUMB_BTN_EXPANDED_CLASS;
      btn.setAttribute("aria-label", (item.alt || "Zvětšit fotografii") + " — zvětšit");
      const img = document.createElement("img");
      img.src = item.thumb;
      img.alt = item.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.className =
        "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105";
      btn.appendChild(img);
      btn.addEventListener("click", () => openAt(idx));
      return btn;
    }

    function toggleBarButton(label) {
      const wrap = document.createElement("div");
      wrap.className = "flex justify-center mt-2";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "border border-outline/30 bg-surface-container-low text-on-surface hover:border-primary-container/60 hover:bg-surface-container-high px-8 py-3 rounded-lg font-label font-semibold uppercase tracking-widest text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container";
      btn.textContent = label;
      wrap.appendChild(btn);
      return { wrap, btn };
    }

    mount.replaceChildren();

    const compactRoot = document.createElement("div");
    compactRoot.className = "galerie-compact";
    const compactGrid = document.createElement("div");
    compactGrid.className =
      "grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 w-full max-w-5xl mx-auto";
    compactFlat.forEach((item, idx) => {
      compactGrid.appendChild(makeThumbButton(item, idx, "compact"));
    });
    const expandBar = toggleBarButton("Zobrazit celou galerii");
    compactRoot.appendChild(compactGrid);
    compactRoot.appendChild(expandBar.wrap);

    const expandedRoot = document.createElement("div");
    expandedRoot.className = "galerie-expanded hidden";
    let globalIdx = 0;
    for (const album of data.albums || []) {
      const block = document.createElement("section");
      block.className = "mb-16 last:mb-0";
      block.setAttribute("aria-label", album.title);

      const h3 = document.createElement("h3");
      h3.className = "text-2xl font-headline font-bold mb-8 text-[#e5e2e1] text-center";
      h3.textContent = album.title;
      block.appendChild(h3);

      const grid = document.createElement("div");
      grid.className = "flex flex-wrap justify-center gap-3 sm:gap-4";

      for (const item of album.items || []) {
        const idx = globalIdx;
        globalIdx += 1;
        grid.appendChild(makeThumbButton(item, idx, "expanded"));
      }

      block.appendChild(grid);
      expandedRoot.appendChild(block);
    }

    const shrinkBar = toggleBarButton("Zobrazit méně");
    shrinkBar.wrap.className = "flex justify-center mt-14 mb-2";
    expandedRoot.appendChild(shrinkBar.wrap);

    mount.appendChild(compactRoot);
    mount.appendChild(expandedRoot);

    function setExpanded(on) {
      if (!lb.hidden) close();
      flat = on ? fullFlat : compactFlat;
      compactRoot.classList.toggle("hidden", on);
      expandedRoot.classList.toggle("hidden", !on);
      if (leadEl) {
        leadEl.classList.toggle("mb-10", !on);
        leadEl.classList.toggle("mb-4", on);
      }
      if (hintEl) hintEl.classList.toggle("hidden", !on);
      updateNavButtons();
      if (!on && galerieSection) {
        requestAnimationFrame(() => {
          galerieSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    expandBar.btn.addEventListener("click", () => setExpanded(true));
    shrinkBar.btn.addEventListener("click", () => setExpanded(false));

    const main = lb.querySelector(".galerie-lb-main");
    const frame = lb.querySelector(".galerie-lb-frame");

    function isFullLayerVisible() {
      return (
        Boolean(lbFull.getAttribute("src")) &&
        !lbFull.classList.contains("opacity-0") &&
        !lbFull.classList.contains("invisible")
      );
    }

    main.addEventListener("click", (e) => {
      if (frame.contains(e.target)) return;
      close();
    });

    frame.addEventListener("click", (e) => {
      const activeImg = isFullLayerVisible() ? lbFull : lbThumb;
      const rect = getObjectFitContainRect(activeImg);
      if (pointInRect(e.clientX, e.clientY, rect)) {
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      close();
    });

    lb.querySelectorAll(".galerie-lb-dismiss-side").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        close();
      });
    });

    lb.addEventListener("click", (e) => {
      if (e.target === lb) close();
    });

    document.addEventListener("keydown", (e) => {
      if (lb.hidden) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft" && flat.length > 1) {
        e.preventDefault();
        openAt(current - 1);
      } else if (e.key === "ArrowRight" && flat.length > 1) {
        e.preventDefault();
        openAt(current + 1);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
