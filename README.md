# Iowa DOT 2050 Transportation Plan Tracker

A comprehensive web-based tracker for monitoring Iowa Department of Transportation's Long-Range Transportation Plan implementation through 2050.

## Features

### Core Functionality
- **Dashboard View**: Overview of all projects with key statistics and progress metrics
- **Projects View**: Detailed project cards with filtering and search capabilities
- **Tasks View**: Implementation tasks organized by chapter
- **Strategies View**: 30+ strategic initiatives with division assignments
- **Chapters View**: Direct links to plan chapters with progress tracking
- **Timeline View**: Visual timeline of project milestones from 2023-2030

### Interactive Features
- **Smart Search & Filters**: Search projects by name, location, or county with auto-save preferences
- **AI Chatbot**: Interactive assistant for quick information lookup
- **Data Export**: Download tracker data in CSV or JSON format
- **Progress Tracking**: Visual progress bars for all active projects
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### New Enhancements
- **Keyboard Shortcuts**:
  - `Alt + 1-6`: Quick navigation between views
  - `Ctrl/Cmd + K`: Open chatbot
  - `Esc`: Close chatbot
- **LocalStorage**: Filter preferences are automatically saved
- **Console Logging**: Project statistics logged on page load

## How to Use

### Opening the Page
1. Simply open `index.html` in any modern web browser
2. No server or installation required - works completely offline

### Navigation
- Click the tabs at the top to switch between views
- Use keyboard shortcuts for faster navigation (see above)

### Searching Projects
1. Navigate to the **Projects** view
2. Use the search box to find projects by keyword
3. Filter by Chapter or Status using the dropdown menus
4. Your filter preferences are automatically saved

### Using the Chatbot
1. Click the chat bubble in the bottom-right corner (or press `Ctrl/Cmd + K`)
2. Ask questions like:
   - "How many poor bridges are left?"
   - "What is the I-35 status?"
   - "Show me winter operations"
   - Type "help" for all available questions

### Exporting Data
1. Go to the **Dashboard** view
2. Click "Export as CSV" or "Export as JSON"
3. File will download with current date in filename

## Project Data

The tracker currently monitors **10 major projects**:

1. **I-35 Reconstruction** (Ankeny → Huxley) - 55% complete
2. **I-35/I-80/I-235 West Mixmaster** - Planned
3. **I-80/I-380 Systems Interchange** - ✅ Completed (2023)
4. **Black Hawk Bridge Replacement** (Lansing) - 50% complete
5. **US 61 Four-Lane Expansion** - Programmed
6. **IA 14 Improvements** (Monroe ↔ Knoxville) - 30% complete
7. **I-35/US 30 Interchange Bridges** - Programmed
8. **IA 141 Corridor Safety Enhancements** - 35% complete
9. **NEVI DC Fast-Charging Buildout** - 15% complete
10. **I-29 Flood Resilience Improvements** - Planned

## Technical Details

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Technologies Used
- Pure HTML5, CSS3, and JavaScript
- No external dependencies
- No server required
- LocalStorage for preference persistence

### File Structure
```
Iowa-DOT-Long-Range-Plan-Tracker/
├── index.html                              # Main tracker page
├── Iowa DOT LRTP Tracker POC.html         # Original file
└── README.md                               # This file
```

## Deployment Options

### Option 1: Local Use
- Open `index.html` directly in your browser
- Share the HTML file via email or file sharing

### Option 2: GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select branch and `/` (root) folder
4. Access at `https://[username].github.io/[repo-name]`

### Option 3: Web Server
Upload to any web server:
- Apache, Nginx, IIS
- Cloud hosting (AWS S3, Azure Static Sites, Netlify, Vercel)
- No special configuration needed

## Data Updates

To update project data:
1. Open `index.html` in a text editor
2. Find the `projectsData` array (around line 1428)
3. Edit project information
4. Save the file

### Project Data Structure
```javascript
{
    id: 'PROJECT-ID',
    name: 'Project Name',
    mode: 'Highway|Bridge|etc',
    location: 'Location description',
    counties: 'County names',
    status: 'Completed|Under construction|Planned|Programmed',
    completion: 2026, // Year or 'TBD'
    division: 'Division name',
    bureau: 'Bureau name',
    chapterId: 'Ch5',
    url: 'https://...',
    statusDetail: 'Detailed status description',
    percentComplete: 55
}
```

## Customization

### Branding
All Iowa DOT brand colors are defined as CSS variables at the top of the `<style>` section:
- `--iowa-navy`: #19405B
- `--iowa-teal`: #03617A
- `--iowa-gold`: #E0A624
- And more...

### Chatbot Responses
Edit the `chatResponses` object (around line 1581) to add new questions and answers.

## Support

For questions or issues:
- Iowa DOT Main: 515-239-1101
- Visit: https://iowadot.gov
- Traffic & Safety: 515-239-1267

## License

Developed for the Iowa Department of Transportation
Director of New and Emerging Transportation Technologies

## Version History

- **v1.1** (Current) - Added keyboard shortcuts, localStorage, enhanced functionality
- **v1.0** - Initial POC release

---

*Last updated: November 12, 2025*
*Iowa in Motion 2050 State Long Range Transportation Plan*
