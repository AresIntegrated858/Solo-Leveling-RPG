// Geocoder — converts location strings to lat/lng coordinates
// Uses Nominatim (OpenStreetMap) — free, no API key, accurate worldwide
// Electron has no CORS restrictions so this works directly

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const HEADERS = {
  'User-Agent': 'SoloLevelingRPG/1.0 (desktop game)',
  'Accept-Language': 'en',
};

// Cache to avoid repeat calls for same location string
const geocodeCache = new Map();

/**
 * Geocode a location string to { lat, lng }
 * Returns null if geocoding fails — caller falls back to hometown coords
 */
export async function geocodeLocation(locationString) {
  if (!locationString) return null;

  // Strip game-specific prefixes so nominatim can find the real place
  // e.g. "Gate B-12, Gangnam District, Seoul" → try progressively shorter
  const cleaned = stripGameTerms(locationString);
  if (!cleaned) return null;

  // Check cache first
  if (geocodeCache.has(cleaned)) return geocodeCache.get(cleaned);

  // Try progressively shorter versions of the location
  const candidates = buildCandidates(cleaned);

  for (const candidate of candidates) {
    const result = await fetchGeocode(candidate);
    if (result) {
      geocodeCache.set(cleaned, result);
      return result;
    }
  }

  // Cache null result to avoid repeated failed attempts
  geocodeCache.set(cleaned, null);
  return null;
}

function stripGameTerms(location) {
  return location
    .replace(/\b(Gate|Dungeon|Raid|Instance|Boss|Interior|Exterior|Floor|Level|Stage)\s*[A-Z0-9\-]*/gi, '')
    .replace(/\b(B-Rank|A-Rank|S-Rank|C-Rank|D-Rank|E-Rank)\b/gi, '')
    .replace(/\b(Hunter Association|Guild|HQ|Headquarters|Branch|Office)\b/gi, '')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,|,\s*$/g, '')
    .trim();
}

function buildCandidates(location) {
  // Split by comma and build progressively broader queries
  // "Gangnam District, Seoul, South Korea" → try all, then "Seoul, South Korea", then "South Korea"
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  const candidates = [];
  for (let i = 0; i < parts.length; i++) {
    candidates.push(parts.slice(i).join(', '));
  }
  return candidates;
}

async function fetchGeocode(query) {
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    const { lat, lon } = data[0];
    return { lat: parseFloat(lat), lng: parseFloat(lon) };
  } catch {
    return null;
  }
}

/**
 * Determine appropriate zoom level based on location type
 * City → 10, Country → 5, Neighborhood → 13
 */
export function getZoomForLocation(locationString) {
  if (!locationString) return 10;
  const lower = locationString.toLowerCase();
  // Dungeon/gate interior — keep at city zoom
  if (/gate|dungeon|floor|interior|instance/.test(lower)) return 11;
  // Country level
  if (lower.split(',').length <= 1 && lower.length < 20) return 5;
  // City/district
  return 11;
}
