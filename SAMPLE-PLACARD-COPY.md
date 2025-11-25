# Sample Long Range Plan Placard Copy with AI Connections

## How to Use These Samples

These placard templates show how to write Long Range Plan initiative cards that naturally connect to the AI Strategy page. Each includes:
- **Goal Area** - Which Long Range Plan goal this supports
- **Initiative Title** - Clear, action-oriented
- **Description** - What we're doing and why
- **Key Bullets** - Specific deliverables
- **AI Connection** - The 🔗 chip that links to AI page

---

## Template Structure

```
[GOAL AREA]
├── Initiative Title
├── Description (2-3 sentences)
├── Key Initiatives (3-5 bullets)
└── 🔗 AI in this Initiative (if applicable)
```

---

## Sample 1: Traffic Operations & Safety

### Goal Area: **Safety & Operations**

**Initiative:** Smarter Traffic Operations for Safer Travel

**Description:**
Iowa DOT is modernizing traffic management with real-time data, predictive analytics, and coordinated incident response. These tools help us detect incidents faster, manage traffic better during construction, and provide travelers with accurate, timely information.

**Key Initiatives:**
- Expand statewide Traffic Management Center capabilities
- Enhance 511 traveler information with real-time updates
- Implement coordinated incident response protocols
- Deploy smart work zone management tools

**🔗 AI in this Initiative**
[Link to: `/long-range-plan/ai-strategy#operations`]

---

## Sample 2: Construction Oversight & Documentation

### Goal Area: **Project Delivery & Stewardship**

**Initiative:** Modernizing Construction Documentation

**Description:**
Moving from paper-based field reports to digital, AI-assisted documentation improves consistency, reduces inspector workload, and creates searchable project records. This transformation supports faster project delivery and better contract compliance.

**Key Initiatives:**
- Complete e-Construction statewide rollout
- Integrate electronic ticketing with field reporting
- Pilot AI-assisted Daily Work Report drafting
- Implement automated compliance checks

**🔗 AI in this Initiative**
[Link to: `/long-range-plan/ai-strategy#construction`]

---

## Sample 3: Winter Operations Optimization

### Goal Area: **System Stewardship & Resilience**

**Initiative:** Data-Driven Winter Operations

**Description:**
Iowa DOT is exploring how data analytics and AI can optimize winter maintenance decisions—from treatment recommendations to route planning to after-storm analysis. Early pilots show promise in improving service while managing costs and environmental impacts.

**Key Initiatives:**
- Expand use of Road Weather Information Systems (RWIS)
- Pilot AI-optimized treatment recommendations
- Implement GPS-based material tracking
- Develop predictive snowplow routing tools

**🔗 AI in this Initiative**
[Link to: `/long-range-plan/ai-strategy#winter-ops`]

---

## Sample 4: Enterprise Knowledge & Productivity

### Goal Area: **Organizational Excellence**

**Initiative:** AI-Powered Knowledge Management

**Description:**
New AI tools help Iowa DOT staff find answers faster, draft documents more efficiently, and ramp up new employees quicker. These productivity enhancements free up time for higher-value work while maintaining quality and consistency.

**Key Initiatives:**
- Deploy AI document assistants for specifications and design
- Implement meeting summarization tools
- Create natural-language search for policies and manuals
- Build organizational knowledge base

**🔗 AI in this Initiative**
[Link to: `/long-range-plan/ai-strategy#productivity`]

---

## Sample 5: AI Governance & Guardrails

### Goal Area: **Digital Infrastructure & AI**

**Initiative:** Responsible AI Framework

**Description:**
Iowa DOT is establishing governance, ethical guardrails, and approval workflows to ensure all AI use aligns with public sector values. This framework defines risk tiers, requires human oversight, and maintains transparency about how and where we use AI.

**Key Initiatives:**
- Establish AI governance board and review process
- Define risk tiers for AI applications
- Create "Rapid Pilot Path" for 30/60/90-day trials
- Align with statewide IA AI initiative

**🔗 AI in this Initiative**
[Link to: `/long-range-plan/ai-strategy#governance`]

---

## Sample 6: Placard WITHOUT AI Connection

### Goal Area: **System Stewardship**

**Initiative:** Bridge Asset Management

**Description:**
Iowa DOT maintains over 4,000 state-owned bridges. Our asset management program uses regular inspections, condition data, and lifecycle cost models to prioritize preservation and replacement investments, ensuring safe and reliable infrastructure.

