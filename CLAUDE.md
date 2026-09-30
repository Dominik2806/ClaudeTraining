# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A static example weather website (German UI) built with plain HTML/CSS/JavaScript. There is no build step, package manager, linter or test suite.

- Run: open `index.html` directly in a browser, or serve the folder with `python3 -m http.server 8000`.
- UI text, code comments and the README are written in German; keep new UI text in German.

## Architecture

- `index.html` holds the page structure plus a `<template id="card-template">` that `app.js` clones for each weather box. A small inline script in `<head>` sets `data-theme` on `<html>` before first paint, which prevents a light flash in dark mode.
- `style.css` defines every color as a CSS variable, once under `:root[data-theme="light"]` and once under `:root[data-theme="dark"]`. The dark/light toggle only switches that attribute, so new colors must be added as variables in both blocks.
- `app.js` does everything else:
  - State is an array of locations `{ name, region, latitude, longitude }`, saved to `localStorage` under `weather-locations`. The theme is saved under `theme`. The default location is Köln. Locations are identified by their rounded coordinates (`locationId`), which is also how duplicates are detected.
  - Weather data comes from Open-Meteo (`api.open-meteo.com/v1/forecast`), and city search comes from `geocoding-api.open-meteo.com`. Neither needs an API key, and both are called directly from the browser.
  - Open-Meteo returns times in the location's local timezone without an offset (`timezone=auto`). `nextSunEvent` and `currentPrecipitation` therefore compare ISO strings against `data.current.time` instead of using `Date`. Keep it that way so locations in other timezones stay correct.
  - Weather codes are mapped to German text and an emoji in `WEATHER_CODES` (WMO codes).

## Testing

There are no automated tests. To verify changes, drive the page with Playwright (installed globally in the cloud environment) and mock both Open-Meteo hosts with `page.route(...)`. The cloud container's proxy blocks `open-meteo.com` (HTTP 403), so real API calls only work in a normal browser.

Do not publish this page as a claude.ai Artifact: the Artifact sandbox blocks `fetch` to external hosts, so the weather data would never load.
