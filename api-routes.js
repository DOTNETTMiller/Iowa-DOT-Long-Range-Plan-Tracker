const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { OpenAI } = require('openai');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');
const mammoth = require('mammoth');

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
        const { status, completion_percentage, completion_justification, update_note, user_id } = req.body;
        const project_id = req.params.id;

        try {
            // Get current values
            const current = await dbGet('SELECT * FROM projects WHERE id = ?', [project_id]);
            if (!current) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }

            // Update project
            await dbRun(`
                UPDATE projects
                SET status = ?, completion_percentage = ?, completion_justification = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [status, completion_percentage, completion_justification || null, project_id]);

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

            // EMAIL NOTIFICATIONS - Send to all subscribers
            const subscribers = await dbAll('SELECT email FROM project_subscriptions WHERE project_id = ? AND active = 1', [project_id]);

            if (subscribers.length > 0) {
                const { sendProjectUpdateNotification } = require('./email-service');
                const updatedProject = { ...current, status, completion_percentage };

                let updateType, updateDetails;

                // Determine notification type
                if (current.status !== status) {
                    updateType = 'status_change';
                    updateDetails = { old_status: current.status, new_status: status };
                } else if (current.completion_percentage !== completion_percentage) {
                    updateType = 'completion_change';
                    updateDetails = { old_completion: current.completion_percentage, new_completion: completion_percentage };
                }

                // Check for milestone (25%, 50%, 75%, 100%)
                const milestones = [25, 50, 75, 100];
                const crossedMilestone = milestones.find(m =>
                    current.completion_percentage < m && completion_percentage >= m
                );

                if (crossedMilestone) {
                    updateType = 'milestone';
                    updateDetails = { milestone: `${crossedMilestone}% Complete` };
                }

                if (updateType) {
                    // Send notifications asynchronously (don't wait)
                    sendProjectUpdateNotification(subscribers, updatedProject, updateType, updateDetails)
                        .catch(err => console.error('Failed to send email notifications:', err));
                }
            }

            res.json({ success: true, message: 'Project status updated' });
        } catch (err) {
            console.error('Error updating project status:', err);
            res.status(500).json({ success: false, error: 'Failed to update project status' });
        }
    });

    // PATCH - Update project completion percentage and status
    app.patch('/api/projects/:id/completion', async (req, res) => {
        const { completion_percentage, status, user_id } = req.body;
        const project_id = req.params.id;

        if (completion_percentage === undefined || completion_percentage < 0 || completion_percentage > 100) {
            return res.status(400).json({ success: false, error: 'Valid completion percentage is required (0-100)' });
        }

        try {
            // Get current values
            const current = await dbGet('SELECT status, completion_percentage FROM projects WHERE id = ?', [project_id]);
            if (!current) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }

            // Update project
            await dbRun(`
                UPDATE projects
                SET completion_percentage = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [completion_percentage, status, project_id]);

            // Log status update if status has changed
            if (current.status !== status || current.completion_percentage !== completion_percentage) {
                await dbRun(`
                    INSERT INTO status_updates (project_id, user_id, old_status, new_status, old_completion, new_completion, update_note)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [project_id, user_id || 1, current.status, status, current.completion_percentage, completion_percentage, 'Completion updated via modal']);

                // Log activity
                await dbRun(`
                    INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                    VALUES (?, ?, 'completion_updated', ?)
                `, [user_id || 1, project_id, JSON.stringify({ old_status: current.status, new_status: status, old_completion: current.completion_percentage, new_completion: completion_percentage })]);
            }

            res.json({ success: true, message: 'Project completion updated' });
        } catch (err) {
            console.error('Error updating project completion:', err);
            res.status(500).json({ success: false, error: 'Failed to update project completion' });
        }
    });

    // PATCH - Update project weight
    app.patch('/api/projects/:id/weight', async (req, res) => {
        const { weight, user_id } = req.body;
        const project_id = req.params.id;

        if (weight === undefined || weight < 0) {
            return res.status(400).json({ success: false, error: 'Valid weight is required (must be >= 0)' });
        }

        try {
            await dbRun(`
                UPDATE projects
                SET weight = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [weight, project_id]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'weight_updated', ?)
            `, [user_id || 1, project_id, JSON.stringify({ weight })]);

            res.json({ success: true, message: 'Project weight updated' });
        } catch (err) {
            console.error('Error updating weight:', err);
            res.status(500).json({ success: false, error: 'Failed to update weight' });
        }
    });

    // PUT - Update entire project (for Kanban drag-and-drop)
    app.put('/api/projects/:id', async (req, res) => {
        const project_id = req.params.id;
        const updates = req.body;

        try {
            // Build dynamic UPDATE query based on provided fields
            const allowedFields = ['name', 'description', 'status', 'completion_percentage', 'category', 'project_type', 'responsible', 'url', 'reference', 'priority_level', 'program_status'];
            const updateFields = [];
            const updateValues = [];

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key) && updates[key] !== undefined) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(updates[key]);
                }
            });

            if (updateFields.length === 0) {
                return res.status(400).json({ success: false, error: 'No valid fields to update' });
            }

            updateValues.push(project_id);

            await dbRun(`
                UPDATE projects
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, updateValues);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'project_updated', ?)
            `, [updates.user_id || 1, project_id, JSON.stringify(updates)]);

            res.json({ success: true, message: 'Project updated successfully' });
        } catch (err) {
            console.error('Error updating project:', err);
            res.status(500).json({ success: false, error: 'Failed to update project' });
        }
    });

    // PATCH - Update project details (plan page, division, bureau)
    app.patch('/api/projects/:id/details', async (req, res) => {
        const { plan_page, division, bureau, status, user_id } = req.body;
        const project_id = req.params.id;

        try {
            await dbRun(`
                UPDATE projects
                SET plan_page = ?, division = ?, bureau = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [plan_page || null, division || null, bureau || null, status || 'ongoing', project_id]);

            // Log activity
            await dbRun(`
                INSERT INTO activity_log (user_id, project_id, activity_type, activity_data)
                VALUES (?, ?, 'details_updated', ?)
            `, [user_id || 1, project_id, JSON.stringify({ plan_page, division, bureau, status })]);

            res.json({ success: true, message: 'Project details updated' });
        } catch (err) {
            console.error('Error updating project details:', err);
            res.status(500).json({ success: false, error: 'Failed to update project details' });
        }
    });

    // PATCH update project coordinates
    app.patch('/api/projects/:id/coordinates', async (req, res) => {
        const { latitude, longitude } = req.body;
        const project_id = req.params.id;

        try {
            await dbRun(`
                UPDATE projects
                SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [latitude || null, longitude || null, project_id]);

            res.json({ success: true, message: 'Project coordinates updated' });
        } catch (err) {
            console.error('Error updating project coordinates:', err);
            res.status(500).json({ success: false, error: 'Failed to update project coordinates' });
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

    // ============================================
    // PHOTO ENDPOINTS
    // ============================================

    // Configure multer for file uploads
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, 'uploads', 'projects');
            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            // Generate unique filename: timestamp-original name
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    });

    const upload = multer({
        storage: storage,
        limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit to accept large drone/DSLR photos (compressed after upload)
        fileFilter: function (req, file, cb) {
            // Allow only images
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed!'), false);
            }
        }
    });

    // GET photos for a project
    app.get('/api/projects/:id/photos', async (req, res) => {
        try {
            const photos = await dbAll(`
                SELECT * FROM project_photos
                WHERE project_id = ?
                ORDER BY uploaded_at DESC
            `, [req.params.id]);

            res.json({ success: true, data: photos });
        } catch (err) {
            console.error('Error fetching photos:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch photos' });
        }
    });

    // POST upload photo
    app.post('/api/projects/:id/photos', upload.single('photo'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const { caption, uploaded_by } = req.body;
            const project_id = req.params.id;

            // Compress and resize image
            const compressedFilename = `compressed-${Date.now()}.webp`;
            const compressedPath = path.join(__dirname, 'uploads', 'projects', compressedFilename);

            await sharp(req.file.path)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(compressedPath);

            // Delete original file
            fs.unlinkSync(req.file.path);

            const file_path = `/uploads/projects/${compressedFilename}`;

            console.log(`[PHOTO UPLOAD] Compression successful. Saving to database:`);
            console.log(`  - project_id: ${project_id}`);
            console.log(`  - file_path: ${file_path}`);
            console.log(`  - file_name: ${req.file.originalname}`);
            console.log(`  - caption: ${caption || ''}`);
            console.log(`  - uploaded_by: ${uploaded_by || 'Anonymous'}`);

            let result;
            try {
                result = await dbRun(`
                    INSERT INTO project_photos (project_id, file_path, file_name, caption, uploaded_by)
                    VALUES (?, ?, ?, ?, ?)
                `, [project_id, file_path, req.file.originalname, caption || '', uploaded_by || 'Anonymous']);

                console.log(`[PHOTO UPLOAD] ✓ Database insert successful. Photo ID: ${result.id}`);
            } catch (dbError) {
                console.error(`[PHOTO UPLOAD] ✗ Database insert failed:`, dbError);
                // Delete the uploaded file since DB insert failed
                try {
                    fs.unlinkSync(compressedPath);
                    console.log(`[PHOTO UPLOAD] Cleaned up orphaned file: ${compressedFilename}`);
                } catch (unlinkErr) {
                    console.error(`[PHOTO UPLOAD] Failed to clean up file:`, unlinkErr);
                }
                throw dbError;
            }

            res.json({
                success: true,
                data: {
                    id: result.id,
                    project_id,
                    file_path,
                    file_name: req.file.originalname,
                    caption,
                    uploaded_by: uploaded_by || 'Anonymous'
                },
                message: 'Photo uploaded successfully!'
            });
        } catch (err) {
            console.error('[PHOTO UPLOAD] ✗ Upload failed:', err);

            // Provide more specific error messages
            let errorMessage = 'Failed to upload photo';
            if (err.message && err.message.includes('unsupported image format')) {
                errorMessage = 'Unsupported image format. Please upload a JPEG, PNG, GIF, or WebP image.';
            } else if (err.message && err.message.includes('SQLITE')) {
                errorMessage = 'Database error. Please try again or contact support.';
            }

            res.status(500).json({
                success: false,
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    });

    // DELETE photo
    app.delete('/api/projects/:projectId/photos/:photoId', async (req, res) => {
        try {
            const { projectId, photoId } = req.params;

            // Get photo info before deleting
            const photo = await dbGet('SELECT file_path FROM project_photos WHERE id = ? AND project_id = ?', [photoId, projectId]);

            if (!photo) {
                return res.status(404).json({ success: false, error: 'Photo not found' });
            }

            // Delete file from filesystem
            const filePath = path.join(__dirname, photo.file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Delete from database
            await dbRun('DELETE FROM project_photos WHERE id = ? AND project_id = ?', [photoId, projectId]);

            res.json({ success: true, message: 'Photo deleted' });
        } catch (err) {
            console.error('Error deleting photo:', err);
            res.status(500).json({ success: false, error: 'Failed to delete photo' });
        }
    });

    // ============================================
    // MAJOR CONSTRUCTION PROJECTS ENDPOINTS
    // ============================================

    // Helper function to resolve project ID (accepts either database ID or geojson_object_id)
    async function resolveMajorProjectId(idOrObjectId) {
        // First try as database ID
        let project = await dbGet('SELECT id FROM major_projects WHERE id = ?', [idOrObjectId]);

        // If not found, try as geojson_object_id
        if (!project) {
            project = await dbGet('SELECT id FROM major_projects WHERE geojson_object_id = ?', [idOrObjectId]);
        }

        return project ? project.id : null;
    }

    // GET all major projects with stats
    app.get('/api/major-projects', async (req, res) => {
        try {
            const projects = await dbAll(`
                SELECT
                    mp.*,
                    (SELECT COUNT(*) FROM major_project_comments WHERE major_project_id = mp.id) as comment_count,
                    (SELECT COUNT(*) FROM major_project_likes WHERE major_project_id = mp.id) as like_count,
                    (SELECT COUNT(*) FROM major_project_photos WHERE major_project_id = mp.id AND approved = 1) as photo_count
                FROM major_projects mp
                ORDER BY mp.district, mp.project_title
            `);
            res.json({ success: true, data: projects });
        } catch (err) {
            console.error('Error fetching major projects:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch major projects' });
        }
    });

    // GET single major project with details
    app.get('/api/major-projects/:id', async (req, res) => {
        try {
            const projectId = await resolveMajorProjectId(req.params.id);

            if (!projectId) {
                return res.status(404).json({ success: false, error: 'Major project not found' });
            }

            const project = await dbGet(`
                SELECT
                    mp.*,
                    (SELECT COUNT(*) FROM major_project_comments WHERE major_project_id = mp.id) as comment_count,
                    (SELECT COUNT(*) FROM major_project_likes WHERE major_project_id = mp.id) as like_count,
                    (SELECT COUNT(*) FROM major_project_photos WHERE major_project_id = mp.id AND approved = 1) as photo_count
                FROM major_projects mp
                WHERE mp.id = ?
            `, [projectId]);

            res.json({ success: true, data: project });
        } catch (err) {
            console.error('Error fetching major project:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch major project' });
        }
    });

    // GET comments for a major project
    app.get('/api/major-projects/:id/comments', async (req, res) => {
        try {
            const projectId = await resolveMajorProjectId(req.params.id);

            if (!projectId) {
                return res.status(404).json({ success: false, error: 'Major project not found' });
            }

            const comments = await dbAll(`
                SELECT c.*, u.display_name, u.username
                FROM major_project_comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.major_project_id = ?
                ORDER BY c.created_at DESC
            `, [projectId]);
            res.json({ success: true, data: comments });
        } catch (err) {
            console.error('Error fetching comments:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch comments' });
        }
    });

    // POST new comment on major project
    app.post('/api/major-projects/:id/comments', async (req, res) => {
        const { comment_text, user_id, display_name } = req.body;

        if (!comment_text) {
            return res.status(400).json({ success: false, error: 'Comment text is required' });
        }

        try {
            const major_project_id = await resolveMajorProjectId(req.params.id);

            if (!major_project_id) {
                return res.status(404).json({ success: false, error: 'Major project not found' });
            }

            // Get or create user
            let userId = user_id || 1;
            if (display_name && !user_id) {
                // Create anonymous user
                const result = await dbRun(`
                    INSERT INTO users (username, email, display_name, role)
                    VALUES (?, ?, ?, ?)
                `, [`anon_${Date.now()}`, `anon_${Date.now()}@temp.local`, display_name, 'user']);
                userId = result.id;
            }

            const result = await dbRun(`
                INSERT INTO major_project_comments (major_project_id, user_id, comment_text)
                VALUES (?, ?, ?)
            `, [major_project_id, userId, comment_text]);

            res.json({ success: true, data: { id: result.id }, message: 'Comment added' });
        } catch (err) {
            console.error('Error adding comment:', err);
            res.status(500).json({ success: false, error: 'Failed to add comment' });
        }
    });

    // POST toggle like on major project
    app.post('/api/major-projects/:id/like', async (req, res) => {
        const { user_id } = req.body;

        try {
            const major_project_id = await resolveMajorProjectId(req.params.id);

            if (!major_project_id) {
                return res.status(404).json({ success: false, error: 'Major project not found' });
            }

            // Check if already liked
            const existing = await dbGet(
                `SELECT id FROM major_project_likes WHERE major_project_id = ? AND user_id = ?`,
                [major_project_id, user_id || 1]
            );

            if (existing) {
                // Unlike
                await dbRun('DELETE FROM major_project_likes WHERE id = ?', [existing.id]);
                res.json({ success: true, liked: false, message: 'Like removed' });
            } else {
                // Like
                await dbRun(`
                    INSERT INTO major_project_likes (major_project_id, user_id)
                    VALUES (?, ?)
                `, [major_project_id, user_id || 1]);

                res.json({ success: true, liked: true, message: 'Project liked' });
            }
        } catch (err) {
            console.error('Error toggling like:', err);
            res.status(500).json({ success: false, error: 'Failed to toggle like' });
        }
    });

    // GET photos for a major project
    app.get('/api/major-projects/:id/photos', async (req, res) => {
        try {
            const major_project_id = await resolveMajorProjectId(req.params.id);

            if (!major_project_id) {
                return res.status(404).json({ success: false, error: 'Major project not found' });
            }

            const photos = await dbAll(`
                SELECT p.*, u.display_name
                FROM major_project_photos p
                JOIN users u ON p.user_id = u.id
                WHERE p.major_project_id = ? AND p.approved = 1
                ORDER BY p.upload_date DESC
            `, [major_project_id]);
            res.json({ success: true, data: photos });
        } catch (err) {
            console.error('Error fetching photos:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch photos' });
        }
    });

    // POST upload photo to major project
    app.post('/api/major-projects/:id/photos', upload.single('photo'), async (req, res) => {
        const { caption, user_id } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No photo file uploaded' });
        }

        try {
            const major_project_id = await resolveMajorProjectId(req.params.id);

            if (!major_project_id) {
                return res.status(404).json({ success: false, error: 'Major project not found' });
            }

            // Compress and resize image
            const compressedFilename = `compressed-${Date.now()}.webp`;
            const compressedPath = path.join(__dirname, 'uploads', 'projects', compressedFilename);

            await sharp(req.file.path)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(compressedPath);

            // Delete original file
            fs.unlinkSync(req.file.path);

            const result = await dbRun(`
                INSERT INTO major_project_photos (major_project_id, user_id, photo_url, caption, approved)
                VALUES (?, ?, ?, ?, 1)
            `, [major_project_id, user_id || 1, `/uploads/projects/${compressedFilename}`, caption || '']);

            res.json({ success: true, data: { id: result.id }, message: 'Photo uploaded successfully!' });
        } catch (err) {
            console.error('Error uploading photo:', err);
            res.status(500).json({ success: false, error: 'Failed to upload photo' });
        }
    });

    // POST approve photo (admin/moderator only)
    app.post('/api/major-projects/:projectId/photos/:photoId/approve', async (req, res) => {
        try {
            await dbRun('UPDATE major_project_photos SET approved = 1 WHERE id = ?', [req.params.photoId]);
            res.json({ success: true, message: 'Photo approved' });
        } catch (err) {
            console.error('Error approving photo:', err);
            res.status(500).json({ success: false, error: 'Failed to approve photo' });
        }
    });

    // ============================================
    // BIWEEKLY UPDATE PARSER ENDPOINTS
    // ============================================

    const { parseUpdateWithGPT, applyParsedUpdates, previewParsedUpdates } = require('./update-parser-service');

    // Configure multer for DOCX file uploads (in-memory storage)
    const docxUpload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req, file, cb) => {
            const allowedTypes = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
                'application/msword' // .doc
            ];
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Only Word documents (.docx, .doc) are allowed'));
            }
        }
    });

    // POST - Upload DOCX file and extract text
    app.post('/api/updates/upload-docx', docxUpload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            // Extract text from DOCX using mammoth
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            const extractedText = result.value;

            if (!extractedText || extractedText.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No text could be extracted from the document'
                });
            }

            // Return extracted text
            res.json({
                success: true,
                text: extractedText,
                filename: req.file.originalname,
                size: req.file.size
            });
        } catch (error) {
            console.error('Error processing DOCX file:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process document: ' + error.message
            });
        }
    });

    // POST - Parse biweekly update text and preview changes
    app.post('/api/updates/parse', async (req, res) => {
        const { updateText } = req.body;

        if (!updateText || updateText.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Update text is required' });
        }

        try {
            // Get all existing projects for matching
            const existingProjects = await dbAll('SELECT * FROM projects WHERE approved = 1 ORDER BY name');

            // Parse with GPT-4
            const parseResult = await parseUpdateWithGPT(updateText, existingProjects);

            if (!parseResult.success) {
                return res.status(503).json(parseResult);
            }

            // Generate preview of what would change
            const preview = await previewParsedUpdates(parseResult.data, existingProjects);

            res.json({
                success: true,
                data: {
                    parsed: parseResult.data,
                    preview: preview,
                    message: 'Update parsed successfully. Review changes before applying.'
                }
            });

        } catch (err) {
            console.error('Error parsing update:', err);
            res.status(500).json({ success: false, error: 'Failed to parse update' });
        }
    });

    // POST - Apply parsed updates to database
    app.post('/api/updates/apply', async (req, res) => {
        const { parsedData } = req.body;

        if (!parsedData || !parsedData.updates) {
            return res.status(400).json({ success: false, error: 'Parsed data is required' });
        }

        try {
            // Apply updates to database
            const result = await applyParsedUpdates(parsedData, dbRun, dbGet);

            res.json(result);

        } catch (err) {
            console.error('Error applying updates:', err);
            res.status(500).json({ success: false, error: 'Failed to apply updates' });
        }
    });

    // POST - Parse and apply in one step (with confirmation)
    app.post('/api/updates/parse-and-apply', async (req, res) => {
        const { updateText, autoApply } = req.body;

        if (!updateText || updateText.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Update text is required' });
        }

        try {
            // Get all existing projects
            const existingProjects = await dbAll('SELECT * FROM projects WHERE approved = 1 ORDER BY name');

            // Parse with GPT-4
            const parseResult = await parseUpdateWithGPT(updateText, existingProjects);

            if (!parseResult.success) {
                return res.status(503).json(parseResult);
            }

            if (autoApply) {
                // Apply immediately
                const applyResult = await applyParsedUpdates(parseResult.data, dbRun, dbGet);

                res.json({
                    success: true,
                    data: {
                        parsed: parseResult.data,
                        applied: applyResult.results,
                        message: applyResult.message
                    }
                });
            } else {
                // Just return preview
                const preview = await previewParsedUpdates(parseResult.data, existingProjects);

                res.json({
                    success: true,
                    data: {
                        parsed: parseResult.data,
                        preview: preview,
                        message: 'Ready to apply. Set autoApply=true to confirm.'
                    }
                });
            }

        } catch (err) {
            console.error('Error processing update:', err);
            res.status(500).json({ success: false, error: 'Failed to process update' });
        }
    });

    // ============================================
    // GOOGLE SHEETS INTEGRATION ENDPOINTS
    // ============================================

    const { exportToGoogleSheets, importFromGoogleSheets, createNewSpreadsheet, exportStatsToSheet } = require('./sheets-service');

    // POST - Export all projects to Google Sheets
    app.post('/api/google-sheets/export', async (req, res) => {
        const { spreadsheetId } = req.body;

        if (!spreadsheetId) {
            return res.status(400).json({ success: false, error: 'Spreadsheet ID is required' });
        }

        try {
            const projects = await dbAll('SELECT * FROM projects WHERE approved = 1 ORDER BY name');
            const result = await exportToGoogleSheets(projects, spreadsheetId);

            res.json(result);
        } catch (err) {
            console.error('Error exporting to Google Sheets:', err);
            res.status(500).json({ success: false, error: 'Failed to export to Google Sheets' });
        }
    });

    // POST - Import projects from Google Sheets
    app.post('/api/google-sheets/import', async (req, res) => {
        const { spreadsheetId } = req.body;

        if (!spreadsheetId) {
            return res.status(400).json({ success: false, error: 'Spreadsheet ID is required' });
        }

        try {
            const result = await importFromGoogleSheets(spreadsheetId);

            if (!result.success) {
                return res.json(result);
            }

            // Update projects in database (optional - could be used for bidirectional sync)
            // For now, just return the imported data
            res.json(result);
        } catch (err) {
            console.error('Error importing from Google Sheets:', err);
            res.status(500).json({ success: false, error: 'Failed to import from Google Sheets' });
        }
    });

    // POST - Create a new Google Spreadsheet
    app.post('/api/google-sheets/create', async (req, res) => {
        const { title } = req.body;

        try {
            const result = await createNewSpreadsheet(title || 'Iowa DOT 2050 Plan Tracker');

            if (result.success) {
                // Automatically export current data to new spreadsheet
                const projects = await dbAll('SELECT * FROM projects WHERE approved = 1 ORDER BY name');
                await exportToGoogleSheets(projects, result.spreadsheetId);

                // Export stats too
                const stats = await dbGet(`
                    SELECT
                        COUNT(*) as total,
                        AVG(completion_percentage) as avg_completion
                    FROM projects WHERE approved = 1
                `);

                const categoryBreakdown = await dbAll('SELECT category, COUNT(*) as count, AVG(completion_percentage) as avg_completion FROM projects WHERE approved = 1 GROUP BY category');
                const statusBreakdown = await dbAll('SELECT status, COUNT(*) as count FROM projects WHERE approved = 1 GROUP BY status');

                await exportStatsToSheet(result.spreadsheetId, {
                    total_projects: stats.total,
                    avg_completion: Math.round(stats.avg_completion || 0),
                    weighted_completion: 0,
                    total_weight: 0,
                    category_breakdown: categoryBreakdown,
                    status_breakdown: statusBreakdown
                });
            }

            res.json(result);
        } catch (err) {
            console.error('Error creating Google Spreadsheet:', err);
            res.status(500).json({ success: false, error: 'Failed to create spreadsheet' });
        }
    });

    // ============================================
    // EMAIL SUBSCRIPTION ENDPOINTS
    // ============================================

    const crypto = require('crypto');
    const { sendProjectUpdateNotification, sendWelcomeNotification } = require('./email-service');

    // POST - Subscribe to project updates
    app.post('/api/projects/:id/subscribe', async (req, res) => {
        const { email } = req.body;
        const project_id = req.params.id;

        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ success: false, error: 'Valid email address is required' });
        }

        try {
            // Check if already subscribed
            const existing = await dbGet(
                'SELECT * FROM project_subscriptions WHERE project_id = ? AND email = ?',
                [project_id, email]
            );

            if (existing && existing.active) {
                return res.json({ success: true, message: 'Already subscribed to this project', alreadySubscribed: true });
            }

            // Generate unsubscribe token
            const unsubscribe_token = crypto.randomBytes(32).toString('hex');

            // Default preferences: all notifications enabled
            const preferences = JSON.stringify({
                status: true,
                completion: true,
                comments: true,
                milestones: true
            });

            if (existing && !existing.active) {
                // Reactivate subscription
                await dbRun(
                    'UPDATE project_subscriptions SET active = 1, subscribed_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [existing.id]
                );
            } else {
                // Create new subscription
                await dbRun(`
                    INSERT INTO project_subscriptions (project_id, email, unsubscribe_token, preferences)
                    VALUES (?, ?, ?, ?)
                `, [project_id, email, unsubscribe_token, preferences]);
            }

            // Get project details
            const project = await dbGet('SELECT * FROM projects WHERE id = ?', [project_id]);

            // Send welcome email
            await sendWelcomeNotification(email, project);

            res.json({ success: true, message: 'Successfully subscribed! Check your email for confirmation.' });
        } catch (err) {
            console.error('Error creating subscription:', err);
            res.status(500).json({ success: false, error: 'Failed to subscribe' });
        }
    });

    // GET - Check if email is subscribed to a project
    app.get('/api/projects/:id/subscription/:email', async (req, res) => {
        try {
            const subscription = await dbGet(
                'SELECT * FROM project_subscriptions WHERE project_id = ? AND email = ? AND active = 1',
                [req.params.id, req.params.email]
            );

            res.json({ success: true, subscribed: !!subscription });
        } catch (err) {
            console.error('Error checking subscription:', err);
            res.status(500).json({ success: false, error: 'Failed to check subscription' });
        }
    });

    // POST - Unsubscribe from project
    app.post('/api/unsubscribe', async (req, res) => {
        const { email, project_id, token } = req.body;

        try {
            let query = 'UPDATE project_subscriptions SET active = 0 WHERE ';
            let params = [];

            if (token) {
                query += 'unsubscribe_token = ?';
                params = [token];
            } else if (email && project_id) {
                query += 'email = ? AND project_id = ?';
                params = [email, project_id];
            } else {
                return res.status(400).json({ success: false, error: 'Email and project_id, or token required' });
            }

            await dbRun(query, params);

            res.json({ success: true, message: 'Successfully unsubscribed' });
        } catch (err) {
            console.error('Error unsubscribing:', err);
            res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
        }
    });

    // GET - Get all subscriptions for a user email
    app.get('/api/subscriptions/:email', async (req, res) => {
        try {
            const subscriptions = await dbAll(`
                SELECT ps.*, p.name as project_name, p.category, p.status, p.completion_percentage
                FROM project_subscriptions ps
                JOIN projects p ON ps.project_id = p.id
                WHERE ps.email = ? AND ps.active = 1
                ORDER BY ps.subscribed_at DESC
            `, [req.params.email]);

            res.json({ success: true, data: subscriptions });
        } catch (err) {
            console.error('Error fetching subscriptions:', err);
            res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' });
        }
    });

    // ============================================
    // DATABASE SETUP ENDPOINT (for Railway)
    // ============================================
    app.get('/api/setup-database', async (req, res) => {
        try {
            console.log('🚀 Running database setup...');

            // Step 1: Create major projects tables
            const additionalSchema = fs.readFileSync(path.join(__dirname, 'add-major-projects-tables.sql'), 'utf8');
            await new Promise((resolve, reject) => {
                getDb().exec(additionalSchema, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('✅ Major projects tables created');

            // Step 2: Check if data already exists
            const existing = await dbGet('SELECT COUNT(*) as count FROM major_projects');
            if (existing.count > 0) {
                return res.json({
                    success: true,
                    message: `Database already set up with ${existing.count} major projects`,
                    count: existing.count
                });
            }

            // Step 3: Load GeoJSON data
            const geojsonPath = path.join(__dirname, 'major-projects-data.geojson');
            if (!fs.existsSync(geojsonPath)) {
                return res.json({
                    success: true,
                    message: 'Tables created but no GeoJSON data found to import',
                    count: 0
                });
            }

            const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

            // Step 4: Insert major projects
            for (const feature of geojsonData.features) {
                const props = feature.properties;
                const coords = feature.geometry.coordinates;

                await dbRun(`
                    INSERT INTO major_projects (
                        project_title, project_number, district, description,
                        start_date, end_date, contact_name, contact_email,
                        latitude, longitude, geojson_object_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    props.Project_Title,
                    props.Project_Number,
                    props.District,
                    props.Description,
                    props.Start_Date,
                    props.End_Date,
                    props.Contact_name,
                    props.Contact_Email,
                    coords[1], // latitude
                    coords[0], // longitude
                    props.OBJECTID
                ]);
            }

            console.log(`✅ Inserted ${geojsonData.features.length} major projects`);

            res.json({
                success: true,
                message: `Database setup complete! Inserted ${geojsonData.features.length} major construction projects`,
                count: geojsonData.features.length
            });
        } catch (err) {
            console.error('❌ Database setup error:', err);
            res.status(500).json({
                success: false,
                error: 'Database setup failed: ' + err.message
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
