/**
 * requireAuth middleware
 * Attach to any route that must be protected.
 * Returns 401 if the request has no valid session.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in to do that.' });
  }
  next();
}

module.exports = { requireAuth };
