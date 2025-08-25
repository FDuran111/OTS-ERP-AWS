#!/usr/bin/env node

/**
 * Environment Validation Script for OTS-ARP-AWS Staging
 * Validates that staging is properly configured for AWS-only operation
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Required environment variables for staging
const REQUIRED_VARS = {
  'NEXT_PUBLIC_ENV': 'staging',
  'DATABASE_URL': 'postgresql://[user]:[pass]@[host].rds.amazonaws.com:5432/[db]',
  'JWT_SECRET': '[any-secret-value]',
  'NEXTAUTH_SECRET': '[any-secret-value]',
  'STORAGE_PROVIDER': 's3',
  'AWS_S3_BUCKET': '[bucket-name]',
  'AWS_REGION': 'us-east-2',
  'NODE_ENV': 'production'
};

// Variables that should NOT exist
const FORBIDDEN_PATTERNS = [
  'SUPABASE',
  'NEXT_PUBLIC_SUPABASE',
  'COOLIFY',
  'RENDER_'
];

class Validator {
  constructor(inventory) {
    this.inventory = inventory;
    this.errors = [];
    this.warnings = [];
    this.passes = [];
    this.proposedEnv = {};
  }

  // Check for forbidden Supabase/old stack references
  checkForbiddenVars() {
    log('\n🔍 Checking for forbidden variables...', 'blue');
    
    const amplifyVars = this.inventory.amplify?.merged || {};
    const lambdaVars = this.inventory.lambda || {};
    
    // Check Amplify
    Object.keys(amplifyVars).forEach(key => {
      if (FORBIDDEN_PATTERNS.some(pattern => key.toUpperCase().includes(pattern))) {
        this.errors.push({
          type: 'FORBIDDEN_VAR',
          location: 'Amplify',
          key,
          value: amplifyVars[key],
          fix: `Remove variable '${key}' from Amplify configuration`
        });
      }
    });
    
    // Check Lambda
    Object.keys(lambdaVars).forEach(key => {
      if (FORBIDDEN_PATTERNS.some(pattern => key.toUpperCase().includes(pattern))) {
        this.errors.push({
          type: 'FORBIDDEN_VAR',
          location: 'Lambda',
          key,
          value: lambdaVars[key],
          fix: `Remove variable '${key}' from Lambda configuration`
        });
      }
    });
    
    if (this.errors.filter(e => e.type === 'FORBIDDEN_VAR').length === 0) {
      this.passes.push('No forbidden variables found (Supabase, Coolify, etc.)');
    }
  }

  // Validate DATABASE_URL points to RDS
  checkDatabaseUrl() {
    log('\n🗄️ Checking DATABASE_URL...', 'blue');
    
    const amplifyVars = this.inventory.amplify?.merged || {};
    const dbUrl = amplifyVars.DATABASE_URL;
    
    if (!dbUrl) {
      this.errors.push({
        type: 'MISSING_VAR',
        key: 'DATABASE_URL',
        fix: 'Set DATABASE_URL to your RDS PostgreSQL endpoint'
      });
      
      // Suggest based on infrastructure
      if (this.inventory.infrastructure?.rds) {
        const endpoint = this.inventory.infrastructure.rds.endpoint;
        this.proposedEnv.DATABASE_URL = `postgresql://dbuser:CHANGE_ME@${endpoint}:5432/otsarpdb`;
      }
    } else if (!dbUrl.includes('rds.amazonaws.com')) {
      this.errors.push({
        type: 'INVALID_DATABASE',
        key: 'DATABASE_URL',
        current: dbUrl,
        fix: 'DATABASE_URL must point to an RDS instance (*.rds.amazonaws.com)'
      });
      
      // Extract current DB name if possible
      const dbMatch = dbUrl.match(/\/([^?]+)(\?|$)/);
      const dbName = dbMatch ? dbMatch[1] : 'otsarpdb';
      
      if (this.inventory.infrastructure?.rds) {
        const endpoint = this.inventory.infrastructure.rds.endpoint;
        this.proposedEnv.DATABASE_URL = `postgresql://dbuser:CHANGE_ME@${endpoint}:5432/${dbName}`;
      }
    } else {
      this.passes.push('DATABASE_URL correctly points to RDS');
    }
  }

  // Check storage configuration
  checkStorageConfig() {
    log('\n📦 Checking storage configuration...', 'blue');
    
    const amplifyVars = this.inventory.amplify?.merged || {};
    
    // Check STORAGE_PROVIDER
    if (!amplifyVars.STORAGE_PROVIDER) {
      this.errors.push({
        type: 'MISSING_VAR',
        key: 'STORAGE_PROVIDER',
        fix: 'Set STORAGE_PROVIDER=s3'
      });
      this.proposedEnv.STORAGE_PROVIDER = 's3';
    } else if (amplifyVars.STORAGE_PROVIDER !== 's3') {
      this.errors.push({
        type: 'INVALID_STORAGE',
        key: 'STORAGE_PROVIDER',
        current: amplifyVars.STORAGE_PROVIDER,
        fix: 'STORAGE_PROVIDER must be "s3" for staging'
      });
      this.proposedEnv.STORAGE_PROVIDER = 's3';
    } else {
      this.passes.push('STORAGE_PROVIDER correctly set to s3');
    }
    
    // Check S3 bucket
    const s3Bucket = amplifyVars.AWS_S3_BUCKET || amplifyVars.S3_BUCKET;
    if (!s3Bucket) {
      this.errors.push({
        type: 'MISSING_VAR',
        key: 'AWS_S3_BUCKET',
        fix: 'Set AWS_S3_BUCKET to your S3 bucket name'
      });
      
      // Suggest based on infrastructure
      if (this.inventory.infrastructure?.s3?.length > 0) {
        this.proposedEnv.AWS_S3_BUCKET = this.inventory.infrastructure.s3[0];
      } else {
        this.proposedEnv.AWS_S3_BUCKET = 'ots-arp-aws-staging-uploads';
      }
    } else {
      this.passes.push(`S3 bucket configured: ${s3Bucket}`);
    }
    
    // Check for S3_ENDPOINT (should be empty for real AWS)
    if (amplifyVars.S3_ENDPOINT || amplifyVars.AWS_ENDPOINT_URL_S3) {
      this.warnings.push({
        type: 'LOCALSTACK_CONFIG',
        key: amplifyVars.S3_ENDPOINT ? 'S3_ENDPOINT' : 'AWS_ENDPOINT_URL_S3',
        current: amplifyVars.S3_ENDPOINT || amplifyVars.AWS_ENDPOINT_URL_S3,
        fix: 'Remove S3_ENDPOINT for real AWS (only needed for LocalStack)'
      });
    }
  }

  // Check required variables
  checkRequiredVars() {
    log('\n✅ Checking required variables...', 'blue');
    
    const amplifyVars = this.inventory.amplify?.merged || {};
    
    Object.entries(REQUIRED_VARS).forEach(([key, expectedValue]) => {
      const currentValue = amplifyVars[key];
      
      if (!currentValue) {
        // Special handling for secrets that might be in Secrets Manager
        if (key === 'JWT_SECRET' || key === 'NEXTAUTH_SECRET') {
          const appSecrets = this.inventory.secrets['ots-arp-aws-staging-app-secrets'];
          if (appSecrets && appSecrets[key]) {
            this.passes.push(`${key} found in Secrets Manager`);
            return;
          }
        }
        
        this.errors.push({
          type: 'MISSING_VAR',
          key,
          expected: expectedValue,
          fix: `Set ${key}=${expectedValue.replace('[', '').replace(']', '')}`
        });
        
        // Add to proposed env
        if (expectedValue.includes('[')) {
          // Placeholder value
          if (key === 'JWT_SECRET' || key === 'NEXTAUTH_SECRET') {
            this.proposedEnv[key] = '${SECRET_FROM_SECRETS_MANAGER}';
          } else {
            this.proposedEnv[key] = expectedValue.replace(/\[([^\]]+)\]/g, 'CHANGE_ME');
          }
        } else {
          this.proposedEnv[key] = expectedValue;
        }
      } else if (!expectedValue.includes('[') && currentValue !== expectedValue) {
        // Fixed value that doesn't match
        this.warnings.push({
          type: 'UNEXPECTED_VALUE',
          key,
          current: currentValue,
          expected: expectedValue,
          fix: `Consider setting ${key}=${expectedValue}`
        });
      }
    });
  }

  // Check for duplicate/conflicting values
  checkDuplicates() {
    log('\n🔄 Checking for duplicate configurations...', 'blue');
    
    const appLevel = this.inventory.amplify?.appLevel || {};
    const branchLevel = this.inventory.amplify?.branchLevel || {};
    
    Object.keys(appLevel).forEach(key => {
      if (branchLevel[key] && appLevel[key] !== branchLevel[key]) {
        this.warnings.push({
          type: 'DUPLICATE_VAR',
          key,
          appValue: appLevel[key],
          branchValue: branchLevel[key],
          fix: `Variable '${key}' is set at both app and branch level with different values. Consider removing from app level.`
        });
      }
    });
  }

  // Generate proposed environment
  generateProposedEnv() {
    const current = this.inventory.amplify?.merged || {};
    const proposed = { ...current };
    
    // Remove forbidden vars
    FORBIDDEN_PATTERNS.forEach(pattern => {
      Object.keys(proposed).forEach(key => {
        if (key.toUpperCase().includes(pattern)) {
          delete proposed[key];
        }
      });
    });
    
    // Add/update required vars
    Object.assign(proposed, this.proposedEnv);
    
    // Add secrets from Secrets Manager if available
    const appSecrets = this.inventory.secrets?.['ots-arp-aws-staging-app-secrets'];
    if (appSecrets) {
      if (appSecrets.JWT_SECRET && !proposed.JWT_SECRET) {
        proposed.JWT_SECRET = '${SECRET_FROM_SECRETS_MANAGER}';
      }
      if (appSecrets.NEXTAUTH_SECRET && !proposed.NEXTAUTH_SECRET) {
        proposed.NEXTAUTH_SECRET = '${SECRET_FROM_SECRETS_MANAGER}';
      }
    }
    
    return proposed;
  }

  // Generate markdown report
  generateReport() {
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    const totalPasses = this.passes.length;
    
    let md = `# Environment Validation Report - Staging

Generated: ${new Date().toISOString()}

## Overall Status: ${totalErrors === 0 ? '✅ PASS' : '❌ FAIL'}

- ✅ Passed: ${totalPasses} checks
- ⚠️  Warnings: ${totalWarnings} issues
- ❌ Errors: ${totalErrors} issues

`;

    if (totalErrors > 0) {
      md += `## ❌ Errors (Must Fix)\n\n`;
      this.errors.forEach((error, i) => {
        md += `### ${i + 1}. ${error.type}\n`;
        md += `- **Key**: \`${error.key || 'N/A'}\`\n`;
        if (error.current) md += `- **Current**: \`${error.current}\`\n`;
        if (error.expected) md += `- **Expected**: \`${error.expected}\`\n`;
        md += `- **Fix**: ${error.fix}\n\n`;
      });
    }

    if (totalWarnings > 0) {
      md += `## ⚠️  Warnings (Should Fix)\n\n`;
      this.warnings.forEach((warning, i) => {
        md += `### ${i + 1}. ${warning.type}\n`;
        md += `- **Key**: \`${warning.key || 'N/A'}\`\n`;
        if (warning.current) md += `- **Current**: \`${warning.current}\`\n`;
        if (warning.expected) md += `- **Expected**: \`${warning.expected}\`\n`;
        md += `- **Fix**: ${warning.fix}\n\n`;
      });
    }

    if (totalPasses > 0) {
      md += `## ✅ Passed Checks\n\n`;
      this.passes.forEach(pass => {
        md += `- ${pass}\n`;
      });
    }

    md += `
## 🔧 Proposed Environment Variables

The following environment variables should be set in Amplify:

\`\`\`bash
`;
    
    const proposed = this.generateProposedEnv();
    Object.entries(proposed).forEach(([key, value]) => {
      // Don't show sensitive values
      if (key.includes('SECRET') || key.includes('PASSWORD') || key === 'DATABASE_URL') {
        if (value.includes('${')) {
          md += `${key}="${value}"\n`;
        } else if (value.includes('CHANGE_ME')) {
          md += `${key}="${value}"\n`;
        } else {
          md += `${key}="[REDACTED - keep current value]"\n`;
        }
      } else {
        md += `${key}="${value}"\n`;
      }
    });

    md += `\`\`\`

## 📝 How to Apply Fixes

### Option 1: Manual Update via AWS Console
1. Go to AWS Amplify Console
2. Select your app: ${this.inventory.amplify?.appId || '[APP_ID]'}
3. Go to Environment Variables
4. Update variables according to the proposed configuration above

### Option 2: Use Sync Script
1. Review and edit \`env-reports/proposed-staging-env.json\`
2. Run: \`bash scripts/env/sync-amplify-from-secrets.sh --app-id ${this.inventory.amplify?.appId || '[APP_ID]'} --branch main env-reports/proposed-staging-env.json\`

### Option 3: Update via AWS CLI
\`\`\`bash
aws amplify update-branch \\
  --app-id ${this.inventory.amplify?.appId || '[APP_ID]'} \\
  --branch-name main \\
  --environment-variables \\
    NEXT_PUBLIC_ENV=staging \\
    STORAGE_PROVIDER=s3 \\
    AWS_S3_BUCKET=ots-arp-aws-staging-uploads \\
    AWS_REGION=us-east-2
\`\`\`

## 🚀 Next Steps

1. **Fix all errors** listed above (${totalErrors} issues)
2. **Review warnings** and fix if applicable (${totalWarnings} issues)
3. **Update DATABASE_URL** with actual RDS credentials
4. **Set JWT secrets** from Secrets Manager or generate new ones
5. **Remove all Supabase/Coolify references**
6. **Run inventory again** to verify: \`node scripts/env/inventory-staging.mjs\`
7. **Run validation again** to confirm: \`node scripts/env/validate-staging.mjs\`
`;

    return md;
  }

  run() {
    this.checkForbiddenVars();
    this.checkDatabaseUrl();
    this.checkStorageConfig();
    this.checkRequiredVars();
    this.checkDuplicates();
    
    return {
      errors: this.errors,
      warnings: this.warnings,
      passes: this.passes,
      proposed: this.generateProposedEnv()
    };
  }
}

// Main execution
async function main() {
  log('🔍 OTS-ARP-AWS Staging Environment Validation', 'green');
  log('=' .repeat(50), 'blue');
  
  // Check if inventory exists
  const inventoryPath = join('env-reports', 'staging-inventory.json');
  if (!existsSync(inventoryPath)) {
    log('\n❌ Inventory file not found!', 'red');
    log('Please run the inventory script first:', 'yellow');
    log('  node scripts/env/inventory-staging.mjs', 'blue');
    process.exit(1);
  }
  
  // Load inventory
  let inventory;
  try {
    const inventoryData = readFileSync(inventoryPath, 'utf8');
    inventory = JSON.parse(inventoryData);
  } catch (error) {
    log(`\n❌ Failed to parse inventory: ${error.message}`, 'red');
    process.exit(1);
  }
  
  // Run validation
  const validator = new Validator(inventory);
  const results = validator.run();
  
  // Generate report
  const report = validator.generateReport();
  
  // Save reports
  const reportPath = join('env-reports', 'staging-validation.md');
  const proposedPath = join('env-reports', 'proposed-staging-env.json');
  
  writeFileSync(reportPath, report);
  writeFileSync(proposedPath, JSON.stringify(results.proposed, null, 2));
  
  log('\n📁 Reports saved:', 'green');
  log(`  - ${reportPath}`, 'blue');
  log(`  - ${proposedPath}`, 'blue');
  
  // Summary
  log('\n📋 Validation Summary:', 'green');
  log(`  ✅ Passed: ${results.passes.length} checks`, 'green');
  log(`  ⚠️  Warnings: ${results.warnings.length} issues`, 'yellow');
  log(`  ❌ Errors: ${results.errors.length} issues`, results.errors.length > 0 ? 'red' : 'green');
  
  if (results.errors.length > 0) {
    log('\n❌ VALIDATION FAILED', 'red');
    log('Please fix the errors listed in the report.', 'yellow');
    process.exit(1);
  } else {
    log('\n✅ VALIDATION PASSED', 'green');
    if (results.warnings.length > 0) {
      log('Consider addressing the warnings for better compliance.', 'yellow');
    }
  }
}

// Run
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});