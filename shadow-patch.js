// Läuft im MAIN world vor allen Seiten-Skripten (document_start).
// Zwingt alle Shadow-Roots auf "open", damit das Content-Script später
// (isolated world) mit element.shadowRoot hineinschauen kann.
(() => {
  const originalAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    return originalAttachShadow.call(this, { ...init, mode: 'open' });
  };
})();
