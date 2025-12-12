// Biweekly Update Parser Service
// Uses GPT-4 to parse natural language updates into structured project data
// Can add new projects or update existing ones intelligently

const { OpenAI } = require('openai');

// ============================================
// GPT-4 UPDATE PARSER
// ============================================

async function parseUpdateWithGPT(updateText, existingProjects = []) {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
        return {
            success: false,
            error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env file.'
        };
    }

    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Build context about existing projects for smart matching
        const projectContext = existingProjects.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            status: p.status,
            completion_percentage: p.completion_percentage
        }));

        const systemPrompt = `You are an expert at parsing Iowa Department of Transportation project updates.

Your task is to extract structured project information from biweekly update text and match it against existing projects.

EXISTING PROJECTS IN DATABASE:
${JSON.stringify(projectContext, null, 2)}

INSTRUCTIONS:
1. Extract all project information from the update text
2. For each project mentioned, determine if it:
   - Matches an existing project (by name similarity, category, or description)
   - Is a new project that needs to be added
3. Extract these fields when available:
   - name (required)
   - category (Modal Plan, Policy Program, System Plan, etc.)
   - status (Completed, Ongoing, Draft, In Progress, etc.)
   - completion_percentage (0-100)
   - description
   - responsible (Iowa DOT division/bureau)
   - reference (plan section, strategy number)
   - update_notes (what changed in this update)

4. Return JSON with this exact structure:
{
  "updates": [
    {
      "action": "update" or "create",
      "matched_project_id": 123,  // only if action is "update"
      "confidence": 0.95,  // 0-1, how confident are you this is a match?
      "data": {
        "name": "Project Name",
        "category": "Modal Plan",
        "status": "Ongoing",
        "completion_percentage": 75,
        "description": "Full description",
        "responsible": "Iowa DOT Systems Planning",
        "reference": "Section 4.1",
        "update_notes": "Increased from 50% to 75% completion"
      }
    }
  ],
  "summary": "Brief summary of what was parsed"
}

MATCHING RULES:
- Match by exact name (case insensitive)
- Match by similar name (>80% similarity)
- Match by category + key words in name
- If unsure, prefer creating new project with confidence < 0.7

IMPORTANT:
- Only extract information explicitly mentioned in the update
- Do not make up data
- If a field is not mentioned, omit it from the response
- Status values should match existing format
- Completion percentage must be 0-100`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: `Parse this biweekly update and extract project information:\n\n${updateText}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 2000
        });

        const parsed = JSON.parse(completion.choices[0].message.content);

        console.log('✅ GPT-4 parsed update:', parsed.summary);

        return {
            success: true,
            data: parsed
        };

    } catch (error) {
        console.error('Error parsing update with GPT:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// SMART PROJECT MATCHING
// ============================================

function calculateNameSimilarity(name1, name2) {
    // Simple Levenshtein distance-based similarity
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    // Jaccard similarity based on words
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

function findBestMatch(projectData, existingProjects) {
    let bestMatch = null;
    let bestScore = 0;

    for (const existing of existingProjects) {
        let score = 0;

        // Name similarity (most important)
        const nameSimilarity = calculateNameSimilarity(projectData.name, existing.name);
        score += nameSimilarity * 0.6;

        // Category match
        if (projectData.category && projectData.category === existing.category) {
            score += 0.2;
        }

        // Reference match
        if (projectData.reference && projectData.reference === existing.reference) {
            score += 0.2;
        }

        if (score > bestScore && score > 0.7) {
            bestScore = score;
            bestMatch = {
                project: existing,
                confidence: score
            };
        }
    }

    return bestMatch;
}

// ============================================
// BATCH APPLY UPDATES
// ============================================

async function applyParsedUpdates(parsedData, dbRun, dbGet) {
    const results = {
        created: [],
        updated: [],
        errors: [],
        summary: parsedData.summary || ''
    };

    if (!parsedData.updates || parsedData.updates.length === 0) {
        return {
            success: true,
            message: 'No updates to apply',
            results
        };
    }

    for (const update of parsedData.updates) {
        try {
            if (update.action === 'create') {
                // Create new project
                const result = await dbRun(`
                    INSERT INTO projects (
                        name, category, description, status, completion_percentage,
                        responsible, reference, url, approved, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                `, [
                    update.data.name,
                    update.data.category || 'Uncategorized',
                    update.data.description || '',
                    update.data.status || 'Draft',
                    update.data.completion_percentage || 0,
                    update.data.responsible || 'Iowa DOT',
                    update.data.reference || null,
                    update.data.url || null
                ]);

                // Log the update notes
                if (update.data.update_notes) {
                    await dbRun(`
                        INSERT INTO status_updates (project_id, user_id, new_status, update_note, created_at)
                        VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP)
                    `, [result.id, update.data.status || 'Draft', update.data.update_notes]);
                }

                results.created.push({
                    id: result.id,
                    name: update.data.name,
                    notes: update.data.update_notes
                });

                console.log(`✅ Created new project: ${update.data.name}`);

            } else if (update.action === 'update' && update.matched_project_id) {
                // Get current project state
                const current = await dbGet('SELECT * FROM projects WHERE id = ?', [update.matched_project_id]);

                if (!current) {
                    results.errors.push({
                        project: update.data.name,
                        error: 'Matched project not found in database'
                    });
                    continue;
                }

                // Build update query dynamically based on what fields are present
                const updates = [];
                const params = [];

                if (update.data.status && update.data.status !== current.status) {
                    updates.push('status = ?');
                    params.push(update.data.status);
                }

                if (update.data.completion_percentage !== undefined && update.data.completion_percentage !== current.completion_percentage) {
                    updates.push('completion_percentage = ?');
                    params.push(update.data.completion_percentage);
                }

                if (update.data.description) {
                    updates.push('description = ?');
                    params.push(update.data.description);
                }

                if (update.data.responsible) {
                    updates.push('responsible = ?');
                    params.push(update.data.responsible);
                }

                if (updates.length > 0) {
                    updates.push('updated_at = CURRENT_TIMESTAMP');
                    params.push(update.matched_project_id);

                    await dbRun(`
                        UPDATE projects
                        SET ${updates.join(', ')}
                        WHERE id = ?
                    `, params);

                    // Log status update
                    await dbRun(`
                        INSERT INTO status_updates (
                            project_id, user_id, old_status, new_status,
                            old_completion, new_completion, update_note, created_at
                        ) VALUES (?, 1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `, [
                        update.matched_project_id,
                        current.status,
                        update.data.status || current.status,
                        current.completion_percentage,
                        update.data.completion_percentage !== undefined ? update.data.completion_percentage : current.completion_percentage,
                        update.data.update_notes || 'Updated via biweekly update parser'
                    ]);

                    results.updated.push({
                        id: update.matched_project_id,
                        name: current.name,
                        changes: update.data,
                        confidence: update.confidence,
                        notes: update.data.update_notes
                    });

                    console.log(`✅ Updated project: ${current.name} (confidence: ${update.confidence})`);
                } else {
                    console.log(`ℹ️  No changes needed for: ${current.name}`);
                }
            }

        } catch (error) {
            results.errors.push({
                project: update.data.name,
                error: error.message
            });
            console.error(`❌ Error processing ${update.data.name}:`, error);
        }
    }

    return {
        success: true,
        message: `Processed ${parsedData.updates.length} updates: ${results.created.length} created, ${results.updated.length} updated, ${results.errors.length} errors`,
        results
    };
}

// ============================================
// PREVIEW UPDATES (WITHOUT APPLYING)
// ============================================

async function previewParsedUpdates(parsedData, existingProjects) {
    const preview = {
        total: parsedData.updates ? parsedData.updates.length : 0,
        to_create: [],
        to_update: [],
        summary: parsedData.summary || ''
    };

    if (!parsedData.updates) {
        return preview;
    }

    for (const update of parsedData.updates) {
        if (update.action === 'create') {
            preview.to_create.push({
                name: update.data.name,
                category: update.data.category,
                status: update.data.status,
                completion: update.data.completion_percentage,
                notes: update.data.update_notes
            });
        } else if (update.action === 'update') {
            const existing = existingProjects.find(p => p.id === update.matched_project_id);
            if (existing) {
                preview.to_update.push({
                    id: update.matched_project_id,
                    name: existing.name,
                    current_status: existing.status,
                    new_status: update.data.status,
                    current_completion: existing.completion_percentage,
                    new_completion: update.data.completion_percentage,
                    confidence: update.confidence,
                    notes: update.data.update_notes
                });
            }
        }
    }

    return preview;
}

module.exports = {
    parseUpdateWithGPT,
    findBestMatch,
    applyParsedUpdates,
    previewParsedUpdates,
    calculateNameSimilarity
};
