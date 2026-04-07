1. Never ship full‑resolution images for the grid
Grid / gallery: serve small thumbnails (fixed max width/height, e.g. 200–400px wide, reasonable JPEG/WebP quality).
Full view: load the large asset only when the user opens it (click/tap), not on initial page load.
That single decision does more than almost anything else for “instant” first paint.

2. Lazy-load everything below the fold
Use native lazy loading on <img loading="lazy"> (and decoding="async" where appropriate).
For the first row or hero, you can use fetchpriority="high" only on what’s actually visible first so you don’t compete with the rest.
3. Responsive images for thumbnails
Use srcset + sizes so the browser picks a thumbnail that matches the displayed size (retina included), instead of one giant file for all breakpoints.
4. Modern formats + fallbacks
Prefer WebP or AVIF for smaller files at the same visual quality; keep JPEG/PNG as fallback via <picture> if you still need very old browsers.
5. Dimensions and layout stability
Always set width and height (or CSS aspect-ratio) on thumbnails so the layout doesn’t jump when images load (better CLS and perceived quality).
6. Perceived speed (optional but strong)
Blur / LQIP: tiny inline placeholder or a very small blurred version while the real thumbnail loads.
Progressive JPEG can help a bit for “something appears quickly” on slow connections.
7. Full-screen / lightbox behavior
On open: show the thumbnail scaled up immediately (or a medium size you already have), then swap to the high-res when it finishes loading (with a subtle spinner or fade).
Preload the next/previous full image only when the user is likely to navigate (e.g. after opening the lightbox, or on hover—careful with mobile).
8. Caching and delivery
Long Cache-Control (or immutable hashed filenames) for static images.
Serve from a CDN close to users.
HTTP/2 or HTTP/3 helps many small parallel requests.
9. Don’t overload the main thread
Prefer CSS transforms for zoom/pan in the lightbox where possible.
If you have dozens of thumbs, virtualize the list (only mount DOM for visible rows) if scroll gets heavy—often unnecessary for ~30 static images if thumbs are small and lazy.
10. Accessibility
Meaningful alt text (or empty alt="" for decorative repeats).
Keyboard: Esc to close, focus trap in modal, focus return on close.
Realistic expectation: “Instant” usually means instant shell + fast first thumbnails, not every pixel of every photo loaded immediately. The pattern thumbnails on the page + full-res on demand is the standard way to get that.

Your autolakovna project’s contact form is a different case (upload size limits, serverless body limits); a read-only marketing gallery can use aggressive optimization and CDN caching without those constraints.

If you tell me your stack (plain HTML, React, etc.), I can map this to concrete markup or a small lightbox flow without implementing it (Ask mode).

