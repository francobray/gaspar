import express from 'express';

const router = express.Router();

// GET /api/health
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// GET /api/health/ready
router.get('/ready', (req, res) => {
  // Check if required environment variables are set
  const requiredEnvVars = ['DEEPGRAM_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return res.status(503).json({
      status: 'not ready',
      message: 'Missing required environment variables',
      missing: missingVars,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    status: 'ready',
    message: 'All required services are available',
    timestamp: new Date().toISOString()
  });
});

export default router; 