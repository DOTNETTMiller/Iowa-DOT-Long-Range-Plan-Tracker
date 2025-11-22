const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'iowa-dot-tracker.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🚀 Setting up Railway database...\n');

db.serialize(() => {
    // Step 1: Run additional major projects schema
    console.log('📋 Step 1: Creating major projects tables...');
    const additionalSchema = fs.readFileSync(path.join(__dirname, 'add-major-projects-tables.sql'), 'utf8');

    db.exec(additionalSchema, (err) => {
        if (err) {
            console.error('❌ Error creating major projects schema:', err.message);
        } else {
            console.log('✅ Major projects tables created\n');
        }
    });

    // Step 2: Check if major projects already exist
    console.log('📋 Step 2: Checking for existing major projects data...');
    db.get('SELECT COUNT(*) as count FROM major_projects', (err, row) => {
        if (err) {
            console.error('❌ Error checking major_projects table:', err.message);
            db.close();
            return;
        }

        if (row.count > 0) {
            console.log(`✅ Found ${row.count} existing major projects - skipping import\n`);
            db.close();
            console.log('🎉 Database setup complete!');
            return;
        }

        // Step 3: Load GeoJSON data
        console.log('📋 Step 3: Loading major projects from GeoJSON...');
        const geojsonPath = path.join(__dirname, 'major-projects-data.geojson');

        if (!fs.existsSync(geojsonPath)) {
            console.log('⚠️  GeoJSON file not found - skipping major projects import');
            console.log('   (This is expected on Railway - major projects can be added via admin)');
            db.close();
            console.log('\n🎉 Database setup complete!');
            return;
        }

        const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

        // Step 4: Insert major projects
        console.log('📋 Step 4: Inserting major projects...');
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
                        console.error(`❌ Error inserting ${props.Project_Title}:`, err.message);
                    } else {
                        inserted++;
                        if (inserted % 5 === 0) {
                            console.log(`   ✓ Inserted ${inserted} projects...`);
                        }
                    }
                }
            );
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('❌ Error finalizing statement:', err);
            } else {
                console.log(`✅ Successfully inserted ${inserted} major construction projects\n`);
            }

            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err);
                } else {
                    console.log('🎉 Database setup complete!');
                    console.log('   Ready for interactive features: photos, comments, and upvotes!');
                }
            });
        });
    });
});
