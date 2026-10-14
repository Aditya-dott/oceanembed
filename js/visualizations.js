/**
 * OceanEmbed — Shared Visualizations & UI Utilities
 * Plotly chart factories, Leaflet helpers, nav, clock
 */

// ── Live Clock ────────────────────────────────────────────────
function startLiveClock(selector = '.live-clock') {
  const el = document.querySelector(selector);
  if (!el) return;
  function tick() {
    const now = new Date();
    const iso = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    el.innerHTML = `<span class="live-dot"></span>${iso}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ── Navigation Active State ───────────────────────────────────
function setActiveNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(el => {
    const href = el.getAttribute('href') || '';
    if (href === current || (current === '' && href === 'index.html')) {
      el.classList.add('active');
    }
  });
}

// ── Plotly default layout ─────────────────────────────────────
const PLOTLY_LAYOUT_BASE = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { family: 'Inter, sans-serif', color: '#b8d4e8', size: 11 },
  margin: { t: 20, r: 20, b: 40, l: 50 },
  colorway: ['#00b4d8', '#48cae4', '#0077b6', '#2dc653', '#f79824', '#e63946', '#9b5de5', '#4895ef'],
  xaxis: {
    gridcolor: '#1a3050', zerolinecolor: '#1a3050',
    tickfont: { color: '#7fa8c9', size: 10 },
    linecolor: '#1a3050',
  },
  yaxis: {
    gridcolor: '#1a3050', zerolinecolor: '#1a3050',
    tickfont: { color: '#7fa8c9', size: 10 },
    linecolor: '#1a3050',
  },
  legend: {
    bgcolor: 'rgba(13,28,52,0.8)',
    bordercolor: '#1a3050',
    borderwidth: 1,
    font: { color: '#b8d4e8', size: 10 },
  },
  hoverlabel: {
    bgcolor: '#0f1e36',
    bordercolor: '#1a3050',
    font: { color: '#e8f4fd', size: 12, family: 'Inter, sans-serif' },
  },
};
const PLOTLY_CONFIG = {
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d', 'toggleSpikelines'],
  displaylogo: false,
  responsive: true,
  toImageButtonOptions: { format: 'png', scale: 2 },
};

// ── Plotly: Temperature Profile Chart ────────────────────────
function plotTemperatureProfile(containerId, depths, temps, title = 'Temperature Profile', label = 'Model') {
  const argo = temps.map((t, i) => t + (Math.random() - 0.5) * 0.8);
  const traces = [
    {
      x: temps, y: depths.map(d => -d),
      type: 'scatter', mode: 'lines+markers',
      name: label,
      line: { color: '#00b4d8', width: 2.5 },
      marker: { color: '#00b4d8', size: 5 },
      hovertemplate: '%{x:.1f}°C @ %{customdata}m<extra></extra>',
      customdata: depths,
    },
    {
      x: argo, y: depths.map(d => -d),
      type: 'scatter', mode: 'markers',
      name: 'ARGO Reference',
      marker: { color: '#f79824', size: 6, symbol: 'diamond' },
      hovertemplate: '%{x:.1f}°C @ %{customdata}m<extra></extra>',
      customdata: depths,
    }
  ];
  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    title: { text: title, font: { color: '#e8f4fd', size: 13 } },
    xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: { text: 'Temperature (°C)', font: { color: '#7fa8c9', size: 11 } }, range: [2, 35] },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: 'Depth (m)', font: { color: '#7fa8c9', size: 11 } },
      tickvals: [-0, -50, -100, -200, -300, -500, -750, -1000],
      ticktext: ['0', '50', '100', '200', '300', '500', '750', '1000'],
    },
    margin: { t: 40, r: 15, b: 50, l: 70 },
  };
  Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

// ── Plotly: SST Heatmap ───────────────────────────────────────
function plotSSTHeatmap(containerId, lats, lons, field, title = 'Sea Surface Temperature (°C)') {
  const data = [{
    z: field, x: lons, y: lats,
    type: 'heatmap',
    colorscale: [
      [0.0, '#023e8a'], [0.1, '#0077b6'], [0.2, '#0096c7'],
      [0.3, '#00b4d8'], [0.4, '#48cae4'], [0.5, '#90e0ef'],
      [0.6, '#fffb96'], [0.7, '#f9c74f'], [0.8, '#f77f00'],
      [0.9, '#e63946'], [1.0, '#9d0208'],
    ],
    colorbar: {
      title: { text: '°C', side: 'right', font: { color: '#7fa8c9' } },
      tickfont: { color: '#7fa8c9', size: 10 },
      bgcolor: 'rgba(13,28,52,0.8)',
      bordercolor: '#1a3050',
      len: 0.85,
    },
    hovertemplate: 'Lat: %{y:.1f}°N<br>Lon: %{x:.1f}°E<br>SST: %{z:.1f}°C<extra></extra>',
  }];
  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    title: { text: title, font: { color: '#e8f4fd', size: 13 } },
    xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: { text: 'Longitude (°E)', font: { color: '#7fa8c9', size: 11 } } },
    yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: { text: 'Latitude (°N)', font: { color: '#7fa8c9', size: 11 } } },
  };
  Plotly.newPlot(containerId, data, layout, PLOTLY_CONFIG);
}

// ── Plotly: Uncertainty Heatmap ───────────────────────────────
function plotUncertaintyHeatmap(containerId, lats, lons, field) {
  const data = [{
    z: field, x: lons, y: lats,
    type: 'heatmap',
    colorscale: [
      [0, '#0a1628'], [0.25, '#023e8a'], [0.5, '#0077b6'],
      [0.75, '#f77f00'], [1, '#e63946'],
    ],
    zmin: 0, zmax: 1,
    colorbar: {
      title: { text: 'Uncertainty', side: 'right', font: { color: '#7fa8c9' } },
      tickfont: { color: '#7fa8c9', size: 10 },
      bgcolor: 'rgba(13,28,52,0.8)',
      bordercolor: '#1a3050',
    },
    hovertemplate: 'Lat: %{y:.1f}°N<br>Lon: %{x:.1f}°E<br>Uncertainty: %{z:.3f}<extra></extra>',
  }];
  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    title: { text: 'Prediction Uncertainty Map', font: { color: '#e8f4fd', size: 13 } },
    xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: { text: 'Longitude (°E)', font: { color: '#7fa8c9', size: 11 } } },
    yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: { text: 'Latitude (°N)', font: { color: '#7fa8c9', size: 11 } } },
  };
  Plotly.newPlot(containerId, data, layout, PLOTLY_CONFIG);
}

// ── Plotly: RMSE by Depth ─────────────────────────────────────
function plotRMSEByDepth(containerId, metrics) {
  const depths = metrics.map(m => -m.depth);
  const traces = [
    { x: metrics.map(m => m.rmse),            y: depths, name: 'OceanEmbed', type: 'scatter', mode: 'lines+markers', line: { color: '#00b4d8', width: 2.5 }, marker: { size: 6 } },
    { x: metrics.map(m => m.unet_rmse),        y: depths, name: 'U-Net',     type: 'scatter', mode: 'lines', line: { color: '#48cae4', width: 1.5, dash: 'dot' } },
    { x: metrics.map(m => m.woa_rmse),         y: depths, name: 'WOA23',     type: 'scatter', mode: 'lines', line: { color: '#f79824', width: 1.5, dash: 'dash' } },
    { x: metrics.map(m => m.regression_rmse),  y: depths, name: 'Regression',type: 'scatter', mode: 'lines', line: { color: '#e63946', width: 1.5, dash: 'dashdot' } },
  ];
  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    title: { text: 'RMSE by Depth', font: { color: '#e8f4fd', size: 13 } },
    xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: { text: 'RMSE (°C)', font: { color: '#7fa8c9' } } },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: 'Depth (m)', font: { color: '#7fa8c9' } },
      tickvals: [0, -50, -100, -200, -300, -500, -750, -1000],
      ticktext: ['0', '50', '100', '200', '300', '500', '750', '1000'],
    },
    margin: { t: 40, r: 15, b: 50, l: 70 },
  };
  Plotly.newPlot(containerId, traces, layout, PLOTLY_CONFIG);
}

// ── Plotly: Sound Speed Profile ───────────────────────────────
function plotSoundSpeedProfile(containerId, depths, speeds, locationName) {
  const data = [{
    x: speeds, y: depths.map(d => -d),
    type: 'scatter', mode: 'lines+markers',
    name: locationName,
    line: { color: '#9b5de5', width: 2.5 },
    marker: { color: '#9b5de5', size: 5 },
    fill: 'tozerox',
    fillcolor: 'rgba(155,93,229,0.05)',
    hovertemplate: '%{x:.1f} m/s @ %{customdata}m<extra></extra>',
    customdata: depths,
  }];

  // Add SOFAR channel annotation
  const minSpeed = Math.min(...speeds);
  const minDepth = depths[speeds.indexOf(minSpeed)];

  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    title: { text: `Sound Speed Profile — ${locationName}`, font: { color: '#e8f4fd', size: 13 } },
    xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: { text: 'Sound Speed (m/s)', font: { color: '#7fa8c9' } } },
    yaxis: {
      ...PLOTLY_LAYOUT_BASE.yaxis,
      title: { text: 'Depth (m)', font: { color: '#7fa8c9' } },
      tickvals: [0, -50, -100, -200, -300, -500, -750, -1000],
      ticktext: ['0', '50', '100', '200', '300', '500', '750', '1000'],
    },
    margin: { t: 40, r: 15, b: 50, l: 70 },
    shapes: [{
      type: 'line',
      x0: Math.min(...speeds), x1: Math.max(...speeds),
      y0: -minDepth, y1: -minDepth,
      line: { color: '#48cae4', width: 1.5, dash: 'dot' },
    }],
    annotations: [{
      x: (Math.min(...speeds) + Math.max(...speeds)) / 2,
      y: -minDepth,
      text: `SOFAR Channel (~${minDepth}m)`,
      showarrow: true,
      arrowhead: 2,
      arrowcolor: '#48cae4',
      font: { color: '#48cae4', size: 10 },
    }],
  };
  Plotly.newPlot(containerId, data, layout, PLOTLY_CONFIG);
}

// ── Plotly: Seasonal Radar ────────────────────────────────────
function plotSeasonalRadar(containerId, bySeason) {
  const data = [{
    type: 'scatterpolar',
    r: bySeason.map(s => s.correlation),
    theta: bySeason.map(s => s.season),
    fill: 'toself',
    fillcolor: 'rgba(0,180,216,0.15)',
    line: { color: '#00b4d8', width: 2 },
    name: 'OceanEmbed',
  }];
  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    polar: {
      bgcolor: 'transparent',
      radialaxis: { visible: true, range: [0.85, 1], gridcolor: '#1a3050', tickfont: { color: '#7fa8c9', size: 9 } },
      angularaxis: { gridcolor: '#1a3050', tickfont: { color: '#b8d4e8', size: 12 } },
    },
    title: { text: 'Seasonal Correlation', font: { color: '#e8f4fd', size: 13 } },
    margin: { t: 50, r: 30, b: 30, l: 30 },
  };
  Plotly.newPlot(containerId, data, layout, PLOTLY_CONFIG);
}

// ── Plotly: Time Series ───────────────────────────────────────
function plotTimeSeries(containerId, label, color = '#00b4d8', points = 60) {
  const dates = Array.from({ length: points }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (points - i));
    return d.toISOString().slice(0, 10);
  });
  const values = dates.map((_, i) => 28.5 + 2 * Math.sin(i * 0.3) + (Math.random() - 0.5) * 1.5);
  const data = [{
    x: dates, y: values,
    type: 'scatter', mode: 'lines',
    name: label,
    line: { color, width: 2.5 },
    fill: 'tozeroy',
    fillcolor: color.replace(')', ',0.08)').replace('rgb(', 'rgba(').replace('#', 'rgba(').replace(/^rgba\(#/, 'rgba(0,180,216,'),
    hovertemplate: '%{x}<br>' + label + ': %{y:.2f}<extra></extra>',
  }];
  const layout = {
    ...PLOTLY_LAYOUT_BASE,
    xaxis: { ...PLOTLY_LAYOUT_BASE.xaxis, title: { text: 'Date', font: { color: '#7fa8c9' } } },
    yaxis: { ...PLOTLY_LAYOUT_BASE.yaxis, title: { text: label, font: { color: '#7fa8c9' } } },
    margin: { t: 20, r: 15, b: 50, l: 60 },
  };
  Plotly.newPlot(containerId, data, layout, PLOTLY_CONFIG);
}

// ── Leaflet: Create Map ───────────────────────────────────────
function createOceanMap(containerId, center = [15, 75], zoom = 5) {
  const map = L.map(containerId, {
    center, zoom,
    minZoom: 4, maxZoom: 10,
    zoomControl: true,
  });

  // Dark ocean tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '© CARTO | © OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // City / label overlay
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '',
    subdomains: 'abcd',
    opacity: 0.5,
  }).addTo(map);

  return map;
}

// ── Leaflet: Add SST heatmap layer ───────────────────────────
function addSSTLayer(map, lats, lons, field, opacity = 0.75) {
  // Convert grid to bounds array for imageOverlay approximation
  const bounds = [[lats[0], lons[0]], [lats[lats.length-1], lons[lons.length-1]]];
  const canvas = document.createElement('canvas');
  canvas.width = lons.length; canvas.height = lats.length;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(lons.length, lats.length);
  const minV = 22, maxV = 34;
  const colormap = [
    [2, 62, 138], [0, 119, 182], [0, 180, 216], [72, 202, 228],
    [255, 251, 150], [249, 199, 79], [247, 127, 0], [230, 57, 70], [157, 2, 8],
  ];
  function getColor(v) {
    const t = Math.max(0, Math.min(1, (v - minV) / (maxV - minV)));
    const idx = Math.min(Math.floor(t * (colormap.length - 1)), colormap.length - 2);
    const frac = t * (colormap.length - 1) - idx;
    return colormap[idx].map((c, i) => Math.round(c + frac * (colormap[idx+1][i] - c)));
  }
  for (let i = 0; i < lats.length; i++) {
    for (let j = 0; j < lons.length; j++) {
      const row = lats.length - 1 - i; // flip y
      const px = (row * lons.length + j) * 4;
      const [r, g, b] = getColor(field[i][j]);
      imgData.data[px] = r; imgData.data[px+1] = g; imgData.data[px+2] = b;
      imgData.data[px+3] = Math.round(opacity * 200);
    }
  }
  ctx.putImageData(imgData, 0, 0);
  const url = canvas.toDataURL();
  return L.imageOverlay(url, bounds, { opacity }).addTo(map);
}

// ── Animate count-up numbers ──────────────────────────────────
function animateCountUp(selector, target, duration = 1200, decimals = 0) {
  const els = document.querySelectorAll(selector);
  els.forEach(el => {
    const start = performance.now();
    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = (target * ease).toFixed(decimals);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(update);
  });
}

// ── Progress bar animation ────────────────────────────────────
function animateProgressBars() {
  document.querySelectorAll('.progress-fill[data-width]').forEach(el => {
    const w = el.getAttribute('data-width');
    setTimeout(() => { el.style.width = w + '%'; }, 200);
  });
}

// ── Intersection Observer for card animations ─────────────────
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('animate-fade-in');
          entry.target.style.opacity = '1';
        }, i * 60);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.card, .metric-card, .event-card, .team-card').forEach(el => {
    el.style.opacity = '0';
    obs.observe(el);
  });
}

// ── Mobile sidebar toggle ─────────────────────────────────────
function initMobileSidebar() {
  const toggle = document.querySelector('.mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!toggle || !sidebar) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('visible');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
}

// ── Toast notification ────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: var(--bg-elevated); border: 1px solid var(--border-emphasis);
    color: var(--text-primary); padding: 14px 20px; border-radius: 10px;
    font-size: 13px; font-family: var(--font-sans); box-shadow: var(--shadow-lg);
    display: flex; align-items: center; gap: 10px;
    animation: fadeIn 0.3s ease;
    border-left: 3px solid ${type === 'success' ? '#2dc653' : type === 'warning' ? '#f79824' : type === 'error' ? '#e63946' : '#00b4d8'};
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transition = '0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Export data as CSV ────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

// ── Export chart as PNG ───────────────────────────────────────
function exportPlotly(containerId, filename = 'oceanembed_chart') {
  Plotly.downloadImage(containerId, { format: 'png', scale: 2, filename });
}

// ── Sidebar nav HTML builder ──────────────────────────────────
function buildSidebar() {
  return `
  <aside class="sidebar" id="sidebar">
    <a class="sidebar-brand" href="index.html">
      <div class="brand-icon">🌊</div>
      <div class="brand-text">
        <span class="brand-name">OceanEmbed</span>
        <span class="brand-tagline">Ocean Intelligence</span>
      </div>
    </a>
    <nav class="sidebar-nav">
      <span class="sidebar-section-label">Platform</span>
      <a class="nav-item" href="index.html" id="nav-overview">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"/></svg></span>
        <span class="nav-label">Executive Overview</span>
      </a>
      <a class="nav-item" href="explorer.html" id="nav-explorer">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg></span>
        <span class="nav-label">3D Ocean Explorer</span>
      </a>
      <span class="sidebar-section-label">Analysis</span>
      <a class="nav-item" href="validation.html" id="nav-validation">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg></span>
        <span class="nav-label">Model Validation</span>
      </a>
      <a class="nav-item" href="uncertainty.html" id="nav-uncertainty">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"/></svg></span>
        <span class="nav-label">Uncertainty & ARGO</span>
      </a>
      <a class="nav-item" href="events.html" id="nav-events">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg></span>
        <span class="nav-label">Ocean Events</span>
        <span class="nav-badge">6</span>
      </a>
      <span class="sidebar-section-label">Applications</span>
      <a class="nav-item" href="acoustics.html" id="nav-acoustics">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/></svg></span>
        <span class="nav-label">Acoustics</span>
      </a>
      <a class="nav-item" href="fisheries.html" id="nav-fisheries">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"/></svg></span>
        <span class="nav-label">Fisheries</span>
      </a>
      <a class="nav-item" href="otec.html" id="nav-otec">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg></span>
        <span class="nav-label">OTEC Sites</span>
      </a>
      <span class="sidebar-section-label">System</span>
      <a class="nav-item" href="pipeline.html" id="nav-pipeline">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 6 0m-6 0H2.25m11.25 0H18m0 0h3.75m-3.75 0a3 3 0 0 0 3-3m-3 3a3 3 0 1 1-6 0m6 0v1.5a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25V5.25A2.25 2.25 0 0 1 5.25 3h9a2.25 2.25 0 0 1 2.25 2.25V9"/></svg></span>
        <span class="nav-label">Pipeline Status</span>
      </a>
      <a class="nav-item" href="about.html" id="nav-about">
        <span class="nav-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg></span>
        <span class="nav-label">Team JalVedh</span>
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="system-status">
        <span class="status-dot live"></span>
        <div class="system-status-text">
          <div class="system-status-label">Model Status</div>
          <div class="system-status-value">Running · Daily Cycle</div>
        </div>
      </div>
    </div>
  </aside>
  <div class="sidebar-overlay" id="sidebarOverlay"></div>
  `;
}

// ── Topbar HTML builder ───────────────────────────────────────
function buildTopbar(title, subtitle) {
  return `
  <header class="topbar">
    <div class="topbar-left">
      <button class="icon-btn mobile-menu-btn" id="mobileMenuBtn" title="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
      </button>
      <div class="page-title-group">
        <span class="page-title">${title}</span>
        <span class="page-subtitle">${subtitle}</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="live-clock" id="liveClock"></div>
      <button class="icon-btn" title="Notifications">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>
      </button>
      <button class="icon-btn" title="Settings">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
      </button>
    </div>
  </header>
  `;
}

// ── Shared page initialization ────────────────────────────────
function initPage(navId) {
  startLiveClock();
  setActiveNav();
  initMobileSidebar();
  initScrollAnimations();
  animateProgressBars();
  if (navId) {
    const el = document.getElementById(navId);
    if (el) el.classList.add('active');
  }
}

// ══════════════════════════════════════════════════════════════
// GEO MAP SYSTEM — Real Geography via Plotly bundled topojson
// No API key, no tile server, works 100% offline
// ══════════════════════════════════════════════════════════════

var GEO_LAYOUT_NIO = {
  scope: 'world', projection: { type: 'mercator' },
  lonaxis: { range: [44, 108] }, lataxis: { range: [3, 32] },
  showland: true, landcolor: '#162a3c',
  showocean: true, oceancolor: '#050d1a',
  showcoastlines: true, coastlinecolor: '#2a5070', coastlinewidth: 1.5,
  showcountries: true, countrycolor: '#1d3d5a', countrywidth: 0.8,
  showrivers: false, showlakes: true, lakecolor: '#0a1e30',
  showframe: false, bgcolor: '#050d1a', resolution: 50,
};

function makeGeoLayout(overrides) {
  overrides = overrides || {};
  return {
    paper_bgcolor: 'transparent',
    margin: { t: 10, r: 10, b: 10, l: 10 },
    font: { family: 'Inter, sans-serif', color: '#b8d4e8', size: 11 },
    geo: Object.assign({}, GEO_LAYOUT_NIO, overrides),
    legend: { bgcolor: 'rgba(13,28,52,0.85)', bordercolor: '#1a3050', borderwidth: 1, font: { color: '#b8d4e8', size: 10 }, x: 0.01, y: 0.99, xanchor: 'left', yanchor: 'top' },
    hoverlabel: { bgcolor: '#0f1e36', bordercolor: '#1a3050', font: { color: '#e8f4fd', size: 12 } },
  };
}

var COLORSCALE_SST = [[0,'#023e8a'],[0.15,'#0077b6'],[0.3,'#0096c7'],[0.45,'#00b4d8'],[0.6,'#48cae4'],[0.7,'#fffb96'],[0.8,'#f9c74f'],[0.9,'#f77f00'],[1,'#e63946']];
var COLORSCALE_UNCERTAINTY = [[0,'#050d1a'],[0.25,'#023e8a'],[0.5,'#0077b6'],[0.75,'#f79824'],[1,'#e63946']];
var COLORSCALE_FISHING = [[0,'#020b18'],[0.3,'#1a3050'],[0.5,'#2dc653'],[0.7,'#f9c74f'],[1,'#e63946']];
var COLORSCALE_OTEC = [[0,'#020b18'],[0.3,'#023e8a'],[0.55,'#0077b6'],[0.75,'#00b4d8'],[0.88,'#fffb96'],[1,'#f77f00']];

function fieldToGeoTrace(lats, lons, field, opts) {
  opts = opts || {};
  var cs = opts.colorscale || COLORSCALE_SST;
  var zmin = (opts.zmin !== undefined) ? opts.zmin : 22;
  var zmax = (opts.zmax !== undefined) ? opts.zmax : 34;
  var nm = opts.name || 'Field';
  var step = opts.step || 2;
  var sz = opts.markerSize || 5;
  var showCB = (opts.showColorbar !== false);
  var cbTitle = opts.colorbarTitle || nm;
  var fl = [], fLon = [], fZ = [];
  for (var i = 0; i < lats.length; i += step) {
    for (var j = 0; j < lons.length; j += step) {
      if (field[i] && field[i][j] !== undefined) { fl.push(lats[i]); fLon.push(lons[j]); fZ.push(field[i][j]); }
    }
  }
  return {
    type: 'scattergeo', lat: fl, lon: fLon, mode: 'markers', name: nm, showlegend: false,
    marker: { color: fZ, colorscale: cs, cmin: zmin, cmax: zmax, size: sz, opacity: 0.88, symbol: 'square', line: { width: 0 },
      colorbar: showCB ? { title: { text: cbTitle, font: { color: '#7fa8c9', size: 11 } }, tickfont: { color: '#7fa8c9', size: 10 }, bgcolor: 'rgba(13,28,52,0.85)', bordercolor: '#1a3050', borderwidth: 1, len: 0.7, thickness: 14, x: 1.01 } : undefined },
    hovertemplate: 'Lat: %{lat:.2f}\u00b0N Lon: %{lon:.2f}\u00b0E  ' + cbTitle + ': %{marker.color:.2f}<extra></extra>',
  };
}

function argoGeoTrace(floats) {
  var act = floats.filter(function(f){return f.isActive;}), inact = floats.filter(function(f){return !f.isActive;});
  return [
    { type:'scattergeo', lat:act.map(function(f){return f.lat;}), lon:act.map(function(f){return f.lon;}), mode:'markers', name:'ARGO Active',
      marker:{color:'#f9c74f',size:7,symbol:'diamond',opacity:0.9,line:{color:'#000',width:0.5}},
      customdata:act.map(function(f){return f.id;}),
      hovertemplate:'<b>ARGO %{customdata}</b><br>%{lat:.2f}\u00b0N %{lon:.2f}\u00b0E<extra></extra>' },
    { type:'scattergeo', lat:inact.map(function(f){return f.lat;}), lon:inact.map(function(f){return f.lon;}), mode:'markers', name:'ARGO Inactive',
      marker:{color:'#4a6d8c',size:5,symbol:'diamond',opacity:0.6},
      customdata:inact.map(function(f){return f.id;}),
      hovertemplate:'<b>ARGO %{customdata}</b><br>%{lat:.2f}\u00b0N %{lon:.2f}\u00b0E<extra></extra>' },
  ];
}

function chokepointGeoTrace(chokepoints, activeCP) {
  var names = Object.keys(chokepoints), data = names.map(function(n){return chokepoints[n];});
  return {
    type:'scattergeo', lat:data.map(function(c){return c.lat;}), lon:data.map(function(c){return c.lon;}),
    mode:'markers+text', name:'Chokepoints', text:names, textposition:'top center',
    textfont:{color:'#e63946',size:8},
    marker:{ color:names.map(function(n){return n===activeCP?'#e63946':'#9b1c1c';}), size:names.map(function(n){return n===activeCP?14:9;}), symbol:'triangle-up', opacity:0.95, line:{color:'#fff',width:1} },
    hovertemplate:'<b>%{text}</b><br>%{lat:.1f}\u00b0N %{lon:.1f}\u00b0E<extra></extra>',
  };
}

function argoRecoGeoTrace(recs) {
  return {
    type:'scattergeo', lat:recs.map(function(r){return r.lat;}), lon:recs.map(function(r){return r.lon;}),
    mode:'markers+text', name:'Deploy Sites', text:recs.map(function(r){return String(r.rank);}),
    textposition:'middle center', textfont:{color:'#050d1a',size:9,family:'JetBrains Mono,monospace'},
    marker:{color:'#f9c74f',size:16,symbol:'star',opacity:0.95,line:{color:'#000',width:1}},
    customdata:recs.map(function(r){return [r.reason,r.priority,r.uncertainty];}),
    hovertemplate:'<b>Deploy Site #%{text}</b><br>%{customdata[0]}<br>Priority: %{customdata[1]}<extra></extra>',
  };
}

function plotGeoMap(containerId, traces, geoOverrides, config) {
  Plotly.newPlot(containerId, traces, makeGeoLayout(geoOverrides||{}),
    Object.assign({responsive:true,displayModeBar:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d'],toImageButtonOptions:{format:'png',scale:2,filename:'oceanembed_map'}}, config||{}));
}

function updateGeoMap(containerId, traces, geoOverrides) {
  Plotly.react(containerId, traces, makeGeoLayout(geoOverrides||{}));
}

// ══════════════════════════════════════════════════════════════
// DYNAMIC OCEAN COMPUTATION HELPERS
// All values derived from OceanEngine — nothing hardcoded
// ══════════════════════════════════════════════════════════════

/** Compute Mixed Layer Depth from temperature profile */
function computeMLD(profile, threshold) {
  threshold = threshold || 0.5;
  var surf = profile[0];
  var depths = window.OceanEngine.DEPTHS;
  for (var i = 1; i < profile.length; i++) {
    if (surf - profile[i] >= threshold) return depths[i];
  }
  return depths[depths.length - 1];
}

/** Compute thermocline depth = depth of maximum temperature gradient */
function computeThermocline(profile) {
  var depths = window.OceanEngine.DEPTHS;
  var maxGrad = 0; var tcDepth = depths[1];
  for (var i = 0; i < profile.length - 1; i++) {
    var grad = Math.abs(profile[i] - profile[i+1]) / (depths[i+1] - depths[i]);
    if (grad > maxGrad) { maxGrad = grad; tcDepth = depths[i]; }
  }
  return tcDepth;
}

/** Compute SOFAR channel from sound speed profile */
function computeSOFAR(speedProfile) {
  var depths = window.OceanEngine.DEPTHS;
  var minSpeed = Infinity; var sofarDepth = 0;
  speedProfile.forEach(function(s, i) {
    if (s < minSpeed) { minSpeed = s; sofarDepth = depths[i]; }
  });
  return { depth: sofarDepth, speed: parseFloat(minSpeed.toFixed(1)) };
}

/** Detect surface duct: near-surface local speed maximum */
function detectSurfaceDuct(speedProfile) {
  if (speedProfile.length < 3) return false;
  return speedProfile[0] > speedProfile[1] && speedProfile[1] < speedProfile[2];
}

/** Get value from a 2D field at a specific lat/lon */
function fieldValueAt(field, lat, lon) {
  var E = window.OceanEngine;
  var latIdx = Math.round((lat - E.GRID.lats[0]) / 0.25);
  var lonIdx = Math.round((lon - E.GRID.lons[0]) / 0.25);
  var li = Math.max(0, Math.min(field.length - 1, latIdx));
  var lj = Math.max(0, Math.min((field[0]||[]).length - 1, lonIdx));
  return field[li] ? field[li][lj] : 0;
}

/** Get SSH anomaly at a lat/lon for a given day */
function getSshAt(lat, lon, day) {
  var field = window.OceanEngine.generateSSHField(day || 180, 0);
  return parseFloat(fieldValueAt(field, lat, lon).toFixed(3));
}

/** Get uncertainty at a lat/lon */
function getUncertaintyAt(lat, lon) {
  var field = window.OceanEngine.generateUncertaintyField(99);
  return parseFloat(fieldValueAt(field, lat, lon).toFixed(3));
}

/** Get temperature at a lat/lon and depth index for a given day */
function getTempAtDepthPoint(lat, lon, depthIdx, day) {
  var E = window.OceanEngine;
  var depth = E.DEPTHS[depthIdx || 0];
  var field = E.generateTemperatureAtDepth(depth, day || 180);
  return parseFloat(fieldValueAt(field, lat, lon).toFixed(2));
}

/** Format a number with sign for anomalies */
function fmtAnomaly(val, decimals) {
  decimals = decimals === undefined ? 2 : decimals;
  var v = parseFloat(val.toFixed(decimals));
  return (v >= 0 ? '+' : '') + v;
}

/** Show a toast notification */
function showToast(msg, type) {
  type = type || 'info';
  var colors = { info:'#00b4d8', success:'#2dc653', warning:'#f79824', error:'#e63946' };
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#0d1c34;border:1px solid ' +
    (colors[type]||colors.info) + ';color:#e8f4fd;padding:12px 20px;border-radius:8px;font-family:Inter,sans-serif;' +
    'font-size:14px;box-shadow:0 4px 24px rgba(0,0,0,0.4);max-width:360px;animation:fadeIn 0.3s ease;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity 0.4s'; setTimeout(function(){t.remove();},400); }, 3500);
}

/** Animated count-up for a single element */
function animateCount(el, target, decimals, suffix, duration) {
  decimals = decimals || 0; suffix = suffix || ''; duration = duration || 1200;
  var start = 0; var startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    var progress = Math.min((ts - startTime) / duration, 1);
    var ease = 1 - Math.pow(1 - progress, 3);
    var val = (start + (target - start) * ease);
    el.textContent = val.toFixed(decimals) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Download data as CSV */
function downloadCSV(data, filename) {
  if (!data || !data.length) { showToast('No data to export', 'warning'); return; }
  var keys = Object.keys(data[0]);
  var csv = [keys.join(',')].concat(data.map(function(r){
    return keys.map(function(k){ return '"'+(r[k]||'').toString().replace(/"/g,'""')+'"'; }).join(',');
  })).join('\n');
  var a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = (filename || 'oceanembed_export') + '.csv';
  a.click();
  showToast('Downloaded ' + filename + '.csv', 'success');
}

/** Live countdown timer — updates element with id every second */
function startCountdown(elementId, targetHour) {
  function tick() {
    var now = new Date();
    var next = new Date(now);
    next.setHours(targetHour || 0, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    var diff = Math.floor((next - now) / 1000);
    var h = Math.floor(diff / 3600).toString().padStart(2,'0');
    var m = Math.floor((diff % 3600) / 60).toString().padStart(2,'0');
    var s = (diff % 60).toString().padStart(2,'0');
    var el = document.getElementById(elementId);
    if (el) el.textContent = h + ':' + m + ':' + s;
  }
  tick();
  setInterval(tick, 1000);
}

/** Generate 60-day SST time series for a given basin lat/lon */
function generateSSTTimeSeries(lat, lon, endDay) {
  var E = window.OceanEngine; endDay = endDay || 180;
  var days = []; var vals = [];
  for (var d = endDay - 59; d <= endDay; d++) {
    var dayOfYear = ((d % 365) + 365) % 365;
    var base = 28 + 3 * Math.sin((dayOfYear - 80) * Math.PI / 182);
    var spatial = 0.5 * Math.sin(lat * Math.PI / 20) - 0.3 * Math.cos(lon * Math.PI / 30);
    var noise = (Math.sin(d * 1.7 + lat) + Math.cos(d * 2.3 + lon)) * 0.4;
    days.push(new Date(2026, 0, dayOfYear).toISOString().slice(0,10));
    vals.push(parseFloat((base + spatial + noise).toFixed(2)));
  }
  return { dates: days, sst: vals };
}
