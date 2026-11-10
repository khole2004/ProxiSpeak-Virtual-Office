/**
 * ProxiSpeak Sliding-Window In-Memory Rate Limiter Middleware
 * Protects HTTP endpoints and real-time WebRTC signaling actions from request flooding,
 * denial-of-service attempts, and unauthorized automated probing.
 */

const requestLog = new Map();

/**
 * Creates an Express rate limiting middleware.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Sliding window duration in milliseconds (default: 60000ms = 1 min)
 * @param {number} options.max - Maximum requests permitted per window (default: 100)
 * @param {string} options.message - Error message delivered upon limit exhaustion
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 100,
  message = "Too many requests from this IP, please try again later.",
} = {}) {
  // Periodically purge stale records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestLog.entries()) {
      const activeTimestamps = timestamps.filter((time) => now - time < windowMs);
      if (activeTimestamps.length === 0) {
        requestLog.delete(ip);
      } else {
        requestLog.set(ip, activeTimestamps);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown-ip";

    const now = Date.now();
    const timestamps = requestLog.get(clientIp) || [];
    const recent = timestamps.filter((time) => now - time < windowMs);

    if (recent.length >= max) {
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
      return res.status(429).json({
        success: false,
        error: "RateLimitExceeded",
        message,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
    }

    recent.push(now);
    requestLog.set(clientIp, recent);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - recent.length));
    next();
  };
}

module.exports = {
  createRateLimiter,
};
