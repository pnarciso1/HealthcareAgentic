# Team Tabs Navigation System

## Overview

The Team Tabs Navigation System provides a unified, consistent navigation experience across all pages of the HealthcareAgentic platform. It allows users to quickly switch between AI agents while maintaining context and providing easy access to user actions.

## Architecture

### Components

1. **Team Tabs Bar**: Horizontal navigation bar with agent tabs
2. **Action Bar**: Dedicated space for user actions (Contact Human, Logout)
3. **Future Agent Indicators**: Visual distinction for upcoming agents

### Layout Structure

```
[Header: Your AI Care Hub]
[Team Tabs: Ava] [Sam] [Riley] [John] [Lena*] [Nico*]
[Action Bar: Contact Human] [Logout]
[Page Content...]
```

## Active Agents

### Ava (Agent 1) - Quick Answers
- **Purpose**: Instant clarity on healthcare questions and billing terms
- **Status**: Free tier available
- **Icon**: Profile photo
- **Page ID**: `agent-1-page`

### Sam (Agent 2) - Bill & Claim Review
- **Purpose**: Medical bill analysis with AI-powered error detection
- **Status**: Premium tier required
- **Icon**: Profile photo
- **Page ID**: `agent-2-page`

### Riley (Agent 3) - Dispute Incorrect Bills
- **Purpose**: Professional dispute letter generation and tracking
- **Status**: Premium tier required
- **Icon**: Profile photo
- **Page ID**: `agent-3-page`

### John (Agent 4) - Appeal Insurance Denials
- **Purpose**: Insurance appeal packet creation and management
- **Status**: Premium tier required (coming soon)
- **Icon**: Profile photo
- **Page ID**: `agent-4-page`

## Future Agents

### Lena - Care Scheduling Assistant
- **Purpose**: Streamline appointment finding and scheduling
- **Icon**: ⚡ (lightning bolt)
- **Status**: Coming soon
- **Features**:
  - Locate in-network providers for specific specialties
  - Automate appointment scheduling
  - Sync with calendar and send reminders
  - Provide estimated out-of-pocket costs

### Nico - Urgent Care Navigator
- **Purpose**: Guide through unexpected medical situations and billing surprises
- **Icon**: 🚨 (warning sign)
- **Status**: Coming soon
- **Features**:
  - Find nearest in-network urgent care or ER
  - Provide coverage guidance before arriving
  - Review and verify bills for errors
  - Help with post-visit insurance claims

## Technical Implementation

### HTML Structure

```html
<!-- Team Tabs Navigation -->
<div class="team-tabs-container">
    <div class="team-tabs-bar" role="tablist" aria-label="AI Team Navigation">
        <button class="team-tab active" data-agent="ava" data-page="agent-1-page" role="tab" aria-selected="true" tabindex="0">
            <img src="img/agents/Ava.png" alt="Ava - Quick Answers" class="tab-avatar">
            <div class="tab-content">
                <div class="tab-name">Ava</div>
                <div class="tab-role">Quick Answers</div>
            </div>
        </button>
        <!-- Additional agent tabs... -->
    </div>
</div>

<!-- Action Bar -->
<div class="action-bar-container">
    <div class="action-bar">
        <button class="action-btn contact-human-btn" id="action-contact-human">
            <span class="action-icon">👤</span>
            <span class="action-text">Contact Human</span>
        </button>
        <button class="action-btn logout-btn" id="action-logout">
            <span class="action-icon">🚪</span>
            <span class="action-text">Logout</span>
        </button>
    </div>
</div>
```

### CSS Classes

#### Team Tabs
- `.team-tabs-container`: Main container with sticky positioning
- `.team-tabs-bar`: Horizontal flex container for tabs
- `.team-tab`: Individual agent tab button
- `.team-tab.active`: Active tab styling
- `.team-tab.future-agent`: Future agent styling with dashed borders
- `.tab-avatar`: Agent profile photo
- `.future-avatar`: Icon-based avatar for future agents
- `.future-badge`: "Future" indicator badge

#### Action Bar
- `.action-bar-container`: Main action bar container
- `.action-bar`: Horizontal flex container for actions
- `.action-btn`: Individual action button
- `.action-btn.contact-human-btn`: Contact Human button styling
- `.action-btn.logout-btn`: Logout button styling

### JavaScript Functionality

