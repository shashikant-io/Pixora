const { verifySessionToken } = require("../services/firebaseService");

/**
 * Validates Bearer token and populates req.user
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in with your email verification code.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifySessionToken(token);

    if (!decoded || !decoded.email || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid session token. Please re-authenticate.",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token. Please log in again.",
    });
  }
}

/**
 * Restricts endpoint to authenticated users with role = "admin"
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return authenticate(req, res, () => {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Forbidden. Administrator privileges required.",
        });
      }
      next();
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Administrator privileges required.",
    });
  }

  next();
}

/**
 * Restricts endpoint to customers authorized for the specific event (or admins)
 */
function requireCustomerForEvent(req, res, next) {
  if (!req.user) {
    return authenticate(req, res, () => checkEventMatch(req, res, next));
  }
  return checkEventMatch(req, res, next);
}

function checkEventMatch(req, res, next) {
  if (req.user.role === "admin") {
    return next(); // Admins have full access to all events
  }

  if (req.user.role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Valid customer authentication required.",
    });
  }

  const targetEventId =
    (req.body && req.body.eventId) ||
    (req.params && req.params.eventId) ||
    (req.query && req.query.eventId) ||
    (req.user && req.user.eventId);

  if (!targetEventId) {
    return res.status(400).json({
      success: false,
      message: "eventId is required to perform this action.",
    });
  }


  if (!req.user.eventId || req.user.eventId !== targetEventId) {
    return res.status(403).json({
      success: false,
      message: `Access denied. You are only authorized to access photos for event "${req.user.eventId}".`,
    });
  }

  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  requireCustomerForEvent,
};
