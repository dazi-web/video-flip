# Video Flip

Chrome-Erweiterung, die einen Button zum horizontalen Spiegeln von Videos hinzufügt — direkt in der Google-Drive-Vorschau und auf YouTube. Praktisch zum Üben vor dem Spiegel, z. B. bei Sport, Tanz oder Gebärdensprache.

## Funktionen

- Fügt bei Videos auf `drive.google.com` und `youtube.com` einen kleinen 🪞-Button hinzu
- Ein Klick spiegelt das Video horizontal, ein weiterer Klick macht es rückgängig
- Läuft nur auf den genannten Seiten — keine Auswirkung auf andere Webseiten
- Keine Datenerfassung, keine externen Server, keine Tracking-Dienste (siehe [privacy-policy.txt](./privacy-policy.txt))

## Installation (Entwicklermodus)

1. Dieses Repository klonen oder als ZIP herunterladen
2. In Chrome `chrome://extensions` öffnen
3. Oben rechts **Entwicklermodus** aktivieren
4. **Entpackte Erweiterung laden** auswählen und den Projektordner (`video-flip/`) auswählen
5. Ein Video auf Google Drive oder YouTube öffnen — der 🪞-Button erscheint automatisch

## Wie es funktioniert

Google Drive spielt Videos in der Vorschau nicht selbst ab, sondern bettet sie über einen YouTube-Embed-Player in einem iframe ein. Da eine transparente Klick-Ebene von Drive über diesem iframe liegt, kann ein Button innerhalb des iframes nicht angeklickt werden. Video Flip zeichnet den Button deshalb im Elternfenster (auf `drive.google.com`) und kommuniziert per `postMessage` mit dem eingebetteten Player, um das Video dort zu spiegeln. Auf YouTube selbst (`youtube.com`) gibt es dieses Problem nicht, dort spiegelt der Button direkt.

## Berechtigungen

Die Erweiterung läuft ausschließlich auf:

- `drive.google.com` — um den Button in der Videovorschau anzuzeigen
- `youtube.com` (inkl. `www.` und `m.`) — um den Button direkt auf YouTube anzuzeigen
- `youtube.googleapis.com` — der von Google Drive intern genutzte Embed-Player

Keine weiteren Berechtigungen, kein Zugriff auf andere Seiten oder Browserdaten.

## Lizenz

[MIT](./LICENSE)
