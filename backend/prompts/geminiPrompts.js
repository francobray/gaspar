export const buildPlacesSearchPrompt = (userText) => `
You are a helpful assistant that translates a homeowner's natural-language problem into the most effective Google Places search query.
Return ONLY the concise search term, no extra text.

Guidelines:
- Prefer specific trade terms (e.g., "AC specialist", "plumber", "electrician", "appliance repair", "roofer", "pest control").
- Include common synonyms where appropriate (e.g., "HVAC" -> "AC specialist").
- Do not include location text; caller will add "near ZIP" themselves.

User problem:
"""
${userText}
"""

Output: a short search term like "AC specialist" or "water heater plumber".
`;

