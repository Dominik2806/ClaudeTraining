# Wetter-Webseite

Eine kleine Beispiel-Wetterseite (reines HTML/CSS/JavaScript, kein Build-Schritt).

## Funktionen

- Wetter-Box für **Köln** als Standard-Ort mit
  - Ortsname
  - aktueller Temperatur in °C
  - Niederschlagswahrscheinlichkeit der aktuellen Stunde
  - nächstem Sonnenaufgang bzw. Sonnenuntergang
- **+ Ort hinzufügen** (oben): Ort per Namen suchen und als neue Box hinzufügen
- **✕** in jeder Box: entfernt den Ort komplett von der Seite
- **Dark Mode / Light Mode** umschalten (oben rechts)
- Orte und Farbmodus werden im Browser (`localStorage`) gespeichert

## Starten

`index.html` direkt im Browser öffnen – oder einen lokalen Server starten:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Datenquelle

Wetter- und Ortsdaten kommen von [Open-Meteo](https://open-meteo.com/) (kostenlos, kein API-Key nötig).
