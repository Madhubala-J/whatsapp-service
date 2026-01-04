const express = require('express');
const webhookHandler = require('./webhookHandler');
// Use Redis-based rate limiter if Redis is available, otherwise fall back to in-memory
const { webhookRateLimiter } = require('./middleware/rateLimiterRedis');

const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Middleware
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'whatsapp-middleware' });
});

// WhatsApp webhook endpoints with rate limiting
app.get('/webhook', webhookRateLimiter, webhookHandler.verify);

// For webhook POST, we need raw body for signature verification
// Parse JSON after storing raw body
app.post('/webhook', webhookRateLimiter, express.raw({ type: 'application/json' }), (req, res, next) => {
  // Store raw body for signature verification
  req.rawBody = req.body;
  // Parse JSON body for processing
  try {
    req.body = JSON.parse(req.body.toString());
  } catch (error) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
}, webhookHandler.handleMessage);

// JSON parser for other routes (if any)
app.use(express.json());

// Export for Vercel
module.exports = app;

// Run server locally if not in Vercel
if (require.main === module) {
  // Validate environment variables
  require('./test-setup').validateEnv();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`WhatsApp middleware running on port ${PORT}`);
  });
}

