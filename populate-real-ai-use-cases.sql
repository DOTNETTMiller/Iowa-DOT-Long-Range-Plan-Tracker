-- Clear existing sample data
DELETE FROM ai_use_cases;

-- Reset auto-increment
DELETE FROM sqlite_sequence WHERE name='ai_use_cases';

-- ============================================
-- IN PRACTICE Use Cases
-- ============================================

INSERT INTO ai_use_cases (name, stage, stage_label, business_area, lr_tracker_id, description, timeline) VALUES
(
    'Automated Incident Detection (TIMELI)',
    'in-practice',
    'In Practice',
    'Traffic Management Center',
    'AI-OPS-1',
    'Machine-learning and computer vision models monitor speed/travel-time data and camera feeds to flag likely incidents so TMC operators can verify and respond faster, reducing secondary crashes.',
    '2024-Present'
),
(
    'Traffic Flow Prediction & Congestion Management',
    'in-practice',
    'In Practice',
    'Traffic Management / TSMO',
    'AI-OPS-1',
    'Use real-time and historical probe/speed data to predict congestion and support proactive strategies (ramp metering, detours, timing changes) instead of purely reactive operations.',
    '2024-Present'
),
(
    'Enhanced Traffic Safety Analysis',
    'in-practice',
    'In Practice',
    'Traffic & Safety',
    'AI-OPS-1',
    'Apply AI/advanced analytics to crash, roadway, and operational data to identify emerging safety issues, hotspots, and treatment candidates more quickly and consistently.',
    '2024-Present'
),
(
    'Winter Maintenance Optimization (AVL & Geofencing)',
    'in-practice',
    'In Practice',
    'Maintenance / Winter Operations',
    'AI-WINTER-1',
    'Use AVL and geofencing from plows and treatment trucks to track coverage, optimize routes, and document winter operations, with a glide path toward more predictive, AI-supported decision tools.',
    '2023-Present'
),
(
    'e-Ticketing & Supply Chain Automation',
    'in-practice',
    'In Practice',
    'Construction & Materials',
    'AI-CONST-1',
    'Use vendor platforms and analytics/LLM helpers to roll up deliveries, exceptions, and weather; support smarter construction supply-chain decisions and digital as-builts.',
    '2024-Present'
),
(
    'e-Ticketing Daily Summaries & Dashboards',
    'in-practice',
    'In Practice',
    'Construction & Materials',
    'AI-CONST-1',
    'Autosummarize deliveries, weather, and out-of-spec events into project-level daily narratives and dashboards that seed DWRs and inspections.',
    '2024-Present'
),
(
    'e-Ticketing Daily Summaries & KML Mapping (HaulHub)',
    'in-practice',
    'In Practice',
    'Construction & Materials',
    'AI-CONST-1',
    'Use LLMs to generate human-readable daily summaries and automatically build KML/map layers of loads, plants, and sites so inspectors and PMs can see issues at a glance.',
    '2024-Present'
),
(
    'Office & Administrative Automation',
    'in-practice',
    'In Practice',
    'Enterprise / Multiple Divisions',
    'AI-PROD-1',
    'AI-assisted email drafting, meeting summaries, Excel helpers (forms bundling, pay-item helpers), and PowerPoint suggestions to shave time off routine admin work.',
    '2024-Present'
),
(
    'Administrative & Document Automation',
    'in-practice',
    'In Practice',
    'Enterprise / Multiple Divisions',
    'AI-PROD-1',
    'Apply AI to repetitive document tasks (templates, letters, reports, correspondence, basic data entry) so staff can focus on higher-value analysis and decision-making.',
    '2024-Present'
),
(
    'Construction Inspection & Quality Control (AI-assisted)',
    'in-practice',
    'In Practice',
    'Construction & Materials',
    'AI-CONST-1',
    'Use data from e-Ticketing, connected equipment, photos, and future CV/LLM checks to highlight potential quality and compliance issues for inspectors to review.',
    '2024-Present'
),
(
    'Project Management & Logistics Assistants',
    'in-practice',
    'In Practice',
    'Project Management',
    'AI-PROD-1',
    'Help project teams keep track of materials, submittals, RFIs, and communications with AI-assisted search and summaries instead of digging through email and shared drives.',
    '2024-Present'
),
(
    'Crash Hotspot & Incident Detection (Cameras + Speeds)',
    'in-practice',
    'In Practice',
    'Traffic Management Center',
    'AI-OPS-1',
    'Use combined camera and speed data with AI to detect incidents and hotspots, complementing the core TIMELI deployment.',
    '2024-Present'
),
(
    'Winter Operations Analytics Foundation',
    'in-practice',
    'In Practice',
    'Maintenance / Winter Operations',
    'AI-WINTER-1',
    'Use AVL, weather, and route data to support storm-by-storm decision-making and after-action reviews, with a roadmap toward more automated recommendations.',
    '2023-Present'
);

