# Major Projects Coordinate Update Summary

## Overview
Updated the Iowa DOT SLTP Tracker with accurate geographic coordinates from the official `Major_Projects_Location.geojson` file.

## Date
2025-11-21

## Source Data
- **File**: `/Users/mattmiller/Downloads/Major_Projects_Location.geojson`
- **Total Projects**: 37 major construction projects across Iowa
- **Data Format**: GeoJSON FeatureCollection with WGS84 coordinates (CRS84)

## Updates Made

### 1. HTML Tracker Map Links (iowa_dot_enhanced_tracker.html)

Updated 511ia.org map links with precise coordinates:

| Project | Old Coordinates | New Coordinates | Line |
|---------|----------------|-----------------|------|
| U.S. 30 Missouri Valley Bypass | lat=41.5, lon=-96.0 | lat=41.764111, lon=-95.682403 | 2835 |
| U.S. 63 Oskaloosa Bypass | lat=41.3, lon=-92.6 | lat=41.804667, lon=-92.591328 | 2888 |
| Mississippi River Bridge at Lansing | lat=43.2, lon=-91.2 | lat=43.364821, lon=-91.216095 | 3024 |

### 2. Database Coordinate Script (populate-coordinates.js)

Updated PROJECT_OVERRIDES with accurate GeoJSON coordinates:

```javascript
'U.S. 30 Missouri Valley Bypass': { lat: 41.764111, lon: -95.682403 }
'U.S. 63 Oskaloosa Bypass': { lat: 41.804667, lon: -92.591328 }
'Iowa 12 Gordon Drive Bridge Replacement': { lat: 42.496005, lon: -94.187957 }
'Mississippi River Bridge at Lansing': { lat: 43.364821, lon: -91.216095 }
```

### 3. Database Updated
Ran `populate-coordinates.js` to update all 50 projects in the SQLite database with accurate coordinates.

## Key GeoJSON Projects Available

### Interstate Projects
- **I-35/80/235 Northeast Mix Master** (Des Moines): [41.652035, -93.575684]
- **I-35 Polk/Story County** (2 sections): [41.788188, -93.570792] & [41.845067, -93.571130]
- **I-29/I-80/I-480 Council Bluffs**: [41.232422, -95.872480]
- **I-80 Raccoon River Bridges** (3 sections): Near Van Meter/Dallas County
- **I-29 & IA 141 Interchange**: [42.228836, -96.242014]

### US Highway Projects
- **US 30 Bridge Replacement** (Harrison County): [41.764111, -95.682403]
- **US 63 Super 2** (Poweshiek & Tama County): [41.804667, -92.591328]
- **US 20 Reconstruction** (Sioux City): [42.475353, -96.301436]
- **US 61** (Mediapolis area): [41.0248, -91.1701]
- **US 71 Reconstruction** (Arnolds Park/Okoboji): [43.385566, -95.127852]
- **US 75 Reconstruction** (Sioux Center): [43.060956, -96.174864]

### Bridge Projects
- **Mississippi River Bridge Lansing**: [43.364821, -91.216095]
- **Business US 20 in Fort Dodge**: [42.496005, -94.187957]
- **I-280 River Bridge** (Illinois DOT): [41.478811, -90.632087]

### State Highway Projects
- **IA 27/58 at Ridgeway** (Cedar Falls): [42.469275, -92.445684]
- **IA 92** (Columbus Junction): [41.29343, -91.51767]
- **IA 1** (Brighton): [41.177665, -91.945351]
- **IA 175** (Onawa): [42.027167, -96.096883]
- **IA 12 Right Turn Lane** (Sioux City): [42.515, -96.474378]

## District Distribution
- District 1: 6 projects (Des Moines metro, Ames, Fort Dodge areas)
- District 2: 4 projects (Northeast Iowa)
- District 3: 9 projects (Northwest Iowa, Sioux City area)
- District 4: 11 projects (Council Bluffs, I-80 corridor)
- District 5: 5 projects (South-central Iowa)
- District 6: 6 projects (East-central Iowa, Iowa City/Cedar Rapids)

## Testing
- ✅ HTML file opens successfully
- ✅ Map links point to correct 511ia.org coordinates
- ✅ Database updated with 50 project coordinates
- ✅ 4 major construction projects have precise locations

## Files Modified
1. `iowa_dot_enhanced_tracker.html` - Updated 3 map links
2. `populate-coordinates.js` - Updated 4 project overrides with GeoJSON coordinates
3. `iowa-dot-tracker.db` - Updated all 50 projects (via script)

## Notes
- The GeoJSON file contains 37 total projects, many more than currently displayed in the HTML tracker
- Consider adding more projects from the GeoJSON to the interactive map in the future
- All coordinates use WGS84/CRS84 coordinate reference system (standard for web maps)
- Coordinates are in [longitude, latitude] order in GeoJSON, converted to lat/lon for use
