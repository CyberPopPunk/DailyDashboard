# Functional Software Design Document (FSD)

**System Title:** Daily Bulletin iPad Dashboard System  
**Target Hardware:** Apple iPad Mini 5 (7.9-inch Retina Display, 1133 × 744 logical landscape viewport)  
**Host Architecture:** Local Node.js / Python static server  
**Version:** 1.0.0-PROD  

---

## 1. System Overview & Scope

The Daily Bulletin Dashboard is a locally hosted, touch-first personal management hub designed specifically for a wall-mounted or desktop iPad Mini 5. The interface provides a single, zero-scroll landscape viewport combining daily routine enforcement, calendar integration, weather telemetry, a real-time factual positive news feed, and gated access to a YouTube "Watch Later" media playlist.

---

## 2. Functional Requirements

### 2.1 Daily Agenda & Routine Engine
* **Completion Logic:** Tapping any daily task toggles its state between pending (`[ ]`) and completed (`[X]`). Completed tasks render with diminished opacity (`0.45`), line-through text decoration, and a solid Editorial Red indicator.
* **Dynamic Day-of-Week Tasking:** Task #2 dynamically resolves its target string based on the current system day index ($0 = \text{Sunday}, \dots, 6 = \text{Saturday}$):
  * **Sunday:** `10 min cleaning: Kitchen`
  * **Monday:** `10 min cleaning: Desk`
  * **Tuesday:** `10 min cleaning: Bedroom`
  * **Wednesday:** `10 min cleaning: Digital`
  * **Thursday:** `10 min cleaning: Bathroom`
  * **Friday:** `10 min cleaning: Living room`
  * **Saturday:** `10 min cleaning: Digital`
* **Streak Tracking:** Maintains a 7-day dot matrix (`S M T W T F S`). Completing 100% of the day's agenda fills today's indicator (`●`).
* **State Persistence:** All task states and streak records persist across browser reloads via `window.localStorage`.

### 2.2 Schedule & Calendar Integration
* Displays today's agenda items rendered as horizontal cards in a dedicated 4-column sub-grid under the main task agenda.
* Cards present event time, title, and confirmation status.

### 2.3 Telemetry & Media Gating
* **Meteo Module:** Displays local temperature, weather condition text, and a vector weather icon.
* **Interactive 3D Viewport:** Renders a WebGL Three.js wireframe model of a NASA satellite.
* **Gated Media Access:** The YouTube "Watch Later" CTA is locked (`opacity: 0.6`, `cursor: not-allowed`) by default. Access to the external playlist (`https://www.youtube.com/playlist?list=WL`) is granted only when all daily tasks achieve $100\%$ completion.

### 2.4 Live Good News Wire Ticker
* Fetches live RSS feeds from verified news providers via an HTTP proxy.
* Caches up to 70 headlines in `localStorage` for 7 days before requesting fresh data.
* Renders an animated infinite marquee ticker (`@keyframes ticker`). Pauses animation on touch/hover and opens the source article in a new tab upon selection.

---

## 3. UI/UX Architecture & Touch Targets

* **Viewport Bounds:** Rigid `1133px × 744px` canvas bounds with `overflow: hidden` to prevent layout shift or elastic scroll on iPad OS WebKit.
* **Touch Targets:** Interactive targets maintain a minimum dimension of $36\text{px} \times 36\text{px}$ up to $56\text{px}$ touch heights to guarantee high accuracy for finger/thumb navigation.
* **Design DNA (Newsprint Default):** Sharp $0\text{px}$ border radii, $2\text{px}$ solid ink-black borders, newsprint off-white background (`#F9F9F7`), and high-contrast editorial red (`#CC0000`) accents.

---

## 4. Alternative Style Mode Prompts

Below are the style prompts from `designprompts.dev` to switch the visual theme of this dashboard while retaining the underlying functional structure.

### Alternative Mode A: Terminal Dark
```text
Design Style: Terminal Dark

A computer terminal aesthetic paying homage to the command line interface. It strips away user interface bloat to reveal a brutally functional, high-contrast, and retro environment.

Color Palette:
- Background: #0a0a0a (Deep Black)
- Primary/Foreground: #33ff00 (Phosphor Neon Green)
- Secondary/Warning: #ffb000 (Amber)
- Error: #ff3333 (Bright Red)
- Border/Muted: #1f521f (Dimmed Green)

Typography & Radius:
- Font Stack: 'JetBrains Mono', 'Fira Code', 'VT323', monospace
- All CAPS for section titles and system indicators
- Radius: 0px throughout. Strictly rectangular panes with 1px solid or dashed borders
- CRT scanline overlay effect with subtle phosphor text glow

Component Paradigms:
- Prompt symbols (>, $, ~), command flags (--help), and status tags ([OK], [ERR])
- Hard inverted color fills on active touch states
- High contrast, phosphor monitor aesthetic