import express from 'express';
import { body, validationResult } from 'express-validator';

const router = express.Router();

const getMapsKey = () => process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

router.post(
  '/textsearch',
  [body('query').isString().isLength({ min: 2 }), body('zipCode').isString().isLength({ min: 3 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { query, zipCode } = req.body;
    const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const key = getMapsKey();
    if (!key) {
      console.warn(`[${requestId}] 🗺️ Places request blocked: missing Google Maps key`);
      return res.status(503).json({ error: 'Maps key missing' });
    }

    const q = encodeURIComponent(`${query} near ${zipCode}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${key}`;
    console.log(`[${requestId}] 🗺️ Places TextSearch →`, { query, zipCode });

    const start = Date.now();
    try {
      const resp = await fetch(url);
      const json = await resp.json();
      const latencyMs = Date.now() - start;
      const count = Array.isArray(json.results) ? json.results.length : 0;
      console.log(`[${requestId}] ✅ Places response`, {
        status: json.status,
        results: count,
        latencyMs,
        sample: json.results?.slice(0, 3)?.map(r => ({ name: r.name, addr: r.formatted_address })) || []
      });

      return res.json({
        success: true,
        status: json.status,
        results: json.results || [],
      });
    } catch (err) {
      console.error(`[${requestId}] ❌ Places error`, { message: err.message });
      return res.status(500).json({ error: 'Places failed', message: err.message });
    }
  }
);

export default router;

