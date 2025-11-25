const express = require('express');
const router = express.Router();
const { getDb } = require('./database');

// Helper functions to promisify database operations
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        getDb().all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
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

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        getDb().run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

// GET all AI use cases
router.get('/use-cases', async (req, res) => {
    try {
        const useCases = await dbAll('SELECT * FROM ai_use_cases ORDER BY stage, name');

        res.json({
            success: true,
            useCases
        });
    } catch (error) {
        console.error('Error fetching AI use cases:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI use cases'
        });
    }
});

// GET single AI use case
router.get('/use-cases/:id', async (req, res) => {
    try {
        const useCase = await dbGet('SELECT * FROM ai_use_cases WHERE id = ?', [req.params.id]);

        if (!useCase) {
            return res.status(404).json({
                success: false,
                error: 'Use case not found'
            });
        }

        res.json({
            success: true,
            useCase
        });
    } catch (error) {
        console.error('Error fetching AI use case:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI use case'
        });
    }
});

// POST create new AI use case
router.post('/use-cases', async (req, res) => {
    try {
        const { name, stage, stage_label, business_area, lr_tracker_id, description, benefits, risks, timeline, video_url } = req.body;

        if (!name || !stage || !business_area) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, stage, business_area'
            });
        }

        const result = await dbRun(
            `INSERT INTO ai_use_cases
            (name, stage, stage_label, business_area, lr_tracker_id, description, benefits, risks, timeline, video_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, stage, stage_label || stage, business_area, lr_tracker_id, description, benefits, risks, timeline, video_url]
        );

        res.json({
            success: true,
            id: result.id,
            message: 'AI use case created successfully'
        });
    } catch (error) {
        console.error('Error creating AI use case:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create AI use case'
        });
    }
});

// PATCH update AI use case
router.patch('/use-cases/:id', async (req, res) => {
    try {
        const { name, stage, stage_label, business_area, lr_tracker_id, description, benefits, risks, timeline, video_url } = req.body;

        // Build dynamic update query
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (stage !== undefined) {
            updates.push('stage = ?');
            values.push(stage);
        }
        if (stage_label !== undefined) {
            updates.push('stage_label = ?');
            values.push(stage_label);
        }
        if (business_area !== undefined) {
            updates.push('business_area = ?');
            values.push(business_area);
        }
        if (lr_tracker_id !== undefined) {
            updates.push('lr_tracker_id = ?');
            values.push(lr_tracker_id);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (benefits !== undefined) {
            updates.push('benefits = ?');
            values.push(benefits);
        }
        if (risks !== undefined) {
            updates.push('risks = ?');
            values.push(risks);
        }
        if (timeline !== undefined) {
            updates.push('timeline = ?');
            values.push(timeline);
        }
        if (video_url !== undefined) {
            updates.push('video_url = ?');
            values.push(video_url);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        await dbRun(
            `UPDATE ai_use_cases SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: 'AI use case updated successfully'
        });
    } catch (error) {
        console.error('Error updating AI use case:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update AI use case'
        });
    }
});

// DELETE AI use case
router.delete('/use-cases/:id', async (req, res) => {
    try {
        await dbRun('DELETE FROM ai_use_cases WHERE id = ?', [req.params.id]);

        res.json({
            success: true,
            message: 'AI use case deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting AI use case:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete AI use case'
        });
    }
});

// GET AI strategy summary/stats
router.get('/summary', async (req, res) => {
    try {
        // Get initiative stats
        const initiatives = await dbAll(`
            SELECT COUNT(*) as count, AVG(completion_percentage) as avg_completion
            FROM projects
            WHERE category = 'AI Strategy'
        `);

        // Get use case counts by stage
        const useCaseStats = await dbAll(`
            SELECT stage, COUNT(*) as count
            FROM ai_use_cases
            GROUP BY stage
        `);

        // Get recent initiatives
        const recentInitiatives = await dbAll(`
            SELECT id, name, status, completion_percentage
            FROM projects
            WHERE category = 'AI Strategy'
            ORDER BY updated_at DESC
            LIMIT 3
        `);

        res.json({
            success: true,
            summary: {
                totalInitiatives: initiatives[0].count,
                avgCompletion: Math.round(initiatives[0].avg_completion || 0),
                useCaseStats,
                recentInitiatives
            }
        });
    } catch (error) {
        console.error('Error fetching AI summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI summary'
        });
    }
});

module.exports = router;
