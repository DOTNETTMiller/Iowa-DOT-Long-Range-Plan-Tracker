const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const DB_PATH = path.join(__dirname, 'iowa-dot-tracker.db');
let db;

function getDb() {
    if (!db) {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            }
        });
    }
    return db;
}

// Helper function to promisify database queries
function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        getDb().run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        getDb().get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        getDb().all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// API Routes Setup
function setupApiRoutes(app) {

    // ============================================
    // PROJECTS ENDPOINTS
    // ============================================

    // GET all projects with stats
    app.get('/api/projects', async (req, res) => {
        try {
            const projects = await dbAll(`
                SELECT
                    p.*,
                    (SELECT COUNT(*) FROM comments WHERE project_id = p.id) as comment_count,
                    (SELECT COUNT(*) FROM project_likes WHERE project_id = p.id) as like_count
                FROM projects p
                WHERE p.approved = 1
                ORDER BY p.name
            `);
            res.json({ success: true, data: projects });
        } catch (err) {
            console.error('Error fetching projects:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch projects' });
        }
    });

    // GET single project with full details
    app.get('/api/projects/:id', async (req, res) => {
        try {
            const project = await dbGet(`
                SELECT
                    p.*,
                    (SELECT COUNT(*) FROM comments WHERE project_id = p.id) as comment_count,
                    (SELECT COUNT(*) FROM project_likes WHERE project_id = p.id) as like_count
                FROM projects p
                WHERE p.id = ? AND p.approved = 1
            `, [req.params.id]);

            if (!project) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }

            res.json({ success: true, data: project });
        } catch (err) {
            console.error('Error fetching project:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch project' });
        }
    });

    // POST new project (user submission)
    app.post('/api/projects', async (req, res) => {
        const { name, category, description, status, responsible, url, reference, user_id } = req.body;

        if (!name || !category || !description || !status || !responsible) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        try {
            const result = await dbRun(`
                INSERT INTO projects (name, category, description, status, completion_percentage, responsible, url, reference, submitted_by, approved)
                VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 0)
            `, [name, category, description, status, responsible, url || null, reference || null, user_id || 1]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'new_project', ?)
            `, [user_id || 1, result.id, JSON.stringify({ name })]);

            res.json({ success: true, data: { id: result.id }, message: 'Project submitted for approval' });
        } catch (err) {
            console.error('Error creating project:', err);
            res.status(500).json({ success: false, error: 'Failed to create project' });
        }
    });

    // PATCH update project status/completion
    app.patch('/api/projects/:id/status', async (req, res) => {
        const { status, completion_percentage, update_note, user_id } = req.body;
        const project_id = req.params.id;

        try {
            // Get current values
            const current = await dbGet('SELECT status, completion_percentage FROM projects WHERE id = ?', [project_id]);
            if (!current) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }

            // Update project
            await dbRun(`
                UPDATE projects
                SET status = ?, completion_percentage = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [status, completion_percentage, project_id]);

            // Log status update
            await dbRun(`
                INSERT INTO status_updates (project_id, user_id, old_status, new_status, old_completion, new_completion, update_note)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [project_id, user_id || 1, current.status, status, current.completion_percentage, completion_percentage, update_note || null]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'status_update', ?)
            `, [user_id || 1, project_id, JSON.stringify({ old_status: current.status, new_status: status, old_completion: current.completion_percentage, new_completion: completion_percentage })]);

            res.json({ success: true, message: 'Project status updated' });
        } catch (err) {
            console.error('Error updating project status:', err);
            res.status(500).json({ success: false, error: 'Failed to update project status' });
        }
    });

    // ============================================
    // COMMENTS ENDPOINTS
    // ============================================

    // GET comments for a project
    app.get('/api/projects/:id/comments', async (req, res) => {
        try {
            const comments = await dbAll(`
                SELECT c.*, u.display_name, u.username
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.project_id = ?
                ORDER BY c.created_at DESC
            `, [req.params.id]);

            res.json({ success: true, data: comments });
        } catch (err) {
            console.error('Error fetching comments:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch comments' });
        }
    });

    // POST new comment
    app.post('/api/projects/:id/comments', async (req, res) => {
        const { comment_text, user_id } = req.body;
        const project_id = req.params.id;

        if (!comment_text) {
            return res.status(400).json({ success: false, error: 'Comment text is required' });
        }

        try {
            const result = await dbRun(`
                INSERT INTO comments (project_id, user_id, comment_text)
                VALUES (?, ?, ?)
            `, [project_id, user_id || 1, comment_text]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'comment', ?)
            `, [user_id || 1, project_id, JSON.stringify({ comment_id: result.id })]);

            res.json({ success: true, data: { id: result.id }, message: 'Comment added' });
        } catch (err) {
            console.error('Error adding comment:', err);
            res.status(500).json({ success: false, error: 'Failed to add comment' });
        }
    });

    // ============================================
    // LIKES ENDPOINTS
    // ============================================

    // POST toggle like on project
    app.post('/api/projects/:id/like', async (req, res) => {
        const { user_id } = req.body;
        const project_id = req.params.id;

        try {
            // Check if already liked
            const existing = await dbGet(`
                SELECT id FROM project_likes WHERE project_id = ? AND user_id = ?
            `, [project_id, user_id || 1]);

            if (existing) {
                // Unlike
                await dbRun('DELETE FROM project_likes WHERE id = ?', [existing.id]);
                res.json({ success: true, liked: false, message: 'Like removed' });
            } else {
                // Like
                await dbRun(`
                    INSERT INTO project_likes (project_id, user_id)
                    VALUES (?, ?)
                `, [project_id, user_id || 1]);

                // Log activity
                await dbRun(`
                    INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                    VALUES (?, ?, 'like', ?)
                `, [user_id || 1, project_id, JSON.stringify({})]);

                res.json({ success: true, liked: true, message: 'Project liked' });
            }
        } catch (err) {
            console.error('Error toggling like:', err);
            res.status(500).json({ success: false, error: 'Failed to toggle like' });
        }
    });

    // ============================================
    // LINKS ENDPOINTS
    // ============================================

    // GET links for a project
    app.get('/api/projects/:id/links', async (req, res) => {
        try {
            const links = await dbAll(`
                SELECT pl.*, u.display_name
                FROM project_links pl
                JOIN users u ON pl.user_id = u.id
                WHERE pl.project_id = ?
                ORDER BY pl.created_at DESC
            `, [req.params.id]);

            res.json({ success: true, data: links });
        } catch (err) {
            console.error('Error fetching links:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch links' });
        }
    });

    // POST new link
    app.post('/api/projects/:id/links', async (req, res) => {
        const { link_url, link_title, link_description, user_id } = req.body;
        const project_id = req.params.id;

        if (!link_url || !link_title) {
            return res.status(400).json({ success: false, error: 'URL and title are required' });
        }

        try {
            const result = await dbRun(`
                INSERT INTO project_links (project_id, user_id, link_url, link_title, link_description)
                VALUES (?, ?, ?, ?, ?)
            `, [project_id, user_id || 1, link_url, link_title, link_description || null]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'link_added', ?)
            `, [user_id || 1, project_id, JSON.stringify({ link_id: result.id, link_title })]);

            res.json({ success: true, data: { id: result.id }, message: 'Link added' });
        } catch (err) {
            console.error('Error adding link:', err);
            res.status(500).json({ success: false, error: 'Failed to add link' });
        }
    });

    // ============================================
    // STATUS UPDATES ENDPOINTS
    // ============================================

    // GET status update history for a project
    app.get('/api/projects/:id/history', async (req, res) => {
        try {
            const history = await dbAll(`
                SELECT su.*, u.display_name
                FROM status_updates su
                JOIN users u ON su.user_id = u.id
                WHERE su.project_id = ?
                ORDER BY su.created_at DESC
            `, [req.params.id]);

            res.json({ success: true, data: history });
        } catch (err) {
            console.error('Error fetching history:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch history' });
        }
    });

    // ============================================
    // ACTIVITY FEED ENDPOINT
    // ============================================

    // GET recent activity
    app.get('/api/activity', async (req, res) => {
        const limit = req.query.limit || 20;

        try {
            const activities = await dbAll(`
                SELECT
                    a.*,
                    u.display_name,
                    p.name as project_name
                FROM activity_log a
                JOIN users u ON a.user_id = u.id
                LEFT JOIN projects p ON a.project_id = p.id
                ORDER BY a.created_at DESC
                LIMIT ?
            `, [limit]);

            res.json({ success: true, data: activities });
        } catch (err) {
            console.error('Error fetching activity:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch activity' });
        }
    });

    // ============================================
    // METRICS ENDPOINTS
    // ============================================

    // GET overall metrics
    app.get('/api/metrics', async (req, res) => {
        try {
            const [
                projectCount,
                avgCompletion,
                categoryBreakdown,
                statusBreakdown,
                recentActivity
            ] = await Promise.all([
                dbGet('SELECT COUNT(*) as count FROM projects WHERE approved = 1'),
                dbGet('SELECT AVG(completion_percentage) as avg FROM projects WHERE approved = 1'),
                dbAll('SELECT category, COUNT(*) as count, AVG(completion_percentage) as avg_completion FROM projects WHERE approved = 1 GROUP BY category ORDER BY count DESC'),
                dbAll('SELECT status, COUNT(*) as count FROM projects WHERE approved = 1 GROUP BY status'),
                dbGet('SELECT COUNT(*) as count FROM activity_log WHERE created_at >= datetime("now", "-7 days")')
            ]);

            res.json({
                success: true,
                data: {
                    total_projects: projectCount.count,
                    avg_completion: Math.round(avgCompletion.avg || 0),
                    category_breakdown: categoryBreakdown,
                    status_breakdown: statusBreakdown,
                    weekly_activity: recentActivity.count
                }
            });
        } catch (err) {
            console.error('Error fetching metrics:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
        }
    });

    // ============================================
    // USER ENDPOINTS (Simple)
    // ============================================

    // POST create/get user (simple session)
    app.post('/api/users/session', async (req, res) => {
        const { username, display_name, email } = req.body;

        if (!username || !display_name) {
            return res.status(400).json({ success: false, error: 'Username and display name are required' });
        }

        try {
            // Check if user exists
            let user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);

            if (!user) {
                // Create new user
                const result = await dbRun(`
                    INSERT INTO users (username, email, display_name)
                    VALUES (?, ?, ?)
                `, [username, email || `${username}@guest.local`, display_name]);

                user = { id: result.id, username, display_name, email: email || `${username}@guest.local`, role: 'user' };
            }

            res.json({ success: true, data: user });
        } catch (err) {
            console.error('Error creating/fetching user:', err);
            res.status(500).json({ success: false, error: 'Failed to process user session' });
        }
    });

    // ============================================
    // AI CHAT ASSISTANT
    // ============================================

    app.post('/api/chat', async (req, res) => {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        try {
            // Search for relevant projects based on the message
            const searchTerms = message.toLowerCase();
            const projects = await dbAll(`
                SELECT * FROM projects
                WHERE LOWER(name) LIKE ?
                   OR LOWER(description) LIKE ?
                   OR LOWER(category) LIKE ?
                   OR LOWER(status) LIKE ?
                LIMIT 5
            `, [`%${searchTerms}%`, `%${searchTerms}%`, `%${searchTerms}%`, `%${searchTerms}%`]);

            // Get overall statistics
            const stats = await dbGet(`
                SELECT
                    COUNT(*) as total,
                    AVG(completion_percentage) as avg_completion,
                    COUNT(CASE WHEN LOWER(status) LIKE '%completed%' THEN 1 END) as completed,
                    COUNT(CASE WHEN LOWER(status) LIKE '%progress%' OR LOWER(status) LIKE '%ongoing%' THEN 1 END) as in_progress
                FROM projects
            `);

            // Generate intelligent response
            const response = generateIntelligentResponse(message, projects, stats);

            res.json({
                success: true,
                data: {
                    message: response,
                    projects: projects.slice(0, 3), // Return top 3 relevant projects
                    timestamp: new Date().toISOString()
                }
            });
        } catch (err) {
            console.error('Error processing chat:', err);
            res.status(500).json({ success: false, error: 'Failed to process chat message' });
        }
    });
}

