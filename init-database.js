const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'iowa-dot-tracker.db');

// Check if database already exists
const dbExists = fs.existsSync(DB_PATH);

// Create/open database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Read schema file
const schema = fs.readFileSync(path.join(__dirname, 'database-schema.sql'), 'utf8');

// Initial projects data (the 39 projects we already have)
const initialProjects = [
  {
    "name": "2020-2040 Iowa Aviation System Plan",
    "category": "Modal Plan",
    "description": "Provides a detailed overview of Iowa's aviation system, evaluates current conditions, and recommends future airport development to meet user needs over 20 years.",
    "status": "Completed (2021)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Aviation Bureau",
    "url": "https://iowadot.gov/aviation/studiesreports/systemplanreports",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa Bicycle and Pedestrian Long Range Plan",
    "category": "Modal Plan",
    "description": "Primary guide for Iowa DOT decision-making on bicycle and pedestrian programs and facilities; involved stakeholder input, recommendations, and includes Iowa DOT's Complete Streets Policy requiring accommodations for all users on highway projects.",
    "status": "Completed (2018)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Systems Planning Bureau",
    "url": "https://iowadot.gov/iowainmotion/Modal-Plans/Bicycle-Pedestrian-Plan",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa Public Transit 2050 Long Range Plan",
    "category": "Modal Plan",
    "description": "Comprehensive plan reviewing demographic and usage trends, forecasting future needs for public transit, and developing strategies to improve Iowa's transit system.",
    "status": "Completed (2020)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Public Transit Bureau",
    "url": "https://iowadot.gov/iowainmotion/Modal-Plans/Public-Transit-Plan",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa State Freight Plan",
    "category": "Modal Plan",
    "description": "Weaves together Iowa DOT's freight planning activities to achieve optimal freight transportation. Guides investment decisions to maintain and improve the freight system.",
    "status": "Draft (2022)",
    "completion_percentage": 85,
    "responsible": "Iowa DOT Freight and Policy Bureau",
    "url": "https://iowadot.gov/iowainmotion/Specialized-System-plans/2022-State-Freight-Plan",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa State Rail Plan",
    "category": "Modal Plan",
    "description": "Guides Iowa DOT in promoting rail access, improving the freight rail system, expanding passenger rail service, and enhancing rail safety. Describes the rail network, economic impacts, vision, goals, and proposed improvements.",
    "status": "Completed (2021)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Rail Transportation Bureau",
    "url": "https://iowadot.gov/iowainmotion/Modal-Plans/Rail-Transportation-Plan",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa Strategic Highway Safety Plan (SHSP)",
    "category": "Policy Program",
    "description": "Statewide coordinated safety plan providing a comprehensive framework to reduce highway fatalities and serious injuries on all public roads. Establishes statewide safety goals, objectives, and emphasis areas.",
    "status": "Completed (2019)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Traffic & Safety Bureau and Safety Stakeholders",
    "url": "https://iowadot.gov/traffic/shsp/home",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa Transportation Asset Management Plan (TAMP)",
    "category": "System Plan",
    "description": "Describes how Iowa DOT manages pavements and bridges on the National Highway System, including asset inventory, condition data, life-cycle planning, performance gaps, risk analysis, financial plan, and process improvements.",
    "status": "Completed (2019)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Asset Management Program",
    "url": "https://iowadot.gov/systems_planning/fpmam/IowaDOT-TAMP-2019.pdf",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa TSMO Plan (Transportation Systems Management & Operations Plan Update)",
    "category": "System Plan",
    "description": "Plan to improve the performance of Iowa's transportation system using existing infrastructure, technology, and proactive system management. Focuses on integrating TSMO into Iowa DOT processes and improving system operations.",
    "status": "Draft (2022)",
    "completion_percentage": 75,
    "responsible": "Iowa DOT Traffic Operations Bureau",
    "url": "https://iowadot.gov/tsmo/",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa Carbon Reduction Strategy (CRS)",
    "category": "Specialized Plan",
    "description": "Statewide strategy required by the 2021 IIJA to reduce transportation emissions. Developed with MPOs, it compiles and synthesizes emission-reduction strategies and initiatives across Iowa into a cohesive plan.",
    "status": "Completed (2024)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Systems Planning Bureau",
    "url": "https://iowadot.gov/iowainmotion/Long-Range-Transportation-Plans/2022-State-Transportation-Plan",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa Resilience Improvement Plan (RIP)",
    "category": "Specialized Plan",
    "description": "Developed under the PROTECT program (IIJA), Iowa's first Resilience Improvement Plan addresses transportation system resilience to future weather events and disasters. It includes a toolbox of strategies, countermeasures, and research initiatives to mitigate hazards.",
    "status": "Completed (2024)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Resiliency Working Group",
    "url": "https://iowadot.gov/iowainmotion/Specialized-System-plans/Resilience-Improvement-Plan",
    "reference": "Appendix 4"
  },
  {
    "name": "Transportation 4.0: Innovative Strategies for the Transportation Revolution",
    "category": "Statewide Strategy",
    "description": "A statewide strategy (developed with IEDA) targeting key industries to implement technologies that move products more safely and efficiently. Contains eight strategies with short-term action items in areas such as AI, advanced analytics, advanced highway planning, system resiliency, alternative fuels, digital infrastructure, and emerging freight tech.",
    "status": "Completed (2023)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT and Iowa Economic Development Authority",
    "url": "N/A",
    "reference": "Section 4.3 Economic Vitality"
  },
  {
    "name": "Revitalize Iowa's Sound Economy (RISE) Program",
    "category": "Funding Program",
    "description": "State program promoting economic development through road infrastructure. Funds establishment, construction, and improvement of roads and streets to spur value-adding economic activities. Since 1985 it has funded 840+ local road projects, providing nearly $500 million and supporting over 90,000 job opportunities.",
    "status": "Ongoing",
    "completion_percentage": 50,
    "responsible": "Iowa DOT Program Management Bureau",
    "url": "https://iowadot.gov/systems_planning/RISE.aspx",
    "reference": "Section 4.3 Economic Vitality"
  },
  {
    "name": "Freight Network Optimization Strategy",
    "category": "Study/Initiative",
    "description": "Joint effort with IEDA (completed in 2016) to identify and prioritize public and private freight network investments. The resulting report, Development of Iowa Statewide Freight Transportation Network Optimization Strategy, outlines an optimized multimodal freight network to lower transportation costs for Iowa businesses and promote economic growth.",
    "status": "Completed (2016)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT & Iowa Economic Development Authority",
    "url": "N/A",
    "reference": "Section 4.3 Economic Vitality"
  },
  {
    "name": "Iowa Certified Site Program",
    "category": "Economic Development Program",
    "description": "Launched by IEDA in 2012 to certify industrial sites as project-ready. Sites undergo a rigorous third-party certification (infrastructure, environmental clearances, etc.). Certified sites meet development-ready criteria (including transportation access) and may qualify for higher RISE funding participation in local road projects.",
    "status": "Ongoing",
    "completion_percentage": 60,
    "responsible": "Iowa Economic Development Authority (with Iowa DOT support)",
    "url": "https://www.iowaeda.com/properties/certified-sites/",
    "reference": "Section 4.3 Economic Vitality"
  },
  {
    "name": "Iowa Energy Plan",
    "category": "Policy Strategy",
    "description": "Developed in 2016 as a joint initiative between Iowa DOT and IEDA to set state energy priorities and provide strategic guidance. Assessed current and future energy supply/demand, existing policies, and emerging challenges. One of its four pillars is Transportation & Infrastructure, including strategies to expand alternative fuel vehicle use and optimize freight movement to reduce energy use.",
    "status": "Completed (2016)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT & Iowa Economic Development Authority",
    "url": "https://iowaenergyplan.org/",
    "reference": "Section 4.3 Energy Considerations"
  },
  {
    "name": "Iowa Park and Ride System Plan (PRSP)",
    "category": "Modal Plan",
    "description": "Plan completed in 2014 focusing on park-and-ride facilities. Updated the inventory of park-and-ride lots, identified new candidate locations, and set implementation strategies. The plan's objective was to create a prioritized, coordinated statewide park-and-ride system to facilitate carpools, vanpools, and transit connections.",
    "status": "Completed (2014)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Systems Planning Bureau",
    "url": "N/A",
    "reference": "Section 3.7 Intermodal Options"
  },
  {
    "name": "Iowa Passenger Transportation Funding Study",
    "category": "Study",
    "description": "A 2009 study (referenced in the SLRTP appendices) examining funding for passenger transportation in Iowa. It evaluated funding structures and needs for public transit and other passenger transportation services.",
    "status": "Completed (2009)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Public Transit Bureau",
    "url": "N/A",
    "reference": "Appendix 4"
  },
  {
    "name": "Iowa Statewide Transportation Alternatives Program (TAP)",
    "category": "Funding Program",
    "description": "Iowa's implementation of the federal Transportation Alternatives Program, funding community-based projects like trails, safe routes to school, and other non-motorized transportation improvements. Administered via an application process by Iowa DOT.",
    "status": "Ongoing",
    "completion_percentage": 50,
    "responsible": "Iowa DOT Program Management Bureau",
    "url": "https://iowadot.gov/systems_planning/Grant-Programs/Transportation-Alternatives",
    "reference": "Section 7.1 Programming"
  },
  {
    "name": "Iowa Clean Air Attainment Program (ICAAP)",
    "category": "Funding Program",
    "description": "State program (modeled on federal CMAQ) funding transportation projects that improve air quality and reduce congestion. In practice, ICAAP funding has often been used for projects like public transit bus replacements to reduce emissions.",
    "status": "Ongoing",
    "completion_percentage": 50,
    "responsible": "Iowa DOT Systems Planning Bureau",
    "url": "https://iowadot.gov/systems_planning/icaap.aspx",
    "reference": "Section 7.1 Programming"
  },
  {
    "name": "Traffic Safety Improvement Program (TSIP)",
    "category": "Funding Program",
    "description": "State-funded program that provides grants for roadway safety improvements on public roads. Projects are typically selected annually based on safety benefit and include spot improvements, traffic control devices, and research or public awareness initiatives.",
    "status": "Ongoing",
    "completion_percentage": 50,
    "responsible": "Iowa DOT Traffic & Safety Bureau",
    "url": "https://iowadot.gov/traffic/tsip/traffic-safety-improvement-program",
    "reference": "Section 7.1 Programming"
  },
  {
    "name": "Iowa State Recreational Trails Program",
    "category": "Funding Program",
    "description": "State grant program that funds development of recreational trails in Iowa. It complements the Federal Recreational Trails Program by providing state resources for trail projects.",
    "status": "Ongoing",
    "completion_percentage": 50,
    "responsible": "Iowa DOT Parks and Trails Program (Systems Planning)",
    "url": "https://iowadot.gov/systems_planning/Grant-Programs/Recreational-Trails",
    "reference": "Section 5.4 Strategies"
  },
  {
    "name": "Federal Recreational Trails Program",
    "category": "Funding Program",
    "description": "Federal program (administered through Iowa DOT for Iowa projects) providing funds for recreational trail development and maintenance. Often used in conjunction with Iowa's state trail program.",
    "status": "Ongoing",
    "completion_percentage": 50,
    "responsible": "Federal Highway Administration (administered by Iowa DOT)",
    "url": "https://www.fhwa.dot.gov/environment/recreational_trails/",
    "reference": "Chapter 6 Funding (footnote)"
  },
  {
    "name": "Iowa DOT Five-Year Program (Transportation Improvement Program)",
    "category": "Capital Program",
    "description": "The Iowa DOT's Five-Year Program is an annually approved list of specific transportation investments for the next five years. It includes modal projects, funding sources, expected accomplishments, and criteria for modal funding programs. Projects in the Five-Year Program implement the SLRTP vision.",
    "status": "Ongoing (Updated Annually)",
    "completion_percentage": 50,
    "responsible": "Iowa Transportation Commission & Program Management Bureau",
    "url": "https://iowadot.gov/program_management/five-year-program",
    "reference": "Section 1.4 Planning Cycle"
  },
  {
    "name": "Project Prioritization/Scoping Tool",
    "category": "Digital Tool / Process",
    "description": "An evaluation tool used in Iowa's project development process to compare project benefits and costs and rank projects against system-level targets. It provides pause points during development to ensure projects still address the identified need before advancing to programming.",
    "status": "In Use",
    "completion_percentage": 80,
    "responsible": "Iowa DOT Program Management Bureau",
    "url": "N/A",
    "reference": "Section 7.1 Programming"
  },
  {
    "name": "Infrastructure Condition Evaluation (ICE) Tool",
    "category": "Analysis Tool",
    "description": "A composite analysis tool developed by Iowa DOT in 2014 to evaluate the Primary Highway System's condition and performance. It calculates a single rating per road segment based on seven criteria (traffic volumes, congestion, pavement and bridge condition, etc.), serving as an initial screening to identify areas for further study.",
    "status": "In Use (since 2014, updated annually)",
    "completion_percentage": 90,
    "responsible": "Iowa DOT Systems Planning Bureau",
    "url": "N/A",
    "reference": "Section 3.3 Highway Planning"
  },
  {
    "name": "Iowa Interstate Investment Plan (I3P)",
    "category": "System Plan",
    "description": "A long-term plan establishing a statewide vision for Iowa's Interstate highways. Initially detailed improvements for each Interstate segment through 2040 (now extended to 2050) to maintain high safety and condition levels and address capacity needs. Supports project prioritization by focusing investments where they yield long-term benefits.",
    "status": "Completed (Initial plan 2012; extended to 2050)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Systems Planning Bureau",
    "url": "N/A",
    "reference": "Section 3.3 Highway Planning"
  },
  {
    "name": "Iowa Travel Analysis Model (iTRAM)",
    "category": "Modeling Tool",
    "description": "The statewide travel demand model used by Iowa DOT for forecasting traffic and evaluating network scenarios. For example, iTRAM was used to quantify the value of freight bottleneck improvements by modeling efficiency gains in the network. An updated iTRAM now forecasts traffic volumes out to 2050.",
    "status": "In Use",
    "completion_percentage": 85,
    "responsible": "Iowa DOT Systems Planning Bureau",
    "url": "N/A",
    "reference": "Section 3.3 Highway Planning"
  },
  {
    "name": "Iowa DOT Complete Streets Policy",
    "category": "Policy Program",
    "description": "Policy adopted in 2020 requiring all Iowa DOT projects on the Primary Highway System to consider accommodations for all users (including bicyclists and pedestrians) in planning, design, construction, and reconstruction. It formalizes accessibility considerations by treating all improvements as opportunities to improve safety, access, and mobility for all modes.",
    "status": "Adopted (2020, implementation ongoing)",
    "completion_percentage": 70,
    "responsible": "Iowa DOT (all divisions, led by Systems Planning/Bureau of Design)",
    "url": "https://iowadot.gov/completestreets",
    "reference": "Section 3.2 Bicycle/Pedestrian"
  },
  {
    "name": "Iowa DOT Rightsizing Policy",
    "category": "Policy Program",
    "description": "A policy framework adopted as part of Iowa in Motion 2050 to ensure efficient investment and management of the transportation system (rightsizing). It defines what rightsizing means for Iowa DOT and identifies ten specific areas (e.g., project scope, system stratification, equity, resiliency, etc.) where the department will incorporate rightsizing principles.",
    "status": "Adopted (2022, implementation ongoing)",
    "completion_percentage": 65,
    "responsible": "Iowa DOT Executive Leadership Team",
    "url": "N/A",
    "reference": "Section 5.5 Rightsizing Policy"
  },
  {
    "name": "Get There Your Way",
    "category": "Public Outreach Tool",
    "description": "An initiative to inform individuals of their transportation options and improve personal mobility for all users. Aimed at reducing barriers for underserved populations, this program (e.g., a web tool or campaign) helps Iowans discover available travel modes and services.",
    "status": "Ongoing",
    "completion_percentage": 60,
    "responsible": "Iowa DOT Motor Vehicle Division (Driver & Identification Services)",
    "url": "https://iowadot.gov/getthere",
    "reference": "Strategy 14 – Accessibility"
  },
  {
    "name": "Iowa Advisory Council on Automated Transportation (ATC)",
    "category": "Collaboration Initiative",
    "description": "A public-private advisory council convened by Iowa DOT to guide automated transportation (CAT) efforts in Iowa. The ATC provides a venue for stakeholder engagement, education, and strategic planning toward the Iowa Automated Transportation Vision. It focuses on infrastructure readiness, policy/legislation, economic development, public safety, outreach/education, and research/testing for automation.",
    "status": "Ongoing",
    "completion_percentage": 55,
    "responsible": "Iowa DOT (Traffic Operations) with public/private partners",
    "url": "https://iowadot.gov/automatedtransportation",
    "reference": "Strategy 18 – Automated Transportation"
  },
  {
    "name": "Iowa Automated Transportation Vision (AT Vision)",
    "category": "Strategic Plan",
    "description": "The statewide vision and strategic framework for advancing cooperative and automated transportation (CAT) in Iowa. Developed in conjunction with the ATC, it sets strategic objectives (in areas like infrastructure, policy, economic development, safety, education, research) to prepare Iowa for future CAT deployment.",
    "status": "Completed (Adopted by ATC)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT Traffic Operations (with ATC)",
    "url": "https://iowadot.gov/automatedtransportation/vision",
    "reference": "Strategy 18 – Automated Transportation"
  },
  {
    "name": "Volkswagen Settlement (Iowa EV Funding)",
    "category": "Funding Program",
    "description": "Iowa's administration of funds from the Volkswagen emissions settlement. The Iowa DOT has used this funding to support alternative fuel and electric vehicle infrastructure and emissions-reduction projects across the state.",
    "status": "Ongoing (Funding Implementation)",
    "completion_percentage": 45,
    "responsible": "Iowa DOT and Iowa Department of Natural Resources",
    "url": "https://www.iowadnr.gov/Environmental-Protection/Air-Quality/VW-Settlement",
    "reference": "Strategy 19 – Alternative Fuel Initiatives"
  },
  {
    "name": "I-80 Mid-America Alternative Fuel Corridor",
    "category": "Corridor Initiative",
    "description": "A planning effort to establish Interstate 80 as an alternative fuel corridor (for electric, CNG, etc.) across Iowa and neighboring states. Iowa DOT participated in a planning study to identify infrastructure needs for alternative fuel vehicles along I-80 (the Mid-America corridor).",
    "status": "Completed (Planning Study)",
    "completion_percentage": 100,
    "responsible": "Iowa DOT (in coordination with Mid-America Corridor states)",
    "url": "N/A",
    "reference": "Strategy 19 – Alternative Fuel Initiatives"
  },
  {
    "name": "Iowa 511 Traveler Information System",
    "category": "Digital Tool",
    "description": "Iowa's statewide 511 system providing real-time traveler information on road conditions, incidents, closures, work zones, and weather-related driving conditions. Part of the nationwide 511 program but operated by Iowa DOT, it is crucial for both everyday travel and emergency operations.",
    "status": "Operational",
    "completion_percentage": 95,
    "responsible": "Iowa DOT Traffic Operations (Highway Division)",
    "url": "https://511ia.org/",
    "reference": "Section 4.3 Security & Emergency"
  },
  {
    "name": "Essential Air Service (EAS) Program in Iowa",
    "category": "Funding Program",
    "description": "Federal program that subsidizes a minimum level of scheduled commercial air service to smaller communities. Five of Iowa's commercial airports (Burlington, Fort Dodge, Mason City, Sioux City, Waterloo) receive EAS support to maintain airline service.",
    "status": "Ongoing",
    "completion_percentage": 50,
    "responsible": "U.S. DOT (FAA) – utilized by Iowa communities",
    "url": "https://www.transportation.gov/policy/aviation-policy/small-community-rural-air-service/essential-air-service",
    "reference": "Section 3.1 Aviation"
  },
  {
    "name": "Infrastructure Condition Evaluation – Operations (ICE-OPS) Tool",
    "category": "Analysis Tool",
    "description": "An operations-focused extension of the ICE tool. ICE-OPS provides a system-wide screening of relative operational risk on primary highways. It uses ten operations-oriented criteria (e.g., traffic incidents, weather, reliability measures) to rank highway segments by risk to safe and reliable operations, similar in structure to ICE.",
    "status": "In Use (Developed circa 2022)",
    "completion_percentage": 80,
    "responsible": "Iowa DOT Systems Operations Division",
    "url": "N/A",
    "reference": "Chapter 5 – Needs/Risks Analysis"
  },
  {
    "name": "Iowa DOT Business Plan 2021–2025",
    "category": "Agency Strategy",
    "description": "Iowa DOT's short-term strategic business plan aligning with the SLRTP. It operationalizes the long-range plan by setting near-term objectives and priority goals (1-year, 5-year, 10-year targets) for the department. The 2021–2025 plan established five priority goals (safety, customer service, workforce, funding, innovation) that correspond to SLRTP themes.",
    "status": "In Effect (2021–2025)",
    "completion_percentage": 75,
    "responsible": "Iowa DOT Executive Leadership Team",
    "url": "https://iowadot.gov/about/Business-Plan",
    "reference": "Section 1.4 SLRTP Use"
  },
  {
    "name": "Iowa Rideshare",
    "category": "Digital Tool",
    "description": "An online carpool and vanpool matching platform managed by Iowa DOT to facilitate ridesharing. The Iowa Rideshare site connects users with DART's vanpool program and other carpool opportunities statewide, supporting commuters in forming and finding shared rides.",
    "status": "Operational",
    "completion_percentage": 85,
    "responsible": "Iowa DOT Public Transit Bureau (in partnership with transit agencies)",
    "url": "https://iowarideshare.org/",
    "reference": "Section 3.8 Commuting Trends"
  },
  {
    "name": "M-35 Marine Highway Corridor (Waterway of the Saints)",
    "category": "Corridor Initiative",
    "description": "A designated marine highway corridor on the Upper Mississippi River (part of MARAD's America's Marine Highway Program). The M-35 corridor runs from St. Paul, MN, to near St. Louis, MO, providing an inland waterway route (also called the Waterway of the Saints). Iowa, bordering this corridor, supports improvements to locks, dams, and intermodal connections along the river.",
    "status": "Ongoing (Federal designation)",
    "completion_percentage": 50,
    "responsible": "MARAD (with Iowa DOT advocacy)",
    "url": "https://www.maritime.dot.gov/ports/marine-highway/m-35-upper-mississippi-river",
    "reference": "Section 3.6 Waterway"
  }
];

