# Iowa DOT Long Range Plan Tracker

A comprehensive web-based tracker for Iowa Department of Transportation's Long Range Transportation Plan through 2050, combining **what the plan says** with **what we're actually tracking** as concrete initiatives.

## Features

### 📋 All Plan Items View
- **81 Total Items** tracked including:
  - **54 Plan Items** (What the plan says):
    - 30 Strategies
    - 5 Key Actions
    - 11 Modal/System Plans
    - Projects, Tools, Corridors, Networks, and more
  - **27 Implementation Projects** (What we're actually tracking):
    - Connected & Automated Corridor Projects (5)
    - Truck Freight & Parking / Freight Operations (4)
    - Digital Delivery, Asset Data & BIM/IFC (5)
    - Customer-Facing Mobility & Transit/Access (4)
    - Resilience, Flood & Climate Adaptation (3)
    - Data Platforms, APIs & Governance (3)
    - Workforce, Training & Change Management (3)

- **Advanced Filtering**:
  - **Level**: Distinguish between Plan Items and Implementation Projects
  - **Search**: Find by name, description, or owner
  - **Category**: Strategy, Key Action, Modal/System Plan, Implementation Project, etc.
  - **Project Status**: Proposed, Proposed/Ongoing, Already in Motion, etc.
  - **Owner Organization**: Filter by responsible parties
  - **Project Type**: Platform, Program, Pilot, Corridor, Governance, etc.

- **Export Capabilities**:
  - Export to CSV with all fields for spreadsheet analysis
  - Export to JSON with comprehensive statistics for programmatic use

### 🚧 Projects View
- Track 10 major infrastructure projects
- Real-time progress indicators
- Filter by status, chapter, and search
- Detailed project information including:
  - Location and counties
  - Completion dates
  - Responsible divisions and bureaus
  - Current status and progress percentage

### 📊 Dashboard
- High-level statistics and metrics
- Recent milestones
- Active major projects with progress bars
- Quick access to all data exports

### ✓ Tasks, 🎯 Strategies, 📖 Chapters, 📅 Timeline Views
- Organized tracking of implementation tasks
- Strategic objectives and actions
- Chapter-based organization
- Timeline visualization of projects

## Usage

### Opening the Tracker

#### Option 1: Direct File Access
Simply open the HTML file in your web browser:
```bash
# On Linux/Mac
open "Iowa DOT LRTP Tracker POC.html"

# On Windows
start "Iowa DOT LRTP Tracker POC.html"
```

#### Option 2: Local Web Server
For the best experience, serve the file using a local web server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js http-server
npx http-server -p 8000
```

Then navigate to: `http://localhost:8000/Iowa%20DOT%20LRTP%20Tracker%20POC.html`

### Navigation

Use the top navigation tabs to switch between views:
- **📊 Dashboard**: Overview and statistics
- **📋 All Plan Items**: Complete list of all tracked items with filtering
- **🚧 Projects**: Infrastructure projects
- **✓ Tasks**: Implementation tasks
- **🎯 Strategies**: Strategic objectives
- **📖 Chapters**: Chapter organization
- **📅 Timeline**: Project timeline

### Filtering and Search

#### All Plan Items View:
1. Use the **Search** box to find items by keywords
2. Select a **Category** from the dropdown to filter by type
3. Select an **Owner** to see items assigned to specific organizations
4. Click **Export as CSV** or **Export as JSON** to download data

#### Projects View:
1. Search by project name, location, or county
2. Filter by chapter or status
3. Click on any project card for more details

### Exporting Data

All views support data export:
- **CSV Format**: Compatible with Excel, Google Sheets, and other spreadsheet software
- **JSON Format**: For developers and programmatic access

## Data Categories

The tracker organizes Long Range Plan items into two main levels:

### Level 1: Plan Items (What the Plan Says) - 54 items

- **Strategy** (30 items): High-level strategic approaches from Iowa in Motion 2050
- **Key Action** (5 items): Critical implementation actions identified in the plan
- **Modal/System Plan** (11 items): Specialized transportation plans (Aviation, Transit, Freight, Rail, Safety, TAMP, TSMO, Carbon Reduction, Resilience, Transportation 4.0)
- **Project**: Major infrastructure initiatives
- **Corridor/Tool**: Planning tools and corridor designations
- **Tool**: Analysis and decision-making tools (ICE, ICE-OPS, I3P, get There Your Way)
- **Corridor**: Designated transportation corridors
- **Network**: Transportation network definitions
- **Program Area**: Programmatic focus areas
- **Toolbox**: Collections of strategies and countermeasures

### Level 2: Implementation Projects (What We're Actually Tracking) - 27 items

These are concrete, trackable initiatives that turn the long-range strategies into actionable work:

#### 1. Connected & Automated Corridor Projects (5)
- I-80/I-35 Connected Corridor Testbed
- Roadway Digital Infrastructure (RDI) Inventory
- Statewide RSU + V2X Deployment Plan
- CAV Freight Platooning Corridor Pilot
- Connected Work Zone Program

#### 2. Truck Freight & Parking / Freight Operations (4)
- Truck Parking Information Management 2.0 (TPIMS 2.0)
- Statewide OS/OW Digital Routing & Permit Modernization
- IMFN Priority Freight Projects List
- Freight Data Hub & Carrier Portal

#### 3. Digital Delivery, Asset Data & BIM/IFC (5)
- IFC/OpenBIM Implementation Program (Road & Bridge)
- Digital Construction Data Standard & Specs Update
- Lane Closure & Work Zone Digital Platform (e.g., ZoneLock)
- Digital Utility As-Built & Underground Mapping
- Priority Corridor Digital Twins (I-80/I-35 segments, key bridges)

#### 4. Customer-Facing Mobility & Transit/Access (4)
- Statewide Multimodal Trip Planner & Open Data Suite
- Rural Mobility Innovation Pilots (e.g., microtransit zones)
- Transit Signal Priority & Dedicated Bus Corridors on Key Urban Routes
- Safe Multimodal Corridors on State Routes through Communities

#### 5. Resilience, Flood & Climate Adaptation (3)
- Priority Flood Mitigation Corridors Program
- Winter Operations Data & Decision Support Platform
- Climate-Resilient Design Standards Update

#### 6. Data Platforms, APIs & Governance (3)
- Statewide Transportation Data Hub & API Gateway
- Transportation Data Governance & Standards Program
- OT/ITS Cybersecurity Hardening Program

#### 7. Workforce, Training & Change Management (3)
- Transportation Digital Skills Academy
- Operations & Maintenance Tech Upskilling Initiative
- Innovation Sandbox & Pilot Governance Process

### Project Status Tracking

Implementation Projects include status tracking:
- **Proposed**: New initiatives being considered
- **Proposed/Expanding**: Projects that are proposed or expanding in scope
- **Proposed/Ongoing**: Work that has started but needs formal program structure
- **Already Emerging**: Initiatives that have begun informally
- **Already in Motion**: Formally established and progressing
- **Already Underway**: Active implementation
- **Proposed/Under Discussion**: Under active consideration
- **Proposed (Can Be Phased)**: Can be implemented incrementally

## Technology Stack

- **Pure HTML/CSS/JavaScript**: No dependencies required
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Iowa DOT Branding**: Official color scheme and typography
- **Offline Capable**: Works without internet connection after initial load

## Customization

### Adding New Items

To add new plan items, edit the `lrpData` array in the JavaScript section:

```javascript
const lrpData = [
    {
        category: 'Strategy',
        name: 'Your Item Name',
        description: 'Description of the item',
        owners: 'Responsible organization',
        url: 'https://relevant-url.com'
    },
    // ... more items
];
```

### Updating Project Status

Update project progress in the `projectsData` array:

```javascript
{
    id: 'PROJECT-ID',
    name: 'Project Name',
    // ... other fields
    percentComplete: 75, // Update this value
    statusDetail: 'Current status description'
}
```

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Internet Explorer 11: ⚠️ Limited support

## Future Enhancements

Potential features for future versions:
- Database backend for real-time updates
- User authentication and role-based access
- Integration with Iowa DOT project management systems
- Automated data synchronization
- Advanced analytics and reporting
- Mobile app version

## Railway Database Integration

If you need persistent storage and multi-user access, you can integrate with Railway:

### Setup Steps:

1. **Create a Railway Account**: Visit [railway.app](https://railway.app)

2. **Create a PostgreSQL Database**:
   ```bash
   # Deploy PostgreSQL on Railway
   # Get connection string from Railway dashboard
   ```

3. **Backend API Options**:
   - Node.js/Express with Sequelize ORM
   - Python/Flask with SQLAlchemy
   - PHP/Laravel

4. **Database Schema**:
   ```sql
   CREATE TABLE lrp_items (
       id SERIAL PRIMARY KEY,
       category VARCHAR(50),
       name VARCHAR(255),
       description TEXT,
       owners TEXT,
       url TEXT,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE projects (
       id SERIAL PRIMARY KEY,
       project_id VARCHAR(50) UNIQUE,
       name VARCHAR(255),
       mode VARCHAR(50),
       location TEXT,
       status VARCHAR(50),
       completion VARCHAR(50),
       percent_complete INTEGER,
       division TEXT,
       bureau TEXT,
       status_detail TEXT,
       url TEXT,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

## Support

For questions or issues:
- Contact: Iowa DOT New and Emerging Transportation Technologies
- Website: [https://iowadot.gov](https://iowadot.gov)
- Long Range Plan: [Iowa in Motion 2050](https://iowadot.gov/iowainmotion/Long-Range-Transportation-Plans/2022-State-Transportation-Plan)

## License

This tracker is developed for the Iowa Department of Transportation. All data is sourced from official Iowa DOT publications and plans.

---

**Making Lives Better Through Transportation**
