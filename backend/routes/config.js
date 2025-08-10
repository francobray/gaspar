import express from 'express';

const router = express.Router();

// Returns the Google Maps JS/Places API key from backend env
router.get('/maps-key', (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || null;
  const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  console.log(`[${requestId}] 🗺️ Config request: Google Maps key ${key ? `FOUND (len=${key.length})` : 'MISSING'}`);
  res.json({ mapsApiKey: key ?? null });
});

export default router;

