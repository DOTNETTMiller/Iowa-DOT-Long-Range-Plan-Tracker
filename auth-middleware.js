// Authentication Middleware
// Protect routes and enforce role-based access control

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: 'Authentication required',
            redirectTo: '/login'
        });
    }
    next();
}

// Middleware to check if user has specific role
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                error: 'Authentication required',
                redirectTo: '/login'
            });
        }

        if (!roles.includes(req.session.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                requiredRole: roles,
                yourRole: req.session.role
            });
        }

        next();
    };
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}

// Middleware to check if user is editor or admin
function requireEditor(req, res, next) {
    return requireRole('editor', 'admin')(req, res, next);
}

// Middleware to attach user info to request
function attachUser(req, res, next) {
    if (req.session && req.session.userId) {
        req.user = {
            id: req.session.userId,
            username: req.session.username,
            role: req.session.role
        };
    }
    next();
}

// Middleware for optional auth (doesn't block if not authenticated)
function optionalAuth(req, res, next) {
    if (req.session && req.session.userId) {
        req.user = {
            id: req.session.userId,
            username: req.session.username,
            role: req.session.role
        };
    }
    next();
}

module.exports = {
    requireAuth,
    requireRole,
    requireAdmin,
    requireEditor,
    attachUser,
    optionalAuth
};
