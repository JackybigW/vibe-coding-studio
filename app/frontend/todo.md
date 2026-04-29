# Vibe Coding Studio Platform - Full Feature Implementation Plan

## Design Guidelines (Existing)
- **Theme**: Dark mode (#09090B background, #18181B cards, #27272A borders)
- **Accent**: Purple gradient (#7C3AED → #A855F7)
- **Typography**: System fonts, clean and modern
- **Components**: shadcn/ui based

## Implementation Strategy
Due to the massive scope (17 features), we'll implement MVP versions of each feature group.
Focus on making the workspace FUNCTIONAL rather than pixel-perfect.

## Files to Create/Modify (max 8 new files + modifications)

### New Pages
1. `src/pages/Dashboard.tsx` — Project list dashboard with create/delete projects
2. `src/pages/ProjectWorkspace.tsx` — Full functional workspace with real AI chat, Monaco editor, live preview, terminal
3. `src/pages/Settings.tsx` — User settings, account info, API keys
4. `src/pages/Explore.tsx` — Community explore page with public projects

### New Components  
5. `src/components/ChatPanel.tsx` — Real AI chat with SSE streaming, markdown rendering, file upload
6. `src/components/CodeEditor.tsx` — Monaco Editor integration with file tree, multi-tab
7. `src/components/ProjectCard.tsx` — Project card for dashboard grid

### Backend
8. Create database tables: projects, messages, project_files
9. Create edge function: ai-chat (SSE streaming with LLM)
10. Create edge function: project-files (CRUD for project files)

### Modifications
- `src/App.tsx` — Add new routes
- `src/components/Navbar.tsx` — Add Dashboard link
- `src/pages/Index.tsx` — Update CTA buttons to link to dashboard

## Task Breakdown

### Phase 1: Database & Backend Setup
- [x] user_profiles table exists
- [ ] Create projects table
- [ ] Create messages table  
- [ ] Create project_files table
- [ ] Create ai-chat edge function (SSE streaming)

### Phase 2: Dashboard & Project Management
- [ ] Dashboard page with project grid
- [ ] Create project dialog
- [ ] Delete project
- [ ] ProjectCard component

### Phase 3: Functional Workspace
- [ ] ChatPanel with real AI streaming
- [ ] Monaco CodeEditor with file tree
- [ ] Live preview iframe
- [ ] Terminal output display
- [ ] File upload support

### Phase 4: Settings & Explore
- [ ] Settings page (account, plan, credits history)
- [ ] Explore page (public projects grid)

### Phase 5: Advanced Features (simplified MVP)
- [ ] LLM model selector in chat
- [ ] Mode toggle (Engineer/Team)
- [ ] Responsive preview toggle
- [ ] Share project dialog
- [ ] Stripe payment link on pricing
