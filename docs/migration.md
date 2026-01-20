<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Migration Guide

**Purpose**: Migrate existing Lens deployments to support branding system, OAuth, and updated organization structure.

**Estimated Time**: 5-10 minutes
**Risk Level**: Medium (database schema changes)

---

## Table of Contents

- [Do You Need to Migrate?](#do-you-need-to-migrate)
- [Pre-Migration](#pre-migration)
- [Migration Steps](#migration-steps)
- [Post-Migration](#post-migration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## Do You Need to Migrate?

**Quick Check**: Does `site-config` collection exist in your database?

```bash
mongosh "mongodb://localhost:27017/backend-db" --eval "db.getCollectionNames().includes('site-config')"
```

- ✅ **`true`** - Migration may not be needed (unless you see errors)
- ❌ **`false`** - **Migration is required**

**Alternative**: Check if you can access "Branding Hub" or "OAuth Configuration" in admin panel. If not, migration is required.

---

## Pre-Migration

### 1. Verify Prerequisites

- [ ] MongoDB is running and accessible:
  ```bash
  mongosh "mongodb://localhost:27017/backend-db" --eval "db.adminCommand('ping')"
  # Or for Docker Compose (port 27018):
  mongosh "mongodb://localhost:27018/backend-db" --eval "db.adminCommand('ping')"
  ```

### 2. Backup Database

**⚠️ CRITICAL: Always backup before running migrations.**

**Manual Installation**:
```bash
mongodump --uri="mongodb://localhost:27017/backend-db" --out=lens-backup-$(date +%Y%m%d-%H%M%S)
```

**Docker Compose**:
```bash
mongodump --uri="mongodb://localhost:27018/backend-db" --out=lens-backup-$(date +%Y%m%d-%H%M%S)
```
*(Port `27018` is the default. Check `docker-compose.yml` if using custom `EXPOSE_DB_PORT`)*

### 3. Update Codebase

**Manual Installation**:
```bash
cd /path/to/Ondsel-Server
git pull origin main
git submodule update --init --recursive  # Update submodules (FC-Worker)
cd backend && npm ci
cd ../frontend && npm ci
```

**Docker Compose**:
```bash
cd /path/to/Ondsel-Server
git pull origin main
git submodule update --init --recursive  # Update submodules (FC-Worker)
docker-compose build  # Rebuild all services to include new code
```

**After updating codebase**: Check example environment files (`backend/env.example`, `frontend/env.example`, or root `.env.example` for Docker) for any new variables and add them to your `.env` files if needed.

---

## Migration Steps

### Docker Compose

**Note**: The following migrations run automatically via `entry.sh` when container starts:
- `addInitialTosPp` - Creates placeholder Terms of Service and Privacy Policy
- `createDefaultSiteConfig` - Creates default site configuration
- `addOauthToSiteConfig` - Adds OAuth configuration structure (only needed if site-config was created before OAuth was added)
- `addDefaultAdminUser` - Creates admin user and Admin Organization
- `createDefaultPublisherEntries` - Creates publisher entries

**Manual migration** (required for existing deployments):
- `migrateOndselToAdminOrganization` - Migrates existing "Ondsel" type organizations to "Admin" type. This is a one-time migration for existing deployments and is not included in `entry.sh` since it's only needed when upgrading from older versions.

```bash
# Run the organization type migration
docker-compose exec backend npm run migration migrateOndselToAdminOrganization

# Restart backend to apply changes
docker-compose restart backend
```

### Manual Installation

**⚠️ Run migrations in this exact order:**

```bash
cd backend
set -a; . ./.env; set +a

# Step 1: Create placeholder Terms of Service and Privacy Policy (idempotent)
npm run migration addInitialTosPp

# Step 2: Create Site-Config
npm run migration createDefaultSiteConfig

# Step 3: Migrate Organization Types
npm run migration migrateOndselToAdminOrganization

# Step 4: Create Admin User and Organization (if admin user doesn't exist)
npm run migration addDefaultAdminUser

# Step 5: Create Publisher Entries (idempotent)
npm run migration createDefaultPublisherEntries

# Step 6: Restart backend
# Stop and restart your backend service
```

---

## Post-Migration

### Configure Branding (Optional)

Customize branding via admin panel:

1. Log in as admin user
2. Navigate to admin panel (Xavier menu) → **Branding Hub** (see [`docs/admin-panel.md`](admin-panel.md) for details)
3. Configure:
   - Site title, logo, favicon
   - Copyright text, homepage content
   - Social links, banner (optional)
4. Click **Save** to apply changes in each section

### Configure OAuth (Optional)

Configure OAuth via admin panel → **OAuth Configuration** (see [`docs/admin-panel.md`](admin-panel.md) for detailed instructions).

---

## Verification

### Quick Checks

```bash
# Site-config exists (use port 27018 for Docker Compose)
mongosh "mongodb://localhost:27017/backend-db" --eval "db['site-config'].countDocuments()"
# Expected: 1

# Admin organization exists
mongosh "mongodb://localhost:27017/backend-db" --eval "db.organizations.find({ type: 'Admin' }).count()"
# Expected: >= 1

# No Ondsel organizations
mongosh "mongodb://localhost:27017/backend-db" --eval "db.organizations.find({ type: 'Ondsel' }).count()"
# Expected: 0
```

### Application Checks

- [ ] Admin panel accessible
- [ ] Branding visible (logo, title)
- [ ] OAuth works (if configured)
- [ ] No errors in logs
- [ ] User authentication works
- [ ] Model upload, update, and download work

---

## Troubleshooting

### Migration Fails

1. Check MongoDB connection: `mongosh "mongodb://localhost:27017/backend-db" --eval "db.adminCommand('ping')"`
2. Verify migrations run in correct order
3. Check logs for specific error messages

### Admin Panel Not Accessible

1. Verify admin user exists: `db.users.find({ email: "admin@local.test" })`
2. Check Admin organization exists: `db.organizations.find({ type: "Admin" })`
3. Verify admin user is a member of Admin organization

### Branding Not Working

1. Verify site-config exists: `db['site-config'].findOne()`
2. Check admin panel configuration is saved
3. Clear browser cache
4. Verify frontend uses latest code

### OAuth Not Working

1. Verify OAuth is enabled in admin panel configuration
2. Verify credentials and redirect URIs match provider settings
3. Check backend logs for OAuth errors

### Rollback

If needed, restore database backup and revert code:

**Docker Compose**:
```bash
docker-compose down
mongorestore --uri="mongodb://localhost:27018/backend-db" /path/to/backup
git checkout <previous-version>
docker-compose up -d
```

**Manual Installation**:
```bash
# Stop backend service
mongorestore --uri="mongodb://localhost:27017/backend-db" /path/to/backup
git checkout <previous-version>
# Restart backend service
```

---

## Additional Resources

- **`docs/admin-panel.md`** - Detailed admin panel configuration
- **`README.md`** - Installation and setup
