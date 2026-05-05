# DomBeacon (域灯) v1 Verification Checklist

## Pre-Deployment Checklist

### Database Schema
- [x] domains table has watch_kind column
- [x] domains table has priority column
- [x] domain_status_latest has last_error column
- [x] domain_status_latest has last_error_at column
- [x] actions table exists with all required columns
- [x] Indexes created for actions table
- [ ] Migration SQL tested on fresh database
- [ ] Migration SQL tested on existing database

### API Endpoints
- [x] GET /api/domains supports watchKind filter
- [x] GET /api/domains supports priority filter
- [x] POST /api/domains accepts watchKind and priority
- [x] PUT /api/domains/[id] updates domain fields
- [x] GET /api/actions returns actions with domain info
- [x] POST /api/actions creates actions
- [x] PATCH /api/actions/[id] updates action status
- [x] POST /api/auth/login authenticates user
- [x] GET /api/auth/status checks auth state
- [x] POST /api/auth/logout clears session

### Scanner & Tasks
- [x] Scanner uses PENDING_DELETE instead of DROPPING
- [x] Scanner populates lastError on failures
- [x] Scanner clears lastError on success
- [x] Scanner creates WANTED_AVAILABLE actions
- [x] Scanner creates WANTED_DROPPING actions
- [x] Scanner creates OWNED_EXPIRING actions
- [x] Scanner creates SCAN_FAILED actions
- [x] Action deduplication prevents duplicates

### Authentication
- [x] Auth middleware checks ADMIN_PASSWORD
- [x] Auth disabled when ADMIN_PASSWORD not set
- [x] Login page accessible without auth
- [x] Protected routes redirect to login
- [x] Session cookie set on successful login
- [x] Logout clears session cookie

### UI Components
- [x] AppHeader shows Radar icon
- [x] AppHeader has /actions link
- [x] AddDomainModal has watchKind dropdown
- [x] AddDomainModal has priority dropdown
- [x] DomainCard shows watchKind badge
- [x] DomainCard shows priority badge
- [x] DomainCard has priority border accent
- [x] DomainCard shows PENDING_DELETE status
- [x] Actions page displays actions
- [x] Actions page has status filter
- [x] Actions page has priority filter
- [x] Actions page has snooze button
- [x] Actions page has dismiss button
- [x] Actions page has resolve button

### Documentation
- [x] README updated with new features
- [x] .env.example has ADMIN_PASSWORD
- [x] docker-compose.yml updated
- [x] docs/README.md created
- [x] MIGRATION.md created
- [x] IMPLEMENTATION.md created

## Testing Checklist

### Manual Testing

#### Authentication Flow
- [ ] Start app without ADMIN_PASSWORD → should access all pages
- [ ] Set ADMIN_PASSWORD → should redirect to /login
- [ ] Login with wrong password → should show error
- [ ] Login with correct password → should redirect to /domains
- [ ] Access protected route → should stay logged in
- [ ] Logout → should redirect to /login
- [ ] Try to access protected route after logout → should redirect to /login

#### Domain Management
- [ ] Add domain with WANTED + HIGH priority
- [ ] Add domain with OWNED + MEDIUM priority
- [ ] Verify domains show correct badges
- [ ] Verify priority border accent displays
- [ ] Filter domains by watchKind
- [ ] Filter domains by priority
- [ ] Update domain watchKind via API
- [ ] Update domain priority via API

#### Action Queue
- [ ] Manually create action via API
- [ ] Verify action appears in /actions page
- [ ] Filter actions by status
- [ ] Filter actions by priority
- [ ] Snooze action → verify status changes to SNOOZED
- [ ] Dismiss action → verify status changes to DISMISSED
- [ ] Resolve action → verify status changes to RESOLVED
- [ ] Verify duplicate actions are prevented

#### Scanner Integration
- [ ] Add WANTED domain that's AVAILABLE
- [ ] Trigger scan → verify WANTED_AVAILABLE action created
- [ ] Add WANTED domain that's PENDING_DELETE
- [ ] Trigger scan → verify WANTED_DROPPING action created
- [ ] Add OWNED domain that's EXPIRING
- [ ] Trigger scan → verify OWNED_EXPIRING action created
- [ ] Cause scan to fail → verify SCAN_FAILED action created
- [ ] Verify lastError populated on failure
- [ ] Verify lastError cleared on success

### Docker Testing
- [ ] Build Docker image successfully
- [ ] Start container with docker-compose
- [ ] Verify app accessible on port 3000
- [ ] Verify database persists in ./data volume
- [ ] Verify environment variables work
- [ ] Stop and restart container → verify data persists

### Performance Testing
- [ ] Add 100 domains → verify UI remains responsive
- [ ] Create 50 actions → verify /actions page loads quickly
- [ ] Run hourly scan with 100 domains → verify completes in reasonable time
- [ ] Check database size after 1 week of operation

## Known Issues

### better-sqlite3 Compilation
- **Issue**: better-sqlite3 requires Visual Studio build tools on Windows
- **Workaround**: Use Docker (pre-compiled binaries) or install VS Build Tools
- **Status**: Documented in MIGRATION.md

### Migration Application
- **Issue**: Migration requires better-sqlite3 to be compiled
- **Workaround**: Apply migration via Docker or manual SQL execution
- **Status**: Migration script and SQL file provided

## Deployment Recommendations

### Production Checklist
- [ ] Set strong ADMIN_PASSWORD
- [ ] Configure SMTP settings via /settings
- [ ] Set up data volume backup
- [ ] Configure BASE_URL to production domain
- [ ] Enable HTTPS (reverse proxy recommended)
- [ ] Set up monitoring for task execution
- [ ] Configure log rotation
- [ ] Test email notifications
- [ ] Document recovery procedures

### Security Considerations
- [ ] ADMIN_PASSWORD is strong (16+ chars, mixed case, numbers, symbols)
- [ ] Session cookie uses secure flag in production
- [ ] HTTPS enabled for production deployment
- [ ] Database file permissions restricted
- [ ] Regular backups configured
- [ ] Rate limiting considered for API endpoints

### Monitoring
- [ ] Set up alerts for scan failures
- [ ] Monitor action queue growth
- [ ] Track database size
- [ ] Monitor email delivery success rate
- [ ] Log task execution times

## Post-Deployment Validation

### Week 1
- [ ] Verify hourly scans running
- [ ] Verify actions being created
- [ ] Verify email notifications working
- [ ] Check for any error logs
- [ ] Validate database integrity

### Week 2
- [ ] Review action queue patterns
- [ ] Optimize scan frequency if needed
- [ ] Adjust notification rules based on feedback
- [ ] Check database growth rate

### Month 1
- [ ] Analyze action resolution rates
- [ ] Review scanner error patterns
- [ ] Optimize RDAP server selection
- [ ] Plan for v1.1 features

## Success Criteria

- [x] All core features implemented
- [x] Code committed to git
- [x] Documentation complete
- [ ] Manual testing passed
- [ ] Docker build successful
- [ ] Production deployment successful
- [ ] No critical bugs in first week

## Next Steps

1. Complete manual testing checklist
2. Build and test Docker image
3. Deploy to staging environment
4. Run for 1 week in staging
5. Deploy to production
6. Monitor for 1 week
7. Plan v1.1 features (SSL monitoring, CSV import/export)