// Initialize database
function initializeDatabase() {
    db.serialize(() => {
        // Execute schema
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error creating schema:', err);
                process.exit(1);
            }
            console.log('Database schema created successfully');
        });

        // Insert initial projects
        const stmt = db.prepare(`
            INSERT INTO projects (name, category, description, status, completion_percentage, responsible, url, reference, approved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);

        initialProjects.forEach(project => {
            stmt.run(
                project.name,
                project.category,
                project.description,
                project.status,
                project.completion_percentage,
                project.responsible,
                project.url,
                project.reference
            );
        });

        stmt.finalize((err) => {
            if (err) {
                console.error('Error inserting initial projects:', err);
            } else {
                console.log(`Successfully inserted ${initialProjects.length} projects`);
            }
        });

        // Create a demo user
        db.run(`
            INSERT INTO users (username, email, display_name, role)
            VALUES ('system', 'system@iowadot.gov', 'System', 'admin')
        `, (err) => {
            if (err) {
                console.error('Error creating demo user:', err);
            } else {
                console.log('Demo user created successfully');
            }
        });
    });
}

// Check if we need to initialize
if (!dbExists) {
    console.log('Initializing new database...');
    initializeDatabase();
} else {
    console.log('Database already exists. Skipping initialization.');
    console.log('To reinitialize, delete iowa-dot-tracker.db and run this script again.');
}

// Close database after a delay to allow all operations to complete
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
}, 2000);
