/**
 * Geospatial Conflict Detection Service
 * PATENT-WORTHY FEATURE #3
 *
 * Automatically detects conflicts between project locations and regulatory zones
 *
 * Novel Components:
 * - Multi-layer spatial intersection analysis
 * - Buffer zone calculations
 * - Severity-based conflict scoring
 * - Automated permit checklist generation
 */

const turf = require('@turf/turf');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

class GeospatialConflictService {
    constructor(dbPath = './iowa-dot-tracker.db') {
        this.db = new sqlite3.Database(dbPath);

        // Default buffer sizes for project impact zones (meters)
        this.defaultBuffers = {
            'System Plan': 5000,      // 5km - statewide impact
            'Modal Plan': 3000,       // 3km - regional impact
            'Safety Program': 1000,   // 1km - localized
            'Financing Program': 500, // 500m - point location
            'Policy Program': 100     // 100m - minimal spatial impact
        };
    }

    /**
     * CORE PATENTABLE METHOD
     * Check a project for spatial conflicts with regulatory layers
     *
     * @param {number} projectId - Project ID
     * @returns {Array} - Detected conflicts with severity scoring
     */
    async checkProjectConflicts(projectId) {
        console.log(`Checking spatial conflicts for project ${projectId}`);

        // Get project location
        const project = await this.getProject(projectId);

        if (!project.latitude || !project.longitude) {
            return {
                project_id: projectId,
                has_location: false,
                conflicts: [],
                message: 'Project has no geographic coordinates'
            };
        }

        // Create project buffer zone
        const bufferSize = this.defaultBuffers[project.category] || 1000;
        const projectPoint = turf.point([project.longitude, project.latitude]);
        const projectBuffer = turf.buffer(projectPoint, bufferSize / 1000, { units: 'kilometers' });

        // Get all enabled regulatory layers
        const layers = await this.getRegulatoryLayers();

        const conflicts = [];

        // Check each layer for intersections
        for (const layer of layers) {
            if (!layer.enabled || !layer.geojson_path) continue;

            try {
                const layerConflicts = await this.checkLayerConflict(
                    project,
                    projectBuffer,
                    layer
                );

                conflicts.push(...layerConflicts);
            } catch (error) {
                console.error(`Error checking layer ${layer.layer_name}:`, error.message);
            }
        }

        // Save conflicts to database
        for (const conflict of conflicts) {
            await this.saveConflict(conflict);
        }

        // Generate permit checklist
        const permits = this.generatePermitChecklist(conflicts, project);
        for (const permit of permits) {
            await this.savePermit(permit);
        }

        return {
            project_id: projectId,
            project_name: project.name,
            location: [project.latitude, project.longitude],
            buffer_size_meters: bufferSize,
            conflicts_found: conflicts.length,
            conflicts: conflicts,
            permits_required: permits.length,
            permits: permits
        };
    }

    /**
     * NOVEL ALGORITHM
     * Check intersection with a single regulatory layer
     */
    async checkLayerConflict(project, projectBuffer, layer) {
        const conflicts = [];

        // Load GeoJSON file (in production, cache this)
        if (!fs.existsSync(layer.geojson_path)) {
            console.warn(`GeoJSON file not found: ${layer.geojson_path}`);
            return conflicts;
        }

        const geoJSON = JSON.parse(fs.readFileSync(layer.geojson_path, 'utf8'));

        // Check each feature in the layer
        for (const feature of geoJSON.features) {
            try {
                // Calculate intersection
                const intersection = turf.intersect(projectBuffer, feature);

                if (intersection) {
                    // Calculate intersection area
                    const intersectionArea = turf.area(intersection); // square meters
                    const bufferArea = turf.area(projectBuffer);
                    const intersectionPct = (intersectionArea / bufferArea) * 100;

                    // Determine severity based on area and layer type
                    const severity = this.calculateConflictSeverity(
                        layer.severity_level,
                        intersectionPct
                    );

                    conflicts.push({
                        project_id: project.id,
                        layer_id: layer.id,
                        conflict_type: layer.layer_type,
                        severity: severity,
                        intersection_area_sqm: Math.round(intersectionArea),
                        intersection_percentage: Math.round(intersectionPct * 10) / 10,
                        site_name: feature.properties.name || `${layer.layer_type} site`,
                        site_id: feature.properties.id || feature.properties.objectid,
                        site_metadata: JSON.stringify(feature.properties),
                        required_permits: this.getRequiredPermits(layer.layer_type)
                    });
                }
            } catch (error) {
                // Skip invalid geometries
                continue;
            }
        }

        return conflicts;
    }

