import { ProblemSummary } from '../types';

const CATEGORY_KEYWORDS = {
  hvac: ['heating', 'cooling', 'air conditioning', 'a/c', 'ac ', ' ac', 'ac broke', 'furnace', 'hvac', 'thermostat', 'vent', 'duct', 'ac unit', 'heat pump'],
  plumber: ['plumbing', 'pipe', 'leak', 'faucet', 'toilet', 'drain', 'water', 'sink', 'shower', 'bath', 'sewer'],
  electrician: ['electrical', 'electric', 'outlet', 'switch', 'light', 'power', 'wire', 'breaker', 'fuse', 'voltage'],
  roofer: ['roof', 'roofing', 'shingle', 'gutter', 'leak', 'attic', 'chimney', 'flashing'],
  appliance: ['appliance', 'refrigerator', 'washer', 'dryer', 'dishwasher', 'oven', 'stove', 'microwave'],
  pest: ['pest', 'bug', 'insect', 'rodent', 'mouse', 'rat', 'ant', 'roach', 'termite', 'exterminator'],
  general: ['repair', 'fix', 'broken', 'maintenance', 'handyman', 'contractor']
};

const URGENCY_KEYWORDS = {
  emergency: ['emergency', 'urgent', 'immediate', 'asap', 'flooding', 'fire', 'gas leak', 'no power'],
  high: ['today', 'quickly', 'soon', 'major', 'serious', 'broken', 'not working'],
  medium: ['this week', 'few days', 'moderate', 'annoying', 'intermittent'],
  low: ['when convenient', 'eventually', 'minor', 'cosmetic', 'preventive']
};

export const analyzeProblem = async (transcript: string): Promise<ProblemSummary> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const lowerText = transcript.toLowerCase();
  
  // Determine category
  let category: ProblemSummary['category'] = 'general';
  let maxMatches = 0;
  
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      category = cat as ProblemSummary['category'];
    }
  }
  
  // Determine urgency
  let urgency: ProblemSummary['urgency'] = 'medium';
  
  for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      urgency = level as ProblemSummary['urgency'];
      break;
    }
  }
  
  // Extract symptoms (simple keyword extraction)
  const symptoms: string[] = [];
  const symptomKeywords = ['leaking', 'dripping', 'broken', 'not working', 'making noise', 'sparking', 'clogged', 'cracked'];
  
  symptomKeywords.forEach(symptom => {
    if (lowerText.includes(symptom)) {
      symptoms.push(symptom);
    }
  });
  
  // Extract model/serial if mentioned
  const modelMatch = transcript.match(/model\s*[#:]?\s*([A-Z0-9\-]+)/i);
  const serialMatch = transcript.match(/serial\s*[#:]?\s*([A-Z0-9\-]+)/i);
  const modelSerial = modelMatch?.[1] || serialMatch?.[1];
  
  // Generate summary
  const summary = generateSummary(transcript, category, symptoms);
  
  return {
    transcript,
    summary,
    category,
    urgency,
    symptoms,
    modelSerial
  };
};

const generateSummary = (transcript: string, category: string, symptoms: string[]): string => {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const firstSentence = sentences[0]?.trim() || transcript.substring(0, 100);
  
  if (firstSentence.length > 150) {
    return firstSentence.substring(0, 147) + '...';
  }
  
  return firstSentence + (firstSentence.endsWith('.') ? '' : '.');
};