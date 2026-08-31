const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');

const app = express();
const PORT = process.env.PORT || 4545;
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Mock / fallback positive news headlines when offline or feeds fail
const FALLBACK_NEWS = [
  { title: "Scientists develop new enzyme that breaks down plastic waste in hours instead of centuries.", link: "https://www.goodnewsnetwork.org", pubDate: new Date().toISOString() },
  { title: "Global wild tiger populations show sustained recovery for the first time in a decade.", link: "https://www.goodnewsnetwork.org", pubDate: new Date().toISOString() },
  { title: "New solar-powered water filtration system provides clean drinking water to 50 communities.", link: "https://www.goodnewsnetwork.org", pubDate: new Date().toISOString() },
  { title: "Local community restores historical forest, planting over 100,000 native saplings.", link: "https://www.goodnewsnetwork.org", pubDate: new Date().toISOString() },
  { title: "Breakthrough in medical research: New vaccine shows high efficacy in preventing malaria.", link: "https://www.goodnewsnetwork.org", pubDate: new Date().toISOString() },
  { title: "Coral reef restoration project in the Pacific reports 80% survival rate for transplanted coral.", link: "https://www.goodnewsnetwork.org", pubDate: new Date().toISOString() },
  { title: "Young inventor designs biodegradable alternative to single-use bubble wrap.", link: "https://www.goodnewsnetwork.org", pubDate: new Date().toISOString() }
];

app.get('/api/news', async (req, res) => {
  const feeds = [
    'https://www.goodnewsnetwork.org/feed/',
    'https://www.positive.news/feed/'
  ];

  let aggregatedItems = [];

  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      const parsed = feed.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString()
      }));
      aggregatedItems = aggregatedItems.concat(parsed);
    } catch (err) {
      console.error(`Error parsing RSS feed from ${url}:`, err.message);
    }
  }

  // If we couldn't fetch any live news items, use fallbacks
  if (aggregatedItems.length === 0) {
    console.log("Using fallback news due to fetch failure.");
    aggregatedItems = FALLBACK_NEWS;
  } else {
    // Sort items by date descending
    aggregatedItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  }

  // Limit to 70 items
  const limitedItems = aggregatedItems.slice(0, 70);
  res.json(limitedItems);
});

// Lightweight iCal Calendar Parser for Google Calendar Sync
function parseIcalDate(str) {
  const m = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
  if (m) {
    if (m[7]) { // UTC Date
      return new Date(Date.UTC(
        parseInt(m[1], 10),
        parseInt(m[2], 10) - 1,
        parseInt(m[3], 10),
        parseInt(m[4], 10),
        parseInt(m[5], 10),
        parseInt(m[6], 10)
      ));
    } else { // Local Date
      return new Date(
        parseInt(m[1], 10),
        parseInt(m[2], 10) - 1,
        parseInt(m[3], 10),
        parseInt(m[4], 10),
        parseInt(m[5], 10),
        parseInt(m[6], 10)
      );
    }
  }
  const mAll = str.match(/^(\d{4})(\d{2})(\d{2})/);
  if (mAll) {
    return new Date(
      parseInt(mAll[1], 10),
      parseInt(mAll[2], 10) - 1,
      parseInt(mAll[3], 10)
    );
  }
  return new Date(str);
}

