# DomBeacon (域灯) v1 Implementation Summary

## Overview

This document summarizes the implementation of DomBeacon (域灯) v1, transforming the original Domain Watchlist into a comprehensive domain operations console with action queue, authentication, and enhanced monitoring capabilities.

## Implementation Date

2026-05-03

## Git Commit History

1. **Initial baseline** - Created .gitignore and initial commit
2. **Product rename** - Renamed to DomBeacon (域灯) with updated branding
3. **Schema refactor** - Added watchKind, priority, actions table
4. **Scanner updates** - Added error tracking and PENDING_DELETE status
5. **Action queue** - Implemented action creation and management system
6. **Authentication** - Added optional password gate
7. **Domain APIs** - Updated CRUD APIs for new fields
8. **UI updates** - Enhanced components with Morandi aesthetic
9. **Documentation** - Updated README, env config, and docker-compose

## Key Features Implemented

### 1. Product Positioning

- **New Name**: DomBeacon (域灯) (formerly Domain Watchlist)
- **New Icon**: Radar icon (replacing Globe)
- **Bilingual Docs**: English + Chinese documentation in docs/README.md

### 2. Database Schema

**domains table additions**:
- `watch_kind` (OWNED | WANTED) - Distinguishes owned vs wanted domains
- `priority` (LOW | MEDIUM | HIGH) - Priority level for monitoring

**domain_status_latest additions**:
- `last_error` - Last scan error message
- `last_error_at` - Timestamp of last error

**New actions table**:
- Tracks actionable events requiring user attention
- Fields: domainId, actionType, status, priority, triggeredAt, snoozedUntil, resolvedAt, metadata
- Action types: WANTED_AVAILABLE, WANTED_DROPPING, OWNED_EXPIRING, SCAN_FAILED
- Action statuses: OPEN, SNOOZED, DISMISSED, RESOLVED

### 3. Scanner Enhancements

- **Status Change**: DROPPING → PENDING_DELETE (aligns with RDAP terminology)
- **Error Tracking**: Populates lastError and lastErrorAt on scan failures
- **Error Clearing**: Clears error fields on successful scans
- **Action Creation**: Auto-creates actions based on domain events

### 4. Action Queue System

**Core Utilities** (`server/utils/actions.ts`):
- `createAction()` - Creates actions with deduplication
- `updateActionStatus()` - Updates action status (snooze/dismiss/resolve)
- `getActionsWithDomains()` - Fetches actions with domain info joined
- `autoResolveSnoozedActions()` - Re-opens expired snoozes

**API Endpoints**:
- `GET /api/actions` - List actions (filterable by status, priority, domainId)
- `POST /api/actions` - Manually create action
- `PATCH /api/actions/[id]` - Update action status

**Integration**:
- Scanner automatically creates actions on status changes
- Actions inherit priority from domain
- Deduplication prevents duplicate open actions

### 5. Authentication System

**Server Middleware** (`server/middleware/auth.ts`):
- Checks ADMIN_PASSWORD environment variable
- If set, requires authentication for all non-auth routes
- If not set, authentication is disabled

**API Endpoints**:
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check auth status

**Client Middleware** (`middleware/auth.global.ts`):
- Redirects to /login if authentication required
- Skips auth check for /login page

**Login Page** (`pages/login.vue`):
- Clean Morandi aesthetic
- Radar icon branding
- Error handling

**Session Management**:
- HttpOnly cookie (7 day expiry)
- Secure flag in production
- SameSite: lax

### 6. Domain CRUD API Updates

**POST /api/domains**:
- Added watchKind field (default: WANTED)
- Added priority field (default: MEDIUM)

**GET /api/domains**:
- Added watchKind filter
- Added priority filter
- Returns watchKind and priority in response

**PUT /api/domains/[id]** (new):
- Update watchKind, priority, note, tags, group, isActive
- Validates watchKind (OWNED/WANTED)
- Validates priority (LOW/MEDIUM/HIGH)

### 7. UI Enhancements

**CSS Theme** (`assets/css/main.css`):
- Added color variables for watchKind, priority, actions
- Maintained Morandi color palette consistency

**AddDomainModal**:
- Added watchKind dropdown (Owned/Wanted)
- Added priority dropdown (Low/Medium/High)
- Grid layout for compact form

