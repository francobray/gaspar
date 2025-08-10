import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import { createClient } from '@deepgram/sdk';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  },
});

// Validation middleware
const validateTranscriptionRequest = [
  body('model').optional().isString().isIn(['nova-2', 'nova', 'enhanced', 'base']),
  body('language').optional().isString().isIn(['en-US', 'en-GB', 'es-ES', 'es-AR', 'fr-FR', 'de-DE']),
  body('smartFormat').optional().isBoolean(),
  body('punctuate').optional().isBoolean(),
  body('interimResults').optional().isBoolean(),
];

// Initialize Deepgram client
const initializeDeepgram = () => {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error('Deepgram API key not configured');
  }
  return createClient(apiKey);
};

// POST /api/deepgram/transcribe
router.post('/transcribe', 
  upload.single('audio'),
  validateTranscriptionRequest,
  async (req, res) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const startTime = Date.now();
    
    console.log(`[${requestId}] 🎤 Transcription request received`);
    console.log(`[${requestId}] 📊 Request details:`, {
      fileSize: req.file?.size || 'No file',
      model: req.body.model || 'default',
      language: req.body.language || 'default',
      smartFormat: req.body.smartFormat,
      punctuate: req.body.punctuate,
      interimResults: req.body.interimResults,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(`[${requestId}] ❌ Validation failed:`, errors.array());
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      // Check if audio file was uploaded
      if (!req.file) {
        console.log(`[${requestId}] ❌ No audio file provided`);
        return res.status(400).json({
          error: 'No audio file provided',
          message: 'Please upload an audio file'
        });
      }

      console.log(`[${requestId}] 🔑 Initializing Deepgram client...`);
      const deepgram = initializeDeepgram();
      
      // Prepare transcription options - use minimal options for prerecorded audio
      const options = {
        model: req.body.model || 'nova-2',
        language: req.body.language || 'en-US',
        smart_format: req.body.smartFormat !== 'false',
        punctuate: req.body.punctuate !== 'false',
      };

      console.log(`[${requestId}] ⚙️ Transcription options:`, { 
        ...options, 
        audioSize: req.file.size,
        apiKeyLength: process.env.DEEPGRAM_API_KEY?.length || 0
      });

      // Transcribe the audio
      console.log(`[${requestId}] 🚀 Sending request to Deepgram API...`);
      console.log(`[${requestId}] 📊 File details:`, {
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        bufferLength: req.file.buffer.length
      });
      const transcriptionStartTime = Date.now();
      
      const transcription = await deepgram.listen.prerecorded.transcribeFile(
        req.file.buffer,
        options
      );
      
      const transcriptionDuration = Date.now() - transcriptionStartTime;
      console.log(`[${requestId}] ✅ Deepgram API response received in ${transcriptionDuration}ms`);
      console.log(`[${requestId}] 🔍 Deepgram response structure:`, {
        hasResult: !!transcription.result,
        hasResults: !!transcription.results,
        resultType: typeof transcription.result,
        resultsType: typeof transcription.results,
        fullResponse: JSON.stringify(transcription, null, 2).substring(0, 500) + '...'
      });

      // Add detailed debugging for the result structure
      console.log(`[${requestId}] 🔍 Detailed result debugging:`, {
        resultExists: !!transcription.result,
        resultKeys: transcription.result ? Object.keys(transcription.result) : 'N/A',
        channels: transcription.result?.channels,
        channelsLength: transcription.result?.channels?.length,
        firstChannel: transcription.result?.channels?.[0],
        firstChannelKeys: transcription.result?.channels?.[0] ? Object.keys(transcription.result.channels[0]) : 'N/A',
        alternatives: transcription.result?.channels?.[0]?.alternatives,
        alternativesLength: transcription.result?.channels?.[0]?.alternatives?.length,
        firstAlternative: transcription.result?.channels?.[0]?.alternatives?.[0],
        firstAlternativeKeys: transcription.result?.channels?.[0]?.alternatives?.[0] ? Object.keys(transcription.result.channels[0].alternatives[0]) : 'N/A'
      });

      // Normalize Deepgram response across API versions
      // v2 shape: { result: { metadata, results: { channels: [ { alternatives: [ { transcript } ] } ] } } }
      // legacy shape: { results: { channels: [ { alternatives: [ { transcript } ] } ] } }
      const dgRoot = transcription?.result ?? transcription?.results ?? transcription;
      const dgChannels = dgRoot?.results?.channels ?? dgRoot?.channels;
      const dgAlternative = dgChannels?.[0]?.alternatives?.[0];

      // Normalize metadata location
      const dgMetadata = (transcription?.result && transcription.result.metadata)
        || transcription?.metadata
        || dgRoot?.metadata
        || null;
      
      if (!dgAlternative) {
        console.log(`[${requestId}] ❌ No transcription result received from Deepgram`);
        return res.status(500).json({
          error: 'Transcription failed',
          message: 'No transcription result received',
          debug: {
            hasResult: !!transcription.result,
            hasResults: !!transcription.results,
            resultType: typeof transcription.result,
            resultsType: typeof transcription.results,
            hasDgRoot: !!dgRoot,
            hasDgChannels: !!dgChannels,
            alternativesLength: dgChannels?.[0]?.alternatives?.length,
            fullResponse: JSON.stringify(transcription, null, 2).substring(0, 200) + '...'
          }
        });
      }

      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] 🎉 Transcription completed successfully in ${totalDuration}ms`);
      console.log(`[${requestId}] 📝 Result:`, {
        transcriptLength: (dgAlternative.transcript || dgAlternative.text || '').length,
        confidence: dgAlternative.confidence,
        wordCount: dgAlternative.words?.length || 0,
        audioDuration: dgMetadata?.duration,
        processingTime: transcriptionDuration,
        totalTime: totalDuration
      });

      res.json({
        success: true,
        transcript: dgAlternative.transcript || dgAlternative.text || '',
        confidence: dgAlternative.confidence,
        words: dgAlternative.words || [],
        metadata: {
          model: options.model,
          language: options.language,
          audioDuration: dgMetadata?.duration,
          audioSize: req.file.size,
          processingTime: transcriptionDuration,
          totalTime: totalDuration,
          requestId: requestId
        }
      });

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error(`[${requestId}] ❌ Transcription error after ${totalDuration}ms:`, {
        error: error.message,
        stack: error.stack,
        code: error.code,
        status: error.status
      });
      
      if (error.message?.includes('API key')) {
        console.log(`[${requestId}] 🔑 Authentication failed - invalid API key`);
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid Deepgram API key'
        });
      }
      
      if (error.message?.includes('quota') || error.message?.includes('credits')) {
        console.log(`[${requestId}] 💰 Quota exceeded - insufficient credits`);
        return res.status(402).json({
          error: 'Quota exceeded',
          message: 'Deepgram quota or credits exceeded'
        });
      }
      
      console.log(`[${requestId}] 💥 General transcription error`);
      res.status(500).json({
        error: 'Transcription failed',
        message: error.message || 'An error occurred during transcription',
        requestId: requestId
      });
    }
  }
);

// POST /api/deepgram/validate-key
router.post('/validate-key', async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const startTime = Date.now();
  
  console.log(`[${requestId}] 🔑 API key validation request received`);
  console.log(`[${requestId}] 📊 Request details:`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    apiKeyLength: process.env.DEEPGRAM_API_KEY?.length || 0
  });
  
  try {
    console.log(`[${requestId}] 🔑 Initializing Deepgram client for validation...`);
    const deepgram = initializeDeepgram();
    
    // Make a simple API call to validate the key
    console.log(`[${requestId}] 🚀 Testing API key with sample audio...`);
    const validationStartTime = Date.now();
    
    const response = await deepgram.listen.prerecorded.transcribeUrl(
      'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav',
      { model: 'nova-2' }
    );
    
    const validationDuration = Date.now() - validationStartTime;
    const totalDuration = Date.now() - startTime;
    
    console.log(`[${requestId}] ✅ API key validation successful in ${validationDuration}ms`);
    console.log(`[${requestId}] 📝 Validation result:`, {
      model: 'nova-2',
      responseTime: validationDuration,
      totalTime: totalDuration,
      hasResults: !!response.results
    });
    
    res.json({
      success: true,
      message: 'API key is valid',
      model: 'nova-2',
      validationTime: validationDuration,
      requestId: requestId
    });
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ API key validation failed after ${totalDuration}ms:`, {
      error: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status
    });
    
    if (error.message?.includes('API key') || error.message?.includes('unauthorized')) {
      console.log(`[${requestId}] 🔑 Authentication failed - invalid API key`);
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided Deepgram API key is invalid',
        requestId: requestId
      });
    }
    
    console.log(`[${requestId}] 💥 General validation error`);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message || 'Failed to validate API key',
      requestId: requestId
    });
  }
});

