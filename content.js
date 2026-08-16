(() => {
  const MSG_TOGGLE = '__mirrorExtToggle__';
  const MSG_STATE = '__mirrorExtState__';
  const PROCESSED_ATTR = 'data-mirror-ext-processed';

  function collectVideos(root, results) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('video').forEach((v) => results.push(v));
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) collectVideos(el.shadowRoot, results);
    });
  }

  function findVideos() {
    const results = [];
    collectVideos(document, results);
    return results;
  }

  function createFloatingButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '🪞';
    Object.assign(btn.style, {
      position: 'fixed',
      zIndex: '2147483647',
      width: '40px',
      height: '40px',
      padding: '0',
      border: 'none',
      borderRadius: '50%',
      color: '#fff',
      fontSize: '18px',
      lineHeight: '1',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.15s ease, opacity 0.25s ease',
      pointerEvents: 'auto',
      opacity: '0',
    });
    document.body.appendChild(btn);
    return btn;
  }

  function paintButton(btn, mirrored) {
    btn.style.background = mirrored ? '#1a73e8' : 'rgba(32, 33, 36, 0.75)';
    btn.title = mirrored ? 'Spiegelung aufheben' : 'Video horizontal spiegeln';
  }

  // Hält den Button sichtbar, wenn die Seite in den Vollbildmodus wechselt:
  // Der Browser rendert per Spezifikation nur Nachfahren des Vollbild-Elements,
  // ein an document.body hängender Button würde sonst spurlos verschwinden.
  function keepVisibleDuringFullscreen(btn) {
    const homeParent = btn.parentElement || document.body;
    document.addEventListener('fullscreenchange', () => {
      const target = document.fullscreenElement;
      if (target && btn.parentElement !== target) {
        target.appendChild(btn);
      } else if (!target && btn.parentElement !== homeParent) {
        homeParent.appendChild(btn);
      }
    });
  }

  // Blendet den Button wie eine Steuerleiste ein, solange sich die Maus in
  // der Nähe des Videos befindet, und nach kurzer Inaktivität wieder aus.
  function attachAutoHide(btn, getRect) {
    const HIDE_DELAY = 1800;
    const MARGIN = 16;
    let hideTimer = null;
    let hoveringBtn = false;

    const show = () => {
      btn.style.opacity = '1';
    };
    const hide = () => {
      if (!hoveringBtn) btn.style.opacity = '0';
    };
    const scheduleHide = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, HIDE_DELAY);
    };

    btn.addEventListener('mouseenter', () => {
      hoveringBtn = true;
      clearTimeout(hideTimer);
      show();
    });
    btn.addEventListener('mouseleave', () => {
      hoveringBtn = false;
      scheduleHide();
    });

    window.addEventListener('mousemove', (event) => {
      const rect = getRect();
      if (!rect) return;
      const within =
        event.clientX >= rect.left - MARGIN &&
        event.clientX <= rect.right + MARGIN &&
        event.clientY >= rect.top - MARGIN &&
        event.clientY <= rect.bottom + MARGIN;
      if (within) {
        show();
        scheduleHide();
      }
    });

    show();
    scheduleHide();
  }

  function trackRect(btn, getRect) {
    const reposition = () => {
      const rect = getRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        btn.style.display = 'none';
        return;
      }
      btn.style.display = 'flex';
      btn.style.top = `${Math.max(rect.top, 0) + 12}px`;
      btn.style.left = `${rect.right - 52}px`;
    };
    reposition();
    setInterval(reposition, 300);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
  }

  const TOOLBAR_BTN_CLASS = 'mirror-ext-toolbar-button';

  // Ermittelt, ob ein <video> zum echten YouTube-Player gehört (dann kann der
  // Button in dessen eigene Werkzeugleiste eingehängt werden), zu einer der
  // vielen Vorschau-Mini-Player (Hover-Preview auf Thumbnails, Shorts-Regal
  // usw. - dort soll gar kein Button erscheinen, das war die Quelle der
  // "doppelten" Spiegel-Buttons) oder zu keinem YouTube-Player gehört (dann
  // greift der schwebende Fallback-Button).
  function classifyYoutubePlayer(video) {
    const player = video.closest('.html5-video-player');
    if (!player) return { kind: 'none' };
    if (
      /preview/i.test(player.id) ||
      player.closest('ytd-video-preview') ||
      player.closest('ytd-thumbnail')
    ) {
      return { kind: 'preview' };
    }
    const toolbar = player.querySelector('.ytp-right-controls');
    return toolbar ? { kind: 'toolbar', toolbar } : { kind: 'none' };
  }

  function createToolbarButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ytp-button ${TOOLBAR_BTN_CLASS}`;
    btn.style.fontSize = '18px';
    btn.style.lineHeight = '1';
    btn.textContent = '🪞';
    return btn;
  }

  function paintToolbarButton(btn, mirrored) {
    btn.style.opacity = mirrored ? '1' : '0.75';
    btn.title = mirrored ? 'Spiegelung aufheben' : 'Video horizontal spiegeln';
  }

  // Fügt den Button direkt in YouTubes eigene Werkzeugleiste ein (neben
  // Einstellungen/Vollbild). Das löst beide gemeldeten Probleme zugleich:
  // Es gibt nur einen Button pro echtem Player (idempotente Prüfung statt
  // einmaliger Markierung, damit ein von YouTube neu gezeichneter Player-DOM
  // den Button automatisch zurückbekommt), und der Button bleibt im
  // Vollbildmodus sichtbar, weil er Teil des Elements ist, das YouTube
  // tatsächlich in den Vollbildmodus versetzt.
  function ensureYoutubeToolbarButton(video, toolbar) {
    let btn = toolbar.querySelector(`:scope > .${TOOLBAR_BTN_CLASS}`);
    if (!btn) {
      btn = createToolbarButton();
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const mirrored = video.style.transform !== 'scaleX(-1)';
        video.style.transform = mirrored ? 'scaleX(-1)' : '';
        paintToolbarButton(btn, mirrored);
      });
      video.addEventListener('emptied', () => {
        video.style.transform = '';
        paintToolbarButton(btn, false);
      });
      const anchor = toolbar.querySelector('.ytp-right-controls-left');
      toolbar.insertBefore(btn, anchor ? anchor.nextSibling : toolbar.firstChild);
    }
    paintToolbarButton(btn, video.style.transform === 'scaleX(-1)');
  }

  // Fall A: eigenständige Seite mit direktem <video> (z.B. youtube.com/watch),
  // aber ohne erkennbare Werkzeugleiste (z.B. abweichendes mobiles Layout).
  // Hier gibt es keine fremde Klick-Ebene, die den Button verdecken könnte,
  // also wird direkt geklickt und direkt am Video gespiegelt.
  function attachStandaloneButton(video) {
    if (video.hasAttribute(PROCESSED_ATTR)) return;
    video.setAttribute(PROCESSED_ATTR, 'true');

    const btn = createFloatingButton();
    keepVisibleDuringFullscreen(btn);
    let mirrored = false;
    paintButton(btn, mirrored);
    trackRect(btn, () => video.getBoundingClientRect());
    attachAutoHide(btn, () => video.getBoundingClientRect());

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      mirrored = !mirrored;
      video.style.transform = mirrored ? 'scaleX(-1)' : '';
      paintButton(btn, mirrored);
    });

    video.addEventListener('emptied', () => {
      mirrored = false;
      video.style.transform = '';
      paintButton(btn, mirrored);
    });
  }

  function setupStandalone() {
    function scan() {
      findVideos().forEach((video) => {
        const info = classifyYoutubePlayer(video);
        if (info.kind === 'preview') return;
        if (info.kind === 'toolbar') {
          ensureYoutubeToolbarButton(video, info.toolbar);
          return;
        }
        attachStandaloneButton(video);
      });
    }
    scan();
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(scan, 1500);
  }

  // Fall B: eingebettetes <video> in einem fremden iframe (z.B. der
  // YouTube-Embed, den Google Drive für die Videovorschau nutzt). Ein
  // eigener Button wäre hier von der Klick-Ebene der einbettenden Seite
  // verdeckt, daher nur auf Toggle-Nachrichten der Elternseite reagieren.
  function setupEmbeddedVideoHost() {
    const mirroredState = new WeakMap();

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data[MSG_TOGGLE] !== true) return;

      const videos = findVideos();
      if (!videos.length) return;

      const video = videos[0];
      const mirrored = !mirroredState.get(video);
      mirroredState.set(video, mirrored);
      video.style.transform = mirrored ? 'scaleX(-1)' : '';

      if (event.source) {
        event.source.postMessage({ [MSG_STATE]: true, mirrored }, '*');
      }
    });
  }

  // Fall C: Seite, die einen Video-iframe einbettet (die
  // Google-Drive-Vorschauseite). Zeichnet den Button dort, wo er auch
  // tatsächlich klickbar ist - im selben Dokument wie Drives eigene
  // Klick-Ebene - und leitet Klicks per postMessage an den iframe weiter.
  function setupIframeController() {
    const processed = new WeakSet();

    function isVideoFrame(iframe) {
      const src = iframe.getAttribute('src') || '';
      return /(^|\.)youtube\.com\/embed|youtube\.googleapis\.com\/embed/.test(src);
    }

    function attachToIframe(iframe) {
      if (processed.has(iframe)) return;
      processed.add(iframe);

      const btn = createFloatingButton();
      keepVisibleDuringFullscreen(btn);
      let mirrored = false;
      paintButton(btn, mirrored);
      trackRect(btn, () => iframe.getBoundingClientRect());
      attachAutoHide(btn, () => iframe.getBoundingClientRect());

      const cleanupCheck = setInterval(() => {
        if (!document.contains(iframe)) {
          clearInterval(cleanupCheck);
          btn.remove();
        }
      }, 300);

      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        iframe.contentWindow.postMessage({ [MSG_TOGGLE]: true }, '*');
      });

      window.addEventListener('message', (event) => {
        if (event.source !== iframe.contentWindow) return;
        const data = event.data;
        if (!data || data[MSG_STATE] !== true) return;
        mirrored = !!data.mirrored;
        paintButton(btn, mirrored);
      });
    }

    function scanIframes() {
      document.querySelectorAll('iframe').forEach((iframe) => {
        if (isVideoFrame(iframe)) attachToIframe(iframe);
      });
    }

    scanIframes();
    const observer = new MutationObserver(scanIframes);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
    setInterval(scanIframes, 1500);
  }

  if (findVideos().length > 0) {
    if (window.top === window.self) {
      setupStandalone();
    } else {
      setupEmbeddedVideoHost();
    }
  }
  setupIframeController();
})();