#### Core Functions

```javascript
// Update active tab state
function updateTeamTabsActiveState(pageId)

// Handle tab clicks
function handleTeamTabClick(event)

// Handle keyboard navigation
function handleTeamTabsKeyboard(event)

// Show future agent modal
function showFutureAgentModal(agentName)

// Initialize Team Tabs
function initializeTeamTabs()
```

#### Event Handling

- **Click Events**: Switch between agents, show future agent modals
- **Keyboard Navigation**: Arrow keys for tab navigation, Enter/Space for activation
- **Analytics Tracking**: Track tab switches, future agent interest, logout actions
- **Premium Gating**: Show upgrade prompts for locked agents

## Responsive Design

### Breakpoints

- **Desktop (1024px+)**: Full tabs with avatars, names, and roles
- **Tablet (768px-1024px)**: Smaller tabs with avatars and names
- **Mobile (768px-)**: Horizontal scrollable tabs with avatars and names only

### Mobile Optimizations

- Horizontal scrolling with snap points
- Hidden scrollbars for clean appearance
- Touch-friendly tap targets (minimum 44px)
- Optimized spacing and typography

## Accessibility Features

### ARIA Implementation

- `role="tablist"` on the tabs container
- `role="tab"` on individual tab buttons
- `aria-selected` for active tab indication
- `aria-label` for screen reader context

### Keyboard Navigation

- **Tab**: Move between interactive elements
- **Arrow Keys**: Navigate between tabs
- **Enter/Space**: Activate selected tab
- **Escape**: Close modals

### Focus Management

- Visible focus rings with brand colors
- Proper tab order management
- Focus restoration after modal interactions

## Analytics Integration

### Tracked Events

- `team_tabs_viewed`: When tabs are first rendered
- `team_tab_switched`: When switching between agents
- `future_agent_clicked`: When clicking future agents
- `contact_human_clicked`: When using Contact Human button
- `logout_clicked`: When logging out
- `upgrade_prompt`: When premium agents are locked

### Event Data

```javascript
// Example analytics event
trackUserBehavior('team_tab_switched', {
    toAgent: 'sam',
    toPage: 'agent-2-page',
    subscription_tier: 'free'
});
```

## Future Enhancements

### Planned Features

1. **Unread Indicators**: Show notification dots for agents with new activity
2. **Agent Status**: Real-time status indicators (online, busy, offline)
3. **Quick Actions**: Context-sensitive actions in agent tabs
4. **Customization**: User preferences for tab order and visibility
5. **Keyboard Shortcuts**: Quick access to specific agents

### Scalability

The system is designed to accommodate unlimited future agents:

- Dynamic tab generation
- Responsive overflow handling
- Efficient event delegation
- Modular CSS architecture

## Browser Support

- **Modern Browsers**: Full functionality with all features
- **Legacy Browsers**: Graceful degradation with basic functionality
- **Mobile Browsers**: Optimized touch interactions
- **Screen Readers**: Full ARIA support and semantic markup

## Performance Considerations

- **Lazy Loading**: Future agent modals loaded on demand
- **Event Delegation**: Efficient event handling for multiple tabs
- **CSS Transitions**: Hardware-accelerated animations
- **Minimal DOM Manipulation**: Optimized state updates

## Testing

### Manual Testing Checklist

- [ ] Tab switching works on all pages
- [ ] Active state updates correctly
- [ ] Keyboard navigation functions properly
- [ ] Future agent modals display correctly
- [ ] Action bar buttons work as expected
- [ ] Responsive design works on all devices
- [ ] Analytics events fire correctly
- [ ] Premium gating functions properly

### Automated Testing

- Unit tests for JavaScript functions
- Integration tests for tab switching
- Accessibility tests for ARIA compliance
- Visual regression tests for styling

## Troubleshooting

### Common Issues

1. **Tabs not switching**: Check `data-page` attributes and `showAppPage()` function
2. **Styling issues**: Verify CSS classes and responsive breakpoints
3. **Analytics not firing**: Check `trackUserBehavior()` function and Firebase configuration
4. **Keyboard navigation**: Ensure proper `tabindex` and ARIA attributes

### Debug Tools

- Browser developer tools for CSS/JavaScript debugging
- Firebase Analytics dashboard for event tracking
- Accessibility inspector for ARIA compliance
- Responsive design mode for mobile testing
