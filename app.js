// Wetter-Webseite: zeigt Wetter-Boxen für gespeicherte Orte an.
// Datenquelle: Open-Meteo (kostenlos, kein API-Key nötig).

const STORAGE_KEY = "weather-locations";
const THEME_KEY = "theme";

const DEFAULT_LOCATIONS = [
  { name: "Köln", region: "Nordrhein-Westfalen, Deutschland", latitude: 50.9333, longitude: 6.95 },
];

// WMO-Wettercodes -> Beschreibung + Symbol
const WEATHER_CODES = {
  0: ["Klar", "☀️"],
  1: ["Überwiegend klar", "🌤️"],
  2: ["Teilweise bewölkt", "⛅"],
  3: ["Bedeckt", "☁️"],
  45: ["Nebel", "🌫️"],
  48: ["Reifnebel", "🌫️"],
  51: ["Leichter Nieselregen", "🌦️"],
  53: ["Nieselregen", "🌦️"],
  55: ["Starker Nieselregen", "🌧️"],
  56: ["Gefrierender Nieselregen", "🌧️"],
  57: ["Gefrierender Nieselregen", "🌧️"],
  61: ["Leichter Regen", "🌦️"],
  63: ["Regen", "🌧️"],
  65: ["Starker Regen", "🌧️"],
  66: ["Gefrierender Regen", "🌧️"],
  67: ["Gefrierender Regen", "🌧️"],
  71: ["Leichter Schneefall", "🌨️"],
  73: ["Schneefall", "🌨️"],
  75: ["Starker Schneefall", "❄️"],
  77: ["Schneegriesel", "🌨️"],
  80: ["Leichte Regenschauer", "🌦️"],
  81: ["Regenschauer", "🌧️"],
  82: ["Heftige Regenschauer", "⛈️"],
  85: ["Schneeschauer", "🌨️"],
  86: ["Starke Schneeschauer", "❄️"],
  95: ["Gewitter", "⛈️"],
  96: ["Gewitter mit Hagel", "⛈️"],
  99: ["Gewitter mit starkem Hagel", "⛈️"],
};

const cardsEl = document.getElementById("cards");
const emptyEl = document.getElementById("empty");
const template = document.getElementById("card-template");
const addToggle = document.getElementById("add-toggle");
const addForm = document.getElementById("add-form");
const addCancel = document.getElementById("add-cancel");
const cityInput = document.getElementById("city-input");
const addMessage = document.getElementById("add-message");
const themeToggle = document.getElementById("theme-toggle");

let locations = loadLocations();

// ---------- Speicher ----------

function loadLocations() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored)) return stored;
  } catch (e) {
    // localStorage nicht verfügbar oder kaputt -> Standard verwenden
  }
  return DEFAULT_LOCATIONS.slice();
}

function saveLocations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  } catch (e) {
    // ignorieren, Seite funktioniert auch ohne Speicher
  }
}

function locationId(loc) {
  return `${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}`;
}

// ---------- Wetterdaten ----------

