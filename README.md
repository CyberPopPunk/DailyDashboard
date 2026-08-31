# Daily Bulletin // Daily Dashboard

A retro, high-contrast, dual-theme personal daily productivity dashboard engineered for dedicated display on an iPad or standalone touchscreen.

🌐 **Live GitHub Pages Demo**: **[https://cyberpoppunk.github.io/DailyDashboard/](https://cyberpoppunk.github.io/DailyDashboard/)**
🏛️ **Archival Scans Gallery**: **[https://cyberpoppunk.github.io/DailyDashboard/assets/links.html](https://cyberpoppunk.github.io/DailyDashboard/assets/links.html)**

---

## Features

### 📰 Dual Aesthetic Engine
- **Newsprint Broadsheet**: High-contrast vintage typography (`Playfair Display`, `JetBrains Mono`), shaded 3D antique camera model, 70% container transparency, paper texture overlay, and sepia inking.
- **Terminal Matrix**: Green phosphorus CRT phosphor styling (`#33ff00` / `#0a0a0a`), CRT scanline raster shaders, 3D Matrix starfield, and glowing digital rain.

### 📋 Daily Routine Engine
- 7 tracked daily habits with streak counters and dynamic day-of-week task generators.
- Auto-resets daily at **00:00 midnight** without requiring page reloads.
- Full server-side JSON persistence (`/api/tasks` & `tasks_state.json`) with client-side localStorage fallback.

### 📅 Calendar Integration
- Live Google Calendar iCal sync via private configuration (`calendar_url.txt`).
- Active event filtering (automatically hides past/ended events).
- One-click Google Calendar links for every scheduled card.

### ⛅ Weather Telemetry
- Real-time weather data (temperature, high/low, wind speed, humidity, and condition description) fetched via Open-Meteo API.

### 🖥️ Fullscreen Screensaver (Inactivity Mode)
- Triggers automatically after **15 minutes** of dashboard inactivity.
- **Newsprint Mode**: Continuous 70-second seamless panoramic scroll of 13 authentic 19th and early-20th century microfilm conversions and broadsheet scans from New York, San Francisco, London, Paris, Cairo, Tokyo, Sydney, Mexico City, Vienna, and the Kingdom of Hawaii.
- **Terminal Mode**: Fullscreen high-performance 2D Canvas Matrix digital rain.
- **Wake-to-Clear**: Requires an explicit **click or screen tap** to clear, ignoring ambient vibrations or mouse movement.

### 🏛️ Archival Scans Library
- Dedicated historical gallery (`/assets/links.html`) with thumbnail cards, metadata, and direct full-resolution scan viewers.
- Quick-access button in the top dashboard header.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
node server.js
```
The server will start on port `4545`: **`http://localhost:4545`**

### 3. (Optional) Connect Google Calendar
Create a file named `calendar_url.txt` in the root folder and paste your secret iCal link:
```text
https://calendar.google.com/calendar/ical/your_calendar_address/basic.ics
```

---

## License
MIT License. Public domain historical archives sourced from Wikimedia Commons and Library of Congress.