-- ============================================
-- PILOTED Use Cases
-- ============================================

INSERT INTO ai_use_cases (name, stage, stage_label, business_area, lr_tracker_id, description, timeline) VALUES
(
    'Inspector Daily Summary (DWR Copilot)',
    'piloted',
    'Piloted',
    'Construction & Materials',
    'AI-CONST-1',
    'LLM ingests e-Ticketing, test results, weather, and inspector notes to draft a DWR with action items and missing data prompts; inspector reviews and signs off.',
    'FY 2025 Pilot'
),
(
    'EEO Board Photo Check',
    'piloted',
    'Piloted',
    'Construction & Materials / Civil Rights',
    'AI-CONST-1',
    'Computer vision checks photos of project-site EEO boards to verify required posters and dates, pre-fills inspection forms, and schedules the next check, with human review.',
    'FY 2025 Pilot'
),
(
    'Work-Zone Impact Forecasting (LCPT + WZDx)',
    'piloted',
    'Piloted',
    'Traffic Management / TSMO',
    'AI-OPS-1',
    'ML model uses lane-closure permits, historical speeds/volumes, and work-zone history to estimate delay and queues, propose detours, and feed better traveler information.',
    'FY 2025-2026 Pilot'
),
(
    'Utility Conflict Risk Scoring',
    'piloted',
    'Piloted',
    'Design / Right-of-Way',
    'AI-OPS-1',
    'Combine permits, aerial/street imagery, prior locate records, and as-built info to generate a probability map of likely underground utilities and flag high-risk conflict areas for designers.',
    'FY 2025-2026 Pilot'
),
(
    'Pavement Asset Condition Prediction (XGBoost)',
    'piloted',
    'Piloted',
    'Asset Management / Pavements',
    'AI-WINTER-1',
    'Use supervised ML (e.g., XGBoost) with explainability (feature importance/SHAP) to predict multiple pavement distresses together and support a "digital twin" style asset view.',
    'FY 2025-2026 Pilot'
),
(
    'Pavement Distress Forecasting',
    'piloted',
    'Piloted',
    'Asset Management / Pavements',
    'AI-WINTER-1',
    'Forecast key pavement indices (cracking, IRI, rutting/faulting) at segment level to inform programming and treatments.',
    'FY 2025-2026 Pilot'
),
(
    'Patching Tabulations',
    'piloted',
    'Piloted',
    'Asset Management / Pavements',
    'AI-WINTER-1',
    'Use model outputs to estimate where patching will likely be needed and generate data-driven patch quantity estimates for scoping.',
    'FY 2025-2026 Pilot'
),
(
    'Treatment Needs Prediction',
    'piloted',
    'Piloted',
    'Asset Management / Pavements',
    'AI-WINTER-1',
    'Predict where crack sealing, microsurfacing, or other treatments will be needed and when, supporting better timing and budgeting.',
    'FY 2025-2026 Pilot'
),
(
    'IowaRun Asset Extraction from Imagery',
    'piloted',
    'Piloted',
    'Asset Management / Data Collection',
    'AI-WINTER-1',
    'Use ML to extract pavement and asset attributes from mobile/airborne imagery with human QC, feeding condition and inventory datasets.',
    'FY 2025 Pilot'
),
(
    'Meeting Minutes & Action-Item Extractor',
    'piloted',
    'Piloted',
    'Enterprise / Multiple Divisions',
    'AI-PROD-1',
    'Transcribe meetings and run an LLM to extract decisions, tasks, owners, and due dates, generating draft minutes and action lists for staff to confirm.',
    'FY 2025 Pilot'
),
(
    'Connected Equipment Signals for As-Built Intelligence',
    'piloted',
    'Piloted',
    'Construction & Materials',
    'AI-CONST-1',
    'Ingest telematics from connected compactors, pavers, trucks, etc., along with e-Ticketing and LCPT to infer work-in-progress and as-built conditions and prompt QA checks.',
    'FY 2025-2026 Pilot'
),
(
    'Signal Timing Optimization with Predictive Demand',
    'piloted',
    'Piloted',
    'Traffic Management / Signals',
    'AI-OPS-1',
    'Use short-term traffic forecasts from probe/sensor data and LCPT/event calendars to recommend signal timing adjustments and detour strategies on targeted corridors.',
    'FY 2026 Pilot'
),
(
    'PlanSet Quality Control (IFC/PDF Cross-Check)',
    'piloted',
    'Piloted',
    'Design / Plans Review',
    'AI-CONST-1',
    'Run CV/LLM checks across IFC models, plan PDFs, and spec libraries to surface likely conflicts, missing notes, and quantity mismatches before letting.',
    'FY 2025-2026 Pilot'
),
(
    'DBE Truck Tracking & Haul Route Verification',
    'piloted',
    'Piloted',
    'Construction & Materials / Civil Rights',
    'AI-CONST-1',
    'Use GPS/telematics and geofenced routes to verify DBE trucking participation and haul routes more efficiently while protecting privacy and consent.',
    'FY 2025-2026 Pilot'
),
(
    'Public Sentiment & Comment Mining',
    'piloted',
    'Piloted',
    'Communications / Public Engagement',
    'AI-COMM-1',
    'Use NLP to cluster public comments (email, social, web portals, 311) into themes, geotag mentions, and produce concise summaries for project teams and leadership.',
    'FY 2025-2026 Pilot'
),
(
    'AI-Supported Knowledge Search (Specs, Manuals, Policies)',
    'piloted',
    'Piloted',
    'Enterprise / Knowledge Management',
    'AI-PROD-1',
    'Chat-style interface over curated specs/design manuals/policies so staff can ask questions in plain language and get answers with citations into official documents.',
    'FY 2025 Pilot'
);