async function fetchWeather(loc) {
  const params = new URLSearchParams({
    latitude: loc.latitude,
    longitude: loc.longitude,
    current: "temperature_2m,weather_code",
    hourly: "precipitation_probability",
    daily: "sunrise,sunset",
    timezone: "auto",
    forecast_days: "2",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function searchCity(name) {
  const params = new URLSearchParams({ name, count: "1", language: "de", format: "json" });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const hit = data.results && data.results[0];
  if (!hit) return null;
  return {
    name: hit.name,
    region: [hit.admin1, hit.country].filter(Boolean).join(", "),
    latitude: hit.latitude,
    longitude: hit.longitude,
  };
}

// Niederschlagswahrscheinlichkeit der aktuellen Stunde
function currentPrecipitation(data) {
  const hourKey = data.current.time.slice(0, 13) + ":00";
  const idx = data.hourly.time.indexOf(hourKey);
  return idx >= 0 ? data.hourly.precipitation_probability[idx] : null;
}

// Nächstes Sonnenereignis (Aufgang oder Untergang).
// Alle Zeiten liefert die API in der Ortszeit des Standorts, daher reicht ein String-Vergleich.
function nextSunEvent(data) {
  const now = data.current.time;
  const events = [];
  data.daily.sunrise.forEach((t) => events.push({ type: "sunrise", time: t }));
  data.daily.sunset.forEach((t) => events.push({ type: "sunset", time: t }));
  events.sort((a, b) => a.time.localeCompare(b.time));
  return events.find((e) => e.time > now) || null;
}

// ---------- Darstellung ----------

function render() {
  cardsEl.innerHTML = "";
  emptyEl.hidden = locations.length > 0;
  locations.forEach((loc) => {
    const card = createCard(loc);
    cardsEl.appendChild(card);
    loadCard(card, loc);
  });
}

function createCard(loc) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.id = locationId(loc);
  card.querySelector(".card-name").textContent = loc.name;
  card.querySelector(".card-region").textContent = loc.region || "";
  const removeBtn = card.querySelector(".btn-remove");
  removeBtn.setAttribute("aria-label", `${loc.name} entfernen`);
  removeBtn.addEventListener("click", () => removeLocation(loc));
  return card;
}

async function loadCard(card, loc) {
  card.classList.add("loading");
  card.querySelector(".card-desc").textContent = "Lade Wetterdaten …";
  try {
    const data = await fetchWeather(loc);
    const [desc, icon] = WEATHER_CODES[data.current.weather_code] || ["Unbekannt", "🌡️"];
    card.querySelector(".card-icon").textContent = icon;
    card.querySelector(".card-temp").textContent = `${Math.round(data.current.temperature_2m)} °C`;
    card.querySelector(".card-desc").textContent = desc;

    const rain = currentPrecipitation(data);
    card.querySelector(".card-rain").textContent = rain == null ? "–" : `${rain} %`;

    const sun = nextSunEvent(data);
    if (sun) {
      const isSunrise = sun.type === "sunrise";
      card.querySelector(".card-sun-label").textContent = isSunrise ? "🌅 Sonnenaufgang" : "🌇 Sonnenuntergang";
      card.querySelector(".card-sun").textContent = `${sun.time.slice(11, 16)} Uhr`;
    }
  } catch (err) {
    card.classList.add("error");
    card.querySelector(".card-desc").textContent = "Wetterdaten konnten nicht geladen werden.";
  } finally {
    card.classList.remove("loading");
  }
}

function removeLocation(loc) {
  const id = locationId(loc);
  locations = locations.filter((l) => locationId(l) !== id);
  saveLocations();
  const card = cardsEl.querySelector(`[data-id="${id}"]`);
  if (card) card.remove();
  emptyEl.hidden = locations.length > 0;
}

// ---------- Ort hinzufügen ----------

function setFormOpen(open) {
  addForm.hidden = !open;
  addToggle.setAttribute("aria-expanded", String(open));
  if (open) {
    cityInput.focus();
  } else {
    addForm.reset();
    showMessage("");
  }
}

function showMessage(text, isError = false) {
  addMessage.textContent = text;
  addMessage.classList.toggle("error", isError);
}

addToggle.addEventListener("click", () => setFormOpen(addForm.hidden));
addCancel.addEventListener("click", () => setFormOpen(false));

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = cityInput.value.trim();
  if (!name) return;

  const submitBtn = addForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  showMessage("Suche Ort …");
  try {
    const loc = await searchCity(name);
    if (!loc) {
      showMessage(`Kein Ort mit dem Namen „${name}“ gefunden.`, true);
      return;
    }
    if (locations.some((l) => locationId(l) === locationId(loc))) {
      showMessage(`${loc.name} ist bereits vorhanden.`, true);
      return;
    }
    locations.push(loc);
    saveLocations();
    emptyEl.hidden = true;
    const card = createCard(loc);
    cardsEl.appendChild(card);
    loadCard(card, loc);
    setFormOpen(false);
  } catch (err) {
    showMessage("Ortssuche fehlgeschlagen. Bitte später erneut versuchen.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !addForm.hidden) setFormOpen(false);
});

// ---------- Dark / Light Mode ----------

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  themeToggle.querySelector(".theme-icon").textContent = dark ? "☀️" : "🌙";
  themeToggle.querySelector(".theme-label").textContent = dark ? "Light Mode" : "Dark Mode";
  themeToggle.setAttribute("aria-pressed", String(dark));
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {
    // ignorieren
  }
});

// ---------- Start ----------

applyTheme(document.documentElement.dataset.theme || "light");
render();
