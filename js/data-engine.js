/**
 * OceanEmbed Data Engine
 * Generates realistic synthetic ocean data for the North Indian Ocean
 * Lat: 5°N–30°N  |  Lon: 45°E–105°E  |  Resolution: 0.25°
 *
 * Team JalVedh | Smart India Hackathon 2026
 */

(function (global) {
  'use strict';

  // ── Grid Configuration ───────────────────────────────────────
  const GRID = {
    latMin: 5, latMax: 30, latStep: 0.25,
    lonMin: 45, lonMax: 105, lonStep: 0.25,
  };
  GRID.lats = Array.from({ length: Math.round((GRID.latMax - GRID.latMin) / GRID.latStep) + 1 }, (_, i) => GRID.latMin + i * GRID.latStep);
  GRID.lons = Array.from({ length: Math.round((GRID.lonMax - GRID.lonMin) / GRID.lonStep) + 1 }, (_, i) => GRID.lonMin + i * GRID.lonStep);

  // Standard depth levels (m)
  const DEPTHS = [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000];

  // Sub-basin definitions
  const BASINS = {
    'Arabian Sea':         { latMin: 5,  latMax: 25, lonMin: 55, lonMax: 78 },
    'Bay of Bengal':       { latMin: 5,  latMax: 23, lonMin: 80, lonMax: 100 },
    'Andaman Sea':         { latMin: 8,  latMax: 16, lonMin: 92, lonMax: 100 },
    'Equatorial IO':       { latMin: 5,  latMax: 12, lonMin: 60, lonMax: 90 },
  };

  const SEASONS = ['DJF', 'MAM', 'JJA', 'SON'];

  // Chokepoints
  const CHOKEPOINTS = {
    'Strait of Hormuz':  { lat: 26.5, lon: 56.5 },
    'Gulf of Aden':      { lat: 12.0, lon: 46.0 },
    'Bab-el-Mandeb':     { lat: 12.5, lon: 43.5 },
    'Malacca Strait':    { lat: 3.5,  lon: 103.0 },
    'Ten Degree Channel':{ lat: 10.0, lon: 92.5 },
    'Six Degree Channel':{ lat: 6.5,  lon: 94.0 },
    'Palk Strait':       { lat: 9.5,  lon: 79.5 },
  };

  // ── Pseudo-random (seeded) ────────────────────────────────────
  function mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  let _rand = mulberry32(42);

  function rand(min = 0, max = 1) { return min + _rand() * (max - min); }
  function randGauss(mean = 0, std = 1) {
    const u = 1 - _rand(), v = _rand();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function reseed(seed = 42) { _rand = mulberry32(seed); }

  // ── Noise utilities ───────────────────────────────────────────
  function smoothNoise(x, y, scale = 1, seed = 0) {
    const s = scale;
    const xi = Math.floor(x / s); const yi = Math.floor(y / s);
    const xf = (x / s) - xi; const yf = (y / s) - yi;
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const hash = (a, b) => Math.sin((a * 127.1 + b * 311.7 + seed) * 43758.5453) * 0.5 + 0.5;
    const xfade = fade(xf); const yfade = fade(yf);
    return lerp(
      lerp(hash(xi, yi), hash(xi + 1, yi), xfade),
      lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), xfade),
      yfade
    );
  }

  function fbm(x, y, octaves = 4, scale = 8, seed = 0) {
    let value = 0, amplitude = 1, frequency = 1, max = 0;
    for (let i = 0; i < octaves; i++) {
      value += smoothNoise(x * frequency, y * frequency, scale, seed + i * 100) * amplitude;
      max += amplitude;
      amplitude *= 0.5; frequency *= 2;
    }
    return value / max;
  }

  // ── SST Field Generation ──────────────────────────────────────
  function generateSSTField(dayOfYear = 180, seed = 0) {
    const seasonPhase = (2 * Math.PI * dayOfYear) / 365;
    const field = [];
    for (const lat of GRID.lats) {
      const row = [];
      for (const lon of GRID.lons) {
        // Climatological base: Indian Ocean ranges ~25–32°C
        let sst = 28.5 - 0.18 * (lat - 10);
        // Seasonal variation
        const seasonalAmp = lat > 20 ? 3.0 : 1.5;
        sst += seasonalAmp * Math.sin(seasonPhase - Math.PI / 6);
        // Arabian Sea upwelling (summer: JJA)
        if (lon < 78 && lat > 8 && lat < 22 && dayOfYear > 150 && dayOfYear < 270) {
          const upwellStrength = Math.sin((dayOfYear - 150) * Math.PI / 120);
          sst -= 2.5 * upwellStrength * Math.max(0, 1 - Math.abs(lon - 65) / 10);
        }
        // Bay of Bengal warm pool
        if (lon > 80 && lat > 5 && lat < 20) {
          sst += 0.8 * fbm(lon * 0.3, lat * 0.3, 3, 5, seed + 10);
        }
        // Spatial noise
        const n = fbm(lon * 0.2, lat * 0.2, 4, 6, seed);
        sst += 2.0 * (n - 0.5);
        // Clamp to realistic range
        row.push(Math.max(22, Math.min(34, sst)));
      }
      field.push(row);
    }
    return field;
  }

  function generateSSHField(dayOfYear = 180, seed = 1) {
    const field = [];
    for (const lat of GRID.lats) {
      const row = [];
      for (const lon of GRID.lons) {
        let ssh = 0;
        // Equatorial Indian Ocean has positive SSH anomaly during monsoon
        ssh += 0.12 * Math.exp(-0.05 * (lat - 8) ** 2);
        // Eddies (mesoscale noise)
        const n = fbm(lon * 0.15, lat * 0.15, 3, 4, seed + 200);
        ssh += 0.25 * (n - 0.5);
        // Seasonal
        ssh += 0.06 * Math.sin(2 * Math.PI * dayOfYear / 365 - lat * 0.1);
        row.push(parseFloat(ssh.toFixed(3)));
      }
      field.push(row);
    }
    return field;
  }

  function generateTemperatureAtDepth(depth, dayOfYear = 180, seed = 0) {
    const surfaceField = generateSSTField(dayOfYear, seed);
    const thermoclineDepth = 80; // m
    const deepTemp = 4 + 0.003 * depth; // approximate deep water
    const decay = Math.exp(-depth / thermoclineDepth);
    const field = [];
    for (let i = 0; i < GRID.lats.length; i++) {
      const row = [];
      for (let j = 0; j < GRID.lons.length; j++) {
        const sst = surfaceField[i][j];
        // Temperature profile using exponential decay to deep water
        const t = sst * decay + deepTemp * (1 - decay);
        // Add noise at depth
        const n = fbm(GRID.lons[j] * 0.1, GRID.lats[i] * 0.1, 3, 8, seed + depth);
        const temp = t + 0.5 * (1 - decay) * (n - 0.5);
        row.push(parseFloat(Math.max(2, Math.min(34, temp)).toFixed(2)));
      }
      field.push(row);
    }
    return field;
  }

  function generateUncertaintyField(seed = 99) {
    const field = [];
    for (const lat of GRID.lats) {
      const row = [];
      for (const lon of GRID.lons) {
        let u = 0.3 + 0.2 * fbm(lon * 0.25, lat * 0.25, 3, 5, seed);
        // Higher uncertainty near coasts
        const distCoast = Math.min(
          Math.abs(lat - GRID.latMax), Math.abs(lat - GRID.latMin),
          Math.abs(lon - GRID.lonMin), Math.abs(lon - GRID.lonMax)
        );
        if (distCoast < 3) u += 0.15 * (1 - distCoast / 3);
        // Data-sparse regions
        if (lon > 90 && lat > 20) u += 0.1;
        row.push(parseFloat(Math.min(1, u).toFixed(3)));
      }
      field.push(row);
    }
    return field;
  }

  // ── Temperature Profile ───────────────────────────────────────
  function getTemperatureProfile(lat, lon, dayOfYear = 180) {
    const sst = getSSTAtPoint(lat, lon, dayOfYear);
    return DEPTHS.map(d => {
      const thermocline = 80 + (lat - 10) * 2;
      const deepTemp = 3.5 + rand(-0.3, 0.3);
      const t = sst * Math.exp(-d / thermocline) + deepTemp * (1 - Math.exp(-d / thermocline));
      const noise = 0.3 * (1 - Math.exp(-d / 200));
      return parseFloat((t + randGauss(0, noise)).toFixed(2));
    });
  }

  function getSSTAtPoint(lat, lon, dayOfYear = 180) {
    reseed(Math.floor(lat * 100 + lon * 200 + dayOfYear));
    let sst = 28.5 - 0.18 * (lat - 10);
    const seasonPhase = (2 * Math.PI * dayOfYear) / 365;
    sst += 2.0 * Math.sin(seasonPhase - Math.PI / 6);
    sst += randGauss(0, 0.8);
    return Math.max(22, Math.min(33, sst));
  }

  // ── Sound Speed Profile ───────────────────────────────────────
  function getSoundSpeedProfile(lat, lon, dayOfYear = 180) {
    const tempProfile = getTemperatureProfile(lat, lon, dayOfYear);
    const salinityProfile = DEPTHS.map(d => {
      // Salinity: typically 34–36 PSU for NIO
      return 35.2 - 0.5 * Math.exp(-d / 100) + randGauss(0, 0.1);
    });
    // Mackenzie 1981 sound speed formula (simplified)
    return DEPTHS.map((d, i) => {
      const T = tempProfile[i];
      const S = salinityProfile[i];
      const D = d;
      const c = 1448.96 + 4.591 * T - 0.05304 * T * T + 0.0002374 * T * T * T
               + 1.340 * (S - 35) + 0.01630 * D + 1.675e-7 * D * D
               - 0.01025 * T * (S - 35) - 7.139e-13 * T * D * D * D;
      return parseFloat(c.toFixed(1));
    });
  }

  // ── Validation Metrics ────────────────────────────────────────
  function getValidationMetrics() {
    // Depth-wise metrics
    const byDepth = DEPTHS.map(d => {
      const baseRMSE = 0.8 + 0.012 * d + randGauss(0, 0.15);
      return {
        depth: d,
        rmse:       parseFloat(Math.max(0.4, baseRMSE).toFixed(2)),
        correlation:parseFloat(Math.min(0.99, 0.97 - 0.00015 * d + randGauss(0, 0.01)).toFixed(3)),
        bias:       parseFloat(randGauss(0.05, 0.2).toFixed(3)),
        woa_rmse:   parseFloat((baseRMSE * 1.45 + 0.3).toFixed(2)),
        persist_rmse: parseFloat((baseRMSE * 1.8 + 0.5).toFixed(2)),
        unet_rmse:  parseFloat((baseRMSE * 1.2 + 0.1).toFixed(2)),
        regression_rmse: parseFloat((baseRMSE * 1.6 + 0.4).toFixed(2)),
      };
    });
    // By season
    const bySeason = SEASONS.map(s => ({
      season: s,
      rmse: parseFloat((1.0 + randGauss(0, 0.2)).toFixed(2)),
      correlation: parseFloat((0.94 + randGauss(0, 0.02)).toFixed(3)),
      bias: parseFloat(randGauss(0.05, 0.15).toFixed(3)),
    }));
    // By sub-basin
    const byBasin = Object.keys(BASINS).map(b => ({
      basin: b,
      rmse: parseFloat((1.1 + randGauss(0, 0.25)).toFixed(2)),
      correlation: parseFloat((0.93 + randGauss(0, 0.03)).toFixed(3)),
      bias: parseFloat(randGauss(0.05, 0.15).toFixed(3)),
      sampleCount: Math.floor(rand(500, 2000)),
    }));
    return { byDepth, bySeason, byBasin };
  }

  // ── Ocean-only placement zones (NIO) ─────────────────────────
  // Each zone is a confirmed open-ocean rectangle — no land inside.
  // Weight is proportional to zone area so sampling is geographically balanced.
  const OCEAN_ZONES = [
    { latMin:  5, latMax: 20, lonMin: 56, lonMax: 72, weight: 15 }, // Arabian Sea (main body)
    { latMin: 18, latMax: 24, lonMin: 58, lonMax: 66, weight:  4 }, // Arabian Sea NW / Oman Sea
    { latMin: 12, latMax: 22, lonMin: 57, lonMax: 65, weight:  4 }, // Arabian Sea north
    { latMin:  5, latMax: 20, lonMin: 81, lonMax: 96, weight: 12 }, // Bay of Bengal (main body)
    { latMin: 18, latMax: 21, lonMin: 82, lonMax: 89, weight:  2 }, // BoB northern (avoids Bangladesh)
    { latMin:  8, latMax: 16, lonMin: 92, lonMax: 99, weight:  3 }, // Andaman Sea
    { latMin:  5, latMax: 12, lonMin: 96, lonMax:100, weight:  2 }, // Nicobar waters
    { latMin: 10, latMax: 14, lonMin: 44, lonMax: 51, weight:  2 }, // Gulf of Aden
    { latMin:  5, latMax: 10, lonMin: 57, lonMax: 80, weight:  5 }, // Equatorial IO
    { latMin: 22, latMax: 25, lonMin: 57, lonMax: 63, weight:  2 }, // Gulf of Oman
    { latMin:  5, latMax: 15, lonMin: 72, lonMax: 79, weight:  4 }, // Lakshadweep / SW coastal waters
    { latMin:  5, latMax: 10, lonMin: 79, lonMax: 82, weight:  2 }, // Waters around Sri Lanka
  ];

  // Total weight for weighted zone selection
  const _zoneWeightTotal = OCEAN_ZONES.reduce((s, z) => s + z.weight, 0);

  // Pick a random point guaranteed to be in open ocean
  function randOceanPoint() {
    let r = _rand() * _zoneWeightTotal;
    let zone = OCEAN_ZONES[OCEAN_ZONES.length - 1];
    for (const z of OCEAN_ZONES) {
      r -= z.weight;
      if (r <= 0) { zone = z; break; }
    }
    const lat = zone.latMin + _rand() * (zone.latMax - zone.latMin);
    const lon = zone.lonMin + _rand() * (zone.lonMax - zone.lonMin);
    return { lat: parseFloat(lat.toFixed(2)), lon: parseFloat(lon.toFixed(2)) };
  }

  // ── ARGO Floats ───────────────────────────────────────────────
  function getARGOFloats() {
    reseed(77);
    const floats = [];
    const count = 48;
    for (let i = 0; i < count; i++) {
      const { lat, lon } = randOceanPoint();
      const profile = getTemperatureProfile(lat, lon, 180);
      floats.push({
        id: `WMO${5900000 + Math.floor(i * 1234)}`,
        lat,
        lon,
        lastReport: new Date(Date.now() - rand(0, 10) * 24 * 3600e3).toISOString().slice(0, 10),
        cycleNumber: Math.floor(rand(1, 300)),
        profile,
        sst: parseFloat(profile[0].toFixed(1)),
        isActive: rand() > 0.15,
      });
    }
    return floats;
  }

  // ── ARGO Deployment Recommendations ──────────────────────────
  function getARGORecommendations(count = 10) {
    reseed(88);
    const reasons = [
      'Data-sparse deep ocean region',
      'High model uncertainty zone',
      'Eddy-active region with sparse coverage',
      'Arabian Sea upwelling boundary',
      'Bay of Bengal halocline region',
      'Thermocline variability hotspot',
      'Monsoon current transition zone',
      'Cyclone passage corridor',
      'OTEC candidate site — validation needed',
      'Cross-basin transport pathway',
    ];
    return Array.from({ length: count }, (_, i) => {
      const { lat, lon } = randOceanPoint();
      return {
        rank: i + 1,
        lat,
        lon,
        uncertainty: parseFloat(rand(0.55, 0.95).toFixed(3)),
        priority: i < 3 ? 'Critical' : i < 6 ? 'High' : 'Medium',
        reason: reasons[i],
      };
    });
  }

  // ── Ocean Events ──────────────────────────────────────────────
  function getEventCatalog() {
    reseed(55);
    const events = [
      {
        id: 'MHW-2026-01',
        type: 'Marine Heatwave',
        category: 'heatwave',
        severity: 'Extreme',
        lat: 15.2, lon: 68.4,
        startDate: '2026-05-12',
        endDate: '2026-06-28',
        duration: 47,
        intensity: 3.8,
        area: 412000,
        confidence: 0.94,
        description: 'Category IV marine heatwave persisting in central Arabian Sea, driven by weakened monsoon onset.',
        basin: 'Arabian Sea',
      },
      {
        id: 'EDDY-2026-07',
        type: 'Anticyclonic Eddy',
        category: 'eddy',
        severity: 'Moderate',
        lat: 12.8, lon: 87.3,
        startDate: '2026-07-03',
        endDate: null,
        duration: null,
        intensity: 2.1,
        area: 78000,
        confidence: 0.89,
        description: 'Persistent anticyclonic eddy in the Bay of Bengal with anomalous warming at 100–300 m.',
        basin: 'Bay of Bengal',
      },
      {
        id: 'CYC-2026-AS',
        type: 'Cyclone Cold Wake',
        category: 'cyclone',
        severity: 'High',
        lat: 20.1, lon: 63.7,
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        duration: 14,
        intensity: 3.1,
        area: 95000,
        confidence: 0.97,
        description: 'Cold wake left by VSCS Varun across central Arabian Sea; SST anomaly −3.4°C, mixed layer deepening.',
        basin: 'Arabian Sea',
      },
      {
        id: 'UPW-2026-01',
        type: 'Coastal Upwelling',
        category: 'upwelling',
        severity: 'High',
        lat: 11.5, lon: 75.5,
        startDate: '2026-06-15',
        endDate: '2026-09-10',
        duration: 87,
        intensity: 2.6,
        area: 22000,
        confidence: 0.91,
        description: 'Strong summer SW monsoon upwelling along Kerala coast; surface temperatures dropped to 23.5°C.',
        basin: 'Arabian Sea',
      },
      {
        id: 'MHW-2026-BOB',
        type: 'Marine Heatwave',
        category: 'heatwave',
        severity: 'Moderate',
        lat: 16.4, lon: 91.2,
        startDate: '2026-04-20',
        endDate: '2026-05-18',
        duration: 28,
        intensity: 2.4,
        area: 185000,
        confidence: 0.86,
        description: 'Pre-monsoon marine heatwave in Bay of Bengal; elevated SST of 32.1°C recorded over northern BoB.',
        basin: 'Bay of Bengal',
      },
      {
        id: 'THERMO-2026-01',
        type: 'Thermocline Shift',
        category: 'anomaly',
        severity: 'Moderate',
        lat: 8.3, lon: 82.1,
        startDate: '2026-07-15',
        endDate: '2026-08-30',
        duration: 46,
        intensity: 1.8,
        area: 68000,
        confidence: 0.78,
        description: 'Thermocline shoaling event in equatorial Indian Ocean; thermocline depth decreased by 35 m.',
        basin: 'Equatorial IO',
      },
    ];
    return events;
  }

  // ── Fisheries Intelligence ────────────────────────────────────
  function getFishingZones() {
    reseed(33);
    const zones = [];
    const hotspots = [
      { lat: 9.5, lon: 76.0, radius: 3, species: 'Skipjack Tuna', score: 0.92 },
      { lat: 12.0, lon: 72.5, radius: 2.5, species: 'Yellowfin Tuna', score: 0.88 },
      { lat: 20.5, lon: 65.0, radius: 2, species: 'Indian Mackerel', score: 0.82 },
      { lat: 7.5, lon: 82.0, radius: 3.5, species: 'Bigeye Tuna', score: 0.79 },
      { lat: 14.0, lon: 74.0, radius: 2, species: 'Seer Fish', score: 0.85 },
      { lat: 11.0, lon: 65.5, radius: 4, species: 'Flying Fish', score: 0.73 },
      { lat: 9.0, lon: 77.0, radius: 1.5, species: 'Red Snapper', score: 0.76 },
    ];
    const field = [];
    for (const lat of GRID.lats) {
      const row = [];
      for (const lon of GRID.lons) {
        let score = 0.1 + 0.05 * fbm(lon * 0.2, lat * 0.2, 3, 5, 33);
        for (const h of hotspots) {
          const d = Math.sqrt((lat - h.lat) ** 2 + (lon - h.lon) ** 2);
          if (d < h.radius * 2) {
            score += h.score * Math.exp(-d / h.radius);
          }
        }
        row.push(parseFloat(Math.min(1, score).toFixed(3)));
      }
      field.push(row);
    }
    return { field, hotspots };
  }

  function getFisheriesAdvisory() {
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    return {
      date: today,
      region: 'North Indian Ocean',
      advisories: [
        {
          zone: 'Southwest Arabian Sea',
          coords: '8°N–14°N, 60°E–73°E',
          optimalDepth: '40–80 m',
          species: ['Yellowfin Tuna', 'Skipjack Tuna'],
          suitability: 'High',
          confidence: 0.89,
          notes: 'Convergence zone between warm water pool and coastal upwelling; productive thermocline depth. Favorable wind and current conditions.',
        },
        {
          zone: 'Southeast Bay of Bengal',
          coords: '7°N–12°N, 83°E–92°E',
          optimalDepth: '30–60 m',
          species: ['Bigeye Tuna', 'Mahi-mahi'],
          suitability: 'Moderate',
          confidence: 0.77,
          notes: 'Active eddy field creating convergence zones. Subsurface oxygen above 3 mg/L at optimal depth range.',
        },
        {
          zone: 'Lakshadweep Sea',
          coords: '9°N–13°N, 71°E–76°E',
          optimalDepth: '20–50 m',
          species: ['Skipjack Tuna', 'Barracuda', 'Red Snapper'],
          suitability: 'Very High',
          confidence: 0.93,
          notes: 'Prime fishing zone driven by SST frontal boundary and strong chlorophyll enhancement along seamount chain.',
        },
      ],
    };
  }

  // ── OTEC Sites ────────────────────────────────────────────────
  function getOTECSites() {
    reseed(66);
    const sites = [
      { name: 'Lakshadweep Ridge', lat: 10.8, lon: 72.3, gradientDelta: 22.4, bathymetry: 2800, distCoast: 220, stability: 0.91, score: 0.94 },
      { name: 'Andaman Deep',      lat: 11.2, lon: 93.8, gradientDelta: 21.8, bathymetry: 3200, distCoast: 180, stability: 0.88, score: 0.91 },
      { name: 'SSIO South',        lat: 6.5,  lon: 75.2, gradientDelta: 23.1, bathymetry: 3600, distCoast: 310, stability: 0.94, score: 0.93 },
      { name: 'Arabian Sea West',  lat: 14.0, lon: 60.5, gradientDelta: 19.6, bathymetry: 4100, distCoast: 850, stability: 0.82, score: 0.82 },
      { name: 'BoB Central',       lat: 13.5, lon: 86.0, gradientDelta: 20.5, bathymetry: 3900, distCoast: 430, stability: 0.85, score: 0.85 },
      { name: 'Maldives East',     lat: 5.5,  lon: 76.5, gradientDelta: 23.5, bathymetry: 2900, distCoast: 120, stability: 0.92, score: 0.95 },
      { name: 'Kerala Offshore',   lat: 9.0,  lon: 74.0, gradientDelta: 21.0, bathymetry: 2400, distCoast: 95,  stability: 0.87, score: 0.89 },
      { name: 'Sri Lanka South',   lat: 6.0,  lon: 82.0, gradientDelta: 22.2, bathymetry: 3100, distCoast: 160, stability: 0.9,  score: 0.92 },
    ];
    return sites.sort((a, b) => b.score - a.score);
  }

  function getOTECGradientField(seed = 0) {
    const surfaceField = generateSSTField(180, seed);
    const deepField    = generateTemperatureAtDepth(1000, 180, seed);
    const field = [];
    for (let i = 0; i < GRID.lats.length; i++) {
      const row = [];
      for (let j = 0; j < GRID.lons.length; j++) {
        const gradient = surfaceField[i][j] - deepField[i][j];
        row.push(parseFloat(Math.max(0, gradient).toFixed(2)));
      }
      field.push(row);
    }
    return field;
  }

  // ── Pipeline Status ───────────────────────────────────────────
  function getPipelineStatus() {
    const now = new Date();
    const fmt = d => d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    const sources = [
      { id: 'SST',    name: 'Sea Surface Temperature', provider: 'CMEMS / MODIS',     status: 'live',    coverage: 94, quality: 0.96, lastUpdate: fmt(new Date(now - 2 * 3600e3)),  latencyHrs: 2,  variable: 'SST',  unit: '°C' },
      { id: 'SSS',    name: 'Sea Surface Salinity',    provider: 'SMOS / Aquarius',   status: 'live',    coverage: 88, quality: 0.91, lastUpdate: fmt(new Date(now - 6 * 3600e3)),  latencyHrs: 6,  variable: 'SSS',  unit: 'PSU' },
      { id: 'SSH',    name: 'Sea Surface Height',      provider: 'CMEMS AltiKa',      status: 'live',    coverage: 92, quality: 0.94, lastUpdate: fmt(new Date(now - 1 * 3600e3)),  latencyHrs: 1,  variable: 'SSH',  unit: 'm' },
      { id: 'CUR',    name: 'Surface Currents',        provider: 'OSCAR / CMEMS',     status: 'live',    coverage: 90, quality: 0.90, lastUpdate: fmt(new Date(now - 3 * 3600e3)),  latencyHrs: 3,  variable: 'U/V',  unit: 'm/s' },
      { id: 'WIND',   name: 'Surface Winds',           provider: 'SCATSAT-2 / ERA5',  status: 'live',    coverage: 97, quality: 0.97, lastUpdate: fmt(new Date(now - 1 * 3600e3)),  latencyHrs: 1,  variable: 'U/V',  unit: 'm/s' },
      { id: 'GLORYS', name: 'GLORYS Reanalysis',       provider: 'Copernicus Marine', status: 'live',    coverage: 100,quality: 0.99, lastUpdate: fmt(new Date(now - 24 * 3600e3)), latencyHrs: 24, variable: '3D',   unit: 'multi' },
      { id: 'ARGO',   name: 'ARGO Float Profiles',     provider: 'INCOIS / Argo GDAC',status: 'live',    coverage: 62, quality: 0.98, lastUpdate: fmt(new Date(now - 4 * 3600e3)),  latencyHrs: 4,  variable: 'T/S',  unit: 'profile' },
      { id: 'WOA23',  name: 'WOA23 Climatology',       provider: 'NOAA NCEI',         status: 'idle',    coverage: 100,quality: 0.95, lastUpdate: '2023-01-01 00:00 UTC',            latencyHrs: null, variable: 'T/S', unit: 'multi' },
      { id: 'GEBCO',  name: 'GEBCO Bathymetry',        provider: 'GEBCO 2023',        status: 'idle',    coverage: 100,quality: 0.99, lastUpdate: '2023-06-01 00:00 UTC',            latencyHrs: null, variable: 'Depth', unit: 'm' },
      { id: 'CHL',    name: 'Chlorophyll-a',           provider: 'MODIS / VIIRS',     status: 'live',    coverage: 78, quality: 0.85, lastUpdate: fmt(new Date(now - 5 * 3600e3)),  latencyHrs: 5,  variable: 'Chl',  unit: 'mg/m³' },
      { id: 'DO',     name: 'Dissolved Oxygen',        provider: 'WOA / ARGO BGC',    status: 'warning', coverage: 45, quality: 0.80, lastUpdate: fmt(new Date(now - 18 * 3600e3)), latencyHrs: 18, variable: 'DO',   unit: 'ml/L' },
      { id: 'CYC',    name: 'Cyclone Tracks',          provider: 'RSMMC / IBTrACS',   status: 'live',    coverage: 100,quality: 0.99, lastUpdate: fmt(new Date(now - 1 * 3600e3)),  latencyHrs: 1,  variable: 'Track',unit: 'hPa/ms' },
    ];
    const model = {
      status: 'running',
      lastRun: fmt(new Date(now - 2 * 3600e3)),
      runDurationMin: 14.7,
      nextRun: fmt(new Date(now + 22 * 3600e3)),
      totalPredictions: 2847,
      argo_validated: 1248,
      meanRMSE: 1.24,
      gpuUsage: 72,
      memoryGB: 38.4,
    };
    return { sources, model };
  }

  // ── Team Info ─────────────────────────────────────────────────
  function getTeamInfo() {
    return {
      teamName: 'JalVedh',
      institution: 'Smart India Hackathon 2026',
      problemStatement: 'SIH2026-OCN-07: Satellite-Embedding-Based Deep Learning for Subsurface Ocean Reconstruction',
      members: [
        { name: 'Aditya Patil',     role: 'Team Lead / ML Engineer',    emoji: 'AP', skills: ['Deep Learning', 'PyTorch', 'Ocean ML'] },
        { name: 'Priya Sharma',     role: 'Data Science Lead',          emoji: 'PS', skills: ['Data Fusion', 'Python', 'Xarray'] },
        { name: 'Arjun Nair',       role: 'Oceanography Expert',        emoji: 'AN', skills: ['Physical Oceanography', 'GLORYS', 'ARGO'] },
        { name: 'Sneha Patel',      role: 'Backend / API Engineer',     emoji: 'SP', skills: ['FastAPI', 'PostgreSQL', 'Docker'] },
        { name: 'Rohan Desai',      role: 'Frontend / Visualization',   emoji: 'RD', skills: ['D3.js', 'Three.js', 'Plotly'] },
        { name: 'Kavya Menon',      role: 'Geospatial Engineer',        emoji: 'KM', skills: ['GDAL', 'Leaflet', 'GEE'] },
      ],
    };
  }

  // ── Exposure as global ────────────────────────────────────────
  global.OceanEngine = {
    GRID, DEPTHS, BASINS, SEASONS, CHOKEPOINTS,
    generateSSTField,
    generateSSHField,
    generateTemperatureAtDepth,
    generateUncertaintyField,
    getTemperatureProfile,
    getSoundSpeedProfile,
    getValidationMetrics,
    getARGOFloats,
    getARGORecommendations,
    getEventCatalog,
    getFishingZones,
    getFisheriesAdvisory,
    getOTECSites,
    getOTECGradientField,
    getPipelineStatus,
    getTeamInfo,
    getSSTAtPoint,
    reseed,
    rand, randGauss,
  };

})(window);
