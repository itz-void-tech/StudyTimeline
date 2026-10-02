# StudyTimeline — Product Requirements Document

> **Version:** 1.0.0
> **Date:** 2026-09-26
> **Status:** Approved for MVP Development
> **Author:** Product & Engineering
> **Audience:** Implementing developers and AI coding agents

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Problem Statement](#2-problem-statement)
3. [Goals](#3-goals)
4. [Non-Goals](#4-non-goals)
5. [Target User](#5-target-user)
6. [Core User Stories](#6-core-user-stories)
7. [User Journey](#7-user-journey)
8. [Information Architecture](#8-information-architecture)
9. [Complete Page List](#9-complete-page-list)
10. [Detailed Page Requirements](#10-detailed-page-requirements)
11. [Video Player Architecture](#11-video-player-architecture)
12. [Timeline Architecture](#12-timeline-architecture)
13. [Segment System](#13-segment-system)
14. [Importance System](#14-importance-system)
15. [Revision Mode](#15-revision-mode)
16. [Playlist System](#16-playlist-system)
17. [Subject/Chapter System](#17-subjectchapter-system)
18. [Notes System](#18-notes-system)
19. [Search & Filtering](#19-search--filtering)
20. [Watch Progress](#20-watch-progress)
21. [Firebase Architecture](#21-firebase-architecture)
22. [Firestore Data Model](#22-firestore-data-model)
23. [Security Rules Strategy](#23-security-rules-strategy)
24. [Frontend Architecture](#24-frontend-architecture)
25. [Component Architecture](#25-component-architecture)
26. [State Management Strategy](#26-state-management-strategy)
27. [API / Service Layer](#27-api--service-layer)
28. [YouTube Integration](#28-youtube-integration)
29. [Error Handling](#29-error-handling)
30. [Accessibility](#30-accessibility)
31. [Responsive Design](#31-responsive-design)
32. [Performance Requirements](#32-performance-requirements)
33. [UX/UI Design System](#33-uxui-design-system)
34. [Empty States](#34-empty-states)
35. [Loading States](#35-loading-states)
36. [Error States](#36-error-states)
37. [MVP Definition](#37-mvp-definition)
38. [Future Roadmap](#38-future-roadmap)
39. [Acceptance Criteria](#39-acceptance-criteria)
40. [Development Phases](#40-development-phases)
41. [Testing Strategy](#41-testing-strategy)
42. [Potential Technical Risks](#42-potential-technical-risks)
43. [Mitigation Strategies](#43-mitigation-strategies)

---

## 1. Product Vision

**StudyTimeline** is a personal study-video management and revision application. It functions as a control layer on top of YouTube, giving a student the power to mark, label, prioritize, and replay the exact portions of long educational lectures that matter most.

YouTube provides the video. StudyTimeline provides:

| Capability | What it means |
|---|---|
| Organization | Lectures filed under subjects and chapters |
| Timestamp intelligence | Arbitrary start/end segments on any video |
| Importance | Five-level importance system driving all views |
| Revision | Time-constrained, importance-filtered playback |
| Notes | Per-lecture and per-segment annotations |
| Playlists | Custom groupings of lectures and segments |
| Progress | Persistent watch position and segment completion |
| Exam-focused filtering | Surface only what matters given limited time |

The application should feel like **a personal study cockpit**, not a generic productivity dashboard. It is minimal, fast, highly visual, and optimized for real studying sessions.

---

## 2. Problem Statement

A student studying from long YouTube lectures (2–6+ hours) faces these compounding problems:

| # | Problem | Current Workaround | Cost |
|---|---|---|---|
| P1 | Important moments are buried inside very long videos | Memorize or scribble timestamps on paper | Timestamps are lost; paper is unsearchable |
| P2 | No way to mark *why* a moment matters | Re-watch and re-evaluate before every exam | Hours wasted re-scanning entire lectures |
| P3 | No structured revision under time pressure | Open random videos and scrub manually | Inefficient, stressful, incomplete revision |
| P4 | No organization across subjects/chapters | Bookmarks folder or YouTube "Watch Later" | Flat list; no hierarchy; no importance metadata |
| P5 | Notes are disconnected from video position | Separate notebook or document | Cannot jump from a note back to the exact moment |

**Core insight:** The student already *knows* which moments are important while watching. They just lack a tool to capture that knowledge instantly and leverage it later.

---

## 3. Goals

### 3.1 Primary Goals (MVP)

| ID | Goal | Success Metric |
|---|---|---|
| G1 | Allow a student to mark arbitrary start/end segments on any YouTube lecture within seconds | Segment creation requires ≤ 3 clicks or 2 key presses |
| G2 | Visually represent all segments on a proportional timeline | Segments render at correct positions; click-to-seek works |
| G3 | Enable time-constrained, importance-filtered revision playback | User can generate a revision playlist in < 30 seconds |
| G4 | Persist all data reliably via Firebase | Zero data loss under normal operation; offline resilience |
| G5 | Organize lectures by subject and chapter | User can navigate Subject → Chapter → Lecture → Segments |
| G6 | Deliver a premium, dark-first, minimal UI | Visual fidelity matches the reference design |

### 3.2 Secondary Goals (MVP)

| ID | Goal |
|---|---|
| G7 | Custom playlists for grouping lectures |
| G8 | Per-lecture and per-segment notes |
| G9 | Global search across all entities |
| G10 | Dark and light theme toggle |
| G11 | Persistent watch progress with resume prompt |

---

## 4. Non-Goals

The following are explicitly **out of scope** for the MVP and must not be built, designed for, or referenced in the UI:

| Non-Goal | Rationale |
|---|---|
| User authentication / login | Personal-use app; no multi-user requirement yet |
| Public user profiles | No social layer |
| Social features (followers, comments, sharing) | Not a social platform |
| Multi-user collaboration | Single user |
| Admin dashboard | No administrative role |
| Subscription / payment system | Free personal tool |
| AI summarization / transcript analysis | Phase 2 feature |
| Automatic topic detection | Phase 2 feature |
| Recommendation algorithms | Phase 2 feature |
| Complex analytics dashboard | Unnecessary for personal use |
| Mobile native application | Web-only in MVP |
| Chrome extension | Phase 3 feature |
| Spaced repetition engine | Phase 2 feature |

---

## 5. Target User

### 5.1 Primary Persona

**Name:** The Exam-Prep Student

**Demographics:**
- Class 9–12 student (age 14–18)
- Studying through educational YouTube channels
- Preparing for school exams, boards, or competitive exams

**Subjects:** Physics, Chemistry, Biology, Mathematics, Geography, History, Computer Applications, English

**Behaviors:**
- Watches lectures 2–6+ hours long
- Identifies important derivations, numericals, diagrams, exam tricks, and key explanations while watching
- Needs to revisit specific explanations before exams
- Has limited revision time (often days or hours before an exam)
- Currently writes timestamps on paper or tries to remember them

**Technical context:**
- Primarily uses a Windows laptop or desktop for long study sessions
- Occasionally checks on a phone or tablet
- Comfortable with basic web applications
- Not a power user; needs simple, obvious UX

### 5.2 Key User Needs

| Priority | Need |
|---|---|
| P0 | Mark important moments instantly while watching |
| P0 | Jump to any marked moment in one click |
| P0 | Revise only what matters under time pressure |
| P1 | Organize lectures by subject and chapter |
| P1 | Attach notes to segments |
| P2 | Group lectures into custom playlists |
| P2 | Track what has been watched and revised |

---

## 6. Core User Stories

### 6.1 Segment Marking

| ID | Story | Priority |
|---|---|---|
| US-01 | As a student, I want to paste a YouTube URL and add it as a lecture so that I can begin marking segments. | P0 |
| US-02 | As a student, I want to press "Mark Start" to capture the current timestamp so that I don't need to remember or type it. | P0 |
| US-03 | As a student, I want to press "Mark End" to capture the end timestamp so that I define the segment boundaries without pausing. | P0 |
| US-04 | As a student, I want to assign a title, importance level, and optional note to a segment so that I can identify and prioritize it later. | P0 |
| US-05 | As a student, I want to press `M` twice (start, then end) as a keyboard shortcut so that marking is even faster. | P1 |
| US-06 | As a student, I want to edit a segment's timestamps, title, importance, and notes after creation so that I can correct mistakes. | P0 |
| US-07 | As a student, I want to delete a segment so that I can remove irrelevant markers. | P0 |

### 6.2 Timeline & Navigation

| ID | Story | Priority |
|---|---|---|
| US-08 | As a student, I want to see all segments on a visual timeline bar below the video so that I can see the lecture's structure at a glance. | P0 |
| US-09 | As a student, I want to click a segment on the timeline to jump to its start time so that I can navigate quickly. | P0 |
| US-10 | As a student, I want segments color-coded by importance so that I can visually distinguish critical from optional content. | P0 |
| US-11 | As a student, I want to hover over a segment on the timeline to see its title and time range so that I get context without clicking. | P1 |

### 6.3 Revision

| ID | Story | Priority |
|---|---|---|
| US-12 | As a student, I want to select a subject, chapter, importance levels, and available time to generate a revision playlist so that I study only what matters. | P0 |
| US-13 | As a student, I want revision playback to automatically jump between segments (skipping unimportant parts) so that I don't waste time. | P0 |
| US-14 | As a student, I want to see revision progress (current segment, total, remaining time) so that I can pace myself. | P0 |
| US-15 | As a student, I want to skip to the next/previous segment in revision mode so that I have control over playback. | P1 |

### 6.4 Organization

| ID | Story | Priority |
|---|---|---|
| US-16 | As a student, I want to create and manage subjects so that my lectures are organized by discipline. | P0 |
| US-17 | As a student, I want to create chapters within subjects so that my lectures follow a study sequence. | P0 |
| US-18 | As a student, I want to create custom playlists of lectures so that I can group them for specific purposes (e.g., "Pre-Exam Revision"). | P1 |
| US-19 | As a student, I want to search across all lectures, segments, subjects, and notes so that I can find anything quickly. | P1 |

### 6.5 Notes & Progress

| ID | Story | Priority |
|---|---|---|
| US-20 | As a student, I want to write notes on a lecture or segment so that I capture additional context. | P1 |
| US-21 | As a student, I want the app to remember where I stopped watching so that I can resume seamlessly. | P1 |
| US-22 | As a student, I want to see a "Continue from XX:XX:XX" prompt when I reopen a lecture so that I pick up where I left off. | P1 |

### 6.6 Settings & Theme

| ID | Story | Priority |
|---|---|---|
| US-23 | As a student, I want to toggle between dark and light themes so that I can study comfortably at any time of day. | P2 |
| US-24 | As a student, I want to set default playback speed and default importance level so that the app matches my preferences. | P2 |

---

## 7. User Journey

### 7.1 First-Time User Journey

```
Open StudyTimeline
        │
        ▼
 Dashboard (empty state)
  "Welcome! Add your first lecture to get started."
        │
        ▼
 Click [+ Add Lecture]
        │
        ▼
 Add Lecture modal opens
        │
        ▼
 Paste YouTube URL
        │
        ▼
 System extracts video ID → loads thumbnail, title, duration
        │
        ▼
 User sees video preview
        │
        ▼
 Select Subject (or create new)
        │
        ▼
 Select Chapter (or create new)
        │
        ▼
 Optionally select a Playlist
        │
        ▼
 Click [Add Lecture]
        │
        ▼
 Lecture appears in Library and Dashboard
        │
        ▼
 Click lecture card to open
        │
        ▼
 Video Player page loads
  - YouTube player embedded
  - Empty timeline bar below
  - Marking controls visible
        │
        ▼
 Student watches lecture
        │
        ▼
 Reaches important point → clicks [Mark Start]
  - Current time captured (e.g., 00:18:20)
  - "Start marked" indicator appears
        │
        ▼
 Continues watching
        │
        ▼
 Reaches end of important section → clicks [Mark End]
  - End time captured (e.g., 00:31:45)
  - Segment editor opens
        │
        ▼
 Enters:
  - Title: "Newton's Second Law Derivation"
  - Importance: Critical
  - Note: "Complete derivation from first principles"
        │
        ▼
 Clicks [Save Segment]
        │
        ▼
 Red segment block appears on the timeline at the correct position
        │
        ▼
 Repeat for more segments throughout the lecture
```

### 7.2 Revision Journey (Pre-Exam)

```
Open StudyTimeline
        │
        ▼
 Click [Revision Mode] in sidebar
        │
        ▼
 Revision Mode page loads
        │
        ▼
 Select Subject: Physics
        │
        ▼
 Select Chapter: Laws of Motion
        │
        ▼
 Select Importance: ☑ Critical  ☑ Very Important  ☐ Important  ☐ Useful  ☐ Optional
        │
        ▼
 System calculates:
  "5 segments • 19 min 40 sec estimated"
        │
        ▼
 Select Duration: 20 min
        │
        ▼
 System shows:
  "5 segments selected • 19 min 40 sec"
  Segment list with titles, importance badges, durations
        │
        ▼
 Click [Play Playlist]
        │
        ▼
 Revision playback begins
  - Segment 1 plays from its start time
  - At segment end, auto-seeks to Segment 2
  - Progress bar: "1 / 5 • Remaining: 14m 28s"
        │
        ▼
 Revision complete
  - "Revision Complete! You covered 5 segments in 19 min 40 sec."
  - [Return to Dashboard]  [Revise Again]
```

---

## 8. Information Architecture

```
StudyTimeline
├── Home (Dashboard)
│   ├── Greeting + Date
│   ├── Continue Learning
│   ├── Subjects Grid
│   ├── Recent Lectures
│   └── Quick Actions
│
├── Library
│   ├── Subjects List
│   │   ├── Subject Page
│   │   │   ├── Chapters Tab
│   │   │   ├── All Lectures Tab
│   │   │   └── Notes Tab
│   │   └── Chapter Page
│   │       ├── Lectures List
│   │       ├── Segments Summary
│   │       └── Notes
│   └── Lecture Page (Video Player)
│       ├── YouTube Player
│       ├── Segment Timeline
│       ├── Marking Controls
│       ├── Segment List Panel
│       └── Notes Panel
│
├── Playlists
│   ├── Playlists List
│   └── Playlist Detail
│       └── Lecture Cards
│
├── Revision Mode
│   ├── Filter Panel (Subject, Chapter, Importance, Duration)
│   ├── Revision Preview (segments list, total time)
│   └── Revision Playback
│       ├── Video Player
│       ├── Progress Indicator
│       └── Navigation Controls
│
├── Notes
│   ├── All Notes List
│   └── Note Editor
│
└── Settings
    ├── Appearance (Theme)
    ├── Color Scheme
    ├── YouTube Player Defaults
    └── Data Management
```

---

## 9. Complete Page List

| # | Page | Route | Description |
|---|---|---|---|
| 1 | Home / Dashboard | `/` | Overview with greeting, continue learning, subjects, recent lectures, quick actions |
| 2 | Library | `/library` | All subjects with lecture/chapter counts |
| 3 | Subject Detail | `/library/:subjectId` | Subject overview with chapters tab, all lectures tab, notes tab |
| 4 | Chapter Detail | `/library/:subjectId/:chapterId` | Lectures in chapter, progress, segments summary |
| 5 | Lecture (Video Player) | `/lecture/:lectureId` | Full video player page with timeline, segments, marking controls |
| 6 | Playlists | `/playlists` | All custom playlists |
| 7 | Playlist Detail | `/playlists/:playlistId` | Lectures and segments in a playlist |
| 8 | Revision Mode | `/revision` | Filter and configure revision session |
| 9 | Revision Playback | `/revision/play` | Active revision playback with auto-seeking |
| 10 | Notes | `/notes` | All notes, filterable by lecture/chapter |
| 11 | Settings | `/settings` | Theme, player defaults, data management |

**Modal overlays (not separate routes):**

| Modal | Trigger |
|---|---|
| Add Lecture | "+ Add Lecture" button from any page |
| Segment Editor | Mark End click or segment edit action |
| Create Subject | "New Subject" action in Add Lecture modal or Library |
| Create Chapter | "New Chapter" action in Add Lecture modal or Subject page |
| Create Playlist | "Create Playlist" action in Playlists page |
| Keyboard Shortcuts Help | `?` key press or help icon |
| Delete Confirmation | Any destructive action |

---

## 10. Detailed Page Requirements

### 10.1 Home / Dashboard
**Purpose:** Provide a focused landing page that surfaces the most actionable information and quick-start actions.
- Greeting Banner (Time-aware)
- Continue Learning (recent lecture with progress)
- Subjects Grid (with counts)
- Recent Lectures row
- Quick Actions

### 10.2 Library Page
**Purpose:** Top-level subject browser.
- Grid of subject cards showing lecture/chapter count
- New Subject creation

### 10.3 Subject Detail Page
**Purpose:** View all chapters and lectures for a given subject.
- Chapters tab
- All Lectures tab
- Notes tab

### 10.4 Chapter Detail Page
**Purpose:** View all lectures in a chapter with progress indicators.
- Lecture cards with thumbnail, title, segment count, duration
- Mini segment timeline preview

### 10.5 Lecture Page (Video Player)
Detailed specification in [Section 11: Video Player Architecture](#11-video-player-architecture).

### 10.6 Playlists Page
**Purpose:** Browse and manage custom playlists.

### 10.7 Playlist Detail Page
**Purpose:** View and manage lectures within a playlist.

### 10.8 Revision Mode Page
Detailed specification in [Section 15: Revision Mode](#15-revision-mode).

### 10.9 Notes Page
Detailed specification in [Section 18: Notes System](#18-notes-system).

### 10.10 Settings Page
- Theme toggle
- Color Scheme
- YouTube Player Defaults
- Data Export/Clear

---

## 11. Video Player Architecture

### 11.1 Purpose
The Video Player page is the centerpiece of StudyTimeline. It combines YouTube video playback, a custom visual timeline, real-time segment marking, and a segment management panel into a single cohesive interface.

### 11.2 Page Layout
- **Left:** Sidebar
- **Center:** YouTube IFrame Player (16:9), below it the Visual Timeline and Marking Controls
- **Right:** Segments Panel

### 11.3 Component Breakdown
- **YouTube IFrame Player:** Embedded via YouTube IFrame Player API
- **Visual Timeline:** Custom-rendered timeline bar. Full specification in [Section 12](#12-timeline-architecture).
- **Marking Controls:** `[⌐ Mark Start]` `[⌐ Mark End]` `[+ Add Segment]`
- **Segments Panel:** Scrollable list of segments

### 11.4 Segments Panel
- Color dot, title, duration, play button
- Active segment is highlighted based on video time.

### 11.5 Player State Synchronization
- Polled at 1-second intervals to highlight the active segment and update the progress bar.

---

## 12. Timeline Architecture

### 12.1 Purpose
The timeline is a custom-rendered horizontal bar that visually represents all marked segments on the video's time axis.

### 12.2 Visual Design
Segments are represented as colored blocks inside a timeline track.

### 12.3 Rendering Calculations
All positions MUST be calculated as normalized proportions:
```typescript
const left = (segment.startTime / videoDuration) * 100;
const width = ((segment.endTime - segment.startTime) / videoDuration) * 100;
```

### 12.4 Overlapping Segments
The timeline uses multi-lane rendering for overlapping segments to prevent visual collision. Max 3 lanes visible before showing "+N more" indicator.

### 12.5 Interactions
- Hover: tooltip info
- Click: seek video
- Click empty area: seek to that percentage

---

## 13. Segment System

### 13.1 Purpose
Segments are the fundamental data unit, representing a contiguous time range.

### 13.2 Marking Workflow (Mouse & Keyboard)
- Click `[⌐ Mark Start]` -> Capture current time
- Click `[⌐ Mark End]` -> Capture end time and open Segment Editor
- Keyboard: `M` to toggle start/end marking.

### 13.3 Segment Editor
Modal containing Title, Importance, Start Time, End Time, Notes.

---

## 14. Importance System

### 14.1 Purpose
Five-level classification driving visual representation, filtering, and revision playlists.

### 14.2 Levels
1. **Critical (🔴 Red)**: Must revise before exam
2. **Very Important (🟠 Orange)**: Should revise
3. **Important (🟡 Yellow)**: Worth revising if time permits
4. **Useful (🟢 Green)**: Helpful but not essential
5. **Optional (🔵 Blue)**: Nice to have

---

## 15. Revision Mode

### 15.1 Purpose
Generate a time-constrained, importance-filtered playlist of segments from across the library.

### 15.2 Playlist Generation Algorithm
1. Filter segments by Subject, Chapter, Importance.
2. Sort by Importance (Critical first), then chronological order.
3. Include segments until `maxDuration` is reached.

### 15.3 Revision Playback
Plays segments back-to-back. Auto-seeks to the next segment when the current one ends. Loads new videos if crossing lectures.

---

## 16. Playlist System & 17. Subject/Chapter System
Hierarchical organization (Subject -> Chapter -> Lecture) and custom Playlists (arbitrary grouping of lectures).

---

## 18. Notes System
Notes tied to a Subject, Chapter, Lecture, or specific Segment. Supports basic rich-text/Markdown formatting.

---

## 19. Search & Filtering
Global Search (`Ctrl+K`) across all entities.

---

## 20. Watch Progress
Persisted playback position using debounced Firestore writes (every 30s or on pause).

---

## 21. Firebase Architecture

### 21.1 Firebase Config

The following config is explicitly set for the MVP. It uses standard web initialization:

```javascript
// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyByr9Q0SaRM1IaACBBGHW49OzNp44T3eW8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "studytimeline-38100.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "studytimeline-38100",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "studytimeline-38100.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "990731387262",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:990731387262:web:3b73f1d240d846c0d6732f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XPRSBB58FJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  console.warn('Firestore persistence error:', err);
});
```

*(Environment variables should be preferred, but fallback to provided values is set up.)*

---

## 22. Firestore Data Model
- `subjects/{subjectId}`
- `chapters/{chapterId}`
- `lectures/{lectureId}`
- `segments/{segmentId}`
- `playlists/{playlistId}`
- `notes/{noteId}`
- `settings/app_settings`

All top-level collections for easier cross-querying (crucial for Revision Mode).

---

## 23. Security Rules Strategy
MVP: Open read/write.
Future: Scoped to authenticated user IDs via Firebase Auth.

---

## 24. Frontend Architecture
- **React + TypeScript + Vite + Tailwind CSS**
- Firebase JS SDK
- React Router

---

## 25. Component Architecture
Component modularity focusing on container vs. presentational components (e.g. `Timeline`, `SegmentEditor`).

---

## 26. State Management Strategy
- React `useState`/`useContext` for local/shared state.
- Custom hooks encapsulating Firestore queries and realtime listeners (`useSegments`, `useLecture`).

---

## 27. API / Service Layer
Isolated functions handling Firestore operations (e.g., `lectureService.ts`, `segmentService.ts`). Uses batch writes for atomic updates.

---

## 28. YouTube Integration
- Use `https://www.youtube.com/iframe_api` dynamically.
- Parse video IDs with RegEx.
- Use `oEmbed` API for video titles without needing an API key.
- Wait for `onReady` to fetch video duration.

---

## 29. Error Handling
- Inline validation.
- Non-blocking toast notifications for network errors.
- Contextual YouTube player error handling (e.g., if embedding is disabled).

---

## 30. Accessibility
Keyboard navigation, focus rings, semantic HTML, ARIA labels, and not relying on color alone for importance.

---

## 31. Responsive Design
- Desktop XL (1440px+) primary target.
- Adapts down to mobile with a bottom navigation bar, collapsed sidebar, and flexible timeline layout.

---

## 32. Performance Requirements
- Debounced writes (watch progress, search input, note auto-saving).
- Code splitting / Lazy loading.
- Memoization where necessary (e.g., Timeline position calculations).

---

## 33. UX/UI Design System
Dark mode first (`#0A0F1E` primary background, `#3B82F6` accent). Consistent use of importance colors (`#EF4444` for Critical).

---

## 34. Empty States & 35. Loading States
Designed placeholders for all lists and pages when data is missing or loading.

---

## 36. Error States
Recovery flows for offline state, disconnected DB, and missing lectures.

---

## 37. MVP Definition
Includes: Dashboard, Add Lecture, Embedded Player, Segment Marking, Importance, Timeline, Revision Mode, Progress, Playlists, Notes, Global Search.
Excludes: Auth, Sharing, AI Summarization, Complex Analytics.

---

## 38. Future Roadmap
- Phase 2: AI Segment suggestions, flashcards, spaced repetition.
- Phase 3: Chrome extension, Mobile PWA.
- Phase 4: Multi-user auth, playlist sharing.

---

## 39. Acceptance Criteria
- Full E2E flows functional (Marking -> Saving -> Visualizing -> Revising).
- No hardcoded data (outside of config placeholders).
- Responsive UI on all breakpoints.

---

## 40. Development Phases
1. Foundation (Setup, UI primitives, Firebase)
2. Core Video Experience (Player, Timeline, Segments)
3. Organization & Revision
4. Polish (Notes, Search, Settings)
5. QA & Deploy

---

## 41. Testing Strategy
Unit tests for utilities (`time`, `timeline`, `youtube`). Component tests for core logic (`SegmentEditor`, `Timeline`). Manual QA checklist.

---

## 42. Potential Technical Risks & 43. Mitigation Strategies
- **Risk:** YouTube API limits or disabled embedding. **Mitigation:** Graceful degradation, provide "Watch on YouTube" fallback links.
- **Risk:** Firestore complex query limitations. **Mitigation:** Client-side processing for complex Revision filters.
- **Risk:** Data loss. **Mitigation:** Data export to JSON option.

---

*End of PRD — Version 1.0.0*
