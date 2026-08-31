// Daily Bulletin Dashboard - Core Client Application

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // CONFIGURATION & DOM REFERENCES
  // ==========================================================================
  const viewport = document.getElementById('viewport');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');
  const streakMatrix = document.getElementById('streak-matrix');
  const taskChecklist = document.querySelector('.task-checklist');
  const scheduleGrid = document.getElementById('schedule-grid');
  const weatherIconContainer = document.getElementById('weather-icon-container');
  const weatherTemp = document.getElementById('weather-temp');
  const weatherDesc = document.getElementById('weather-desc');
  const weatherRange = document.getElementById('weather-range');
  const weatherWind = document.getElementById('weather-wind');
  const weatherHumidity = document.getElementById('weather-humidity');
  const youtubeCtaCard = document.getElementById('youtube-cta-card');
  const tickerMarquee = document.getElementById('ticker-marquee-inner');

  let currentTheme = localStorage.getItem('dashboard_theme') || 'newsprint';
  applyTheme(currentTheme);

  // ==========================================================================
  // THEME SWITCHER
  // ==========================================================================
  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'newsprint' ? 'terminal' : 'newsprint';
    applyTheme(currentTheme);
    localStorage.setItem('dashboard_theme', currentTheme);
    
    // Notify satellite renderer to update its colors
    if (window.updateSatelliteColors) {
      window.updateSatelliteColors(currentTheme);
    }
  });

  function applyTheme(theme) {
    if (theme === 'terminal') {
      viewport.classList.remove('theme-newsprint');
      viewport.classList.add('theme-terminal');
    } else {
      viewport.classList.remove('theme-terminal');
      viewport.classList.add('theme-newsprint');
    }
  }

  // ==========================================================================
  // CLOCK SYSTEM
  // ==========================================================================
  function updateClock() {
    const now = new Date();
    
    // Time format: HH:MM:SS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clockTime.textContent = `${hours}:${minutes}:${seconds}`;

    // Date format: e.g. "FRIDAY | AUG 28, 2026"
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dateNum = now.getDate();
    const year = now.getFullYear();
    
    clockDate.textContent = `${dayName} | ${monthName} ${dateNum}, ${year}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ==========================================================================
  // DAILY AGENDA & ROUTINE ENGINE
  // ==========================================================================
  const CLEANING_TASKS = [
    "10 min cleaning: Kitchen",       // 0: Sunday
    "10 min cleaning: Desk",          // 1: Monday
    "10 min cleaning: Bedroom",       // 2: Tuesday
    "10 min cleaning: Digital",       // 3: Wednesday
    "10 min cleaning: Bathroom",      // 4: Thursday
    "10 min cleaning: Living room",   // 5: Friday
    "10 min cleaning: Digital"        // 6: Saturday
  ];

  // Primary tasks template
  function getAgendaTemplate() {
    const dayIndex = new Date().getDay();
    const cleaningTask = CLEANING_TASKS[dayIndex];
    return [
      { id: 1, text: "Morning! App", duration: "5 MIN" },
      { id: 2, text: cleaningTask, duration: "10 MIN" },
      { id: 3, text: "Make and check schedule", duration: "10 MIN" },
      { id: 4, text: "Introduce yourself to one stranger", duration: "5 MIN" },
      { id: 5, text: "Read 20 minutes", duration: "20 MIN" },
      { id: 6, text: "Practice Ukulele", duration: "15 MIN" },
      { id: 7, text: "Do 50 Push-Ups" }
    ];
  }

  let tasks = [];
  
  async function initRoutineEngine() {
    const todayStr = getTodayDateString();
    const savedDate = localStorage.getItem('dashboard_current_date');
    let savedStates = null;
    
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        savedStates = await response.json();
      }
    } catch(e) {
      console.error("Failed to load task states from server:", e);
    }

    if (!savedStates) {
      try {
        savedStates = JSON.parse(localStorage.getItem('dashboard_tasks_state'));
      } catch(e) {
        console.error("Error parsing local saved task states:", e);
      }
    }

    if (savedDate !== todayStr) {
      // It's a new day! Save yesterday's 100% status to history
      if (savedDate && savedStates) {
        const allDoneYesterday = savedStates.every(item => item.completed);
        saveHistoryState(savedDate, allDoneYesterday);
      }
      
      // Reset for the new day
      localStorage.setItem('dashboard_current_date', todayStr);
      tasks = getAgendaTemplate().map(t => ({ ...t, completed: false }));
      await saveCurrentTaskState();
    } else {
      // Same day, load states or fallback to defaults
      const template = getAgendaTemplate();
      if (savedStates && savedStates.length === template.length) {
        tasks = template.map((task, i) => ({
          ...task,
          completed: !!savedStates[i].completed
        }));
      } else {
        tasks = template.map(t => ({ ...t, completed: false }));
        await saveCurrentTaskState();
      }
    }

    renderTasks();
    renderStreakMatrix();
    checkCompletionGate();
  }

  function getTodayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function saveCurrentTaskState() {
    const payload = tasks.map(t => ({ id: t.id, completed: t.completed }));
    
    // Save to localStorage as fallback / backup
    localStorage.setItem('dashboard_tasks_state', JSON.stringify(payload));
    
    // Also update history record for today immediately
    const todayStr = getTodayDateString();
    const allDone = tasks.every(t => t.completed);
    saveHistoryState(todayStr, allDone);

    // Save to server
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Failed to save task states to server:", e);
    }
  }

  function saveHistoryState(dateStr, isCompleted) {
    let history = {};
    try {
      history = JSON.parse(localStorage.getItem('dashboard_history')) || {};
    } catch(e) {
      history = {};
    }
    history[dateStr] = isCompleted;
    localStorage.setItem('dashboard_history', JSON.stringify(history));
  }

  function renderTasks() {
    taskChecklist.innerHTML = '';
    tasks.forEach(task => {
      const itemDiv = document.createElement('div');
      itemDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
      itemDiv.setAttribute('data-id', task.id);
      
      const checkboxBox = document.createElement('div');
      checkboxBox.className = 'task-checkbox-box';
      checkboxBox.textContent = task.completed ? 'X' : '';

      const taskText = document.createElement('span');
      taskText.className = 'task-text';
      taskText.textContent = task.text;

      itemDiv.appendChild(checkboxBox);
      itemDiv.appendChild(taskText);

      if (task.duration) {
        const taskDuration = document.createElement('span');
        taskDuration.className = 'task-duration';
        taskDuration.textContent = task.duration;
        itemDiv.appendChild(taskDuration);
      }

      // Event listener for tapping
      itemDiv.addEventListener('click', () => {
        task.completed = !task.completed;
        itemDiv.classList.toggle('completed', task.completed);
        checkboxBox.textContent = task.completed ? 'X' : '';
        saveCurrentTaskState();
        checkCompletionGate();
        renderStreakMatrix();
      });

      taskChecklist.appendChild(itemDiv);
    });
  }

  // Render 7 streak dots representing Sun-Sat of current week
  function renderStreakMatrix() {
    streakMatrix.innerHTML = '';
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0: Sun, 1: Mon, etc.
    
    let history = {};
    try {
      history = JSON.parse(localStorage.getItem('dashboard_history')) || {};
    } catch(e) {}

    const daysInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < 7; i++) {
      // Calculate date for day 'i' of this week
      const diff = i - currentDayOfWeek;
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + diff);
      const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      
      const dot = document.createElement('div');
      dot.className = 'streak-dot';
      dot.textContent = daysInitials[i];

      // Check completion status
      let isFilled = false;
      if (i < currentDayOfWeek) {
        // Past day
        isFilled = !!history[targetDateStr];
      } else if (i === currentDayOfWeek) {
        // Today
        isFilled = tasks.every(t => t.completed);
      } // Future days are always uncompleted

      if (isFilled) {
        dot.classList.add('filled');
      }
      
      streakMatrix.appendChild(dot);
    }
  }

  function checkCompletionGate() {
    const allDone = tasks.every(t => t.completed);
    if (allDone) {
      youtubeCtaCard.classList.add('unlocked');
    } else {
      youtubeCtaCard.classList.remove('unlocked');
    }
  }

  // ==========================================================================
  // SCHEDULE & CALENDAR INTEGRATION
  // ==========================================================================
  async function initSchedule() {
    // Paste your Google Calendar "Secret Address in iCal format" link here to sync your live events:
    const googleCalendarIcalUrl = ""; 
    
    let url = "/api/calendar";
    if (googleCalendarIcalUrl) {
      url += `?url=${encodeURIComponent(googleCalendarIcalUrl)}`;
    }

    function renderCards(events) {
      scheduleGrid.innerHTML = '';
      events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';

        const time = document.createElement('span');
        time.className = 'event-time';
        time.textContent = event.time;

        const title = document.createElement('a');
        title.className = 'event-title';
        title.href = 'https://calendar.google.com';
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
        title.textContent = event.title;

        const location = document.createElement('span');
        location.className = 'event-location';
        location.textContent = event.location || "";

        card.appendChild(time);
        card.appendChild(title);
        card.appendChild(location);
        scheduleGrid.appendChild(card);
      });
    }

    const dummyEvents = [
      { time: "09:00 AM", title: "Morning Standup & Focus", location: "Design Studio" },
      { time: "11:30 AM", title: "Ukulele Practice & Song Study", location: "Music Room" },
      { time: "02:00 PM", title: "Dashboard Architecture Review", location: "Main Office" },
      { time: "05:30 PM", title: "50 Push-Ups & Fitness Workout", location: "Gym / Outdoors" }
    ];

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Calendar service not available");
      const events = await response.json();
      if (!Array.isArray(events) || events.length === 0 || events[0].title.includes("No upcoming events")) {
        renderCards(dummyEvents);
      } else {
        renderCards(events);
      }
    } catch (err) {
      console.log("Rendering sample calendar dummy events for demo:", err.message);
      renderCards(dummyEvents);
    }
  }

  // ==========================================================================
  // WEATHER TELEMETRY MODULE (Open-Meteo & SVG Icons)
  // ==========================================================================
  async function fetchWeather() {
    // Default to Glendale coordinates (91201 Zip: Lat 34.1685, Lon -118.2711)
    const lat = 34.1685;
    const lon = -118.2711;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Los_Angeles`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather service status not OK");
      const data = await res.json();
      const current = data.current_weather;
      
      const temp = Math.round(current.temperature);
      const code = current.weathercode;
      const windSpeed = Math.round(current.windspeed);
      const condition = mapWeatherCode(code);
      
      // Get today's high and low from daily forecast
      const tempMax = data.daily && data.daily.temperature_2m_max ? Math.round(data.daily.temperature_2m_max[0]) : '--';
      const tempMin = data.daily && data.daily.temperature_2m_min ? Math.round(data.daily.temperature_2m_min[0]) : '--';
      
      // Find current relative humidity (from hourly forecast corresponding to current hour)
      let humidity = '--';
      if (data.hourly && data.hourly.relativehumidity_2m) {
        const currentHour = new Date().getHours();
        humidity = data.hourly.relativehumidity_2m[currentHour] || data.hourly.relativehumidity_2m[0] || '--';
      }

      weatherTemp.textContent = `${temp}°F`;
      weatherDesc.textContent = condition.text;
      weatherIconContainer.innerHTML = condition.iconSvg;
      
      weatherRange.textContent = `HIGH: ${tempMax}°F | LOW: ${tempMin}°F`;
      weatherWind.textContent = `WIND: ${windSpeed} MPH`;
      weatherHumidity.textContent = `HUMIDITY: ${humidity}%`;
    } catch(err) {
      console.warn("Failed to fetch weather API, utilizing local telemetry cache fallback:", err.message);
      // Fallback local weather (Glendale, CA averages)
      weatherTemp.textContent = "74°F";
      weatherDesc.textContent = "Sunny";
      weatherIconContainer.innerHTML = WEATHER_ICONS.clear;
      
      weatherRange.textContent = "HIGH: 82°F | LOW: 64°F";
      weatherWind.textContent = "WIND: 6 MPH";
      weatherHumidity.textContent = "HUMIDITY: 45%";
    }
  }

  // SVGs for weather conditions
  const WEATHER_ICONS = {
    clear: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    partlyCloudy: `<svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 0 1 5 5c0 .28-.02.56-.07.83A4 4 0 0 1 20 16a4 4 0 0 1-4 4H8a5 5 0 0 1-5-5 5 5 0 0 1 4.54-4.97c.2-.56.52-1.07.96-1.48A5 5 0 0 1 12 7z"/></svg>`,
    cloudy: `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
    rain: `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><line x1="8" y1="21" x2="6" y2="23"></line><line x1="12" y1="21" x2="10" y2="23"></line><line x1="16" y1="21" x2="14" y2="23"></line></svg>`,
    snow: `<svg viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><circle cx="8" cy="22" r="1"></circle><circle cx="12" cy="22" r="1"></circle><circle cx="16" cy="22" r="1"></circle></svg>`,
    storm: `<svg viewBox="0 0 24 24"><path d="M19 10h-1.4A7 7 0 1 0 8 18h10a4 4 0 0 0 1-7.9z"/><path d="M13 18l-3 4h4l-2 3"/></svg>`
  };

  function mapWeatherCode(code) {
    // Open-Meteo WMO weather codes
    if (code === 0) {
      return { text: "Sunny / Clear", iconSvg: WEATHER_ICONS.clear };
    } else if (code >= 1 && code <= 3) {
      return { text: "Partly Cloudy", iconSvg: WEATHER_ICONS.partlyCloudy };
    } else if (code >= 45 && code <= 48) {
      return { text: "Foggy / Misted", iconSvg: WEATHER_ICONS.cloudy };
    } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return { text: "Rain Showers", iconSvg: WEATHER_ICONS.rain };
    } else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
      return { text: "Snow Fall", iconSvg: WEATHER_ICONS.snow };
    } else if (code >= 95 && code <= 99) {
      return { text: "Thunderstorm", iconSvg: WEATHER_ICONS.storm };
    }
    return { text: "Overcast", iconSvg: WEATHER_ICONS.cloudy };
  }

  // ==========================================================================
  // THREE.JS NASA SATELLITE WIREFRAME MODEL
  // ==========================================================================
  function initThreeSatellite() {
    const container = document.getElementById('satellite-canvas-container');
    if (!container) return;

    container.innerHTML = '';

    try {
      // Check WebGL availability
      const canvasTest = document.createElement('canvas');
      const gl = canvasTest.getContext('webgl') || canvasTest.getContext('experimental-webgl');
      if (!gl) {
        throw new Error("WebGL is not supported by this browser.");
      }

      // Check GLTFLoader availability
      if (typeof THREE.GLTFLoader === 'undefined') {
        console.warn("THREE.GLTFLoader not loaded yet, retrying in 500ms...");
        setTimeout(initThreeSatellite, 500);
        return;
      }

      // Create scene, camera, renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf9f9f7);

      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.z = 4.5;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      // Add ambient and directional lights for shaded glTF rendering
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
      dirLight.position.set(5, 10, 7);
      scene.add(dirLight);

      // Group to hold the active 3D structures
      const satGroup = new THREE.Group();
      scene.add(satGroup);

      let cameraModel = null;

      // Load GLTF Antique Camera Model
      const loader = new THREE.GLTFLoader();
      loader.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/AntiqueCamera/glTF-Binary/AntiqueCamera.glb', (gltf) => {
        cameraModel = gltf.scene;
        
        // Auto-center and auto-scale model based on bounding box size
        const box = new THREE.Box3().setFromObject(cameraModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        cameraModel.position.x += (cameraModel.position.x - center.x);
        cameraModel.position.y += (cameraModel.position.y - center.y);
        cameraModel.position.z += (cameraModel.position.z - center.z);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.6 / maxDim; // Fit beautifully in viewport
        cameraModel.scale.set(scale, scale, scale);

        // Add camera model ONLY if in newsprint mode
        if (currentTheme === 'newsprint') {
          satGroup.add(cameraModel);
        }
      }, undefined, (error) => {
        console.error("Error loading glTF Antique Camera:", error);
      });

      // Define 3D Matrix Digital Rain Starfield Group
      const matrixRainGroup = new THREE.Group();
      const particleCount = 450;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const speeds = new Float32Array(particleCount);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 4.5;      // X
        positions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;  // Y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 4.5;  // Z
        speeds[i] = 0.015 + Math.random() * 0.035;           // Fall speeds
      }
      
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const particleMat = new THREE.PointsMaterial({
        color: 0x33ff00,
        size: 0.05,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      
      const points = new THREE.Points(particleGeo, particleMat);
      matrixRainGroup.add(points);

      // Add falling digital trail columns (lines)
      const lineCount = 20;
      const linesArray = [];
      for (let i = 0; i < lineCount; i++) {
        const lineGeo = new THREE.BufferGeometry();
        const lx = (Math.random() - 0.5) * 4.0;
        const lz = (Math.random() - 0.5) * 4.0;
        const ly = Math.random() * 4.0 - 2.0;
        const len = 0.4 + Math.random() * 0.8;
        
        const lineVerts = new Float32Array([
          lx, ly, lz,
          lx, ly - len, lz
        ]);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(lineVerts, 3));
        
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x33ff00,
          transparent: true,
          opacity: 0.25 + Math.random() * 0.4
        });
        
        const line = new THREE.Line(lineGeo, lineMat);
        matrixRainGroup.add(line);
        linesArray.push({
          mesh: line,
          speed: 0.02 + Math.random() * 0.03,
          length: len
        });
      }

      // Add rain starfield ONLY if in terminal mode initially
      if (currentTheme === 'terminal') {
        satGroup.add(matrixRainGroup);
      }

      // Expose color update to window context (and swap models)
      window.updateSatelliteColors = function(theme) {
        const bgColor = theme === 'terminal' ? 0x0a0a0a : 0xf9f9f7;
        scene.background = new THREE.Color(bgColor);
        renderer.setClearColor(bgColor);

        if (theme === 'terminal') {
          if (cameraModel) satGroup.remove(cameraModel);
          satGroup.add(matrixRainGroup);
        } else {
          satGroup.remove(matrixRainGroup);
          if (cameraModel) satGroup.add(cameraModel);
        }
      };

      // Initialize state
      window.updateSatelliteColors(currentTheme);

      // Dragging interaction
      let isDragging = false;
      let previousPointerPosition = { x: 0, y: 0 };

      container.style.cursor = 'grab';

      container.addEventListener('pointerdown', (e) => {
        isDragging = true;
        previousPointerPosition = { x: e.clientX, y: e.clientY };
        container.style.cursor = 'grabbing';
        container.setPointerCapture(e.pointerId);
      });

      container.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousPointerPosition.x;
        const deltaY = e.clientY - previousPointerPosition.y;

        satGroup.rotation.y += deltaX * 0.007;
        satGroup.rotation.x += deltaY * 0.007;

        previousPointerPosition = { x: e.clientX, y: e.clientY };
      });

      container.addEventListener('pointerup', (e) => {
        isDragging = false;
        container.style.cursor = 'grab';
        container.releasePointerCapture(e.pointerId);
      });

      container.addEventListener('pointercancel', (e) => {
        isDragging = false;
        container.style.cursor = 'grab';
      });

      // Animation Loop
      function animate() {
        requestAnimationFrame(animate);

        // Rotate group ONLY if not actively dragging
        if (!isDragging) {
          satGroup.rotation.y += 0.004;
          satGroup.rotation.x += 0.002;
        }

        // Animate matrix digital rain when terminal mode is active
        if (currentTheme === 'terminal') {
          // 1. Animate particle points
          const posAttr = points.geometry.attributes.position;
          for (let i = 0; i < particleCount; i++) {
            let y = posAttr.getY(i);
            y -= speeds[i];
            if (y < -2.2) {
              y = 2.2;
              posAttr.setX(i, (Math.random() - 0.5) * 4.5);
              posAttr.setZ(i, (Math.random() - 0.5) * 4.5);
            }
            posAttr.setY(i, y);
          }
          posAttr.needsUpdate = true;

          // 2. Animate column trail lines
          linesArray.forEach(item => {
            const lineAttr = item.mesh.geometry.attributes.position;
            let yStart = lineAttr.getY(0);
            yStart -= item.speed;
            if (yStart < -2.2) {
              yStart = 2.2 + Math.random() * 0.5;
              const newX = (Math.random() - 0.5) * 4.0;
              const newZ = (Math.random() - 0.5) * 4.0;
              lineAttr.setX(0, newX);
              lineAttr.setZ(0, newZ);
              lineAttr.setX(1, newX);
              lineAttr.setZ(1, newZ);
            }
            lineAttr.setY(0, yStart);
            lineAttr.setY(1, yStart - item.length);
            lineAttr.needsUpdate = true;
          });
        }

        renderer.render(scene, camera);
      }

      animate();

      // Handle resizing
      window.addEventListener('resize', () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });

    } catch (err) {
      console.warn("Could not initialize Three.js viewport:", err.message);
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:'JetBrains Mono',monospace;font-size:12px;color:#888;text-align:center;padding:15px;box-sizing:border-box;">
          <span>[3D VIEWPORT DEGRADED]</span>
          <span style="font-size:10px;margin-top:5px;opacity:0.8;">WebGL not supported or initialization error</span>
        </div>
      `;
    }
  }

  // ==========================================================================
  // LIVE GOOD NEWS WIRE TICKER (RSS cache client)
  // ==========================================================================
  const NEWS_CACHE_KEY = 'dashboard_news_cache';
  const NEWS_CACHE_TIME_KEY = 'dashboard_news_cache_time';
  const CACHE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  async function initNewsTicker() {
    let newsData = [];
    const cachedNews = localStorage.getItem(NEWS_CACHE_KEY);
    const cachedTime = localStorage.getItem(NEWS_CACHE_TIME_KEY);
    const isCacheExpired = !cachedTime || (Date.now() - parseInt(cachedTime)) > CACHE_LIFETIME_MS;

    if (cachedNews && !isCacheExpired) {
      try {
        newsData = JSON.parse(cachedNews);
        console.log(`Loaded ${newsData.length} news items from local storage cache.`);
      } catch(e) {
        console.error("Error reading news cache:", e);
      }
    }

    if (newsData.length === 0) {
      try {
        console.log("Fetching fresh news feeds via local HTTP proxy...");
        const response = await fetch('/api/news');
        if (!response.ok) throw new Error("API News service error");
        newsData = await response.json();
        
        // Cache news
        localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newsData));
        localStorage.setItem(NEWS_CACHE_TIME_KEY, Date.now().toString());
      } catch(err) {
        console.warn("Failed to fetch fresh news proxy, trying expired cache or mock headlines:", err.message);
        if (cachedNews) {
          newsData = JSON.parse(cachedNews);
        } else {
          // Hard fallback in client
          newsData = [
            { title: "Breakthrough: Solar energy production increases by 40% globally, cutting emissions.", link: "https://www.goodnewsnetwork.org" },
            { title: "Ocean recovery project successfully revives historic coral reef colonies.", link: "https://www.goodnewsnetwork.org" },
            { title: "Community-driven reforestation program plants 2 million trees worldwide.", link: "https://www.goodnewsnetwork.org" }
          ];
        }
      }
    }

    renderTickerMarquee(newsData);
  }

  function renderTickerMarquee(headlines) {
    tickerMarquee.innerHTML = '';
    
    if (headlines.length === 0) {
      tickerMarquee.textContent = 'NO TICKER WIRE TRANSMISSION ACTIVE...';
      return;
    }

    // Build ticker content
    const marqueeContent = document.createElement('div');
    marqueeContent.style.display = 'inline-flex';

    headlines.forEach(headline => {
      const link = document.createElement('a');
      link.className = 'ticker-item';
      link.href = headline.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Clean up title (remove RSS noise)
      let cleanTitle = headline.title.trim();
      if (cleanTitle.length > 120) {
        cleanTitle = cleanTitle.substring(0, 117) + '...';
      }
      
      link.textContent = `★ ${cleanTitle.toUpperCase()}`;
      marqueeContent.appendChild(link);
    });

    // To make infinite scrolling smooth, clone items
    const clone = marqueeContent.cloneNode(true);
    
    tickerMarquee.appendChild(marqueeContent);
    tickerMarquee.appendChild(clone);
  }

  // ==========================================================================
  // GENERATIVE ART BLOCK (Ryoji Ikeda Inspired)
  // ==========================================================================
  function initIkedaCanvas() {
    const canvas = document.getElementById('ikeda-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = canvas.parentElement.clientWidth || 300;
      canvas.height = canvas.parentElement.clientHeight || 120;
    }
    resize();
    window.addEventListener('resize', resize);

    let offset = 0;

    function draw() {
      requestAnimationFrame(draw);
      offset += 0.5; // Half speed

      // Clear with deep black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isTerminal = currentTheme === 'terminal';
      const primaryColor = isTerminal ? '#33ff00' : '#ffffff';
      const secondaryColor = isTerminal ? '#1f521f' : '#666666';
      const accentColor = isTerminal ? '#ffb000' : '#CC0000';

      // SECTION 1: SCANNING BARCODE GLITCH (Ryoji Ikeda style)
      const barHeight = 14;
      
      // Generate pseudo-random barcode sequences based on offset
      for (let x = 0; x < canvas.width; x += 4) {
        const seed = Math.sin(x * 0.05 + offset * 0.1);
        if (seed > 0.45) {
          ctx.fillStyle = primaryColor;
          ctx.fillRect(x, 6, 2, barHeight);
        } else if (seed < -0.7) {
          ctx.fillStyle = accentColor;
          ctx.fillRect(x, 6, 1.5, barHeight);
        }
      }

      // SECTION 2: SCROLLING HEXADECIMAL STREAMS
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = primaryColor;
      const hexChars = "0123456789ABCDEF";
      let streamText = "";
      for (let i = 0; i < 18; i++) {
        const charIndex1 = Math.floor(Math.abs(Math.sin(i + offset * 0.05) * 16)) % 16;
        const charIndex2 = Math.floor(Math.abs(Math.cos(i - offset * 0.03) * 16)) % 16;
        streamText += hexChars[charIndex1] + hexChars[charIndex2] + " ";
      }
      ctx.fillText(streamText, 10, 34);

      // Draw an overlay vertical grid divider line
      ctx.strokeStyle = secondaryColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 42);
      ctx.lineTo(canvas.width - 10, 42);
      ctx.stroke();

      // SECTION 3: GENERATIVE SIGNAL WAVES (Oscilloscope)
      ctx.beginPath();
      ctx.strokeStyle = isTerminal ? '#33ff00' : '#ffffff';
      ctx.lineWidth = 1.5;
      for (let x = 10; x < canvas.width - 10; x++) {
        let y = 60;
        let sineVal = Math.sin(x * 0.08 - offset * 0.2) * 10;
        let glitchVal = Math.sin(x * 0.6 + offset * 0.4) > 0.96 ? (Math.random() - 0.5) * 10 : 0;
        
        if (x === 10) {
          ctx.moveTo(x, y + sineVal + glitchVal);
        } else {
          ctx.lineTo(x, y + sineVal + glitchVal);
        }
      }
      ctx.stroke();

      // Meta info text
      ctx.fillStyle = secondaryColor;
      ctx.font = "8px 'JetBrains Mono', monospace";
      const count = String(Math.floor(offset) % 9999).padStart(4, '0');
      ctx.fillText(`FRM.SEQ: ${count}  IKD.SYS: ACTIVE  GLT.PCT: 1.02%`, 10, 84);
    }

    draw();
  }

  // ==========================================================================
  // SETTINGS PANEL & LIVE FONT RESIZING CONTROLS
  // ==========================================================================
  const DEFAULT_FONT_SIZES = {
    title: 62,
    checklist: 27,
    time: 31,
    eventTitle: 34,
    weatherTemp: 42,
    weatherDetails: 14,
    mediaLink: 22,
    ticker: 18
  };

  let userFontSizes = {};
  try {
    const stored = localStorage.getItem('user_font_sizes');
    if (stored) {
      userFontSizes = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load user custom font sizes", e);
  }

  // Fill in any missing keys
  for (const key in DEFAULT_FONT_SIZES) {
    if (userFontSizes[key] === undefined) {
      userFontSizes[key] = DEFAULT_FONT_SIZES[key];
    }
  }

  function applyFontSize(elementName, value) {
    const viewport = document.getElementById('viewport');
    if (!viewport) return;

    const varMap = {
      title: '--font-size-title',
      checklist: '--font-size-checklist',
      time: '--font-size-time',
      eventTitle: '--font-size-event-title',
      weatherTemp: '--font-size-weather-temp',
      weatherDetails: '--font-size-weather-details',
      mediaLink: '--font-size-media-link',
      ticker: '--font-size-ticker'
    };

    const idMap = {
      title: 'title',
      checklist: 'checklist',
      time: 'time',
      eventTitle: 'event-title',
      weatherTemp: 'weather-temp',
      weatherDetails: 'weather-details',
      mediaLink: 'media-link',
      ticker: 'ticker'
    };

    const varName = varMap[elementName];
    if (varName) {
      viewport.style.setProperty(varName, value + 'px');
    }

    const elementIdSuffix = idMap[elementName] || elementName;

    const valueSpan = document.getElementById(`val-${elementIdSuffix}`);
    if (valueSpan) {
      valueSpan.textContent = value + 'px';
    }

    const slider = document.getElementById(`slider-${elementIdSuffix}`);
    if (slider) {
      slider.value = value;
    }
    
    userFontSizes[elementName] = parseInt(value, 10);
  }

  function saveFontSizes() {
    localStorage.setItem('user_font_sizes', JSON.stringify(userFontSizes));
  }

  function initSettingsControls() {
    const settingsPanel = document.getElementById('settings-panel');
    const toggleBtn = document.getElementById('settings-toggle');
    const closeBtn = document.getElementById('settings-close');
    const resetBtn = document.getElementById('btn-settings-reset');
    const saveDefaultBtn = document.getElementById('btn-settings-save-default');

    // Load custom defaults or fallback to DEFAULT_FONT_SIZES
    let currentDefaults = { ...DEFAULT_FONT_SIZES };
    try {
      const storedDefaults = localStorage.getItem('user_default_font_sizes');
      if (storedDefaults) {
        currentDefaults = JSON.parse(storedDefaults);
      }
    } catch (e) {
      console.error("Failed to load user default font sizes", e);
    }

    // Apply saved sizes initially
    for (const key in userFontSizes) {
      applyFontSize(key, userFontSizes[key]);
    }

    // Toggle menu visibility
    if (toggleBtn && settingsPanel) {
      toggleBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
      });
    }

    if (closeBtn && settingsPanel) {
      closeBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('open');
      });
    }

    // Handle range slider inputs
    const sliderDefs = [
      { name: 'title', id: 'title' },
      { name: 'checklist', id: 'checklist' },
      { name: 'time', id: 'time' },
      { name: 'eventTitle', id: 'event-title' },
      { name: 'weatherTemp', id: 'weather-temp' },
      { name: 'weatherDetails', id: 'weather-details' },
      { name: 'mediaLink', id: 'media-link' },
      { name: 'ticker', id: 'ticker' }
    ];

    sliderDefs.forEach(item => {
      const slider = document.getElementById(`slider-${item.id}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          applyFontSize(item.name, e.target.value);
          saveFontSizes();
        });
      }
    });

    // Save current values as default
    if (saveDefaultBtn) {
      saveDefaultBtn.addEventListener('click', () => {
        currentDefaults = { ...userFontSizes };
        localStorage.setItem('user_default_font_sizes', JSON.stringify(currentDefaults));
        
        const originalText = saveDefaultBtn.textContent;
        saveDefaultBtn.textContent = "SAVED AS DEFAULT!";
        saveDefaultBtn.style.backgroundColor = currentTheme === 'terminal' ? '#ffb000' : '#CC0000';
        saveDefaultBtn.style.color = '#FFFFFF';
        setTimeout(() => {
          saveDefaultBtn.textContent = originalText;
          saveDefaultBtn.style.backgroundColor = '';
          saveDefaultBtn.style.color = '';
        }, 2000);
      });
    }

    // Reset button handler (restores active defaults)
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        for (const key in currentDefaults) {
          applyFontSize(key, currentDefaults[key]);
        }
        saveFontSizes();
      });
    }
  }

  // ==========================================================================
  // APP INITIALIZATION
  // ==========================================================================
  function safeInit(name, fn) {
    try {
      fn();
    } catch (e) {
      console.error(`Module initialization failed [${name}]:`, e);
    }
  }

  // ==========================================================================
  // SCREENSAVER CONTROLLER
  // ==========================================================================
  function initScreensaver() {
    const screensaver = document.getElementById('screensaver');
    const newsprintScroller = document.getElementById('screensaver-newsprint');
    const terminalScroller = document.getElementById('screensaver-terminal');
    const rainCanvas = document.getElementById('screensaver-rain-canvas');

    if (!screensaver || !newsprintScroller || !terminalScroller || !rainCanvas) return;

    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes
    let inactivityTimer = null;
    let stopMatrixRainFn = null;
    let isScreensaverActive = false;

    // Reset inactivity countdown while using dashboard
    function onUserActivity() {
      if (!isScreensaverActive) {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(showScreensaver, INACTIVITY_LIMIT);
      }
    }

    // Dismiss screensaver ONLY on explicit click or tap
    function onScreensaverClick(e) {
      if (isScreensaverActive) {
        e.preventDefault();
        e.stopPropagation();
        dismissScreensaver();
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(showScreensaver, INACTIVITY_LIMIT);
      }
    }

    function showScreensaver() {
      isScreensaverActive = true;
      screensaver.classList.remove('hidden');

      if (currentTheme === 'newsprint') {
        newsprintScroller.classList.remove('hidden');
        terminalScroller.classList.add('hidden');
      } else {
        terminalScroller.classList.remove('hidden');
        newsprintScroller.classList.add('hidden');
        
        // Start Matrix digital rain animation
        stopMatrixRainFn = startMatrixRain(rainCanvas);
      }
    }

    function dismissScreensaver() {
      isScreensaverActive = false;
      screensaver.classList.add('hidden');
      newsprintScroller.classList.add('hidden');
      terminalScroller.classList.add('hidden');

      if (stopMatrixRainFn) {
        stopMatrixRainFn();
        stopMatrixRainFn = null;
      }
    }

    // Matrix digital rain animator
    function startMatrixRain(canvas) {
      const ctx = canvas.getContext('2d');
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const alphabet = katakana.split("");
      
      const fontSize = 16;
      const columns = canvas.width / fontSize;
      
      const rainDrops = [];
      for (let x = 0; x < columns; x++) {
        rainDrops[x] = (Math.random() * -100); // Stagger drops
      }
      
      let rainInterval = setInterval(() => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#33ff00';
        ctx.font = fontSize + 'px monospace';
        
        for (let i = 0; i < rainDrops.length; i++) {
          const text = alphabet[Math.floor(Math.random() * alphabet.length)];
          ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);
          
          if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            rainDrops[i] = 0;
          }
          rainDrops[i]++;
        }
      }, 33);
      
      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        clearInterval(rainInterval);
        window.removeEventListener('resize', handleResize);
      };
    }

    // Bind event listeners for detecting dashboard activity (does not dismiss screensaver)
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    // Explicit click/tap listener ONLY to clear the screensaver
    screensaver.addEventListener('click', onScreensaverClick);
    screensaver.addEventListener('touchstart', onScreensaverClick, { passive: false });

    // Start timer on initial page load
    onUserActivity();
  }

  safeInit("Routine Engine", initRoutineEngine);
  safeInit("Schedule Sync", initSchedule);
  safeInit("Weather Telemetry", fetchWeather);
  safeInit("Three.js 3D Viewport", initThreeSatellite);
  safeInit("News Ticker", initNewsTicker);
  safeInit("Generative Art Canvas", initIkedaCanvas);
  safeInit("Settings Drawer", initSettingsControls);
  safeInit("Screensaver Mode", initScreensaver);

  // Check for calendar date changes (midnight rollover) every minute
  setInterval(() => {
    const todayStr = getTodayDateString();
    const currentActiveDate = localStorage.getItem('dashboard_current_date');
    if (currentActiveDate && currentActiveDate !== todayStr) {
      console.log("Midnight rollover detected! Resetting daily checklist...");
      initRoutineEngine();
    }
  }, 60 * 1000);

  // Refresh news, weather and calendar every 30 minutes
  setInterval(() => {
    fetchWeather();
    initNewsTicker();
    initSchedule();
  }, 30 * 60 * 1000);
});
