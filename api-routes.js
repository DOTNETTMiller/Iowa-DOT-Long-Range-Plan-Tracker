const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { OpenAI } = require('openai');

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

    // PATCH - Update a project link
    app.patch('/api/projects/:projectId/links/:linkId', async (req, res) => {
        const { projectId, linkId } = req.params;
        const { link_url, link_title, link_description, user_id } = req.body;

        if (!link_url || !link_title) {
            return res.status(400).json({ success: false, error: 'URL and title are required' });
        }

        try {
            await dbRun(`
                UPDATE project_links
                SET link_url = ?, link_title = ?, link_description = ?
                WHERE id = ? AND project_id = ?
            `, [link_url, link_title, link_description || null, linkId, projectId]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'link_updated', ?)
            `, [user_id || 1, projectId, JSON.stringify({ link_id: linkId, link_title })]);

            res.json({ success: true, message: 'Link updated' });
        } catch (err) {
            console.error('Error updating link:', err);
            res.status(500).json({ success: false, error: 'Failed to update link' });
        }
    });

    // DELETE - Remove a project link
    app.delete('/api/projects/:projectId/links/:linkId', async (req, res) => {
        const { projectId, linkId } = req.params;
        const { user_id } = req.body;

        try {
            // Get link info before deleting for logging
            const link = await dbGet('SELECT link_title FROM project_links WHERE id = ? AND project_id = ?', [linkId, projectId]);

            if (!link) {
                return res.status(404).json({ success: false, error: 'Link not found' });
            }

            await dbRun('DELETE FROM project_links WHERE id = ? AND project_id = ?', [linkId, projectId]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'link_deleted', ?)
            `, [user_id || 1, projectId, JSON.stringify({ link_id: linkId, link_title: link.link_title })]);

            res.json({ success: true, message: 'Link deleted' });
        } catch (err) {
            console.error('Error deleting link:', err);
            res.status(500).json({ success: false, error: 'Failed to delete link' });
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
                weightedCompletion,
                categoryBreakdown,
                statusBreakdown,
                recentActivity
            ] = await Promise.all([
                dbGet('SELECT COUNT(*) as count FROM projects WHERE approved = 1'),
                dbGet('SELECT AVG(completion_percentage) as avg FROM projects WHERE approved = 1'),
                dbGet(`
                    SELECT
                        SUM(completion_percentage * weight) / NULLIF(SUM(weight), 0) as weighted_avg,
                        SUM(weight) as total_weight
                    FROM projects
                    WHERE approved = 1
                `),
                dbAll('SELECT category, COUNT(*) as count, AVG(completion_percentage) as avg_completion FROM projects WHERE approved = 1 GROUP BY category ORDER BY count DESC'),
                dbAll('SELECT status, COUNT(*) as count FROM projects WHERE approved = 1 GROUP BY status'),
                dbGet('SELECT COUNT(*) as count FROM activity_log WHERE created_at >= datetime("now", "-7 days")')
            ]);

            res.json({
                success: true,
                data: {
                    total_projects: projectCount.count,
                    avg_completion: Math.round(avgCompletion.avg || 0),
                    weighted_completion: Math.round(weightedCompletion.weighted_avg || 0),
                    total_weight: weightedCompletion.total_weight || 0,
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
    // AI CHAT ASSISTANT (GPT-POWERED)
    // ============================================

    app.post('/api/chat', async (req, res) => {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Check if OpenAI API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({
                success: false,
                error: 'AI chat is not configured. Please add OPENAI_API_KEY to .env file.'
            });
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

            // Get all project categories for context
            const categories = await dbAll(`
                SELECT DISTINCT category FROM projects ORDER BY category
            `);

            // Initialize OpenAI
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            // Build context for GPT
            const context = buildContextForGPT(projects, stats, categories.map(c => c.category));

            // Call GPT-4
            const completion = await openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: `You are an AI assistant for the Iowa Department of Transportation (Iowa DOT). You help citizens and stakeholders learn about Iowa's Long-Range Transportation Plan projects through 2050.

Your role:
- Provide accurate, helpful information about Iowa DOT projects
- Be conversational and friendly
- Use the project data provided to answer questions
- When relevant, mention specific projects with their completion percentages
- Format project names in **bold** using markdown
- Keep responses concise but informative (2-4 paragraphs max)

Available data:
${context}

When listing projects, include:
- Project name in bold
- Category
- Status
- Completion percentage
- Brief description

Remember: You're representing Iowa DOT, so be professional, accurate, and helpful.`
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 800
            });

            const gptResponse = completion.choices[0].message.content;

            res.json({
                success: true,
                data: {
                    message: gptResponse,
                    projects: projects.slice(0, 3), // Return top 3 relevant projects
                    timestamp: new Date().toISOString()
                }
            });
        } catch (err) {
            console.error('Error processing chat:', err);

            // If OpenAI error, provide helpful message
            if (err.response?.status === 401) {
                return res.status(503).json({
                    success: false,
                    error: 'Invalid OpenAI API key. Please check your .env configuration.'
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to process chat message. Please try again.'
            });
        }
    });
}

// ============================================
// GPT CONTEXT BUILDER
// ============================================

function buildContextForGPT(projects, stats, categories) {
    let context = `\n**Overall Statistics:**
- Total Projects: ${stats.total}
- Completed: ${stats.completed}
- In Progress: ${stats.in_progress}
- Average Completion: ${Math.round(stats.avg_completion)}%

**Project Categories Available:**
${categories.join(', ')}
`;

    if (projects.length > 0) {
        context += `\n**Relevant Projects for this query:**\n`;
        projects.forEach(p => {
            context += `
${p.name}
- Category: ${p.category}
- Status: ${p.status}
- Completion: ${p.completion_percentage}%
- Description: ${p.description}
`;
        });
    }

    return context;
}

module.exports = { setupApiRoutes };