**DomainCard**:
- Shows watchKind and priority badges
- Priority-based left border accent (3px colored border)
- Updated status display (PENDING_DELETE)
- Maintained hover effects and transitions

**Actions Page** (`pages/actions.vue`):
- Card-based layout with priority borders
- Filter by status and priority
- Snooze/Dismiss/Resolve buttons
- Action type badges with color coding
- Metadata display (triggered time, snooze time, expiration)

**AppHeader**:
- Updated to Radar icon
- Added /actions navigation link

### 8. Documentation

**README.md**:
- Updated features list
- Added authentication section
- Added actions management guide
- Added API endpoint documentation
- Expanded usage instructions

**.env.example**:
- Added ADMIN_PASSWORD (optional)
- Changed DATABASE_URL → DATABASE_PATH
- Added comments explaining optional auth

**docker-compose.yml**:
- Updated image name to dombeacon
- Updated environment variables
- Added ADMIN_PASSWORD comment

**docs/README.md** (new):
- Comprehensive product documentation
- Bilingual (English + Chinese)
- Core concepts explanation
- Architecture overview
- Roadmap (v1.0, v1.1, v2.0)

**MIGRATION.md** (new):
- Database migration instructions
- Troubleshooting for better-sqlite3 issues
- Docker vs manual migration options

## Migration Notes

### Database Migration

The migration SQL is located at:
`server/db/migrations/0001_add_watchkind_priority_actions.sql`

**Changes**:
1. Add `watch_kind` and `priority` columns to `domains` table
2. Add `last_error` and `last_error_at` columns to `domain_status_latest` table
3. Create `actions` table with indexes

**Application**:
- Docker: Migration applied automatically on container start
- Manual: Run `node server/scripts/migrate.mjs` (requires better-sqlite3 compiled)
- Alternative: Use sqlite3 CLI to apply SQL directly

### Environment Variables

**Breaking Changes**:
- `DATABASE_URL` → `DATABASE_PATH` (format change)

**New Variables**:
- `ADMIN_PASSWORD` (optional) - Enables authentication

### API Changes

**Non-Breaking**:
- All existing endpoints remain compatible
- New fields (watchKind, priority) have defaults
- New endpoints added without affecting existing ones

## Testing Checklist

### Core Functionality
- [ ] Domain CRUD operations work
- [ ] Scanner runs and updates status
- [ ] Actions are created on status changes
- [ ] Action snooze/dismiss/resolve works
- [ ] Authentication works when ADMIN_PASSWORD set
- [ ] Authentication disabled when ADMIN_PASSWORD not set

### UI/UX
- [ ] Domain cards show watchKind and priority
- [ ] Priority border accent displays correctly
- [ ] Actions page loads and filters work
- [ ] Login page works and redirects properly
- [ ] Navigation includes /actions link
- [ ] Morandi color palette consistent throughout

### Docker
- [ ] Docker build succeeds
- [ ] Container starts successfully
- [ ] Database persists in volume
- [ ] Environment variables work
- [ ] Migration applies automatically

## Known Issues

1. **better-sqlite3 compilation**: Requires Visual Studio Build Tools on Windows for native module compilation. Docker environment has pre-compiled binaries.

2. **Migration in development**: If running locally without Docker, may need to manually apply migration SQL using sqlite3 CLI.

## Next Steps (Post-v1)

### Phase 2: Bilingual Support
- Add i18n for UI strings
- Language switcher in header
- Persist language preference

### Phase 3: Notification Channels
- Webhook support
- Server酱 integration
- Notification channel configuration UI

### Phase 4: Enhanced Monitoring
- SSL certificate monitoring
- Renewal cost tracking
- CSV import/export
- Action-first dashboard redesign

## Conclusion

DomBeacon (域灯) v1 successfully transforms the original Domain Watchlist into a comprehensive domain operations tool with:
- Clear distinction between owned and wanted domains
- Priority-based monitoring
- Action queue for event-driven workflows
- Optional authentication for production deployments
- Enhanced error tracking and resilience
- Consistent Morandi aesthetic throughout

All 10 implementation steps completed successfully with 9 git commits documenting the transformation.
