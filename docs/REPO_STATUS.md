# 📍 Repository Status: OTS-ARP-AWS

## ✅ This is the Canonical Repository

**Active Development**: All new features, bug fixes, and updates happen here.  
**Legacy Repository**: The original `ortmeier-technical-services` is frozen and will be phased out.

## 🏗️ Current Infrastructure

### Staging Environment (Live)
- **Hosting**: AWS Amplify
- **Database**: AWS RDS PostgreSQL  
- **Storage**: AWS S3
- **Region**: us-east-2
- **Budget**: $35/month
- **Status**: ✅ Operational

### Production Environment
- **Status**: 🚧 To be deployed (after staging validation)
- **Plan**: Mirror staging with production-grade security

### Local Development
- **Database**: PostgreSQL (Docker)
- **Storage**: LocalStack S3
- **Hot Reload**: Yes
- **Supabase**: ❌ NOT USED

## 🔒 Environment Isolation

### AWS-Only Enforcement
- **Staging/Production**: MUST use AWS services only (RDS + S3)
- **Supabase**: BLOCKED in staging/production via runtime guards
- **Coolify**: NOT USED (replaced by AWS Amplify)

### Security Features
- Environment isolation guards prevent cross-environment connections
- AWS services lock enforces RDS and S3 usage
- Automatic validation in CI/CD pipeline

## 📚 Key Documentation

| Document | Purpose |
|----------|---------|
| [LOCAL_DEV_SETUP.md](../LOCAL_DEV_SETUP.md) | Local development with hot reload |
| [RUNBOOK_STAGING.md](./RUNBOOK_STAGING.md) | Staging operations and troubleshooting |
| [AWS_SERVICES_LOCK.md](./AWS_SERVICES_LOCK.md) | AWS-only enforcement details |
| [STAGING_ISOLATION.md](./STAGING_ISOLATION.md) | Environment isolation configuration |
| [SMOKE_TESTS.md](./SMOKE_TESTS.md) | Testing and monitoring |

## 🚀 Development Workflow

### Local Development
```bash
# Set up local services
./scripts/setup-local-dev.sh

# Start with hot reload
npm run dev

# Open http://localhost:3000
```

### Deploy to Staging
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and test locally
npm run dev

# Push to GitHub
git push origin feature/my-feature

# Create PR → Merge to main → Auto-deploys to staging
```

## ✅ Required CI/CD Checks

All PRs to `main` must pass:
- `verify-no-debug-routes` - No debug endpoints
- `build` - TypeScript and build validation
- `smoke-staging` - Post-deployment tests
- `uptime-check` - Health monitoring (scheduled)

## 🚫 What NOT to Do

- ❌ Do NOT add Supabase variables to staging/production
- ❌ Do NOT use Coolify for deployments
- ❌ Do NOT modify the legacy repository
- ❌ Do NOT push directly to main (use PRs)

## 📅 Migration Timeline

1. **✅ Complete**: Copy codebase to AWS repository
2. **✅ Complete**: Set up staging on AWS
3. **✅ Complete**: Implement AWS-only guards
4. **🔄 Current**: Local development and testing
5. **📅 Next**: Dry-run data migration to staging
6. **📅 Future**: Deploy production stack
7. **📅 Future**: Cutover from legacy to AWS
8. **📅 Future**: Decommission legacy repository

## 🔍 Legacy Reference Check

Run this to ensure no legacy references remain:
```bash
./scripts/scan-legacy-refs.sh
```

## 📞 Contact

- **Repository**: [OTS-ARP-AWS](https://github.com/[org]/OTS-ARP-AWS)
- **Legacy (Frozen)**: ortmeier-technical-services
- **Team Lead**: [Contact Info]

---

*Last Updated: December 2024*  
*Status: Active Development*