-- ============================================
-- ASPIRATIONAL Use Cases
-- ============================================

INSERT INTO ai_use_cases (name, stage, stage_label, business_area, lr_tracker_id, description, timeline) VALUES
(
    'Snowplow Driver Assistance',
    'aspirational',
    'Aspirational',
    'Maintenance / Winter Operations',
    'AI-WINTER-1',
    'Explore in-cab decision support (e.g., "where to hit next," speed guidance, hazard alerts) using AI on weather, road, and traffic data to help drivers in severe conditions.',
    'FY 2027-2028'
),
(
    'Predictive Asset Maintenance (Weather + Condition Trends)',
    'aspirational',
    'Aspirational',
    'Asset Management',
    'AI-WINTER-1',
    'Use AI to forecast where weather and wear are most likely to cause asset issues so maintenance can act before failures, improving safety and lowering life-cycle costs.',
    'FY 2027-2028'
),
(
    'AI-Optimized Winter Operations (Full Decision Support)',
    'aspirational',
    'Aspirational',
    'Maintenance / Winter Operations',
    'AI-WINTER-1',
    'Combine forecasts, RWIS, AVL, material usage, and crash data to recommend treatment plans and plow deployments, and auto-build after-action summaries (humans still decide).',
    'FY 2027-2028'
),
(
    'AI Phone Service for Road-Issue Reporting',
    'aspirational',
    'Aspirational',
    'Communications / Customer Service',
    'AI-COMM-1',
    'An AI call-handler captures caller location and issue type, routes the call/ticket to the appropriate team, and offers callbacks or scheduling with strong human-fallback paths.',
    'FY 2027-2028'
),
(
    'Multilingual Survey & Public Input Translation',
    'aspirational',
    'Aspirational',
    'Communications / Public Engagement',
    'AI-COMM-1',
    'Use AI translation services on Survey123 (or similar tools) so public input for long-range plans and projects can be collected and understood across multiple languages.',
    'FY 2026-2027'
);

-- Update sample use cases with video URLs (for demo purposes - replace with real YouTube URLs)
-- These are placeholders - replace with actual unlisted YouTube videos when available
UPDATE ai_use_cases SET video_url = 'https://youtu.be/dQw4w9WgXcQ'
WHERE name = 'Automated Incident Detection (TIMELI)';

UPDATE ai_use_cases SET video_url = 'https://youtu.be/dQw4w9WgXcQ'
WHERE name = 'Inspector Daily Summary (DWR Copilot)';

-- Add benefits and risks to key use cases
UPDATE ai_use_cases SET
    benefits = 'Faster incident detection (30-60 seconds faster), reduced secondary crashes, improved TMC operator efficiency',
    risks = 'False positives require human verification, model drift over time, camera coverage gaps'
WHERE name = 'Automated Incident Detection (TIMELI)';

UPDATE ai_use_cases SET
    benefits = 'Saves inspectors 45-60 minutes per day, improves DWR consistency, reduces missing data',
    risks = 'Requires human review, depends on e-Ticketing data quality, adoption/training curve'
WHERE name = 'Inspector Daily Summary (DWR Copilot)';

UPDATE ai_use_cases SET
    benefits = 'Ensures EEO compliance, reduces manual poster checks, creates audit trail',
    risks = 'Photo quality dependent, requires periodic retraining, human oversight needed'
WHERE name = 'EEO Board Photo Check';
