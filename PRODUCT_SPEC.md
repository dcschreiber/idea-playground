# Idea Playground - Product Specification

## Overview
Idea Playground is a kanban-style React TypeScript application for managing and exploring ideas with markdown editing capabilities. The focus is on organizing ideas by their readiness level and providing an intuitive editing experience.

## Core Features

### 1. Kanban Board Interface
- **Single View**: Kanban board
- **Readiness Columns**: Defined by the "readiness" field in dimensions.json
- **Card Display**: Each idea shows title, content preview, and dimension tags
- **Drag & Drop**: Reorder ideas within the same readiness column or move to other columns

### 2. Modal Editor
- **Primary Mode**: Live preview with in-place editing capability
- **Markdown Support**: Full markdown rendering with real-time preview
- **Editable**: Show preview in a way that is editable
- **Fullscreen Mode**: Toggle for distraction-free editing - Opens a new page that also allows editing the dimentions
- **Auto-save**: Changes persist immediately to backend - No need for save button
- **Keyboard Shortcuts**: Standard markdown editor shortcuts

### 3. Idea Management
- **Create**: "New Idea" button opens modal with title validation workflow
- **Edit**: Click any card to open in modal editor
- **Save**: Real-time saving to backend API
- **Delete**: Available only in full screen editing page
- **Metadata**: Title, content, dimensions, connections, order

#### New Idea Creation Workflow
1. **Title Entry Phase**: Modal opens with focus on title input field
   - User must enter a unique title before proceeding to editing
   - Real-time validation against existing idea titles
   - Visual feedback for validation state (valid/invalid/checking)
   - "Continue" button enabled only when title is unique and non-empty
2. **Editing Phase**: After unique title validation passes
   - Automatically transitions to full editing mode
   - Default content template populated
   - Auto-save enabled with 2-second debounce
   - All dimension editing capabilities available

### 4. Dimensions System
- **Field/Topic**: Categorical classification (AI Infrastructure, DevOps, EdTech, Startup Ideas, etc.)
- **Readiness Level**: determining column placement
- **Complexity Level**: 1-10 scale (Trivial to Fundamental)
- **Connected Ideas**: Link to other ideas with strength percentage
- **Visual Tags**: Color-coded badges for each dimension
- **Editable**: Any dimention that doesn't determin card position on kanban (or elsewhere) should be editable from a Dimensions page

#### Available Field Categories
- AI Infrastructure
- DevOps
- EdTech
- Legal/Policy
- Network Security
- Philosophy
- QA/Testing
- Software Architecture
- **Startup Ideas** - For entrepreneurial and business-focused ideas
- UI/UX Engineering

### 5. Filtering System
- **Field Filter**: Dropdown to filter by topic/field
- **Readiness Filter**: Filter by readiness range
- **Complexity Filter**: Filter by complexity range  
- **Clear All**: Reset all filters button
- **Real-time**: Filters apply immediately

### 6. Backend Integration
- **API Server**: Express.js on Google Cloud Run
- **Data Storage**: Cloud Firestore (NoSQL database)
- **Endpoints**: CRUD operations, reordering, filtering, title validation
- **Persistence**: All changes saved to Firestore with automatic scaling

#### Title Validation API
- **Endpoint**: `GET /api/ideas/validate-title?title={encoded_title}`
- **Response**: `{ isUnique: boolean, conflictingId?: string }`
- **Behavior**: Case-insensitive comparison, excludes current idea when editing

### 7. Enhanced Drag & Drop Experience
- **Entire Card Draggable**: Full idea card is draggable, not just a small handle
- **Visual Drag Feedback**: 
  - Cards show rotation and scaling during drag
  - Drag overlay with enhanced shadow and border styling
  - Smooth transitions with 150ms easing
- **Drop Zone Indicators**:
  - Columns highlight with blue border and background when dragged over
  - Empty columns show "Drop ideas here" message during drag
  - Dashed border animation for valid drop targets
  - Visual feedback differentiates between same-column reordering and cross-column moves
- **Cross-Column Drag Support**: 
  - Ideas can be dragged between readiness columns
  - Automatically updates readiness level to match target column
  - Supports dropping on empty columns or between existing cards
- **Accessibility**: 
  - Keyboard navigation support for drag operations
  - Proper cursor states (grab/grabbing)
  - Screen reader compatible drag and drop
