# Production RDS Migration Scripts
## Sync RDS with Local Database Schema

**Created:** October 6, 2025
**Purpose:** Update AWS RDS production database to match local development schema

---

## Execution Order

Run these scripts in order:

1. `01-pre-migration-fixes.sql` - Fix OvertimeSettings UUID issue
2. `02-create-missing-tables.sql` - Create 29 new tables
3. `03-alter-existing-tables.sql` - Modify 9 existing tables
4. `04-create-functions.sql` - Create missing database functions
5. `05-create-triggers.sql` - Create 44 missing triggers
6. `06-migrate-data.sql` - Import role/permission data
7. `07-validate.sql` - Validation queries

---

## How to Run

```bash
# Connect to RDS via SSH tunnel
ssh -i ~/Desktop/ortmeier-bastion-key.pem \
  -L 5433:ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com:5432 \
  ec2-user@18.223.108.189 -N &

# Run each script
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f 01-pre-migration-fixes.sql

psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f 02-create-missing-tables.sql

# ... continue with remaining scripts
```

---

## Rollback

If migration fails, restore from backup:

```bash
pg_restore -d "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  --clean --if-exists \
  ~/Desktop/OTS-ERP/backups/YYYYMMDD/rds_full_backup_*.dump
```
