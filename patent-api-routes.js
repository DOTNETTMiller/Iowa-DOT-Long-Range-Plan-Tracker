/**
 * Patent Features API Routes
 * Exposes all 4 patent-worthy features via REST API
 *
 * Mount this in server.js with: app.use('/api/patent', require('./patent-api-routes'));
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import patent feature services
const PredictiveDelayService = require('./predictive-delay-service');
const DependencyExtractionService = require('./dependency-extraction-service');
const GeospatialConflictService = require('./geospatial-conflict-service');
const LivingPlanGeneratorService = require('./living-plan-generator-service');

// Configure file upload for PDFs
const upload = multer({
    dest: 'uploads/pdfs/',
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Initialize services
const dbPath = './iowa-dot-tracker.db';
const delayService = new PredictiveDelayService(dbPath);
const dependencyService = new DependencyExtractionService(dbPath);
const conflictService = new GeospatialConflictService(dbPath);
const planService = new LivingPlanGeneratorService(dbPath);

// ============================================================================
// FEATURE 1: PREDICTIVE DELAY ANALYSIS
// ============================================================================

/**
 * Generate delay prediction for a specific project
 * GET /api/patent/predictions/project/:id
 */
router.get('/predictions/project/:id', async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const project = await delayService.db.get('SELECT * FROM projects WHERE id = ?', [projectId]);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const prediction = await delayService.predictDelay(project);

        // Save to database
        await delayService.savePrediction(prediction);

        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate predictions for all active projects
 * POST /api/patent/predictions/generate-all
 */
router.post('/predictions/generate-all', async (req, res) => {
    try {
        const predictions = await delayService.generateAllPredictions();

        // Save all predictions
        for (const prediction of predictions) {
            await delayService.savePrediction(prediction);
        }

        res.json({
            success: true,
            count: predictions.length,
            data: predictions
        });
    } catch (error) {
        console.error('Batch prediction error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get high-risk projects (delay probability > 60%)
 * GET /api/patent/predictions/high-risk
 */
router.get('/predictions/high-risk', async (req, res) => {
    try {
        const highRiskProjects = await delayService.getHighRiskProjects();

        res.json({
            success: true,
            count: highRiskProjects.length,
            data: highRiskProjects
        });
    } catch (error) {
        console.error('High risk query error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get prediction history for a project
 * GET /api/patent/predictions/history/:id
 */
router.get('/predictions/history/:id', async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const history = await delayService.getPredictionHistory(projectId);

        res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        console.error('Prediction history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// FEATURE 2: DEPENDENCY EXTRACTION
// ============================================================================

/**
 * Extract dependencies from uploaded PDF
 * POST /api/patent/dependencies/extract-pdf
 */
router.post('/dependencies/extract-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        const pdfPath = req.file.path;
        const dependencies = await dependencyService.extractFromPDF(pdfPath);

        // Save dependencies (only high confidence ones)
        const result = await dependencyService.saveDependencies(dependencies);

        res.json({
            success: true,
            dependencies_found: dependencies.length,
            dependencies_added: result.added.length,
            dependencies_rejected: result.rejected.length,
            data: {
                added: result.added,
                rejected: result.rejected
            }
        });
    } catch (error) {
        console.error('PDF extraction error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Extract dependencies from text
 * POST /api/patent/dependencies/extract-text
 */
router.post('/dependencies/extract-text', async (req, res) => {
    try {
        const { text, source = 'manual_entry' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const dependencies = await dependencyService.extractFromText(text, source);
        const result = await dependencyService.saveDependencies(dependencies);

        res.json({
            success: true,
            dependencies_found: dependencies.length,
            dependencies_added: result.added.length,
            dependencies_rejected: result.rejected.length,
            data: {
                added: result.added,
                rejected: result.rejected
            }
        });
    } catch (error) {
        console.error('Text extraction error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Calculate critical path
 * GET /api/patent/dependencies/critical-path
 */
router.get('/dependencies/critical-path', async (req, res) => {
    try {
        const criticalPath = await dependencyService.calculateCriticalPath();

        res.json({
            success: true,
            data: criticalPath
        });
    } catch (error) {
        console.error('Critical path error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get dependency graph for visualization
 * GET /api/patent/dependencies/graph
 */
router.get('/dependencies/graph', async (req, res) => {
    try {
        const graph = await dependencyService.getDependencyGraph();

        res.json({
            success: true,
            data: graph
        });
    } catch (error) {
        console.error('Dependency graph error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get projects dependent on specific project
 * GET /api/patent/dependencies/project/:id/dependents
 */
router.get('/dependencies/project/:id/dependents', async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const dependents = await dependencyService.getDependentProjects(projectId);

        res.json({
            success: true,
            count: dependents.length,
            data: dependents
        });
    } catch (error) {
        console.error('Dependents query error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get projects that specific project depends on
 * GET /api/patent/dependencies/project/:id/prerequisites
 */
router.get('/dependencies/project/:id/prerequisites', async (req, res) => {
    try {
        const projectId = parseInt(req.params.id);
        const prerequisites = await dependencyService.getPrerequisiteProjects(projectId);

        res.json({
            success: true,
            count: prerequisites.length,
            data: prerequisites
        });
    } catch (error) {
        console.error('Prerequisites query error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Add manual dependency
 * POST /api/patent/dependencies/add
 */
router.post('/dependencies/add', async (req, res) => {
    try {
        const { source_project_id, target_project_id, dependency_type, notes } = req.body;

        if (!source_project_id || !target_project_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const dependency = {
            source_project_id,
            target_project_id,
            dependency_type: dependency_type || 'prerequisite',
            extracted_from: 'manual',
            source_text: notes || 'Manually added by user',
            confidence_score: 1.0
        };

        const id = await dependencyService.insertDependency(dependency);

        res.json({
            success: true,
            dependency_id: id
        });
    } catch (error) {
        console.error('Add dependency error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// FEATURE 3: GEOSPATIAL CONFLICT DETECTION
// ============================================================================

/**
 * Check project for spatial conflicts
 * POST /api/patent/spatial/check-conflicts/:projectId
 */
router.post('/spatial/check-conflicts/:projectId', async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const result = await conflictService.checkProjectConflicts(projectId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Conflict detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get conflicts for a project
 * GET /api/patent/spatial/conflicts/:projectId
 */
router.get('/spatial/conflicts/:projectId', async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const conflicts = await conflictService.getProjectConflicts(projectId);

        res.json({
            success: true,
            count: conflicts.length,
            data: conflicts
        });
    } catch (error) {
        console.error('Conflicts query error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Mark conflict as resolved
 * PATCH /api/patent/spatial/conflicts/:conflictId/resolve
 */
router.patch('/spatial/conflicts/:conflictId/resolve', async (req, res) => {
    try {
        const conflictId = parseInt(req.params.conflictId);
        const { resolution_notes, user_id } = req.body;

        await conflictService.resolveConflict(conflictId, resolution_notes, user_id);

        res.json({
            success: true,
            message: 'Conflict marked as resolved'
        });
    } catch (error) {
        console.error('Resolve conflict error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// FEATURE 4: LIVING PLAN GENERATOR
// ============================================================================

/**
 * Perform gap analysis
 * POST /api/patent/plan-generator/analyze-gaps
 */
router.post('/plan-generator/analyze-gaps', async (req, res) => {
    try {
        const { plan_cycle = '2025-2045' } = req.body;
        const gaps = await planService.performGapAnalysis(plan_cycle);

        res.json({
            success: true,
            plan_cycle,
            gaps_found: gaps.length,
            data: gaps
        });
    } catch (error) {
        console.error('Gap analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate AI recommendations
 * POST /api/patent/plan-generator/generate-recommendations
 */
router.post('/plan-generator/generate-recommendations', async (req, res) => {
    try {
        const {
            plan_cycle = '2025-2045',
            focus_areas = ['gap_filling'],
            count = 10
        } = req.body;

        const recommendations = await planService.generateRecommendations(
            plan_cycle,
            focus_areas,
            count
        );

        res.json({
            success: true,
            plan_cycle,
            recommendations_generated: recommendations.length,
            data: recommendations
        });
    } catch (error) {
        console.error('Recommendation generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get recommendations for a plan cycle
 * GET /api/patent/plan-generator/recommendations
 */
router.get('/plan-generator/recommendations', async (req, res) => {
    try {
        const {
            plan_cycle = '2025-2045',
            status = 'draft'
        } = req.query;

        const recommendations = await planService.getRecommendations(plan_cycle, status);

        res.json({
            success: true,
            count: recommendations.length,
            data: recommendations
        });
    } catch (error) {
        console.error('Recommendations query error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Vote on a recommendation
 * POST /api/patent/plan-generator/recommendations/:id/vote
 */
router.post('/plan-generator/recommendations/:id/vote', async (req, res) => {
    try {
        const recommendationId = parseInt(req.params.id);
        const { vote, user_id } = req.body; // vote: 'up' or 'down'

        // Update vote count
        const voteChange = vote === 'up' ? 1 : -1;

        await new Promise((resolve, reject) => {
            planService.db.run(`
                UPDATE plan_recommendations
                SET vote_count = vote_count + ?
                WHERE id = ?
            `, [voteChange, recommendationId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({
            success: true,
            message: 'Vote recorded'
        });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Approve recommendation (convert to project)
 * POST /api/patent/plan-generator/recommendations/:id/approve
 */
router.post('/plan-generator/recommendations/:id/approve', async (req, res) => {
    try {
        const recommendationId = parseInt(req.params.id);
        const { create_project = false, user_id } = req.body;

        // Update status
        await new Promise((resolve, reject) => {
            planService.db.run(`
                UPDATE plan_recommendations
                SET status = 'approved'
                WHERE id = ?
            `, [recommendationId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        let projectId = null;

        // Optionally create actual project
        if (create_project) {
            const rec = await new Promise((resolve, reject) => {
                planService.db.get(`
                    SELECT * FROM plan_recommendations WHERE id = ?
                `, [recommendationId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            projectId = await new Promise((resolve, reject) => {
                planService.db.run(`
                    INSERT INTO projects (
                        name, category, description, status,
                        completion_percentage, responsible, core_values
                    ) VALUES (?, ?, ?, 'Draft', 0, 'TBD', ?)
                `, [
                    rec.project_name,
                    rec.category,
                    rec.description,
                    rec.core_values
                ], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        }

        res.json({
            success: true,
            message: 'Recommendation approved',
            project_created: create_project,
            project_id: projectId
        });
    } catch (error) {
        console.error('Approve recommendation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// COMBINED ANALYTICS & DASHBOARD DATA
// ============================================================================

/**
 * Get dashboard summary for all patent features
 * GET /api/patent/dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Predictions summary
        const highRiskCount = await new Promise((resolve) => {
            delayService.db.get(`
                SELECT COUNT(*) as count
                FROM delay_predictions
                WHERE delay_probability > 0.6
            `, (err, row) => resolve(row?.count || 0));
        });

        // Dependencies summary
        const dependencyCount = await new Promise((resolve) => {
            dependencyService.db.get(`
                SELECT COUNT(*) as count FROM project_dependencies
            `, (err, row) => resolve(row?.count || 0));
        });

        // Conflicts summary
        const unresolvedConflicts = await new Promise((resolve) => {
            conflictService.db.get(`
                SELECT COUNT(*) as count
                FROM spatial_conflicts
                WHERE resolved = 0
            `, (err, row) => resolve(row?.count || 0));
        });

        // Recommendations summary
        const draftRecommendations = await new Promise((resolve) => {
            planService.db.get(`
                SELECT COUNT(*) as count
                FROM plan_recommendations
                WHERE status = 'draft'
            `, (err, row) => resolve(row?.count || 0));
        });

        res.json({
            success: true,
            data: {
                predictive_delay: {
                    high_risk_projects: highRiskCount,
                    feature_name: 'Predictive Delay Analysis'
                },
                dependency_extraction: {
                    total_dependencies: dependencyCount,
                    feature_name: 'Automated Dependency Extraction'
                },
                spatial_conflicts: {
                    unresolved_conflicts: unresolvedConflicts,
                    feature_name: 'Geospatial Conflict Detection'
                },
                plan_generator: {
                    draft_recommendations: draftRecommendations,
                    feature_name: 'Living Plan Generator'
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
