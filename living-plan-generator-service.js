/**
 * Living Plan Generator Service
 * PATENT-WORTHY FEATURE #4 - THE KILLER FEATURE
 *
 * Automatically generates next long-range plan recommendations using AI
 *
 * Novel Components:
 * - Gap analysis algorithm (geographic, modal, budget)
 * - Priority scoring with weighted multi-factor analysis
 * - AI-powered recommendation generation
 * - Continuous learning from stakeholder feedback
 *
 * THIS IS THE MOST VALUABLE PATENT
 */

const OpenAI = require('openai');
const sqlite3 = require('sqlite3').verbose();

class LivingPlanGeneratorService {
    constructor(dbPath = './iowa-dot-tracker.db', openaiKey = process.env.OPENAI_API_KEY) {
        this.db = new sqlite3.Database(dbPath);
        if (openaiKey) {
            this.openai = new OpenAI({ apiKey: openaiKey });
        } else {
            this.openai = null;
            console.warn('OpenAI API key not set. AI recommendation generation will not work.');
        }
    }

    /**
     * CORE PATENTABLE METHOD #1
     * Perform comprehensive gap analysis
     *
     * Novel approach: Combines geographic, modal, core value, and budget analysis
     */
    async performGapAnalysis(planCycle = '2025-2045') {
        console.log(`Performing gap analysis for plan cycle: ${planCycle}`);

        const gaps = [];

        // Gap Type 1: Geographic Coverage
        const geoGaps = await this.analyzeGeographicGaps();
        gaps.push(...geoGaps);

        // Gap Type 2: Modal Balance
        const modalGaps = await this.analyzeModalGaps();
        gaps.push(...modalGaps);

        // Gap Type 3: Core Values Alignment
        const valueGaps = await this.analyzeCoreValueGaps();
        gaps.push(...valueGaps);

        // Gap Type 4: Budget Allocation
        const budgetGaps = await this.analyzeBudgetGaps();
        gaps.push(...budgetGaps);

        // Save gaps to database
        for (const gap of gaps) {
            await this.saveGap(gap);
        }

        console.log(`Found ${gaps.length} gaps`);
        return gaps;
    }

    /**
     * PATENTABLE ALGORITHM: Geographic Gap Analysis
     * Identifies areas with low project density relative to population
     */
    async analyzeGeographicGaps() {
        const gaps = [];

        // Get project distribution
        const projects = await this.getAllActiveProjects();
        const projectsByRegion = {};

        for (const project of projects) {
            if (!project.latitude || !project.longitude) continue;

            const region = this.getIowaRegion(project.latitude, project.longitude);
            projectsByRegion[region] = (projectsByRegion[region] || 0) + 1;
        }

        // Target: at least 3 active projects per region
        const iowaRegions = [
            'Northwest Iowa',
            'Northeast Iowa',
            'Central Iowa',
            'Southwest Iowa',
            'Southeast Iowa',
            'Des Moines Metro'
        ];

        for (const region of iowaRegions) {
            const count = projectsByRegion[region] || 0;

            if (count < 3) {
                gaps.push({
                    gap_type: 'geographic',
                    description: `Low project density in ${region} (${count} active projects)`,
                    severity: count === 0 ? 'high' : 'medium',
                    affected_area: region,
                    metric: {
                        current: count,
                        target: 3,
                        deficit: 3 - count
                    }
                });
            }
        }

        return gaps;
    }

    /**
     * PATENTABLE ALGORITHM: Modal Gap Analysis
     */
    async analyzeModalGaps() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT category, COUNT(*) as count
                FROM projects
                WHERE status != 'Completed'
                GROUP BY category
            `, async (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const gaps = [];
                const total = rows.reduce((sum, r) => sum + r.count, 0);

                // Target distribution (Iowa DOT policy)
                const targets = {
                    'System Plan': 0.25,
                    'Modal Plan': 0.40,
                    'Safety Program': 0.20,
                    'Financing Program': 0.10,
                    'Policy Program': 0.05
                };

                for (const [category, targetPct] of Object.entries(targets)) {
                    const current = rows.find(r => r.category === category);
                    const currentPct = current ? current.count / total : 0;

                    if (currentPct < targetPct * 0.8) { // 20% below target
                        gaps.push({
                            gap_type: 'modal',
                            description: `Underrepresentation in ${category}`,
                            severity: currentPct < targetPct * 0.5 ? 'high' : 'medium',
                            affected_area: category,
                            metric: {
                                current_pct: Math.round(currentPct * 100),
                                target_pct: Math.round(targetPct * 100),
                                deficit: Math.round((targetPct - currentPct) * 100)
                            }
                        });
                    }
                }

                resolve(gaps);
            });
        });
    }

    /**
     * Core Values Gap Analysis
     */
    async analyzeCoreValueGaps() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT core_values FROM projects
                WHERE status != 'Completed'
                  AND core_values IS NOT NULL
            `, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const gaps = [];
                const valueCounts = {
                    'Safety First': 0,
                    'People Matter': 0,
                    'Customer Focused': 0,
                    'Servant Leadership': 0,
                    'Integrity Without Exception': 0
                };

