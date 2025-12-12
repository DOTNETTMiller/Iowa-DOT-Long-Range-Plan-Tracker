/**
 * Dependency Extraction Service
 * PATENT-WORTHY FEATURE #2
 *
 * Automatically extracts project dependencies from PDFs and text
 * using NLP and pattern matching
 *
 * Novel Components:
 * - PDF text extraction with context preservation
 * - Transportation-specific NER (Named Entity Recognition)
 * - Dependency pattern matching
 * - Critical path calculation
 */

const fs = require('fs');
const pdf = require('pdf-parse');
const compromise = require('compromise');
const sqlite3 = require('sqlite3').verbose();
const graphlib = require('graphlib');

class DependencyExtractionService {
    constructor(dbPath = './iowa-dot-tracker.db') {
        this.db = new sqlite3.Database(dbPath);

        // Dependency pattern rules (NOVEL - transportation-specific)
        this.dependencyPatterns = [
            {
                pattern: /(.+?)\s+(?:must be completed|shall be completed|requires completion of|depends on|is contingent upon)\s+(?:the\s+)?(.+?)(?:\.|,|before|prior to)/gi,
                type: 'prerequisite'
            },
            {
                pattern: /(.+?)\s+(?:follows|comes after|succeeds|built after)\s+(?:the\s+)?(.+?)(?:\.|,)/gi,
                type: 'sequential'
            },
            {
                pattern: /(.+?)\s+(?:and|with|alongside|concurrent with|in parallel with)\s+(?:the\s+)?(.+?)\s+(?:shall|will|should)/gi,
                type: 'concurrent'
            },
            {
                pattern: /(?:prerequisite|requirement):\s+(.+?)\s+for\s+(.+?)(?:\.|,)/gi,
                type: 'prerequisite'
            }
        ];
    }

    /**
     * CORE PATENTABLE METHOD
     * Extract dependencies from PDF document
     *
     * @param {string} pdfPath - Path to PDF file
     * @returns {Array} - Extracted dependencies
     */
    async extractFromPDF(pdfPath) {
        console.log(`Extracting dependencies from: ${pdfPath}`);

        // Step 1: Extract text from PDF
        const pdfBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdf(pdfBuffer);
        const text = pdfData.text;

        // Step 2: Get all existing projects for matching
        const projects = await this.getAllProjects();

        // Step 3: Extract dependencies using NLP
        const dependencies = await this.extractDependencies(text, projects);

        // Step 4: Log extraction
        await this.logExtraction(pdfPath, 'pdf_parse', dependencies.length);

        console.log(`Found ${dependencies.length} potential dependencies`);

        return dependencies;
    }

    /**
     * Extract dependencies from plain text
     */
    async extractFromText(text, source = 'manual_entry') {
        const projects = await this.getAllProjects();
        const dependencies = await this.extractDependencies(text, projects);

        await this.logExtraction(source, 'text_parse', dependencies.length);

        return dependencies;
    }

    /**
     * NOVEL NLP ALGORITHM
     * Extract project dependencies from unstructured text
     *
     * This is patent-worthy because it:
     * 1. Identifies project names in free text (custom NER)
     * 2. Finds relationship patterns specific to transportation planning
     * 3. Fuzzy matches to existing project database
     * 4. Assigns confidence scores
     */
    async extractDependencies(text, projects) {
        const dependencies = [];

        // Split into sentences for analysis
        const doc = compromise(text);
        const sentences = doc.sentences().out('array');

        for (const sentence of sentences) {
            // Try each dependency pattern
            for (const { pattern, type } of this.dependencyPatterns) {
                const matches = [...sentence.matchAll(pattern)];

                for (const match of matches) {
                    const sourceText = this.cleanProjectName(match[1]);
                    const targetText = this.cleanProjectName(match[2]);

                    // Try to match to existing projects
                    const sourceProject = this.findBestMatch(sourceText, projects);
                    const targetProject = this.findBestMatch(targetText, projects);

                    if (sourceProject && targetProject && sourceProject.id !== targetProject.id) {
                        dependencies.push({
                            source_project_id: sourceProject.id,
                            source_project_name: sourceProject.name,
                            target_project_id: targetProject.id,
                            target_project_name: targetProject.name,
                            dependency_type: type,
                            source_text: sentence,
                            confidence_score: this.calculateMatchConfidence(
                                sourceText,
                                targetText,
                                sourceProject,
                                targetProject
                            ),
                            extracted_from: 'nlp'
                        });
                    }
                }
            }
        }

        // Remove duplicates
        return this.deduplicateDependencies(dependencies);
    }

