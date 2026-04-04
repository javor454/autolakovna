(function() {
  const container = document.querySelector('#reference .aspect-video');
  const overlay = document.getElementById('before-overlay');
  const handle = container?.querySelector('.absolute.top-0.bottom-0');
  const beforeLabel = document.getElementById('before-label');
  const afterLabel = document.getElementById('after-label');
  const beforeImage = document.getElementById('before-image');

  if (!container || !overlay || !handle) return;

  let isDragging = false;

  function updatePosition(clientX) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));

    overlay.style.width = `${percentage}%`;
    handle.style.left = `${percentage}%`;

    // Set before image width to match container width (so it stays centered to full space)
    if (beforeImage) {
      beforeImage.style.width = `${rect.width}px`;
    }

    const overlayWidth = (percentage / 100) * rect.width;

    // Hide "PŘED" label when overlay is too narrow (less than 150px)
    if (beforeLabel) {
      beforeLabel.style.opacity = overlayWidth < 150 ? '0' : '1';
    }

    // Hide "PO LAKOVÁNÍ" label when overlay is too wide (less than 150px visible on right side)
    if (afterLabel) {
      const visibleAfterWidth = rect.width - overlayWidth;
      afterLabel.style.opacity = visibleAfterWidth < 150 ? '0' : '1';
    }
  }

  // Mouse
  handle.addEventListener('mousedown', () => {
    isDragging = true;
    handle.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) updatePosition(e.clientX);
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      handle.style.cursor = 'grab';
    }
  });

  // Touch
  handle.addEventListener('touchstart', () => { isDragging = true; });

  document.addEventListener('touchmove', (e) => {
    if (isDragging) updatePosition(e.touches[0].clientX);
  });

  document.addEventListener('touchend', () => { isDragging = false; });

  // Init - set initial position and image widths
  handle.style.cursor = 'grab';
  handle.classList.remove('pointer-events-none');

  function initPosition() {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    updatePosition(centerX);
  }

  initPosition();

  // Update on window resize
  window.addEventListener('resize', initPosition);
})();
