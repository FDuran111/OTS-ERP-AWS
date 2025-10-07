# Simple RDS Migration Guide
## Schema Only - No Data Transfer

**Goal:** Make RDS schema match Local schema (architecture only, no local data)

---

## What You Need To Know

✅ **Backups Created:**
- user_backup.csv (9 users)
- job_backup.csv (36 jobs)
- customer_backup.csv (20 customers)
- timeentry_backup.csv (5 entries)
- overtimesettings_backup.csv (2 settings)

✅ **SSH Tunnel Active:** localhost:5433 → RDS

✅ **Current Code:** Works with fallbacks, no immediate breakage

---

## Simplest Approach: Use pg_dump from Local Container

Since pg_dump version mismatch is preventing exports, here's the workaround:

### Step 1: Get Schema SQL from Local

```bash
# If you have postgres running in Docker locally:
docker exec -it <your-postgres-container> pg_dump -U <user> -d ots_erp_local --schema-only --no-owner --no-privileges > /tmp/local_schema.sql

# OR install matching pg_dump version:
brew install postgresql@16
/opt/homebrew/opt/postgresql@16/bin/pg_dump "postgresql://localhost/ots_erp_local" --schema-only --no-owner --no-privileges -f local_schema.sql
```

### Step 2: Filter Out Existing Tables

The schema dump will have ALL tables. We need to:
1. Remove tables that already exist in RDS
2. Keep only the 29 missing tables
3. Keep functions and triggers

### Step 3: Apply to RDS

```bash
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" -f filtered_schema.sql
```

---

## Alternative: Manual Table Creation

I can generate CREATE TABLE statements for each of the 29 missing tables.

Would you like me to:
1. Generate all 29 CREATE TABLE statements manually?
2. Help you install postgresql@16 to get matching pg_dump?
3. Create a script that does this programmatically?

---

## What's Safe To Do Right Now

Your frontend container is running and working because:
- Code has fallback logic
- Core tables (User, Job, Customer) exist
- Missing tables just return defaults

You can:
- ✅ Test the frontend now
- ✅ Do migration later
- ✅ Do migration in stages

---

## Quick Win Option

Want to just get it working NOW with minimal effort?

Run this single command:

```bash
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" -f quick-migration.sql
```

This will:
- Fix OvertimeSettings UUID issue
- Drop unused columns
- Add new columns to existing tables
- Make existing tables match Local

Then the missing 29 tables can be added later (app works without them via fallbacks).

---

## Tell Me What You Prefer

1. **Quick & Dirty:** Run quick-migration.sql now, add missing tables later
2. **Complete Migration:** Help me get full schema dump and do everything
3. **Manual Approach:** I generate all 29 CREATE TABLE statements for you

What works best for you?