app.get('/api/calendar', async (req, res) => {
  let calendarUrl = req.query.url;
  
  // Fallback to local calendar_url.txt if no query URL is provided
  if (!calendarUrl) {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, 'calendar_url.txt');
      if (fs.existsSync(filePath)) {
        calendarUrl = fs.readFileSync(filePath, 'utf8').trim();
      }
    } catch (err) {
      console.error("Failed to read calendar_url.txt:", err.message);
    }
  }
  
  const now = new Date();
  
  // Helper to construct today's Date from time string HH:MM
  function getMockEventTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    return d;
  }

  const MOCK_EVENTS = [
    { time: "09:30", title: "Morning Sync & Coffee", location: "Office Cafe" },
    { time: "11:30", title: "Core Refactor", location: "Room 404" },
    { time: "14:00", title: "NASA Orbital Review", location: "Glendale HQ" },
    { time: "16:30", title: "Daily Decompress", location: "Relax Lounge" }
  ].map(ev => {
    const startDate = getMockEventTime(ev.time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    return { ...ev, startDate, endDate };
  });

  if (!calendarUrl) {
    const activeMock = MOCK_EVENTS.filter(ev => ev.endDate >= now);
    if (activeMock.length === 0) {
      return res.json([{ time: "--:--", title: "No upcoming events today", location: "" }]);
    }
    return res.json(activeMock.map(ev => ({ time: ev.time, title: ev.title, location: ev.location })).slice(0, 4));
  }

  try {
    const response = await fetch(calendarUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const icsText = await response.text();

    const events = [];
    const vevents = icsText.split('BEGIN:VEVENT');
    
    for (let i = 1; i < vevents.length; i++) {
      const block = vevents[i];
      const event = {};
      
      const summaryMatch = block.match(/SUMMARY:(.*)/);
      if (summaryMatch) {
        event.title = summaryMatch[1].replace(/\\,/g, ',').trim();
      }
      
      const dtstartMatch = block.match(/DTSTART(?:;[^\n:]*)?:(.*)/);
      if (dtstartMatch) {
        event.dtstart = dtstartMatch[1].trim();
      }

      const dtendMatch = block.match(/DTEND(?:;[^\n:]*)?:(.*)/);
      if (dtendMatch) {
        event.dtend = dtendMatch[1].trim();
      }

      const locationMatch = block.match(/LOCATION:(.*)/);
      if (locationMatch) {
        event.location = locationMatch[1].replace(/\\,/g, ',').trim();
      } else {
        event.location = "";
      }

      if (event.title && event.dtstart) {
        events.push(event);
      }
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const filtered = events
      .map(ev => {
        const startDate = parseIcalDate(ev.dtstart);
        const endDate = ev.dtend ? parseIcalDate(ev.dtend) : new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour default
        return { ...ev, parsedDate: startDate, parsedEndDate: endDate };
      })
      .filter(ev => {
        // Ends in the future AND happens within today's window
        return ev.parsedEndDate >= now && ev.parsedDate >= startOfDay && ev.parsedDate < endOfDay;
      })
      .sort((a, b) => a.parsedDate - b.parsedDate)
      .map(ev => {
        const hours = String(ev.parsedDate.getHours()).padStart(2, '0');
        const minutes = String(ev.parsedDate.getMinutes()).padStart(2, '0');
        return {
          time: `${hours}:${minutes}`,
          title: ev.title,
          location: ev.location || ""
        };
      });

    if (filtered.length === 0) {
      return res.json([{ time: "--:--", title: "No upcoming events today", location: "" }]);
    }

    res.json(filtered.slice(0, 4)); // Return top 4 events to fit UI layout
  } catch (err) {
    console.error("Error parsing Google Calendar iCal:", err.message);
    const activeMock = MOCK_EVENTS.filter(ev => ev.endDate >= now);
    res.json(activeMock.map(ev => ({ time: ev.time, title: ev.title, location: ev.location })).slice(0, 4));
  }
});

// GET: Load checklist state from server-side tasks_state.json
app.get('/api/tasks', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const TASKS_FILE = path.join(__dirname, 'tasks_state.json');
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, 'utf8');
      return res.json(JSON.parse(data));
    }
  } catch (err) {
    console.error("Error reading tasks state file:", err.message);
  }
  res.json(null);
});

// POST: Save checklist state to server-side tasks_state.json
app.post('/api/tasks', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const TASKS_FILE = path.join(__dirname, 'tasks_state.json');
    const taskState = req.body;
    fs.writeFileSync(TASKS_FILE, JSON.stringify(taskState, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    console.error("Error writing tasks state file:", err.message);
    res.status(500).json({ error: "Failed to save tasks state" });
  }
});

app.listen(PORT, () => {
  console.log(`Daily Bulletin Dashboard server running at http://localhost:${PORT}`);
});
