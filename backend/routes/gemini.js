import express from 'express';
import { body, validationResult } from 'express-validator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildPlacesSearchPrompt } from '../prompts/geminiPrompts.js';

const router = express.Router();

const getClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(key);
};


router.post(
  '/recommend-search',
  [body('text').isString().isLength({ min: 3 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`[gemini] ❌ Validation failed:`, errors.array());
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const { text } = req.body;
    const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const start = Date.now();
    console.log(`[${requestId}] 🤖 Gemini recommend-search request`, {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      textLength: text?.length || 0
    });
    try {
      const genAI = getClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = buildPlacesSearchPrompt(text);
      console.log(`[${requestId}] 📝 Gemini prompt length`, { promptChars: prompt.length });
      const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      const responseText = result.response.text().trim();
      const term = responseText.replace(/^"|"$/g, '').replace(/\n/g, ' ').trim();
      const latencyMs = Date.now() - start;
      console.log(`[${requestId}] ✅ Gemini term`, { term, latencyMs });
      res.json({ success: true, term, requestId, latencyMs });
    } catch (err) {
      console.error(`[${requestId}] ❌ Gemini error:`, {
        message: err.message,
        stack: err.stack
      });
      res.status(500).json({ error: 'Gemini failed', message: err.message, requestId });
    }
  }
);

export default router;