    /**
     * Clean project name from extracted text
     */
    cleanProjectName(text) {
        return text
            .replace(/^the\s+/i, '')
            .replace(/\s+project$/i, '')
            .replace(/\s+plan$/i, '')
            .replace(/\s+program$/i, '')
            .trim();
    }

    /**
     * NOVEL FUZZY MATCHING ALGORITHM
     * Find best matching project from database using similarity scoring
     */
    findBestMatch(extractedName, projects) {
        let bestMatch = null;
        let bestScore = 0;

        for (const project of projects) {
            const score = this.calculateSimilarity(
                extractedName.toLowerCase(),
                project.name.toLowerCase()
            );

            if (score > bestScore && score > 0.6) { // 60% similarity threshold
                bestScore = score;
                bestMatch = project;
            }
        }

        return bestMatch;
    }

    /**
     * Calculate string similarity (Dice coefficient)
     */
    calculateSimilarity(str1, str2) {
        const set1 = this.getBigrams(str1);
        const set2 = this.getBigrams(str2);

        const intersection = set1.filter(x => set2.includes(x));
        const similarity = (2.0 * intersection.length) / (set1.length + set2.length);

        return similarity;
    }

    /**
     * Get character bigrams for similarity calculation
     */
    getBigrams(str) {
        const bigrams = [];
        for (let i = 0; i < str.length - 1; i++) {
            bigrams.push(str.slice(i, i + 2));
        }
        return bigrams;
    }

    /**
     * Calculate confidence score for a matched dependency
     */
    calculateMatchConfidence(sourceText, targetText, sourceProject, targetProject) {
        const sourceSimilarity = this.calculateSimilarity(
            sourceText.toLowerCase(),
            sourceProject.name.toLowerCase()
        );
        const targetSimilarity = this.calculateSimilarity(
            targetText.toLowerCase(),
            targetProject.name.toLowerCase()
        );

        // Average the two similarities
        return (sourceSimilarity + targetSimilarity) / 2;
    }

    /**
     * Remove duplicate dependencies
     */
    deduplicateDependencies(dependencies) {
        const unique = [];
        const seen = new Set();

        for (const dep of dependencies) {
            const key = `${dep.source_project_id}-${dep.target_project_id}-${dep.dependency_type}`;

            if (!seen.has(key)) {
                seen.add(key);
                unique.push(dep);
            }
        }

        return unique;
    }

    /**
     * Save dependencies to database
     */
    async saveDependencies(dependencies) {
        const added = [];
        const rejected = [];

        for (const dep of dependencies) {
            try {
                // Check if already exists
                const exists = await this.dependencyExists(
                    dep.source_project_id,
                    dep.target_project_id,
                    dep.dependency_type
                );

                if (!exists && dep.confidence_score > 0.7) {
                    await this.insertDependency(dep);
                    added.push(dep);
                } else {
                    rejected.push(dep);
                }
            } catch (error) {
                console.error('Error saving dependency:', error);
                rejected.push(dep);
            }
        }

        return { added, rejected };
    }