- **Performance**: 
  - Smooth 60fps animations
  - Optimized re-renders during drag operations
  - Collision detection for precise drop targeting

### 8. Search Filter
- **Title Search**: A text input above the kanban board allows users to filter ideas by title
- **Case-insensitive**: Matches any part of the title, ignoring case
- **Real-time**: Results update as the user types (no submit button)
- **No interaction with other filters**: Works independently of field/readiness/complexity filters
- **Clearable**: Clearing the input restores the full list of ideas
- **UI**: Input should have placeholder text (e.g., "Search by title...") and `data-testid="search-title-input"` for testing

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Markdown Editor**: @uiw/react-markdown-editor
- **Drag & Drop**: @dnd-kit
- **UI Components**: @headlessui/react
- **Icons**: @heroicons/react

### Backend Stack
- **Server**: Express.js on Google Cloud Run
- **Database**: Cloud Firestore (NoSQL)
- **CORS**: Enabled for frontend communication
- **Authentication**: Firebase Authentication (ready for future implementation)
- **Hosting**: Firebase Hosting (Frontend), Google Cloud Run (Backend)

### Data Structure
```typescript
interface Idea {
  title: string;
  content: string; // Markdown
  dimensions: {
    field: string;
    readiness: number; // 1-10
    complexity: number; // 1-10
    potentially_connected_idea: {
      idea: string;
      relation_strength: number; // 0-1
    } | null;
  };
  sub_ideas: string[];
  order: number;
}
```

## User Experience

### Primary Workflow
1. **Browse Ideas**: View kanban board with all ideas organized by readiness
2. **Filter Content**: Use filters to focus on specific topics or complexity
3. **Edit Ideas**: Click card → modal opens in preview mode → edit in-place
4. **Create Ideas**: Click "New Idea" → title validation → editing mode with auto-save
5. **Organize**: Drag cards within columns to reorder by priority

### New Idea Creation Experience
1. **Initial State**: Modal opens with large title input field and "Continue" button (disabled)
2. **Title Entry**: User types title with real-time uniqueness validation
   - Red border + error message if title exists
   - Green border + checkmark when title is unique
   - "Continue" button enables only with valid unique title
3. **Transition**: Click "Continue" → automatically enter editing mode
4. **Editing**: Full editor with populated default content and auto-save active

### Modal Editor Behavior
- **Default State**: Preview mode showing rendered markdown
- **Editing**: Click anywhere in preview to start editing that section
- **Live Preview**: Changes reflect immediately in preview pane
- **Toolbar**: Markdown formatting buttons available
- **Navigation**: Easy switching between sections
- **Save**: Auto-save

### Responsive Design
- **Desktop First**: Optimized for desktop workflow
- **Horizontal Scroll**: Kanban columns scroll horizontally on smaller screens
- **Modal Responsive**: Full-screen on mobile, centered on desktop

## Testing Strategy

### E2E Tests (Playwright)
- **Data Independent**: Use mocked/fixture data, not production data
- **Core Flows**: 
  - Kanban board displays correctly
  - Modal opens and closes
  - Editing works (preview → edit → save)
  - Filtering functions
  - New idea creation
  - Drag and drop reordering
- **No Data Dependencies**: Tests should not rely on specific idea content

### Test Data
- **Fixtures**: Consistent test data for reliable assertions
- **Mocking**: Mock API responses for predictable test results
- **Isolation**: Each test independent of others

## Performance Requirements
- **Load Time**: < 2 seconds initial page load
- **Modal Open**: < 500ms to open modal
- **Save Response**: < 1 second for save operations
- **Filter Response**: < 200ms for filter application
- **Drag Feedback**: < 100ms visual feedback for drag operations

## Accessibility
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Contrast**: WCAG AA compliant color combinations

## Browser Support
- **Modern Browsers**: Chrome (latest 2 versions)
- **JavaScript**: ES2020+ features
- **CSS**: CSS Grid, Flexbox, CSS Variables

## Development Guidelines
- **TypeScript**: Strict mode enabled, no any types
- **Code Style**: ESLint + Prettier configuration
- **Components**: Functional components with hooks
- **State Management**: React hooks (useState, useEffect)
- **API Layer**: Centralized service layer for backend communication

## Future Enhancements
- **Export**: Export ideas to various formats (PDF, Markdown)