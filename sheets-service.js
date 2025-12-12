// Google Sheets Integration Service (100% FREE)
// Sync Iowa DOT project data to/from Google Sheets

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ============================================
// GOOGLE SHEETS AUTHENTICATION
// ============================================

function getGoogleAuth() {
    try {
        // Check if credentials file exists
        const credsPath = path.join(__dirname, 'google-credentials.json');

        if (!fs.existsSync(credsPath)) {
            console.warn('⚠️  Google Sheets integration disabled: google-credentials.json not found');
            return null;
        }

        const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

        // Use Service Account authentication
        const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        return auth;
    } catch (error) {
        console.error('Error loading Google credentials:', error);
        return null;
    }
}

// ============================================
// EXPORT TO GOOGLE SHEETS
// ============================================

async function exportToGoogleSheets(projects, spreadsheetId, sheetName = 'Iowa DOT Projects') {
    const auth = getGoogleAuth();

    if (!auth) {
        return { success: false, message: 'Google Sheets not configured' };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Prepare header row
        const headers = [
            'ID',
            'Project Name',
            'Category',
            'Status',
            'Completion %',
            'Responsible Party',
            'Core Values',
            'Description',
            'Reference',
            'URL',
            'Last Updated'
        ];

        // Prepare data rows
        const rows = projects.map(p => [
            p.id,
            p.name,
            p.category,
            p.status,
            p.completion_percentage || 0,
            p.responsible,
            p.core_values || '',
            p.description || '',
            p.reference || '',
            p.url || '',
            p.updated_at || p.created_at
        ]);

        // Combine headers and data
        const values = [headers, ...rows];

        // Clear existing sheet and write new data
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${sheetName}!A:K`
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            resource: { values }
        });

        // Format header row (bold, frozen)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.01, green: 0.38, blue: 0.48 },
                                    textFormat: {
                                        foregroundColor: { red: 1, green: 1, blue: 1 },
                                        fontSize: 12,
                                        bold: true
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: 0,
                                gridProperties: {
                                    frozenRowCount: 1
                                }
                            },
                            fields: 'gridProperties.frozenRowCount'
                        }
                    }
                ]
            }
        });

        console.log(`✅ Exported ${projects.length} projects to Google Sheets`);

        return {
            success: true,
            message: `Successfully exported ${projects.length} projects`,
            rowsWritten: rows.length,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        };

    } catch (error) {
        console.error('Error exporting to Google Sheets:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// IMPORT FROM GOOGLE SHEETS
// ============================================

async function importFromGoogleSheets(spreadsheetId, sheetName = 'Iowa DOT Projects') {
    const auth = getGoogleAuth();

    if (!auth) {
        return { success: false, message: 'Google Sheets not configured' };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Read data from sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:K`
        });

        const rows = response.data.values;

        if (!rows || rows.length < 2) {
            return { success: false, message: 'No data found in sheet' };
        }

        // Skip header row, parse data rows
        const projects = rows.slice(1).map(row => ({
            id: row[0],
            name: row[1],
            category: row[2],
            status: row[3],
            completion_percentage: parseFloat(row[4]) || 0,
            responsible: row[5],
            core_values: row[6],
            description: row[7],
            reference: row[8],
            url: row[9]
        }));

        console.log(`✅ Imported ${projects.length} projects from Google Sheets`);

        return {
            success: true,
            data: projects,
            rowsRead: projects.length
        };

    } catch (error) {
        console.error('Error importing from Google Sheets:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// CREATE NEW SPREADSHEET
// ============================================

async function createNewSpreadsheet(title = 'Iowa DOT 2050 Plan Tracker') {
    const auth = getGoogleAuth();

    if (!auth) {
        return { success: false, message: 'Google Sheets not configured' };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: title
                },
                sheets: [
                    {
                        properties: {
                            title: 'Iowa DOT Projects',
                            gridProperties: {
                                frozenRowCount: 1
                            }
                        }
                    }
                ]
            }
        });

        const spreadsheetId = response.data.spreadsheetId;
        const spreadsheetUrl = response.data.spreadsheetUrl;

        console.log(`✅ Created new spreadsheet: ${spreadsheetUrl}`);

        return {
            success: true,
            spreadsheetId,
            spreadsheetUrl,
            message: 'New spreadsheet created successfully'
        };

    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// SYNC STATS TO SUMMARY SHEET
// ============================================

async function exportStatsToSheet(spreadsheetId, stats) {
    const auth = getGoogleAuth();

    if (!auth) {
        return { success: false, message: 'Google Sheets not configured' };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth });

        // Create summary data
        const values = [
            ['Iowa DOT 2050 Plan - Summary Statistics'],
            [''],
            ['Metric', 'Value'],
            ['Total Projects', stats.total_projects],
            ['Average Completion', `${stats.avg_completion}%`],
            ['Weighted Completion', `${stats.weighted_completion}%`],
            ['Total Weight', stats.total_weight],
            [''],
            ['Category Breakdown', ''],
            ['Category', 'Count', 'Avg Completion'],
            ...stats.category_breakdown.map(c => [c.category, c.count, `${Math.round(c.avg_completion)}%`]),
            [''],
            ['Status Breakdown', ''],
            ['Status', 'Count'],
            ...stats.status_breakdown.map(s => [s.status, s.count])
        ];

        // Write to Summary sheet
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Summary!A1',
            valueInputOption: 'RAW',
            resource: { values }
        });

        return { success: true };

    } catch (error) {
        // Sheet might not exist, that's okay
        console.log('Could not export stats (Summary sheet may not exist)');
        return { success: false, error: error.message };
    }
}

// ============================================
// AUTO-SYNC SCHEDULER (Optional)
// ============================================

let syncInterval = null;

function startAutoSync(dbGetAllProjects, spreadsheetId, intervalMinutes = 60) {
    if (syncInterval) {
        console.log('Auto-sync already running');
        return;
    }

    console.log(`🔄 Starting auto-sync every ${intervalMinutes} minutes`);

    syncInterval = setInterval(async () => {
        console.log('🔄 Running scheduled Google Sheets sync...');
        const projects = await dbGetAllProjects();
        const result = await exportToGoogleSheets(projects, spreadsheetId);

        if (result.success) {
            console.log(`✅ Auto-sync complete: ${result.rowsWritten} projects synced`);
        } else {
            console.error(`❌ Auto-sync failed: ${result.error || result.message}`);
        }
    }, intervalMinutes * 60 * 1000);
}

function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('🛑 Auto-sync stopped');
    }
}

module.exports = {
    exportToGoogleSheets,
    importFromGoogleSheets,
    createNewSpreadsheet,
    exportStatsToSheet,
    startAutoSync,
    stopAutoSync
};
