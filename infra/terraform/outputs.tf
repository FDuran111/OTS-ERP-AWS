output "s3_bucket_name"    { value = aws_s3_bucket.uploads.bucket }
output "app_role_arn"      { value = aws_iam_role.app_role.arn }
output "secret_arn_rds_user"     { value = aws_secretsmanager_secret.rds_user.arn }
output "secret_arn_rds_password" { value = aws_secretsmanager_secret.rds_password.arn }
output "secret_arn_jwt"          { value = aws_secretsmanager_secret.jwt_secret.arn }

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "rds_proxy_endpoint" {
  value = aws_db_proxy_endpoint.readwrite.endpoint
}

output "vpc_id" {
  value = local.vpc_id
}

output "private_subnets" {
  value = var.create_vpc ? module.vpc.private_subnets : var.subnet_ids
}

output "public_subnets" {
  value = var.create_vpc ? module.vpc.public_subnets : []
}

output "nat_gw_ids" {
  value = var.create_vpc ? module.vpc.natgw_ids : []
}