// GET /api/deepgram/models
router.get('/models', async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const startTime = Date.now();
  
  console.log(`[${requestId}] 📋 Models fetch request received`);
  console.log(`[${requestId}] 📊 Request details:`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    apiKeyLength: process.env.DEEPGRAM_API_KEY?.length || 0
  });
  
  try {
    console.log(`[${requestId}] 🔑 Initializing Deepgram client for models fetch...`);
    const deepgram = initializeDeepgram();
    
    console.log(`[${requestId}] 🚀 Fetching available models...`);
    const fetchStartTime = Date.now();
    
    const models = await deepgram.manage.getModels();
    
    const fetchDuration = Date.now() - fetchStartTime;
    const totalDuration = Date.now() - startTime;
    
    console.log(`[${requestId}] ✅ Models fetched successfully in ${fetchDuration}ms`);
    console.log(`[${requestId}] 📝 Models result:`, {
      modelCount: models.models?.length || 0,
      fetchTime: fetchDuration,
      totalTime: totalDuration
    });
    
    res.json({
      success: true,
      models: models.models || [],
      fetchTime: fetchDuration,
      requestId: requestId
    });
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Models fetch failed after ${totalDuration}ms:`, {
      error: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status
    });
    
    res.status(500).json({
      error: 'Failed to fetch models',
      message: error.message || 'An error occurred while fetching models',
      requestId: requestId
    });
  }
});

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Audio file must be less than 10MB'
      });
    }
  }
  
  if (error.message === 'Only audio files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only audio files are allowed'
    });
  }
  
  next(error);
});

export default router; 