// ============================================
// AI RESPONSE GENERATOR
// ============================================

function generateIntelligentResponse(message, projects, stats) {
    const msg = message.toLowerCase();

    // Greeting responses
    if (msg.match(/^(hi|hello|hey|greetings)/)) {
        return `Hello! I'm the Iowa DOT AI Assistant. I can help you with information about our ${stats.total} transportation projects. What would you like to know?`;
    }

    // Statistics queries
    if (msg.includes('how many') || msg.includes('total') || msg.includes('count')) {
        if (msg.includes('project')) {
            return `Iowa DOT is currently tracking **${stats.total} projects** across various categories. Of these, **${stats.completed} are completed** and **${stats.in_progress} are in progress or ongoing**. The average completion across all projects is **${Math.round(stats.avg_completion)}%**.`;
        }
        if (msg.includes('completed')) {
            return `We have **${stats.completed} completed projects** out of ${stats.total} total projects. That's approximately **${Math.round((stats.completed / stats.total) * 100)}%** of our project portfolio.`;
        }
    }

    // Progress/status queries
    if (msg.includes('progress') || msg.includes('status')) {
        if (projects.length > 0) {
            const project = projects[0];
            return `**${project.name}** (${project.category}) is currently at **${project.completion_percentage}% completion** with status: "${project.status}". ${project.description}`;
        } else {
            return `Overall, Iowa DOT projects are at an average of **${Math.round(stats.avg_completion)}% completion**. We have ${stats.in_progress} projects actively in progress.`;
        }
    }

    // Category queries
    if (msg.includes('modal') || msg.includes('plan') || msg.includes('funding')) {
        const relevantProjects = projects.filter(p =>
            p.category.toLowerCase().includes(msg.includes('modal') ? 'modal' : msg.includes('plan') ? 'plan' : 'funding')
        );
        if (relevantProjects.length > 0) {
            return `I found ${relevantProjects.length} relevant project(s):\n\n${relevantProjects.map(p =>
                `• **${p.name}** - ${p.completion_percentage}% complete\n  ${p.description.substring(0, 150)}...`
            ).join('\n\n')}`;
        }
    }

    // Specific project search
    if (projects.length > 0) {
        const topProject = projects[0];
        const otherProjects = projects.slice(1, 3);

        let response = `I found **${projects.length}** project(s) related to your question:\n\n`;
        response += `**${topProject.name}**\n`;
        response += `• Category: ${topProject.category}\n`;
        response += `• Status: ${topProject.status}\n`;
        response += `• Completion: ${topProject.completion_percentage}%\n`;
        response += `• ${topProject.description}\n`;

        if (otherProjects.length > 0) {
            response += `\n**Other related projects:**\n`;
            otherProjects.forEach(p => {
                response += `• ${p.name} (${p.completion_percentage}% complete)\n`;
            });
        }

        return response;
    }

    // Default helpful response
    return `I searched our database of ${stats.total} Iowa DOT projects but couldn't find a specific match for "${message}". Here's what I can help with:\n\n• Ask about specific projects (e.g., "aviation plan", "bridge program")\n• Check project status and progress\n• Get statistics about completed projects\n• Learn about different project categories\n\nTry asking: "What projects are in progress?" or "Tell me about modal plans"`;
}

module.exports = { setupApiRoutes };
