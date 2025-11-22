-- Additional tables for Major Construction Projects

-- Major construction projects table (separate from SLTP projects)
CREATE TABLE IF NOT EXISTS major_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_title TEXT NOT NULL,
    project_number TEXT,
    district INTEGER,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    contact_name TEXT,
    contact_email TEXT,
    latitude REAL,
    longitude REAL,
    geojson_object_id INTEGER UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos for major construction projects
CREATE TABLE IF NOT EXISTS major_project_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    major_project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    photo_url TEXT NOT NULL, -- Path to stored photo or external URL
    caption TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT 0, -- Requires moderation
    FOREIGN KEY (major_project_id) REFERENCES major_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Comments for major construction projects
CREATE TABLE IF NOT EXISTS major_project_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    major_project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (major_project_id) REFERENCES major_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Likes/upvotes for major construction projects
CREATE TABLE IF NOT EXISTS major_project_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    major_project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(major_project_id, user_id),
    FOREIGN KEY (major_project_id) REFERENCES major_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Location coordinates for projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude REAL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude REAL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_major_projects_district ON major_projects(district);
CREATE INDEX IF NOT EXISTS idx_major_project_photos_project ON major_project_photos(major_project_id);
CREATE INDEX IF NOT EXISTS idx_major_project_comments_project ON major_project_comments(major_project_id);
CREATE INDEX IF NOT EXISTS idx_major_project_likes_project ON major_project_likes(major_project_id);
