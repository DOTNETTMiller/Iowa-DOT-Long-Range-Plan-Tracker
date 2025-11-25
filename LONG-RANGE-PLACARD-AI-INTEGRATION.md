# Long Range Plan Placard → AI Strategy Integration Guide

## Architecture Overview

**The Pattern:**
- **AI Strategy = Full Page** under `/long-range-plan/ai-strategy` (or similar)
- **Long Range Placards = Windows** that deep-link into specific sections of the AI page
- **Bidirectional**: Placards point to AI page, AI page shows crosswalk back to Long Range goals

This makes AI a **first-class strategic area** in the Long Range Plan, not a side project.

---

## 1. Site Map Structure

```
/long-range-plan/
├── Goal 1 – Safety, Mobility, etc.
├── Goal 2 – System Stewardship
├── Goal 3 – Project Delivery
├── Goal X – Digital Infrastructure & AI  ← New goal area
│   └── /ai-strategy  ← Full AI Strategy & Use-Case Inventory page
│       ├── #exec-summary
│       ├── #governance (AI-GOV-1)
│       ├── #productivity (AI-PROD-1)
│       ├── #operations (AI-OPS-1)
│       ├── #construction (AI-CONST-1)
│       ├── #winter-ops (AI-WINTER-1)
│       ├── #ia-ai-alignment (AI-COMM-1)
│       ├── #usecases
│       └── #lr-crosswalk
└── Other Goals...
```

**Key Point:** The AI Strategy page lives **under the Long Range Plan structure**, not as a separate microsite.

---

## 2. Database Schema for Placards

### Extended `projects` Table

**New Fields Added:**
```sql
ALTER TABLE projects ADD COLUMN has_ai_component BOOLEAN DEFAULT 0;
ALTER TABLE projects ADD COLUMN ai_plan_anchor TEXT;
```

**Field Definitions:**
- `has_ai_component` (Boolean) - Does this placard/initiative have AI aspects?
  - `0` = No AI connection
  - `1` = Has AI component (show AI chip)

- `ai_plan_anchor` (Text) - Which section of the AI page to link to
  - Examples: `governance`, `productivity`, `operations`, `construction`, `winter-ops`, `usecases`
  - Can be comma-separated for multiple: `operations,usecases`

**Example Data:**
```sql
-- Mark AI-related initiatives
UPDATE projects SET has_ai_component = 1, ai_plan_anchor = 'governance'
WHERE name = 'AI Governance & Guardrails';

UPDATE projects SET has_ai_component = 1, ai_plan_anchor = 'operations,usecases'
WHERE name = 'Traffic Management Improvements';

UPDATE projects SET has_ai_component = 1, ai_plan_anchor = 'construction'
WHERE name = 'Construction Documentation Modernization';
```

---

## 3. Placard UI Changes

### Add AI Chip/Badge

On any placard where `has_ai_component = 1`, display:

```html
<div class="ai-chip" onclick="goToAISection('operations')">
    🔗 AI in this Initiative
    <span class="ai-chip-subtitle">View related AI use cases</span>
</div>
```

**Visual Design:**
```css
.ai-chip {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.ai-chip:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
}

.ai-chip-subtitle {
    font-size: 0.75rem;
    opacity: 0.9;
    font-weight: 400;
}
```

**JavaScript:**
```javascript
function goToAISection(anchor) {
    // Navigate to AI Strategy page with anchor
    window.location.href = `/long-range-plan/ai-strategy#${anchor}`;
}
```

---

## 4. AI Page Integration

### Already Implemented ✅

**Breadcrumb** (top of page):
```
📍 Part of Iowa in Motion 2050 Long-Range Transportation Plan

This AI Strategy & Use-Case Inventory is housed under the Long Range Plan's
Digital Infrastructure & AI goal area.
```

**Long Range Crosswalk Section** (bottom of page):
- Shows 5 connection cards mapping AI initiatives to Long Range goals:
  - 🛡️ Safety & Operations → AI-OPS-1
  - 🏗️ Project Delivery & Stewardship → AI-CONST-1
  - 🌐 Digital Infrastructure & AI → AI-GOV-1
  - ⚙️ System Stewardship & Resilience → AI-WINTER-1
  - ✨ Organizational Excellence → AI-PROD-1

**Anchor IDs** for deep linking:
- `#lr-crosswalk` - Crosswalk section
- `#governance` - Can be added to initiative cards
- `#productivity` - Can be added to initiative cards
- `#operations` - Can be added to initiative cards
- `#construction` - Can be added to initiative cards
- `#winter-ops` - Can be added to initiative cards
- `#usecases` - Use cases section

---

## 5. Sample Placard Copy

### Example 1: Traffic Management & Operations Placard

**Title:** "Smarter Traffic Operations for Safer Travel"

**Description:**
Iowa DOT is modernizing traffic management with real-time data, predictive analytics, and coordinated incident response to reduce delays and improve safety.

