(function () {
  const screens = {
    pairing: document.getElementById('pairing-screen'),
    empty: document.getElementById('empty-screen'),
    error: document.getElementById('error-screen'),
    player: document.getElementById('player-screen'),
  };
  const pinEl = document.getElementById('pin');
  const pairingTenantEl = document.getElementById('pairing-tenant');
  const emptyTenantEl = document.getElementById('empty-tenant');
  const errorMessageEl = document.getElementById('error-message');
  const imgEl = document.getElementById('media-image');
  const videoEl = document.getElementById('media-video');

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
})();
