(function () {
  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('contact-form-status');
  var submitBtn = document.getElementById('contact-submit');
  if (!form || !statusEl || !submitBtn) return;
  var MAX_PHOTO_BYTES_TOTAL = Math.floor(3.2 * 1024 * 1024);
  var photosInput = document.getElementById('contact-photos');
  var filesList = document.getElementById('files-list');
  var uploadLabel = document.getElementById('contact-photos-label');
  var uploadIcon = document.getElementById('upload-icon');
  var uploadText = document.getElementById('upload-text');
  var MAX_FILES = 5;

  /** Maps API / client validation keys to DOM (see api/contact.js `errors` object). */
  var FIELD_MAP = {
    name: { controlId: 'contact-name', errorId: 'contact-name-error' },
    email: { controlId: 'contact-email', errorId: 'contact-email-error' },
    message: { controlId: 'contact-message', errorId: 'contact-message-error' },
    photos: { controlId: 'contact-photos-label', errorId: 'contact-photos-error' },
    form: { errorId: 'contact-form-status' },
  };
  var RING_INVALID = ['ring-2', 'ring-red-500/80'];
  var STATUS_NEUTRAL = 'text-sm text-center text-on-surface-variant empty:hidden';
  var STATUS_ERROR = 'text-sm text-center text-red-400 empty:hidden';

  function getControlEl(key) {
    var cfg = FIELD_MAP[key];
    if (!cfg || !cfg.controlId) return null;
    return document.getElementById(cfg.controlId);
  }

  function getErrorEl(key) {
    var cfg = FIELD_MAP[key];
    return cfg && cfg.errorId ? document.getElementById(cfg.errorId) : null;
  }

  function clearFieldError(key) {
    var errEl = getErrorEl(key);
    if (errEl) errEl.textContent = '';
    var ctrl = getControlEl(key);
    if (ctrl) RING_INVALID.forEach(function (c) { ctrl.classList.remove(c); });
    if (key === 'form') {
      statusEl.textContent = '';
      statusEl.className = STATUS_NEUTRAL;
    }
  }

  function clearAllFieldErrors() {
    Object.keys(FIELD_MAP).forEach(clearFieldError);
  }

  function setFieldError(key, message) {
    if (!message) return;
    var errEl = getErrorEl(key);
    if (errEl) errEl.textContent = message;
    var ctrl = getControlEl(key);
    if (ctrl) RING_INVALID.forEach(function (c) { ctrl.classList.add(c); });
    if (key === 'form') {
      statusEl.className = STATUS_ERROR;
    }
  }

  function applyErrorsObject(errors) {
    if (!errors || typeof errors !== 'object') return;
    Object.keys(errors).forEach(function (k) {
      if (FIELD_MAP[k]) setFieldError(k, errors[k]);
    });
  }

  function validateClient() {
    var errors = {};
    var nameEl = document.getElementById('contact-name');
    var emailEl = document.getElementById('contact-email');
    var messageEl = document.getElementById('contact-message');
    var name = (nameEl && nameEl.value ? nameEl.value : '').trim();
    var email = (emailEl && emailEl.value ? emailEl.value : '').trim();
    var message = (messageEl && messageEl.value ? messageEl.value : '').trim();
    if (!name) errors.name = 'Vyplňte jméno a příjmení.';
    if (!email) errors.email = 'Vyplňte e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Zadejte platný e-mail.';
    if (!message) errors.message = 'Vyplňte popis požadované služby.';
    return errors;
  }

  [['contact-name', 'name'], ['contact-email', 'email'], ['contact-message', 'message']].forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.addEventListener('input', function () { clearFieldError(pair[1]); });
  });
  if (photosInput) {
    photosInput.addEventListener('change', function () { clearFieldError('photos'); });
  }

  // Format file size
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Update file list display
  function updateFileList() {
    if (!photosInput.files || photosInput.files.length === 0) {
      filesList.classList.add('hidden');
      uploadLabel.classList.remove('border-[#e30613]', 'bg-surface-container-lowest');
      uploadIcon.textContent = 'upload_file';
      uploadText.textContent = 'Nahrát foto';
      return;
    }

    // Calculate total size
    var totalSize = 0;
    var files = Array.from(photosInput.files);
    files.forEach(function (f) { totalSize += f.size || 0; });

    // Update upload label
    uploadLabel.classList.add('border-[#e30613]', 'bg-surface-container-lowest');
    uploadIcon.textContent = 'check_circle';
    uploadText.textContent = files.length + ' ' + (files.length === 1 ? 'soubor' : files.length < 5 ? 'soubory' : 'souborů') + ' (' + formatSize(totalSize) + ')';

    // Show file list
    filesList.innerHTML = '';
    filesList.classList.remove('hidden');

    files.forEach(function (file, index) {
      var fileItem = document.createElement('div');
      fileItem.className = 'flex items-center justify-between bg-surface-container-lowest rounded-lg p-3 gap-3';
      fileItem.innerHTML = `
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="material-symbols-outlined text-[#e30613] text-xl flex-shrink-0">image</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[#e5e2e1] truncate">${file.name}</p>
            <p class="text-xs text-on-surface-variant opacity-70">${formatSize(file.size)}</p>
          </div>
        </div>
        <button type="button" class="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-container-high hover:bg-[#e30613]/20 transition-colors flex items-center justify-center group" data-file-index="${index}">
          <span class="material-symbols-outlined text-on-surface-variant group-hover:text-[#e30613] text-xl">close</span>
        </button>
      `;
      filesList.appendChild(fileItem);

      // Remove file handler
      fileItem.querySelector('button').addEventListener('click', function () {
        removeFile(index);
      });
    });
  }

  // Remove file by index
  function removeFile(index) {
    var dt = new DataTransfer();
    var files = Array.from(photosInput.files);
    files.forEach(function (file, i) {
      if (i !== index) dt.items.add(file);
    });
    photosInput.files = dt.files;
    updateFileList();
    clearFieldError('photos');
  }

  // Handle file selection with deduplication and max limit
  photosInput.addEventListener('change', function (e) {
    var existingFiles = photosInput.files ? Array.from(photosInput.files) : [];
    var newFiles = e.target.files ? Array.from(e.target.files) : [];

    // Create map of existing files by name+size
    var existingMap = {};
    existingFiles.forEach(function (f) {
      existingMap[f.name + '_' + f.size] = true;
    });

    // Add only unique new files
    var dt = new DataTransfer();
    existingFiles.forEach(function (f) { dt.items.add(f); });

    var added = 0;
    newFiles.forEach(function (f) {
      var key = f.name + '_' + f.size;
      if (!existingMap[key] && dt.files.length < MAX_FILES) {
        dt.items.add(f);
        added++;
      }
    });

    photosInput.files = dt.files;

    // Show warning if limit reached
    if (dt.files.length >= MAX_FILES) {
      statusEl.textContent = 'Maximum ' + MAX_FILES + ' fotek';
      statusEl.className = STATUS_NEUTRAL;
      setTimeout(function () {
        if (statusEl.textContent === 'Maximum ' + MAX_FILES + ' fotek') {
          statusEl.textContent = '';
        }
      }, 3000);
    }

    updateFileList();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearAllFieldErrors();
    submitBtn.disabled = true;
    var clientErr = validateClient();
    if (Object.keys(clientErr).length) {
      applyErrorsObject(clientErr);
      submitBtn.disabled = false;
      return;
    }
    if (photosInput && photosInput.files && photosInput.files.length) {
      var sum = 0;
      for (var i = 0; i < photosInput.files.length; i++) sum += photosInput.files[i].size || 0;
      if (sum > MAX_PHOTO_BYTES_TOTAL) {
        setFieldError(
          'photos',
          'Fotky mohou mít celkem max. 3 MB. Zmenšete je nebo odešlete bez příloh.',
        );
        submitBtn.disabled = false;
        return;
      }
    }
    var fd = new FormData(form);
    fetch('/api/contact', { method: 'POST', body: fd })
      .then(function (r) {
        if (r.status === 413) {
          return Promise.reject({
            handled: true,
            fieldErrors: {
              photos: 'Přílohy jsou příliš velké (celkem max. cca 3 MB). Zkuste menší obrázky.',
            },
          });
        }
        return r.json().then(
          function (data) {
            return { r: r, data: data };
          },
          function () {
            return Promise.reject({ handled: true, msg: 'Server vrátil neočekávanou odpověď. Zkuste to znovu.' });
          },
        );
      })
      .then(function (_ref) {
        var r = _ref.r;
        var data = _ref.data;
        if (r.ok && data.ok) {
          clearAllFieldErrors();

          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-[#131313]/80 backdrop-blur-sm';
          modal.innerHTML = `
            <div class="success-modal bg-[#2a2a2a] p-12 rounded-xl border border-[#e30613]/20 max-w-md mx-4 text-center">
              <div class="checkmark-circle w-20 h-20 bg-[#e30613] rounded-full flex items-center justify-center mx-auto mb-6">
                <span class="material-symbols-outlined text-white text-5xl">check</span>
              </div>
              <h3 class="text-2xl font-bold text-[#e5e2e1] mb-4">Děkujeme!</h3>
              <p class="text-[#e9bcb6] mb-8">Poptávku jsme přijali. Ozveme se vám do 24 hodin.</p>
              <button class="bg-[#e30613] text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest transition-transform hover:scale-105" id="close-modal">
                Zavřít
              </button>
            </div>
          `;

          document.body.appendChild(modal);

          modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());
          modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
          });

          form.reset();
          updateFileList();
        } else {
          if (
            data &&
            data.errors &&
            typeof data.errors === 'object' &&
            Object.keys(data.errors).length
          ) {
            applyErrorsObject(data.errors);
          } else if (data && data.error) {
            setFieldError('form', data.error);
          } else {
            setFieldError('form', 'Něco se pokazilo, zkuste to prosím znovu.');
          }
        }
      })
      .catch(function (err) {
        if (err && err.handled) {
          if (err.fieldErrors) applyErrorsObject(err.fieldErrors);
          else if (err.msg) setFieldError('form', err.msg);
        } else {
          setFieldError('form', 'Nelze odeslat, zkontrolujte připojení.');
        }
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
