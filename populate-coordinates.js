const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'iowa-dot-tracker.db');
const db = new sqlite3.Database(DB_PATH);

// Iowa DOT HQ: 800 Lincoln Way, Ames, IA
const AMES_HQ = { lat: 42.0308, lon: -93.6319 };

// Major Iowa cities for region-specific projects
const LOCATIONS = {
    'Des Moines': { lat: 41.5868, lon: -93.6250 },
    'Cedar Rapids': { lat: 41.9779, lon: -91.6656 },
    'Davenport': { lat: 41.5236, lon: -90.5776 },
    'Sioux City': { lat: 42.4960, lon: -96.4003 },
    'Iowa City': { lat: 41.6611, lon: -91.5302 },
    'Waterloo': { lat: 42.4928, lon: -92.3426 },
    'Council Bluffs': { lat: 41.2619, lon: -95.8608 },
    'Dubuque': { lat: 42.5006, lon: -90.6648 },
    'Ames': AMES_HQ
};

// Default: all statewide projects → Iowa DOT HQ in Ames
// Override specific projects with region-specific locations
const PROJECT_OVERRIDES = {
    // Aviation - Des Moines International Airport
    '2020-2040 Iowa Aviation System Plan': LOCATIONS['Des Moines'],

    // I-80 corridor - runs through multiple cities, use Council Bluffs (western terminus)
    'I-80 Mid-America Alternative Fuel Corridor': LOCATIONS['Council Bluffs'],

    // Mississippi River projects - Dubuque area
    'M-35 Marine Highway Corridor (Waterway of the Saints)': LOCATIONS['Dubuque'],

    // Active Construction Projects - Accurate GeoJSON Coordinates
    'U.S. 30 Missouri Valley Bypass': { lat: 41.764111, lon: -95.682403 }, // US 30 Bridge Replacement, Harrison County
    'U.S. 63 Oskaloosa Bypass': { lat: 41.804667, lon: -92.591328 }, // US 63 Super 2, Poweshiek & Tama County
    'Iowa 12 Gordon Drive Bridge Replacement': { lat: 42.496005, lon: -94.187957 }, // Business US 20 in Fort Dodge
    'Mississippi River Bridge at Lansing': { lat: 43.364821, lon: -91.216095 } // Mississippi River Bridge in Lansing
};

async function updateCoordinates() {
    console.log('Updating project coordinates...\n');

    // Get all projects
    const projects = await new Promise((resolve, reject) => {
        db.all('SELECT id, name FROM projects ORDER BY id', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    let updated = 0;

    // Update each project
    for (const project of projects) {
        // Default to Ames HQ, override with specific location if exists
        const coords = PROJECT_OVERRIDES[project.name] || AMES_HQ;
        const location = PROJECT_OVERRIDES[project.name] ? '(specific location)' : '(Iowa DOT HQ, Ames)';

        await new Promise((resolve, reject) => {
            db.run(
                'UPDATE projects SET latitude = ?, longitude = ? WHERE id = ?',
                [coords.lat, coords.lon, project.id],
                (err) => {
                    if (err) {
                        console.error(`Error updating ${project.name}:`, err);
                        reject(err);
                    } else {
                        updated++;
                        console.log(`✓ ${project.name} ${location} → (${coords.lat}, ${coords.lon})`);
                        resolve();
                    }
                }
            );
        });
    }

    console.log(`\n✅ Updated ${updated} projects with coordinates`);
    console.log(`   Default: Iowa DOT HQ (800 Lincoln Way, Ames, IA)`);
    console.log(`   Specific locations: 3 projects`);
}

// Run the update
updateCoordinates()
    .then(() => {
        console.log('\n✓ Coordinate update complete!');
        db.close();
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error updating coordinates:', err);
        db.close();
        process.exit(1);
    });
