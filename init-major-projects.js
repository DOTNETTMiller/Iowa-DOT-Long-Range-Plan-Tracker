const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'iowa-dot-tracker.db');
const db = new sqlite3.Database(DB_PATH);

// Read and execute the additional schema
const additionalSchema = fs.readFileSync(path.join(__dirname, 'add-major-projects-tables.sql'), 'utf8');

// Read GeoJSON data
const geojsonPath = '/Users/mattmiller/Downloads/Major_Projects_Location.geojson';
const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log('Setting up major projects tables...\n');

db.serialize(() => {
    // Execute schema
    db.exec(additionalSchema, (err) => {
        if (err) {
            console.error('Error creating additional schema:', err);
            return;
        }
        console.log('✓ Additional schema created successfully\n');
    });

    // Check if major_projects table has data
    db.get('SELECT COUNT(*) as count FROM major_projects', (err, row) => {
        if (err) {
            console.error('Error checking major_projects:', err);
            return;
        }

        if (row.count > 0) {
            console.log(`Major projects table already has ${row.count} projects. Skipping population.`);
            console.log('To repopulate, run: DELETE FROM major_projects;');
            db.close();
            return;
        }

        // Insert major projects from GeoJSON
        const stmt = db.prepare(`
            INSERT INTO major_projects (
                project_title, project_number, district, description,
                start_date, end_date, contact_name, contact_email,
                latitude, longitude, geojson_object_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let inserted = 0;
        geojsonData.features.forEach(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;

            stmt.run(
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
                props.OBJECTID,
                (err) => {
                    if (err) {
                        console.error(`Error inserting project ${props.Project_Title}:`, err);
                    } else {
                        inserted++;
                        console.log(`✓ ${inserted}. ${props.Project_Title} (District ${props.District || 'N/A'})`);
                    }
                }
            );
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('Error finalizing statement:', err);
            } else {
                console.log(`\n✅ Successfully inserted ${inserted} major construction projects`);
                console.log('\nProjects are now ready for photos, comments, and upvotes!');
            }

            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        });
    });
});
