(function () {
  const screens = {
    pairing: document.getElementById('pairing-screen'),
    empty: document.getElementById('empty-screen'),
    error: document.getElementById('error-screen'),
    player: document.getElementById('player-screen'),
    deactivated: document.getElementById('deactivated-screen'),
  };
  const pinEl = document.getElementById('pin');
  const pairingTenantEl = document.getElementById('pairing-tenant');
  const emptyTenantEl = document.getElementById('empty-tenant');
  const errorMessageEl = document.getElementById('error-message');
  const deactivatedReasonEl = document.getElementById('deactivated-reason');
  const imgEl = document.getElementById('media-image');
  const videoEl = document.getElementById('media-video');
  const brandLogoEls = [document.getElementById('pairing-logo'), document.getElementById('empty-logo')];

  /**
   * Prueft, ob ein eigenes Branding-Logo verfuegbar ist, und schaltet dann
   * darauf um (sonst bleibt/faellt es auf das Standard-Logo zurueck). Wird
   * wiederholt aufgerufen statt nur einmal beim Laden der Seite zu pruefen -
   * das Logo kann erst kurz NACH dem ersten Seitenaufruf vom Server geladen
   * worden sein (der Player-Dienst holt es asynchron im Hintergrund), ein
   * einmaliger Versuch wuerde in diesem Fall dauerhaft beim Standard-Logo
   * bleiben, obwohl kurz danach ein eigenes verfuegbar waere.
   */
  function refreshBrandLogo() {
    const probe = new Image();
    probe.onload = () => {
      brandLogoEls.forEach((el) => {
        if (el.src.indexOf('/branding-logo') === -1) el.src = '/branding-logo';
      });
    };
    probe.onerror = () => {
      brandLogoEls.forEach((el) => {
        if (el.src.indexOf('/static/logo.png') === -1) el.src = '/static/logo.png';
      });
    };
    probe.src = '/branding-logo';
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle('hidden', key !== name);
    });
  }

  const slideshow = {
    items: [],
    index: 0,
    timer: null,
    signature: '',
  };

  function clearSlideTimer() {
    if (slideshow.timer) {
      clearTimeout(slideshow.timer);
      slideshow.timer = null;
    }
  }

  function buildMediaUrl(status, item) {
    return `${status.apiBaseUrl}/tenants/${status.tenantId}/media/${item.mediaAsset.id}/file`;
  }

  function advance() {
    if (slideshow.items.length === 0) return;
    slideshow.index = (slideshow.index + 1) % slideshow.items.length;
    showCurrentItem();
  }

  let lastStatus = null;

  function showCurrentItem() {
    if (slideshow.items.length === 0) return;
    const item = slideshow.items[slideshow.index];
    const mediaUrl = buildMediaUrl(lastStatus, item);
    const isVideo = (item.mediaAsset.mimeType || '').startsWith('video/');

    clearSlideTimer();

    if (isVideo) {
      imgEl.classList.add('hidden');
      videoEl.classList.remove('hidden');
      videoEl.src = mediaUrl;
      videoEl.onended = advance;
      videoEl.play().catch(() => {});
      slideshow.timer = setTimeout(advance, (item.durationSeconds + 5) * 1000);
    } else {
      videoEl.classList.add('hidden');
      videoEl.pause();
      imgEl.classList.remove('hidden');
      imgEl.src = mediaUrl;
      slideshow.timer = setTimeout(advance, item.durationSeconds * 1000);
    }
  }

  function startSlideshowIfNeeded(items) {
    const signature = JSON.stringify(items.map((i) => [i.mediaAssetId, i.durationSeconds]));
    if (signature === slideshow.signature && slideshow.items.length > 0) {
      return; // Playlist unveraendert, laufende Anzeige nicht unterbrechen
    }
    slideshow.items = items;
    slideshow.index = 0;
    slideshow.signature = signature;
    showCurrentItem();
  }

  let lastRenderedPin = null;

  function renderPin(pin) {
    if (pin === lastRenderedPin) return;
    lastRenderedPin = pin;
    pinEl.innerHTML = '';
    (pin || '------').split('').forEach((digit, i) => {
      const span = document.createElement('span');
      span.textContent = digit;
      span.className = 'pin-digit';
      span.style.animationDelay = `${i * 0.08}s`;
      pinEl.appendChild(span);
    });
  }

  function render(status) {
    lastStatus = status;

    if (status.mode === 'pairing') {
      renderPin(status.pin);
      pairingTenantEl.textContent = status.tenantName || '';
      showScreen('pairing');
      return;
    }

    if (status.lastError) {
      errorMessageEl.textContent = status.lastError;
      showScreen('error');
      return;
    }

    if (status.playlist && status.playlist.source === 'deactivated') {
      deactivatedReasonEl.textContent = status.playlist.deactivationReason || '';
      showScreen('deactivated');
      return;
    }

    const items = status.playlist && status.playlist.playlist ? status.playlist.playlist.items : [];
    if (!items || items.length === 0) {
      emptyTenantEl.textContent = status.tenantName || '';
      showScreen('empty');
      return;
    }

    showScreen('player');
    startSlideshowIfNeeded(items);
  }

  async function refreshStatus() {
    try {
      const res = await fetch('/status');
      const data = await res.json();
      render(data);
    } catch (err) {
      errorMessageEl.textContent = 'Player-Dienst nicht erreichbar: ' + err.message;
      showScreen('error');
    }
  }

  refreshStatus();
  setInterval(refreshStatus, 2000);

  refreshBrandLogo();
  setInterval(refreshBrandLogo, 10000);
})();