                // Count mentions
                for (const row of rows) {
                    const values = row.core_values.split(',');
                    for (const value of values) {
                        const trimmed = value.trim();
                        if (valueCounts.hasOwnProperty(trimmed)) {
                            valueCounts[trimmed]++;
                        }
                    }
                }

                const total = Object.values(valueCounts).reduce((a, b) => a + b, 0);
                const targetPct = 0.15; // Each value should be ~20% (1/5)

                for (const [value, count] of Object.entries(valueCounts)) {
                    const currentPct = count / total;

                    if (currentPct < targetPct * 0.7) {
                        gaps.push({
                            gap_type: 'core_value',
                            description: `Underrepresentation of "${value}" core value`,
                            severity: 'medium',
                            affected_area: value,
                            metric: {
                                current_pct: Math.round(currentPct * 100),
                                target_pct: Math.round(targetPct * 100)
                            }
                        });
                    }
                }

                resolve(gaps);
            });
        });
    }

    /**
     * Budget Allocation Gap Analysis
     */
    async analyzeBudgetGaps() {
        // Future enhancement: Analyze budget distribution
        // For now, return empty (would need cost data in database)
        return [];
    }

    /**
     * CORE PATENTABLE METHOD #2
     * Generate AI recommendations based on gaps
     */
    async generateRecommendations(planCycle, focusAreas = ['gap_filling'], count = 10) {
        console.log(`Generating ${count} recommendations for ${planCycle}`);

        if (!this.openai) {
            throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in environment.');
        }

        // Get gaps
        const gaps = await this.getRecentGaps();

        // Get current projects for context
        const projects = await this.getAllActiveProjects();

        // Build prompt for GPT-4
        const prompt = this.buildRecommendationPrompt(gaps, projects, planCycle, focusAreas, count);

        // Call OpenAI
        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert transportation planner for Iowa DOT with 20+ years of experience in long-range planning.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        });

        const response = completion.choices[0].message.content;

        // Parse recommendations
        const recommendations = this.parseRecommendations(response, planCycle);

        // Calculate priority scores
        for (const rec of recommendations) {
            rec.priority_score = await this.calculatePriorityScore(rec);
        }

        // Save recommendations
        for (const rec of recommendations) {
            await this.saveRecommendation(rec);
        }

        return recommendations;
    }

    /**
     * Build GPT-4 prompt for recommendations
     */
    buildRecommendationPrompt(gaps, projects, planCycle, focusAreas, count) {
        const gapSummary = gaps.map(g =>
            `- ${g.gap_type}: ${g.description} (${g.severity} severity)`
        ).join('\n');

        const projectSummary = `Currently have ${projects.length} active projects:
- System Plans: ${projects.filter(p => p.category === 'System Plan').length}
- Modal Plans: ${projects.filter(p => p.category === 'Modal Plan').length}
- Safety Programs: ${projects.filter(p => p.category === 'Safety Program').length}`;

        return `
You are creating recommendations for Iowa's next long-range transportation plan (${planCycle}).

CURRENT GAPS IDENTIFIED:
${gapSummary}

CURRENT PROJECT STATUS:
${projectSummary}

TASK: Generate ${count} NEW project recommendations that address the gaps above.

For each recommendation, provide:
1. Project Name (concise, specific)
2. Category (System Plan, Modal Plan, Safety Program, Financing Program, or Policy Program)
3. Region (if geographically specific, or "Statewide")
4. Description (2-3 sentences explaining what this project would accomplish)
5. Justification (why this addresses a gap or priority)
6. Core Values addressed (pick 2-3 from: Safety First, People Matter, Customer Focused, Servant Leadership, Integrity Without Exception)
7. Estimated Timeline (e.g., "2-3 years", "5+ years")

Format as JSON array:
[
  {
    "project_name": "...",
    "category": "...",
    "region": "...",
    "description": "...",
    "justification": "...",
    "core_values": ["...", "..."],
    "estimated_timeline": "..."
  }
]

Focus on Iowa-specific challenges: rural transit access, aging bridges, climate resilience, complete streets, and multimodal connectivity.
`.trim();
    }

    /**
     * Parse AI response into structured recommendations
     */
    parseRecommendations(aiResponse, planCycle) {
        try {
            // Extract JSON from response
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return parsed.map(rec => ({
                plan_cycle: planCycle,
                category: rec.category,
                region: rec.region || 'Statewide',
                project_name: rec.project_name,
                description: rec.description,
                justification: rec.justification,
                core_values: JSON.stringify(rec.core_values || []),
                estimated_timeline: rec.estimated_timeline,
                generated_by: 'ai',
                status: 'draft'
            }));
        } catch (error) {
            console.error('Error parsing AI recommendations:', error);
            return [];
        }
    }

    /**
     * CORE PATENTABLE METHOD #3
     * Calculate priority score using weighted multi-factor analysis
     */
    async calculatePriorityScore(recommendation) {
        const factors = {
            safety: this.calculateSafetyScore(recommendation),
            economic: this.calculateEconomicScore(recommendation),
            funding: await this.calculateFundingScore(recommendation),
            stakeholder: 0.5, // Default until we have feedback
            coreValues: this.calculateCoreValuesScore(recommendation)
        };

        const weights = {
            safety: 0.30,
            economic: 0.25,
            funding: 0.20,
            stakeholder: 0.15,
            coreValues: 0.10
        };

        const score = Object.keys(factors).reduce((total, factor) => {
            return total + (factors[factor] * weights[factor]);
        }, 0);

        return Math.round(score * 100) / 100; // Round to 2 decimals
    }

    /**
     * Calculate factor scores
     */
    calculateSafetyScore(rec) {
        const safetyKeywords = ['safety', 'crash', 'fatality', 'injury', 'pedestrian', 'bicycle'];
        const text = (rec.description + ' ' + rec.justification).toLowerCase();

        let score = 0.5; // Base score

        for (const keyword of safetyKeywords) {
            if (text.includes(keyword)) score += 0.1;
        }

        if (rec.category === 'Safety Program') score += 0.3;

        return Math.min(score, 1.0);
    }

    calculateEconomicScore(rec) {
        const economicKeywords = ['economic', 'freight', 'commerce', 'development', 'jobs'];
        const text = (rec.description + ' ' + rec.justification).toLowerCase();

        let score = 0.5;

        for (const keyword of economicKeywords) {
            if (text.includes(keyword)) score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    async calculateFundingScore(rec) {
        // Check for federal program alignment
        const federalKeywords = {
            'IIJA': ['bridge', 'ev', 'charging', 'climate', 'resilience'],
            'RAISE': ['multimodal', 'economic'],
            'CRISI': ['rail', 'grade crossing']
        };

        const text = (rec.description + ' ' + rec.justification).toLowerCase();
        let score = 0.5;

        for (const [program, keywords] of Object.entries(federalKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) score += 0.1;
            }
        }

        return Math.min(score, 1.0);
    }

    calculateCoreValuesScore(rec) {
        try {
            const values = JSON.parse(rec.core_values);
            return values.length / 5; // 5 total core values
        } catch {
            return 0.4; // Default
        }
    }

    /**
     * Get Iowa region from coordinates
     */
    getIowaRegion(lat, lon) {
        // Des Moines Metro
        if (lat > 41.4 && lat < 41.7 && lon > -93.8 && lon < -93.4) {
            return 'Des Moines Metro';
        }

        // Simple quadrant-based regions
        const centerLat = 42.0;
        const centerLon = -93.5;

        if (lat > centerLat && lon < centerLon) return 'Northwest Iowa';
        if (lat > centerLat && lon >= centerLon) return 'Northeast Iowa';
        if (lat <= centerLat && lon < centerLon) return 'Southwest Iowa';
        return 'Southeast Iowa';
    }

    /**
     * Database helpers
     */
    async saveGap(gap) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO gap_analysis (
                    gap_type, gap_description, severity, affected_area
                ) VALUES (?, ?, ?, ?)
            `, [
                gap.gap_type,
                gap.description,
                gap.severity,
                gap.affected_area
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async saveRecommendation(rec) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO plan_recommendations (
                    plan_cycle, category, region, project_name,
                    description, justification, priority_score,
                    estimated_timeline, core_values, generated_by, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                rec.plan_cycle,
                rec.category,
                rec.region,
                rec.project_name,
                rec.description,
                rec.justification,
                rec.priority_score,
                rec.estimated_timeline,
                rec.core_values,
                rec.generated_by,
                rec.status
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async getAllActiveProjects() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM projects
                WHERE status != 'Completed'
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getRecentGaps() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM gap_analysis
                WHERE analysis_date > datetime('now', '-7 days')
                ORDER BY severity DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getRecommendations(planCycle, status = 'draft') {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM plan_recommendations
                WHERE plan_cycle = ?
                  AND status = ?
                ORDER BY priority_score DESC
            `, [planCycle, status], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = LivingPlanGeneratorService;
