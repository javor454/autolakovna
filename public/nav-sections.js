const SECTION_IDS = ["sluzby", "proces", "galerie", "kontakt"];

function navActivationOffsetPx() {
  const nav = document.querySelector("nav");
  return (nav?.offsetHeight ?? 72) + 16;
}

/** Last section in document order whose top edge is at or above the activation line (below fixed nav). */
function activeSectionIdFromScroll() {
  const line = navActivationOffsetPx();
  let active = SECTION_IDS[0];
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= line) {
      active = id;
    }
  }
  return active;
}

function syncNavSectionLinks(activeId) {
  document.querySelectorAll("a.nav-section-link").forEach((a) => {
    const isActive = a.getAttribute("href") === `#${activeId}`;
    a.classList.toggle("nav-section-link--active", isActive);
    if (isActive) {
      a.setAttribute("aria-current", "location");
    } else {
      a.removeAttribute("aria-current");
    }
  });
}

function updateNavFromScroll() {
  syncNavSectionLinks(activeSectionIdFromScroll());
}

let scrollRafPending = false;
function scheduleNavUpdate() {
  if (scrollRafPending) return;
  scrollRafPending = true;
  requestAnimationFrame(() => {
    scrollRafPending = false;
    updateNavFromScroll();
  });
}

window.addEventListener("scroll", scheduleNavUpdate, { passive: true });
window.addEventListener("resize", scheduleNavUpdate);

window.addEventListener("hashchange", () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(updateNavFromScroll);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(updateNavFromScroll);
});

window.addEventListener("load", updateNavFromScroll);
