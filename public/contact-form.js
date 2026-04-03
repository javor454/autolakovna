(function () {
  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('contact-form-status');
  var submitBtn = document.getElementById('contact-submit');
  if (!form || !statusEl || !submitBtn) return;
  var MAX_PHOTO_BYTES_TOTAL = Math.floor(3.2 * 1024 * 1024);
  var photosInput = document.getElementById('contact-photos');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    statusEl.textContent = '';
    statusEl.className = 'text-sm text-center min-h-[1.25rem] text-on-surface-variant';
    submitBtn.disabled = true;
    if (photosInput && photosInput.files && photosInput.files.length) {
      var sum = 0;
      for (var i = 0; i < photosInput.files.length; i++) sum += photosInput.files[i].size || 0;
      if (sum > MAX_PHOTO_BYTES_TOTAL) {
        statusEl.textContent =
          'Fotky celkem max cca 3 MB (limit hostingu). Zmenšete je nebo odešlete bez příloh.';
        statusEl.className = 'text-sm text-center min-h-[1.25rem] text-red-400';
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
            msg: 'Přílohy jsou příliš velké pro hosting (max cca 3 MB fotek). Zkuste menší obrázky.',
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
          statusEl.textContent = 'Děkujeme, poptávku jsme přijali.';
          statusEl.className = 'text-sm text-center min-h-[1.25rem] text-[#e30613]';
          form.reset();
        } else {
          statusEl.textContent = (data && data.error) ? data.error : 'Něco se pokazilo, zkuste to prosím znovu.';
          statusEl.className = 'text-sm text-center min-h-[1.25rem] text-red-400';
        }
      })
      .catch(function (err) {
        if (err && err.handled) {
          statusEl.textContent = err.msg;
        } else {
          statusEl.textContent = 'Nelze odeslat, zkontrolujte připojení.';
        }
        statusEl.className = 'text-sm text-center min-h-[1.25rem] text-red-400';
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
