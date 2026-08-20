/* Dungeon Combat — shared front-end script.
   Reads window.SITE_CONFIG (served dynamically by the backend at /site-config.js)
   so store URLs and the support address are configured by env, not hard-coded here. */
(function () {
  var cfg = window.SITE_CONFIG || {};

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // Store badges — render into every [data-stores] container.
  function storeBadge(opts) {
    var a = document.createElement('a');
    a.className = 'store-badge' + (opts.href ? '' : ' disabled');
    a.href = opts.href || '#';
    if (opts.href) { a.target = '_blank'; a.rel = 'noopener'; }
    a.setAttribute('aria-label', opts.big + (opts.href ? '' : ' (coming soon)'));
    a.innerHTML =
      '<span class="glyph">' + opts.glyph + '</span>' +
      '<span class="lines">' +
        '<span class="small">' + (opts.href ? opts.small : 'Coming soon') + '</span>' +
        '<span class="big">' + opts.big + '</span>' +
      '</span>';
    return a;
  }

  document.querySelectorAll('[data-stores]').forEach(function (holder) {
    holder.innerHTML = '';
    holder.appendChild(storeBadge({ glyph: '', small: 'Download on the', big: 'App Store', href: cfg.appStoreUrl }));
    holder.appendChild(storeBadge({ glyph: '▶', small: 'Get it on', big: 'Google Play', href: cfg.playStoreUrl }));
  });

  // Screenshots band — hidden in the markup until real screenshots exist on
  // the server. Probe the first file; reveal the section only if it loads.
  var screens = document.getElementById('screens');
  if (screens) {
    var probe = new Image();
    probe.onload = function () { screens.hidden = false; };
    probe.src = '/assets/screenshots/shot-1.png';
  }

  // Support email links
  var email = cfg.supportEmail || '';
  document.querySelectorAll('[data-support-email]').forEach(function (el) {
    if (email) {
      el.href = 'mailto:' + email;
      if (el.textContent.trim() === 'our support address') el.textContent = email;
    }
  });

  // Support form
  var form = document.getElementById('support-form');
  if (form) {
    var statusEl = document.getElementById('support-status');
    var submitBtn = document.getElementById('support-submit');

    function setStatus(msg, kind) {
      statusEl.textContent = msg;
      statusEl.className = 'form-status' + (kind ? ' ' + kind : '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        topic: form.topic.value,
        message: form.message.value.trim()
      };
      if (!data.name || !data.email || !data.message) {
        setStatus('Please fill in your name, email, and message.', 'err');
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
        setStatus('That email address doesn\'t look right.', 'err');
        return;
      }
      submitBtn.disabled = true;
      setStatus('Sending…', '');

      fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, body: body };
        });
      }).then(function (r) {
        if (r.ok && r.body && r.body.success) {
          form.reset();
          setStatus('Thanks — your message is on its way. We\'ll reply by email.', 'ok');
        } else {
          var m = (r.body && r.body.error && r.body.error.message) || 'Something went wrong. Please email us directly.';
          setStatus(m, 'err');
        }
      }).catch(function () {
        setStatus('Network error. Please check your connection or email us directly.', 'err');
      }).finally(function () {
        submitBtn.disabled = false;
      });
    });
  }
})();
