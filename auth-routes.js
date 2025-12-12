const express = require('express');
const bcrypt = require('bcrypt');
const validator = require('validator');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('./database');
const { sendPasswordResetEmail } = require('./email-service');

// Rate limiting for login attempts
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Helper function to log user activity
async function logActivity(userId, action, entityType = null, entityId = null, details = null, ipAddress = null) {
    const db = getDb();
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO user_activity (user_id, action, entity_type, entity_id, details, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// Helper function to log login attempts
async function logLoginAttempt(email, ipAddress, success) {
    const db = getDb();
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)`,
            [email, ipAddress, success ? 1 : 0],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        // Validation
        if (!username || !email || !password || !displayName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters long' });
        }

        // Check if user already exists
        const db = getDb();
        const existingUser = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create user
        const userId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO users (username, email, display_name, password_hash, role, verification_token, is_active)
                 VALUES (?, ?, ?, ?, 'user', ?, 1)`,
                [username, email, displayName, passwordHash, verificationToken],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        // Log activity
        await logActivity(userId, 'register', null, null, null, req.ip);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: userId,
                username,
                email,
                displayName,
                role: 'user'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// POST /api/auth/login - User login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = getDb();

        // Get user
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        // Log login attempt
        await logLoginAttempt(email, req.ip, !!user);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is disabled. Please contact administrator.' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        await logLoginAttempt(email, req.ip, passwordMatch);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        // Set cookie expiration based on "remember me"
        if (rememberMe) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        } else {
            req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
        }

        // Log activity
        await logActivity(user.id, 'login', null, null, { rememberMe }, req.ip);

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                role: user.role,
                avatarUrl: user.avatar_url
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
    const userId = req.session.userId;

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }

        // Log activity
        if (userId) {
            logActivity(userId, 'logout', null, null, null, req.ip).catch(console.error);
        }

        res.json({ message: 'Logout successful' });
    });
});

// GET /api/auth/me - Get current user
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = getDb();
    db.get(
        `SELECT id, username, email, display_name, role, avatar_url, bio, created_at, last_login
         FROM users WHERE id = ?`,
        [req.session.userId],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to get user' });
            }

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    displayName: user.display_name,
                    role: user.role,
                    avatarUrl: user.avatar_url,
                    bio: user.bio,
                    createdAt: user.created_at,
                    lastLogin: user.last_login
                }
            });
        }
    );
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { displayName, bio, avatarUrl } = req.body;
        const db = getDb();

        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE users SET display_name = ?, bio = ?, avatar_url = ? WHERE id = ?`,
                [displayName, bio, avatarUrl, req.session.userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Log activity
        await logActivity(req.session.userId, 'update_profile', 'user', req.session.userId, null, req.ip);

        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        const db = getDb();

        // Get current user
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT password_hash FROM users WHERE id = ?', [req.session.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [newPasswordHash, req.session.userId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Log activity
        await logActivity(req.session.userId, 'change_password', 'user', req.session.userId, null, req.ip);

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validator.isEmail(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        const db = getDb();

        // Check if user exists
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, email, display_name FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

        // Save reset token
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
                [resetToken, resetTokenExpires.toISOString(), user.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Send password reset email
        await sendPasswordResetEmail(user.email, user.display_name, resetToken);

        // Log activity
        await logActivity(user.id, 'request_password_reset', 'user', user.id, null, req.ip);

        res.json({ message: 'If an account exists with that email, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        const db = getDb();

        // Find user with valid token
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime("now")',
                [token],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
                [passwordHash, user.id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Log activity
        await logActivity(user.id, 'reset_password', 'user', user.id, null, req.ip);

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// GET /api/auth/users - Get all users (admin only)
router.get('/users', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const db = getDb();
        const users = await new Promise((resolve, reject) => {
            db.all(
                `SELECT id, username, email, display_name, role, avatar_url, is_active, created_at, last_login
                 FROM users ORDER BY created_at DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.json({ users });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// PUT /api/auth/users/:id/role - Update user role (admin only)
router.put('/users/:id/role', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'editor', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const db = getDb();
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Log activity
        await logActivity(req.session.userId, 'update_user_role', 'user', parseInt(id), { newRole: role }, req.ip);

        res.json({ message: 'User role updated successfully' });

    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// PUT /api/auth/users/:id/toggle-active - Enable/disable user (admin only)
router.put('/users/:id/toggle-active', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const db = getDb();
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Log activity
        await logActivity(req.session.userId, isActive ? 'enable_user' : 'disable_user', 'user', parseInt(id), null, req.ip);

        res.json({ message: `User ${isActive ? 'enabled' : 'disabled'} successfully` });

    } catch (error) {
        console.error('Toggle active error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

module.exports = router;