**Key Initiatives:**
- Complete biennial bridge inspections statewide
- Update bridge management system (BMS)
- Expand use of unmanned aerial systems for inspections
- Develop prioritization tools for capital programming

*(No AI connection - this is a traditional asset management program)*

---

## Writing Guidelines

### DO:
✅ Start with action verbs ("Modernizing," "Implementing," "Expanding")
✅ Use plain language, not jargon
✅ Connect AI explicitly to the work ("AI-assisted," "Predictive analytics")
✅ Show value: faster, safer, smarter, more efficient
✅ Keep it concise: 2-3 sentences description, 3-5 key bullets

### DON'T:
❌ Oversell AI as magic ("AI will solve everything")
❌ Use technical AI terms (neural networks, transformers, etc.)
❌ Claim AI replaces people ("fully automated," "no human needed")
❌ Hide AI use—be transparent
❌ Make promises you can't keep ("100% accurate," "zero errors")

---

## AI Chip Language Options

Choose language that fits your placard's tone:

**Option 1 (Recommended):**
```
🔗 AI in this Initiative
View related AI use cases
```

**Option 2 (More Technical):**
```
🤖 AI & Automation
See tools and pilots →
```

**Option 3 (Simple):**
```
🔗 Learn about AI use →
```

**Option 4 (Detailed):**
```
🔗 AI Tools & Guardrails
See how we're using AI responsibly in this work
```

---

## Crosswalk: Which Placards Get AI Chips?

Use this checklist to decide if a placard should have an AI connection:

### ✅ Yes - Show AI Chip:
- Traffic operations, incident management, 511
- Construction documentation, e-Construction
- Winter operations, plow routing, treatment decisions
- Document assistance, knowledge management
- AI governance, policy, or infrastructure
- Any placard with AI pilots or production tools

### ❌ No - Skip AI Chip:
- Traditional asset management (unless using predictive models)
- Policy programs without AI components
- Physical construction projects
- Routine maintenance activities
- Historical/archival initiatives

---

## Example Full Placard HTML

```html
<div class="placard">
    <div class="placard-header">
        <span class="goal-badge">Safety & Operations</span>
    </div>

    <h3 class="placard-title">Smarter Traffic Operations for Safer Travel</h3>

    <p class="placard-description">
        Iowa DOT is modernizing traffic management with real-time data,
        predictive analytics, and coordinated incident response. These tools
        help us detect incidents faster, manage traffic better during
        construction, and provide travelers with accurate, timely information.
    </p>

    <ul class="placard-bullets">
        <li>Expand statewide Traffic Management Center capabilities</li>
        <li>Enhance 511 traveler information with real-time updates</li>
        <li>Implement coordinated incident response protocols</li>
        <li>Deploy smart work zone management tools</li>
    </ul>

    <!-- AI Connection Chip -->
    <div class="ai-chip" onclick="goToAISection('operations')">
        🔗 AI in this Initiative
        <span class="ai-chip-subtitle">View related AI use cases</span>
    </div>
</div>
```

---

## Testing Checklist

Before publishing placards:

- [ ] Does the placard clearly explain the work (no AI jargon)?
- [ ] Is the AI connection relevant and honest?
- [ ] Does clicking the AI chip go to the right section?
- [ ] Does the target AI page section have matching content?
- [ ] Is the language consistent with other placards?
- [ ] Have stakeholders reviewed and approved?
- [ ] Mobile layout tested?
- [ ] Anchor link tested from desktop and mobile?

---

## Questions for Communications Team

When drafting placard copy, ask:

1. **What's the goal?** - Safety, stewardship, operations, excellence?
2. **Who's the audience?** - Public, legislators, staff, partners?
3. **What's the AI role?** - Pilot, production, aspirational?
4. **What's the value?** - Faster, safer, cheaper, smarter?
5. **What's the human role?** - Decision-maker, reviewer, expert?

---

## Next: Hand This to Your Comms Team

Your communications team can use these samples as templates, adapting the language to match Iowa DOT's voice and the specific Long Range Plan format.

**Key Message:**
> "We're not hiding AI—we're showing exactly where and how we use it, with links to the details, use cases, and governance guardrails."

---

**Ready to make AI a transparent, integrated part of your long-range story.** 📝✨
