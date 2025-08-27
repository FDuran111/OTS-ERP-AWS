#!/usr/bin/env bash
set -euo pipefail

# Usage: ./put-secrets.sh <project_name> <env> <rds_user> <rds_password> <jwt_secret>
PN="${1:-ots-erp}"
EV="${2:-prod}"
DBU="${3:-}"
DBP="${4:-}"
JWT="${5:-}"

if [[ -z "$DBU" || -z "$DBP" || -z "$JWT" ]]; then
  echo "Usage: $0 <project_name> <env> <rds_user> <rds_password> <jwt_secret>" >&2
  exit 1
fi

aws secretsmanager put-secret-value --secret-id "${PN}/${EV}/rds/user" --secret-string "$DBU" >/dev/null
aws secretsmanager put-secret-value --secret-id "${PN}/${EV}/rds/password" --secret-string "$DBP" >/dev/null
aws secretsmanager put-secret-value --secret-id "${PN}/${EV}/jwt/secret" --secret-string "$JWT" >/dev/null

echo "✓ Secrets stored:"
echo "  - ${PN}/${EV}/rds/user"
echo "  - ${PN}/${EV}/rds/password"
echo "  - ${PN}/${EV}/jwt/secret"