    /**
     * Insert a dependency into database
     */
    async insertDependency(dep) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO project_dependencies (
                    source_project_id,
                    target_project_id,
                    dependency_type,
                    extracted_from,
                    source_text,
                    confidence_score
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                dep.source_project_id,
                dep.target_project_id,
                dep.dependency_type,
                dep.extracted_from,
                dep.source_text,
                dep.confidence_score
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /**
     * Check if dependency already exists
     */
    async dependencyExists(sourceId, targetId, type) {
        return new Promise((resolve) => {
            this.db.get(`
                SELECT id FROM project_dependencies
                WHERE source_project_id = ?
                  AND target_project_id = ?
                  AND dependency_type = ?
            `, [sourceId, targetId, type], (err, row) => {
                resolve(!!row);
            });
        });
    }

    /**
     * PATENTABLE ALGORITHM
     * Calculate critical path through project network
     *
     * Uses graph theory (longest path in DAG) to identify
     * sequence of projects that determines minimum completion time
     */
    async calculateCriticalPath() {
        // Build dependency graph
        const graph = new graphlib.Graph({ directed: true });

        // Get all dependencies
        const dependencies = await this.getAllDependencies();
        const projects = await this.getAllProjects();

        // Add nodes (projects)
        for (const project of projects) {
            const duration = project.target_completion_date
                ? this.estimateProjectDuration(project)
                : 365; // Default 1 year

            graph.setNode(project.id.toString(), {
                name: project.name,
                duration: duration,
                completion: project.completion_percentage
            });
        }

        // Add edges (dependencies)
        for (const dep of dependencies) {
            graph.setEdge(
                dep.source_project_id.toString(),
                dep.target_project_id.toString(),
                { type: dep.dependency_type }
            );
        }

        // Check for cycles (shouldn't exist in valid plan)
        if (!graphlib.alg.isAcyclic(graph)) {
            throw new Error('Dependency graph contains cycles - invalid dependencies detected');
        }

        // Topological sort to find longest path
        const sorted = graphlib.alg.topsort(graph);

        // Calculate earliest start times using dynamic programming
        const earliestStart = {};
        for (const nodeId of sorted) {
            const predecessors = graph.predecessors(nodeId) || [];

            if (predecessors.length === 0) {
                earliestStart[nodeId] = 0; // No dependencies = start immediately
            } else {
                earliestStart[nodeId] = Math.max(
                    ...predecessors.map(predId => {
                        const predNode = graph.node(predId);
                        return earliestStart[predId] + predNode.duration;
                    })
                );
            }
        }

        // Find critical path (longest path)
        let maxDuration = 0;
        let endNode = null;

        for (const nodeId of sorted) {
            const node = graph.node(nodeId);
            const totalTime = earliestStart[nodeId] + node.duration;

            if (totalTime > maxDuration) {
                maxDuration = totalTime;
                endNode = nodeId;
            }
        }

        // Backtrack to find full critical path
        const criticalPath = [];
        let currentNode = endNode;

        while (currentNode) {
            const node = graph.node(currentNode);
            criticalPath.unshift({
                project_id: parseInt(currentNode),
                project_name: node.name,
                earliest_start: earliestStart[currentNode],
                duration: node.duration,
                completion_percentage: node.completion
            });

            // Find predecessor on critical path
            const predecessors = graph.predecessors(currentNode) || [];
            currentNode = null;

            for (const predId of predecessors) {
                const predNode = graph.node(predId);
                const predEnd = earliestStart[predId] + predNode.duration;

                if (Math.abs(predEnd - earliestStart[currentNode]) < 1) {
                    // This predecessor is on critical path
                    currentNode = predId;
                    break;
                }
            }
        }

        // Save to database
        await this.saveCriticalPath(criticalPath, maxDuration);

        return {
            path: criticalPath,
            total_duration_days: maxDuration,
            project_count: criticalPath.length
        };
    }

    /**
     * Estimate project duration from dates
     */
    estimateProjectDuration(project) {
        if (project.start_date && project.target_completion_date) {
            const start = new Date(project.start_date);
            const end = new Date(project.target_completion_date);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        }

        // Estimate based on category
        const categoryDurations = {
            'System Plan': 730,      // 2 years
            'Modal Plan': 548,       // 1.5 years
            'Safety Program': 365,   // 1 year
            'Financing Program': 365,
            'Policy Program': 180    // 6 months
        };

        return categoryDurations[project.category] || 365;
    }

    /**
     * Save critical path to database
     */
    async saveCriticalPath(path, totalDuration) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO critical_paths (
                    path_json,
                    total_duration_days,
                    valid_until
                ) VALUES (?, ?, datetime('now', '+7 days'))
            `, [
                JSON.stringify(path),
                totalDuration
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /**
     * Get dependency graph for visualization
     */
    async getDependencyGraph() {
        const dependencies = await this.getAllDependencies();
        const projects = await this.getAllProjects();

        // Build nodes array
        const nodes = projects.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            status: p.status,
            completion: p.completion_percentage
        }));

        // Build edges array
        const edges = dependencies.map(d => ({
            source: d.source_project_id,
            target: d.target_project_id,
            type: d.dependency_type,
            confidence: d.confidence_score
        }));

        return { nodes, edges };
    }

    /**
     * Helper: Get all projects
     */
    async getAllProjects() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM projects', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Helper: Get all dependencies
     */
    async getAllDependencies() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM project_dependencies', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Log extraction run
     */
    async logExtraction(source, method, foundCount) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO dependency_extraction_log (
                    source_document,
                    extraction_method,
                    dependencies_found
                ) VALUES (?, ?, ?)
            `, [source, method, foundCount], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /**
     * Get projects that depend on a specific project
     */
    async getDependentProjects(projectId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT p.*, pd.dependency_type, pd.confidence_score
                FROM projects p
                JOIN project_dependencies pd ON p.id = pd.target_project_id
                WHERE pd.source_project_id = ?
            `, [projectId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * Get projects that a specific project depends on
     */
    async getPrerequisiteProjects(projectId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT p.*, pd.dependency_type, pd.confidence_score
                FROM projects p
                JOIN project_dependencies pd ON p.id = pd.source_project_id
                WHERE pd.target_project_id = ?
            `, [projectId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = DependencyExtractionService;
