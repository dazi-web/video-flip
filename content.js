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
      transition: 'background 0.15s ease',
      pointerEvents: 'auto',
    });
    document.body.appendChild(btn);
    return btn;
  }

  function paintButton(btn, mirrored) {
    btn.style.background = mirrored ? '#1a73e8' : 'rgba(32, 33, 36, 0.75)';
    btn.title = mirrored ? 'Spiegelung aufheben' : 'Video horizontal spiegeln';
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

  // Fall A: eigenständige Seite mit direktem <video> (z.B. youtube.com/watch).
  // Hier gibt es keine fremde Klick-Ebene, die den Button verdecken könnte,
  // also wird direkt geklickt und direkt am Video gespiegelt.
  function attachStandaloneButton(video) {
    if (video.hasAttribute(PROCESSED_ATTR)) return;
    video.setAttribute(PROCESSED_ATTR, 'true');

    const btn = createFloatingButton();
    let mirrored = false;
    paintButton(btn, mirrored);
    trackRect(btn, () => video.getBoundingClientRect());

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
      findVideos().forEach(attachStandaloneButton);
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
      let mirrored = false;
      paintButton(btn, mirrored);
      trackRect(btn, () => iframe.getBoundingClientRect());

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
