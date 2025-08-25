#!/usr/bin/env node

/**
 * Environment Inventory Script for OTS-ARP-AWS Staging
 * Collects all environment configurations from AWS services
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// Configuration
const config = {
  region: process.env.AWS_REGION || 'us-east-2',
  appId: process.argv.find(arg => arg.startsWith('--app-id='))?.split('=')[1] || '',
  branch: process.argv.find(arg => arg.startsWith('--branch='))?.split('=')[1] || 'main',
  help: process.argv.includes('--help'),
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function redactSensitive(key, value) {
  const sensitiveKeys = [
    'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'PRIVATE', 'CREDENTIAL',
    'DATABASE_URL', 'JWT_SECRET', 'NEXTAUTH_SECRET'
  ];
  
  if (sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))) {
    if (typeof value === 'string') {
      // For DATABASE_URL, show the host but redact credentials
      if (key === 'DATABASE_URL' && value.includes('@')) {
        const match = value.match(/@([^:\/]+)/);
        return match ? `postgresql://[REDACTED]@${match[1]}:5432/[REDACTED]` : '[REDACTED]';
      }
      // For other sensitive values, show first 4 chars
      return value.length > 4 ? `${value.substring(0, 4)}...[REDACTED]` : '[REDACTED]';
    }
  }
  return value;
}

async function runCommand(command, parseJson = true) {
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('warning')) {
      console.error(`Warning: ${stderr}`);
    }
    return parseJson ? JSON.parse(stdout) : stdout.trim();
  } catch (error) {
    return null;
  }
}

// Main inventory functions
async function getTerraformOutputs() {
  log('\n📊 Fetching Terraform outputs...', 'blue');
  
  const terraformDir = 'infra/terraform/envs/staging';
  const outputs = await runCommand(
    `terraform -chdir=${terraformDir} output -json 2>/dev/null`,
    true
  );
  
  if (!outputs) {
    log('  ⚠️  No Terraform outputs found (may not be initialized)', 'yellow');
    return {};
  }
  
  const parsed = {};
  for (const [key, value] of Object.entries(outputs)) {
    parsed[key] = value.value;
  }
  
  log(`  ✓ Found ${Object.keys(parsed).length} outputs`, 'green');
  return parsed;
}

async function getAmplifyConfig(appId) {
  log('\n🚀 Fetching Amplify configuration...', 'blue');
  
  // If no app ID provided, try to find it
  if (!appId) {
    const apps = await runCommand(
      `aws amplify list-apps --query "apps[?contains(name, 'ots-arp-aws') || contains(name, 'staging')].{name:name,id:appId}" --output json --region ${config.region}`,
      true
    );
    
    if (apps && apps.length > 0) {
      appId = apps[0].id;
      log(`  ℹ️  Auto-detected Amplify app: ${apps[0].name} (${appId})`, 'yellow');
    } else {
      log('  ⚠️  No Amplify app found', 'yellow');
      return { appLevel: {}, branchLevel: {} };
    }
  }
  
  // Get app-level env vars
  const appConfig = await runCommand(
    `aws amplify get-app --app-id ${appId} --query "app.environmentVariables" --output json --region ${config.region}`,
    true
  );
  
  // Get branch-level env vars
  const branchConfig = await runCommand(
    `aws amplify get-branch --app-id ${appId} --branch-name ${config.branch} --query "branch.environmentVariables" --output json --region ${config.region}`,
    true
  );
  
  log(`  ✓ App-level vars: ${Object.keys(appConfig || {}).length}`, 'green');
  log(`  ✓ Branch-level vars: ${Object.keys(branchConfig || {}).length}`, 'green');
  
  return {
    appId,
    appLevel: appConfig || {},
    branchLevel: branchConfig || {},
    merged: { ...(appConfig || {}), ...(branchConfig || {}) }
  };
}

async function getSecretsManager() {
  log('\n🔐 Fetching Secrets Manager...', 'blue');
  
  // List all secrets with ots-arp-aws-staging prefix
  const secretsList = await runCommand(
    `aws secretsmanager list-secrets --query "SecretList[?starts_with(Name, 'ots-arp-aws-staging')].Name" --output json --region ${config.region}`,
    true
  );
  
  if (!secretsList || secretsList.length === 0) {
    log('  ⚠️  No secrets found', 'yellow');
    return {};
  }
  
  const secrets = {};
  
  for (const secretName of secretsList) {
    try {
      const secretValue = await runCommand(
        `aws secretsmanager get-secret-value --secret-id "${secretName}" --query "SecretString" --output text --region ${config.region}`,
        false
      );
      
      // Try to parse as JSON
      try {
        secrets[secretName] = JSON.parse(secretValue);
        log(`  ✓ ${secretName}: ${Object.keys(secrets[secretName]).length} keys`, 'green');
      } catch {
        // Not JSON, store as string
        secrets[secretName] = secretValue;
        log(`  ✓ ${secretName}: string value`, 'green');
      }
    } catch (error) {
      log(`  ⚠️  Could not fetch ${secretName}`, 'yellow');
    }
  }
  
  return secrets;
}

async function getLambdaConfig() {
  log('\n⚡ Fetching Lambda configuration...', 'blue');
  
  const functionName = 'ots-arp-aws-staging-migrate';
  const lambdaConfig = await runCommand(
    `aws lambda get-function-configuration --function-name ${functionName} --query "Environment.Variables" --output json --region ${config.region}`,
    true
  );
  
  if (!lambdaConfig) {
    log('  ⚠️  Lambda function not found', 'yellow');
    return {};
  }
  
  log(`  ✓ Found ${Object.keys(lambdaConfig).length} env vars`, 'green');
  return lambdaConfig;
}

async function checkCurrentInfrastructure() {
  log('\n🔍 Checking current AWS infrastructure...', 'blue');
  
  const checks = {
    rds: false,
    s3: false,
    vpc: false,
    supabaseReferences: []
  };
  
  // Check for RDS instances
  const rdsInstances = await runCommand(
    `aws rds describe-db-instances --query "DBInstances[?contains(DBInstanceIdentifier, 'staging')].{id:DBInstanceIdentifier,endpoint:Endpoint.Address,status:DBInstanceStatus}" --output json --region ${config.region}`,
    true
  );
  
  if (rdsInstances && rdsInstances.length > 0) {
    checks.rds = rdsInstances[0];
    log(`  ✓ RDS found: ${rdsInstances[0].id}`, 'green');
  } else {
    log('  ⚠️  No RDS instance found', 'yellow');
  }
  
  // Check for S3 buckets
  const s3Buckets = await runCommand(
    `aws s3api list-buckets --query "Buckets[?contains(Name, 'ots-arp-aws') || contains(Name, 'staging')].Name" --output json`,
    true
  );
  
  if (s3Buckets && s3Buckets.length > 0) {
    checks.s3 = s3Buckets;
    log(`  ✓ S3 buckets found: ${s3Buckets.join(', ')}`, 'green');
  } else {
    log('  ⚠️  No S3 buckets found', 'yellow');
  }
  
  // Check for VPC
  const vpcs = await runCommand(
    `aws ec2 describe-vpcs --filters "Name=tag:Environment,Values=staging" --query "Vpcs[0].{id:VpcId,cidr:CidrBlock}" --output json --region ${config.region}`,
    true
  );
  
  if (vpcs && vpcs.id) {
    checks.vpc = vpcs;
    log(`  ✓ VPC found: ${vpcs.id}`, 'green');
  } else {
    log('  ⚠️  No staging VPC found', 'yellow');
  }
  
  return checks;
}

// Generate reports
function generateJsonReport(data) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'staging',
    region: config.region,
    terraform: data.terraform,
    amplify: {
      appId: data.amplify.appId,
      appLevel: Object.fromEntries(
        Object.entries(data.amplify.appLevel || {}).map(([k, v]) => [k, redactSensitive(k, v)])
      ),
      branchLevel: Object.fromEntries(
        Object.entries(data.amplify.branchLevel || {}).map(([k, v]) => [k, redactSensitive(k, v)])
      ),
      merged: Object.fromEntries(
        Object.entries(data.amplify.merged || {}).map(([k, v]) => [k, redactSensitive(k, v)])
      )
    },
    secrets: Object.fromEntries(
      Object.entries(data.secrets || {}).map(([secretName, secretValue]) => [
        secretName,
        typeof secretValue === 'object' 
          ? Object.fromEntries(Object.entries(secretValue).map(([k, v]) => [k, redactSensitive(k, v)]))
          : redactSensitive(secretName, secretValue)
      ])
    ),
    lambda: Object.fromEntries(
      Object.entries(data.lambda || {}).map(([k, v]) => [k, redactSensitive(k, v)])
    ),
    infrastructure: data.infrastructure,
    analysis: {
      supabaseVarsFound: [],
      awsServicesConfigured: {
        rds: !!data.infrastructure.rds,
        s3: !!data.infrastructure.s3,
        vpc: !!data.infrastructure.vpc
      }
    }
  };
  
  // Check for Supabase references
  const checkForSupabase = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj || {})) {
      if (key.toUpperCase().includes('SUPABASE') || 
          (typeof value === 'string' && value.includes('supabase'))) {
        report.analysis.supabaseVarsFound.push({
          location: path,
          key,
          value: redactSensitive(key, value)
        });
      }
    }
  };
  
  checkForSupabase(data.amplify.merged, 'Amplify');
  checkForSupabase(data.lambda, 'Lambda');
  
  return report;
}

function generateMarkdownReport(jsonReport) {
  let md = `# Environment Inventory Report - Staging

Generated: ${new Date().toISOString()}
Region: ${config.region}

## 🚨 Supabase References Found

`;

  if (jsonReport.analysis.supabaseVarsFound.length > 0) {
    md += `**WARNING:** Found ${jsonReport.analysis.supabaseVarsFound.length} Supabase references that need to be removed:\n\n`;
    jsonReport.analysis.supabaseVarsFound.forEach(ref => {
      md += `- **${ref.location}**: \`${ref.key}\` = \`${ref.value}\`\n`;
    });
  } else {
    md += `✅ No Supabase references found\n`;
  }

  md += `
## 📊 AWS Services Status

| Service | Status | Details |
|---------|--------|---------|
| RDS | ${jsonReport.infrastructure.rds ? '✅ Configured' : '❌ Not Found'} | ${jsonReport.infrastructure.rds ? jsonReport.infrastructure.rds.endpoint : 'Need to create RDS instance'} |
| S3 | ${jsonReport.infrastructure.s3 ? '✅ Configured' : '❌ Not Found'} | ${jsonReport.infrastructure.s3 ? jsonReport.infrastructure.s3.join(', ') : 'Need to create S3 bucket'} |
| VPC | ${jsonReport.infrastructure.vpc ? '✅ Configured' : '⚠️ Not Found'} | ${jsonReport.infrastructure.vpc ? jsonReport.infrastructure.vpc.id : 'May need VPC for RDS'} |

## 🚀 Amplify Configuration

**App ID:** ${jsonReport.amplify.appId || 'Not Found'}
**Branch:** ${config.branch}

### Effective Environment Variables (Merged)
| Key | Value | Source |
|-----|-------|--------|
`;

  const ampVars = jsonReport.amplify.merged || {};
  const branchVars = jsonReport.amplify.branchLevel || {};
  
  Object.entries(ampVars).forEach(([key, value]) => {
    const source = branchVars[key] ? 'Branch' : 'App';
    md += `| \`${key}\` | \`${value}\` | ${source} |\n`;
  });

  if (Object.keys(ampVars).length === 0) {
    md += `| (No variables configured) | - | - |\n`;
  }

  md += `
## 🔐 Secrets Manager

`;

  if (Object.keys(jsonReport.secrets).length > 0) {
    Object.entries(jsonReport.secrets).forEach(([secretName, values]) => {
      md += `### ${secretName}\n`;
      if (typeof values === 'object') {
        md += `| Key | Value (Redacted) |\n|-----|-------|\n`;
        Object.entries(values).forEach(([k, v]) => {
          md += `| \`${k}\` | \`${v}\` |\n`;
        });
      } else {
        md += `Value: \`${values}\`\n`;
      }
      md += '\n';
    });
  } else {
    md += `No secrets found in Secrets Manager.\n`;
  }

  md += `
## ⚡ Lambda Configuration

**Function:** ots-arp-aws-staging-migrate

| Variable | Value |
|----------|-------|
`;

  if (Object.keys(jsonReport.lambda).length > 0) {
    Object.entries(jsonReport.lambda).forEach(([key, value]) => {
      md += `| \`${key}\` | \`${value}\` |\n`;
    });
  } else {
    md += `| (No Lambda function found) | - |\n`;
  }

  md += `
## 🎯 Next Steps

1. **Remove Supabase References:** ${jsonReport.analysis.supabaseVarsFound.length > 0 ? `Remove all ${jsonReport.analysis.supabaseVarsFound.length} Supabase variables listed above` : 'None needed'}
2. **Configure AWS Services:**
   ${!jsonReport.infrastructure.rds ? '- Create RDS PostgreSQL instance\n' : ''}${!jsonReport.infrastructure.s3 ? '- Create S3 bucket for storage\n' : ''}${!jsonReport.infrastructure.vpc ? '- Set up VPC if needed\n' : ''}
3. **Update Environment Variables:**
   - Set \`DATABASE_URL\` to RDS endpoint
   - Set \`STORAGE_PROVIDER=s3\`
   - Set \`AWS_S3_BUCKET\` to your S3 bucket
   - Remove all \`SUPABASE_*\` variables
4. **Run Validation:** \`node scripts/env/validate-staging.mjs\`
`;

  return md;
}

// Main execution
async function main() {
  if (config.help) {
    console.log(`
Environment Inventory Script

Usage:
  node scripts/env/inventory-staging.mjs [options]

Options:
  --app-id=<id>    Amplify App ID (will auto-detect if not provided)
  --branch=<name>  Branch name (default: main)
  --region=<name>  AWS Region (default: us-east-2)
  --help           Show this help message

Example:
  node scripts/env/inventory-staging.mjs --app-id=d1234567 --branch=main
`);
    process.exit(0);
  }

  log('🔍 OTS-ARP-AWS Staging Environment Inventory', 'green');
  log('=' .repeat(50), 'blue');
  
  // Check AWS CLI
  try {
    await execAsync('aws --version');
  } catch {
    log('\n❌ AWS CLI not found or not configured', 'red');
    log('Please install AWS CLI and configure credentials:', 'yellow');
    log('  aws configure', 'yellow');
    process.exit(1);
  }
  
  // Gather all data
  const data = {
    terraform: await getTerraformOutputs(),
    amplify: await getAmplifyConfig(config.appId),
    secrets: await getSecretsManager(),
    lambda: await getLambdaConfig(),
    infrastructure: await checkCurrentInfrastructure()
  };
  
  // Generate reports
  const jsonReport = generateJsonReport(data);
  const mdReport = generateMarkdownReport(jsonReport);
  
  // Save reports
  mkdirSync('env-reports', { recursive: true });
  
  const jsonPath = join('env-reports', 'staging-inventory.json');
  const mdPath = join('env-reports', 'staging-inventory.md');
  
  writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  writeFileSync(mdPath, mdReport);
  
  log('\n📁 Reports saved:', 'green');
  log(`  - ${jsonPath}`, 'blue');
  log(`  - ${mdPath}`, 'blue');
  
  // Summary
  log('\n📋 Summary:', 'green');
  if (jsonReport.analysis.supabaseVarsFound.length > 0) {
    log(`  ⚠️  Found ${jsonReport.analysis.supabaseVarsFound.length} Supabase references to remove`, 'red');
  } else {
    log('  ✅ No Supabase references found', 'green');
  }
  
  log(`  ${jsonReport.analysis.awsServicesConfigured.rds ? '✅' : '❌'} RDS configured`, 
      jsonReport.analysis.awsServicesConfigured.rds ? 'green' : 'red');
  log(`  ${jsonReport.analysis.awsServicesConfigured.s3 ? '✅' : '❌'} S3 configured`,
      jsonReport.analysis.awsServicesConfigured.s3 ? 'green' : 'red');
  
  log('\nNext step: Run validation script', 'yellow');
  log('  node scripts/env/validate-staging.mjs', 'blue');
}

// Run
main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});