**Key Initiatives:**
- Statewide Traffic Management Center expansion
- Enhanced 511 traveler information
- Coordinated incident response protocols
- 🔗 **AI in this Initiative** — [View AI use cases →](#)

**AI Connection:**
When user clicks "🔗 AI in this Initiative":
→ Goes to `/long-range-plan/ai-strategy#operations`
→ Scrolls to Operations AI section showing:
- Incident Detection (TIMELI) - In Practice
- Work Zone Impact Forecasting - Piloted
- Queue/Delay Prediction - Aspirational

---

### Example 2: Construction Documentation Placard

**Title:** "Modernizing Construction Oversight & Documentation"

**Description:**
Transitioning from paper-based field reports to digital, AI-assisted documentation that improves consistency, reduces inspector burden, and creates searchable project records.

**Key Initiatives:**
- e-Construction rollout
- Electronic ticketing integration
- Inspector productivity tools
- 🔗 **AI in this Initiative** — [View AI use cases →](#)

**AI Connection:**
When user clicks "🔗 AI in this Initiative":
→ Goes to `/long-range-plan/ai-strategy#construction`
→ Scrolls to Construction & Compliance AI showing:
- DWR Auto-Draft - Piloted
- Poster & Device Checks - Piloted
- Compliance Consistency Tools - In Progress

---

## 6. Implementation Checklist

### Phase 1: Database Setup ✅
- [x] Add `has_ai_component` and `ai_plan_anchor` fields to projects table
- [x] Identify which placards have AI connections
- [x] Update database records with appropriate values

### Phase 2: AI Page Enhancements ✅
- [x] Add breadcrumb showing AI page is part of Long Range Plan
- [x] Add Long Range crosswalk section
- [x] Add anchor IDs to all major sections
- [x] Add visual connection cards

### Phase 3: Placard UI Updates ⬜ (To Do)
- [ ] Add AI chip component to placard template
- [ ] Style AI chip with gradient and hover effects
- [ ] Wire up onclick handlers to navigate to AI page with anchors
- [ ] Test deep linking from placards to AI sections

### Phase 4: Navigation Integration ⬜ (To Do)
- [ ] Add "Digital Infrastructure & AI" to Long Range Plan main navigation
- [ ] Ensure AI Strategy page uses same header/footer as main Long Range site
- [ ] Add breadcrumb navigation on AI page back to Long Range Plan home

### Phase 5: Testing & Launch ⬜ (To Do)
- [ ] Test all placard → AI page links
- [ ] Test AI page → placard references
- [ ] Verify mobile responsiveness
- [ ] Get stakeholder review
- [ ] Launch to production

---

## 7. Developer Handoff Spec

### For Placard System Developer:

**Task:** Add AI connection chips to relevant placards

**Requirements:**
1. Check if `project.has_ai_component === 1`
2. If yes, render AI chip with link to: `/long-range-plan/ai-strategy#${project.ai_plan_anchor}`
3. Use provided CSS styles for visual consistency
4. Ensure mobile-responsive design

**Data Contract:**
```json
{
  "project": {
    "id": 5,
    "name": "Traffic Management Improvements",
    "has_ai_component": true,
    "ai_plan_anchor": "operations,usecases"
  }
}
```

**Behavior:**
- If `ai_plan_anchor` contains comma, link to first anchor
- Show tooltip on hover: "See how AI supports this initiative"
- Open in same window (not new tab)

---

### For AI Page Developer:

**Task:** Ensure all sections have proper anchor IDs

**Requirements:**
1. Each major section needs `id` attribute matching anchor names
2. Smooth scroll behavior when arriving from external links
3. Highlight/flash the target section briefly when landing from placard
4. Ensure mobile layout doesn't break anchor positioning

**Example:**
```html
<div id="operations" class="ai-initiative-section">
    <h3>Operations AI (Traffic & Incidents)</h3>
    <!-- Content -->
</div>
```

**Smooth Scroll JavaScript:**
```javascript
// On page load, check for anchor and smooth scroll
if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Optional: Flash highlight
        target.classList.add('anchor-highlight');
        setTimeout(() => target.classList.remove('anchor-highlight'), 2000);
    }
}
```

---

## 8. Communication Strategy

### For Leadership:
> "We're not squeezing AI into a single long-range placard. We're giving it a full, living page under the Long Range Plan, and every placard that uses AI points into that page so people can see the real projects, use cases, and guardrails behind the strategy."

### For Staff:
> "When you see the 🔗 AI chip on a Long Range Plan initiative, click it to explore the specific AI tools, pilots, and policies supporting that work. The AI page is updated regularly as our projects evolve."

### For Partners/Public:
> "Iowa DOT's AI efforts are fully integrated into our long-range transportation planning. Visit the AI Strategy & Use-Case Inventory to see how we're using artificial intelligence responsibly to improve safety, operations, and service delivery."

---

## 9. Maintenance & Updates

### Quarterly Review Checklist:
- [ ] Review all placards with `has_ai_component = 1`
- [ ] Verify AI page crosswalk section is current
- [ ] Update use case stages (Aspirational → Piloted → In Practice)
- [ ] Add new AI initiatives as they emerge
- [ ] Remove deprecated or completed pilots
- [ ] Update completion percentages

### When Adding New AI Initiative:
1. Add to `projects` table with `category = 'AI Strategy'`
2. Assign `reference` ID (e.g., AI-NEW-1)
3. Set `has_ai_component = 1` and `ai_plan_anchor`
4. Add to AI Strategy page initiatives grid
5. Update Long Range crosswalk section if needed
6. Update relevant placard to show AI chip

---

## 10. Future Enhancements

### Short-term (Next 3 months):
- Add "Edit Use Case" functionality (currently only "Add")
- Create mobile-optimized view for AI page
- Add print stylesheet for leadership briefings

### Medium-term (6 months):
- Add timeline visualization showing pilot progression
- Create metrics dashboard (hours saved, incidents detected, etc.)
- Add search/filter for use cases

### Long-term (12+ months):
- Integration with IA AI state dashboard (if applicable)
- Automated data feeds from production AI systems
- ROI calculator for AI investments

---

## Questions & Support

**For placard integration questions:**
Contact IT/Web team managing Long Range Plan site

**For AI Strategy page content:**
Contact New & Emerging Transportation Technologies

**For technical implementation:**
See `AI-STRATEGY-INTEGRATION-GUIDE.md` for full technical details

---

**This architecture makes AI a strategic pillar, not a sidebar.** 🎯
