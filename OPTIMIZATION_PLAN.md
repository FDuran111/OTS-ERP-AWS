# OTS-ERP Optimization Plan

## Executive Summary
Performance audit completed on 2025-10-20. Found 4 critical issues that are significantly impacting performance.

---

## Critical Issues Found

### 🔴 CRITICAL #1: Caching Completely Disabled
**File**: `next.config.ts:42-63`
**Impact**: SEVERE - Every page/asset loads from scratch every time
**Fix Time**: 15 minutes
**Performance Gain**: 50-80% faster page loads

### 🔴 CRITICAL #2: Large Bundle Size (26MB)
**Issue**: Static bundle is 26MB, should be <5MB
**Impact**: HIGH - Slow initial page loads, especially on mobile
**Fix Time**: 2-3 hours
**Performance Gain**: 40-60% faster initial load

### 🔴 CRITICAL #3: Inefficient Database Queries
**Found**: 514 aggregate queries across 82 API routes
**Issues**:
- Likely N+1 query problems
- Missing database indexes
- No query result caching
**Impact**: HIGH - Slow API responses, especially with data growth
**Fix Time**: 1-2 days
**Performance Gain**: 2-5x faster API responses

### 🟡 MODERATE #4: Small Connection Pool
**File**: `src/lib/db.ts:30,42`
**Issue**: Only 10 database connections max
**Impact**: MODERATE - May cause connection waits under load
**Fix Time**: 5 minutes
**Performance Gain**: Better handling of concurrent requests

---

## Phase 1: Quick Wins (TODAY - 3-4 hours total)

### Step 1: Fix Caching (15 mins)
- [ ] Update `next.config.ts` to enable proper caching
- [ ] Add cache headers for static assets
- [ ] Keep no-cache only for API routes that need real-time data

### Step 2: Bundle Analysis (30 mins)
- [ ] Install `@next/bundle-analyzer`
- [ ] Generate bundle report
- [ ] Identify largest dependencies

### Step 3: Bundle Optimization (2 hours)
- [ ] Implement dynamic imports for large components
- [ ] Move Material UI to proper tree-shaking
- [ ] Lazy load charts and heavy components
- [ ] Split admin/employee bundles

### Step 4: Database Connection Pool (5 mins)
- [ ] Increase pool size from 10 to 20-30
- [ ] Add connection pooling stats logging

### Step 5: Enable Query Logging (15 mins)
- [ ] Log slow queries (>500ms) in production
- [ ] Add query duration tracking

**Expected Impact After Phase 1**:
- 50-70% faster page loads
- 30-40% smaller initial bundle
- Better visibility into database performance

---

## Phase 2: Database Optimization (1-2 days)

### Step 1: Analyze Slow Queries (2 hours)
- [ ] Review the 82 files with aggregate queries
- [ ] Identify N+1 query patterns
- [ ] Profile top 10 slowest queries

### Step 2: Add Database Indexes (3-4 hours)
Critical indexes needed:
- [ ] `TimeEntry(userId, date)`
- [ ] `TimeEntry(jobId, status)`
- [ ] `Job(customerId, status)`
- [ ] `JobAssignment(userId, jobId)`
- [ ] `CrewAssignment(userId, scheduleId)`
- [ ] `Material(category, active)`
- [ ] `MaterialLocationStock(materialId, storageLocationId)`

### Step 3: Optimize Critical Queries (4-6 hours)
Focus on:
- [ ] Dashboard stats queries
- [ ] Time entry listing with materials
- [ ] Job listing with assignments
- [ ] Material inventory queries
- [ ] Reports/analytics queries

### Step 4: Implement Query Caching (2-3 hours)
- [ ] Add Redis or in-memory cache
- [ ] Cache dashboard stats (5 min TTL)
- [ ] Cache material inventory (1 min TTL)
- [ ] Cache user permissions (10 min TTL)

**Expected Impact After Phase 2**:
- 2-5x faster API response times
- 70-90% reduction in database load
- Can handle 5-10x more users

---

## Phase 3: Advanced Optimizations (3-5 days)

### Step 1: Implement Pagination (1 day)
- [ ] Add pagination to all list endpoints
- [ ] Implement cursor-based pagination for infinite scroll
- [ ] Add proper LIMIT/OFFSET to queries

### Step 2: Optimize Mobile Experience (1 day)
- [ ] Reduce mobile time clock bundle
- [ ] Implement offline-first time tracking
- [ ] Add service worker for offline capability
- [ ] Optimize image uploads

### Step 3: Implement Server Components (1-2 days)
- [ ] Convert static dashboards to Server Components
- [ ] Move data fetching to server side where possible
- [ ] Reduce client-side JavaScript

### Step 4: Add Performance Monitoring (1 day)
- [ ] Set up Sentry or similar for error tracking
- [ ] Add performance metrics dashboard
- [ ] Set up alerts for slow queries
- [ ] Monitor bundle size in CI/CD

**Expected Impact After Phase 3**:
- 80-90% faster mobile experience
- Offline capability for field workers
- Real-time performance monitoring
- Proactive issue detection

---

## Phase 4: Ongoing Optimization

### Continuous Monitoring
- Weekly bundle size reviews
- Monthly query performance audits
- Automated performance testing in CI
- User experience monitoring

### Performance Budget
- Initial load: < 3 seconds
- API responses: < 500ms (p95)
- Bundle size: < 5MB total
- Database queries: < 100ms (p95)

---

## Recommended Execution Order

### Week 1: Critical Fixes
**Days 1-2**: Phase 1 (Quick Wins)
**Days 3-5**: Phase 2 (Database Optimization)

### Week 2: Advanced Features
**Days 1-3**: Phase 3 (Advanced Optimizations)
**Days 4-5**: Testing & Validation

### Ongoing
- Set up monitoring
- Regular performance reviews
- Iterate based on metrics

---

## Success Metrics

### Current State (Estimated)
- Page load time: 3-5 seconds
- API response time: 500-2000ms
- Bundle size: 26MB
- Database query time: 100-1000ms

### Target State
- Page load time: < 1.5 seconds
- API response time: < 200ms (p95)
- Bundle size: < 5MB
- Database query time: < 50ms (p95)

---

## Next Steps

1. **Review this plan** - Does this align with your priorities?
2. **Start with Phase 1** - Quick wins to show immediate improvement
3. **Set up metrics** - So we can measure progress
4. **Execute Phase 2** - Deep database optimization
5. **Monitor & iterate** - Continuous improvement

## Questions to Consider

1. What's the biggest user complaint right now? (Slow pages? Slow mobile?)
2. How many concurrent users do you typically have?
3. What times of day see the most traffic?
4. Are there specific pages that are particularly slow?
5. Do field workers complain about mobile performance?
