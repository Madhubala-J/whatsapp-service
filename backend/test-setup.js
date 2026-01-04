/**
 * Validate required environment variables
 * Print clear errors if missing
 */

const requiredVars = [
  'WHATSAPP_TOKEN',
  'PHONE_NUMBER_ID',
  'VERIFY_TOKEN',
  'HAIINDEXER_API_URL',
];

// Optional but recommended for production
const recommendedVars = [
  'WHATSAPP_APP_SECRET', // Required for webhook signature validation
];

function validateEnv() {
  const missing = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these in your .env file or environment.');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
  
  // Warn about missing recommended variables
  const missingRecommended = recommendedVars.filter(varName => !process.env[varName]);
  if (missingRecommended.length > 0) {
    console.warn('⚠️  Missing recommended environment variables (may affect security/features):');
    missingRecommended.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
  }
}

// Run validation if called directly
if (require.main === module) {
  validateEnv();
}

module.exports = {
  validateEnv,
};