    /**
     * PATENTABLE SEVERITY SCORING
     * Combines layer importance with intersection magnitude
     */
    calculateConflictSeverity(layerSeverity, intersectionPct) {
        // Layer severity weights
        const severityWeights = {
            'critical': 1.0,
            'high': 0.75,
            'medium': 0.5,
            'low': 0.25
        };

        const baseWeight = severityWeights[layerSeverity] || 0.5;

        // Intersection size factor
        let sizeFactor;
        if (intersectionPct > 50) sizeFactor = 1.0;        // Major overlap
        else if (intersectionPct > 25) sizeFactor = 0.8;   // Significant
        else if (intersectionPct > 10) sizeFactor = 0.6;   // Moderate
        else if (intersectionPct > 1) sizeFactor = 0.4;    // Minor
        else sizeFactor = 0.2;                             // Minimal

        // Combined score
        const score = baseWeight * sizeFactor;

        // Map to severity label
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'medium';
        return 'low';
    }

    /**
     * Generate permit checklist based on conflict types
     */
    generatePermitChecklist(conflicts, project) {
        const permits = [];
        const permitMap = new Map();

        for (const conflict of conflicts) {
            const requiredPermits = JSON.parse(conflict.required_permits);

            for (const permit of requiredPermits) {
                const key = `${permit.type}_${permit.agency}`;

                if (!permitMap.has(key)) {
                    permitMap.set(key, {
                        project_id: project.id,
                        permit_type: permit.type,
                        permit_agency: permit.agency,
                        required_by: permit.jurisdiction,
                        status: 'needed',
                        auto_detected: 1,
                        notes: `Required due to ${conflict.conflict_type} conflict (${conflict.site_name})`
                    });
                }
            }
        }

        return Array.from(permitMap.values());
    }

    /**
     * Get required permits for a conflict type
     */
    getRequiredPermits(conflictType) {
        const permitMatrix = {
            'wetland': [
                {type: 'Section 404', agency: 'USACE', jurisdiction: 'Federal'},
                {type: 'Section 401 Water Quality Cert', agency: 'Iowa DNR', jurisdiction: 'State'}
            ],
            'historic': [
                {type: 'Section 106 Review', agency: 'SHPO', jurisdiction: 'Federal'}
            ],
            'tribal': [
                {type: 'Tribal Consultation', agency: 'Tribal Nations', jurisdiction: 'Federal'},
                {type: 'Section 106 Review', agency: 'SHPO', jurisdiction: 'Federal'}
            ],
            'habitat': [
                {type: 'Endangered Species Consultation', agency: 'USFWS', jurisdiction: 'Federal'},
                {type: 'Habitat Permit', agency: 'Iowa DNR', jurisdiction: 'State'}
            ],
            'floodplain': [
                {type: 'Floodplain Development Permit', agency: 'Local Jurisdiction', jurisdiction: 'Local'}
            ],
            'utility': [
                {type: 'Utility Relocation Agreement', agency: 'Utility Company', jurisdiction: 'Private'}
            ],
            'school': [
                {type: 'School Zone Traffic Plan', agency: 'Iowa DOT', jurisdiction: 'State'}
            ],
            'archaeological': [
                {type: 'Archaeological Survey', agency: 'SHPO', jurisdiction: 'State'},
                {type: 'Section 106 Review', agency: 'SHPO', jurisdiction: 'Federal'}
            ]
        };

        return JSON.stringify(permitMatrix[conflictType] || []);
    }

    /**
     * Save conflict to database
     */
    async saveConflict(conflict) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO spatial_conflicts (
                    project_id, layer_id, conflict_type, severity,
                    intersection_area_sqm, intersection_percentage,
                    site_name, site_id, site_metadata, required_permits
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                conflict.project_id,
                conflict.layer_id,
                conflict.conflict_type,
                conflict.severity,
                conflict.intersection_area_sqm,
                conflict.intersection_percentage,
                conflict.site_name,
                conflict.site_id,
                conflict.site_metadata,
                conflict.required_permits
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /**
     * Save permit to database
     */
    async savePermit(permit) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO project_permits (
                    project_id, permit_type, permit_agency, required_by,
                    status, auto_detected, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                permit.project_id,
                permit.permit_type,
                permit.permit_agency,
                permit.required_by,
                permit.status,
                permit.auto_detected,
                permit.notes
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /**
     * Get project by ID
     */
    async getProject(projectId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * Get all regulatory layers
     */
    async getRegulatoryLayers() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM regulatory_layers WHERE enabled = 1', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Get conflicts for a project
     */
    async getProjectConflicts(projectId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT sc.*, rl.layer_name, rl.source_agency
                FROM spatial_conflicts sc
                JOIN regulatory_layers rl ON sc.layer_id = rl.id
                WHERE sc.project_id = ?
                  AND sc.resolved = 0
                ORDER BY
                    CASE sc.severity
                        WHEN 'critical' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END
            `, [projectId], (err, rows) => {
                if (err) reject(err);
                else {
                    rows.forEach(row => {
                        row.site_metadata = JSON.parse(row.site_metadata);
                    });
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Mark conflict as resolved
     */
    async resolveConflict(conflictId, resolutionNotes, userId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE spatial_conflicts
                SET resolved = 1,
                    resolution_notes = ?,
                    resolved_at = datetime('now'),
                    resolved_by = ?
                WHERE id = ?
            `, [resolutionNotes, userId, conflictId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }
}

module.exports = GeospatialConflictService;
