/**
 * Service for sending messages via WhatsApp Cloud API
 */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
const { fetchWithRetry } = require('../utils/retryWithTimeout');
const { splitMessageWithIndicators } = require('../utils/messageSplitter');

// WhatsApp message length limit (UTF-8 characters)
const WHATSAPP_MESSAGE_MAX_LENGTH = 4096;

// Configuration for message splitting
const ENABLE_MESSAGE_SPLITTING = process.env.ENABLE_MESSAGE_SPLITTING !== 'false'; // Default: true

// Configuration
const API_TIMEOUT_MS = parseInt(process.env.WHATSAPP_API_TIMEOUT_MS || '15000', 10); // 15 seconds default
const API_MAX_RETRIES = parseInt(process.env.WHATSAPP_API_MAX_RETRIES || '2', 10);
const API_RETRY_DELAY_MS = parseInt(process.env.WHATSAPP_API_RETRY_DELAY_MS || '1000', 10);

/**
 * Validate message length for WhatsApp
 * @param {string} message - Message text
 * @throws {Error} If message exceeds WhatsApp limit
 */
function validateMessageLength(message) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message must be a non-empty string');
  }

  // WhatsApp limit is 4096 UTF-8 characters
  if (message.length > WHATSAPP_MESSAGE_MAX_LENGTH) {
    throw new Error(
      `Message length (${message.length}) exceeds WhatsApp limit of ${WHATSAPP_MESSAGE_MAX_LENGTH} characters`
    );
  }
}

/**
 * Send a text message via WhatsApp Cloud API
 * @param {string} to - Recipient phone number (with country code, no +)
 * @param {string} message - Message text
 * @returns {Promise<void>}
 */
async function sendTextMessage(to, message) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    throw new Error('WhatsApp credentials not configured');
  }

  // Validate message length
  validateMessageLength(message);

  try {
    const response = await fetchWithRetry(
      WHATSAPP_API_URL,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message,
          },
        }),
      },
      {
        timeoutMs: API_TIMEOUT_MS,
        maxRetries: API_MAX_RETRIES,
        retryDelayMs: API_RETRY_DELAY_MS,
        // Retry on rate limits (429) and 5xx errors
        shouldRetry: (error, response) => {
          if (error) {
            return error.name === 'AbortError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
          }
          if (response) {
            // Retry on rate limits and server errors
            return response.status === 429 || (response.status >= 500 && response.status < 600);
          }
          return false;
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Message sent successfully:', data);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Send a text message, splitting into multiple messages if necessary
 * @param {string} to - Recipient phone number (with country code, no +)
 * @param {string} message - Message text
 * @returns {Promise<void>}
 */
async function sendTextMessageWithSplitting(to, message) {
  // If message splitting is disabled or message fits, use regular send
  if (!ENABLE_MESSAGE_SPLITTING || message.length <= WHATSAPP_MESSAGE_MAX_LENGTH) {
    return sendTextMessage(to, message);
  }

  // Split message into chunks
  const chunks = splitMessageWithIndicators(message);
  
  if (chunks.length === 1) {
    return sendTextMessage(to, chunks[0]);
  }

  // Send each chunk sequentially with a small delay between them
  // This prevents rate limiting issues and ensures order
  const DELAY_BETWEEN_CHUNKS_MS = 500; // 500ms delay between chunks
  
  for (let i = 0; i < chunks.length; i++) {
    await sendTextMessage(to, chunks[i]);
    
    // Add delay between chunks (except for the last one)
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS_MS));
    }
  }
}

module.exports = {
  sendTextMessage,
  sendTextMessageWithSplitting,
  validateMessageLength,
  WHATSAPP_MESSAGE_MAX_LENGTH,
};

