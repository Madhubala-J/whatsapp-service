/**
 * Message Splitting Utility
 * Splits long messages into multiple WhatsApp messages (max 4096 chars each)
 * Improves UX compared to truncation
 */

const WHATSAPP_MESSAGE_MAX_LENGTH = 4096;

/**
 * Split a long message into multiple chunks that fit within WhatsApp limits
 * Attempts to split on sentence boundaries when possible
 * @param {string} message - Message to split
 * @param {number} maxLength - Maximum length per chunk (default: 4096)
 * @returns {string[]} Array of message chunks
 */
function splitMessage(message, maxLength = WHATSAPP_MESSAGE_MAX_LENGTH) {
  if (!message || typeof message !== 'string') {
    return [];
  }

  // If message fits, return as single chunk
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks = [];
  let remaining = message;

  while (remaining.length > 0) {
    // If remaining fits, add it and break
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to find a good split point (sentence boundary)
    const chunk = remaining.substring(0, maxLength);
    
    // Look for sentence endings in the last 200 characters
    const lookbackWindow = Math.min(200, chunk.length);
    const searchArea = chunk.substring(chunk.length - lookbackWindow);
    
    // Try to find sentence boundaries (., !, ?, \n\n)
    const sentenceEndPattern = /[.!?]\s+|\n\n+/;
    const match = searchArea.match(sentenceEndPattern);
    
    let splitIndex;
    if (match && match.index !== undefined) {
      // Found a sentence boundary
      splitIndex = chunk.length - lookbackWindow + match.index + match[0].length;
    } else {
      // No sentence boundary found, try line breaks
      const lineBreakIndex = chunk.lastIndexOf('\n');
      if (lineBreakIndex > maxLength * 0.8) {
        // Only use line break if it's not too early (at least 80% through)
        splitIndex = lineBreakIndex + 1;
      } else {
        // No good break point, split at maxLength
        splitIndex = maxLength;
      }
    }

    // Extract chunk and add continuation indicator
    const chunkText = remaining.substring(0, splitIndex).trim();
    const totalChunks = Math.ceil(message.length / maxLength);
    const chunkNumber = chunks.length + 1;
    
    if (totalChunks > 1) {
      chunks.push(`[${chunkNumber}/${totalChunks}]\n\n${chunkText}`);
    } else {
      chunks.push(chunkText);
    }

    // Remove processed chunk from remaining
    remaining = remaining.substring(splitIndex).trim();
  }

  return chunks;
}

/**
 * Split message and add page indicators
 * @param {string} message - Message to split
 * @returns {string[]} Array of message chunks with page indicators
 */
function splitMessageWithIndicators(message) {
  const chunks = splitMessage(message);
  
  if (chunks.length <= 1) {
    return chunks;
  }

  // Add page indicators to each chunk
  return chunks.map((chunk, index) => {
    // Remove existing indicator if present (from splitMessage)
    const cleanedChunk = chunk.replace(/^\[\d+\/\d+\]\n\n/, '');
    return `[Part ${index + 1}/${chunks.length}]\n\n${cleanedChunk}`;
  });
}

module.exports = {
  splitMessage,
  splitMessageWithIndicators,
  WHATSAPP_MESSAGE_MAX_LENGTH,
};

