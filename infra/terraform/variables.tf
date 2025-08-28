variable "project_name"    { type = string  default = "ots-erp" }
variable "env"             { type = string  default = "prod" }
variable "aws_region"      { type = string  default = "us-east-2" }

variable "s3_bucket_name"  { type = string  default = "" }
variable "enable_cloudfront" { type = bool  default = false }
variable "cloudfront_domain" { type = string default = "" } # OPTIONAL nice-to-have; not created in this prompt

# Secrets (placeholders — values added via aws cli later)
variable "create_placeholder_secrets" { type = bool default = true }

# VPC Configuration
variable "create_vpc"   { type = bool   default = true }
variable "vpc_id"       { type = string default = "" }
variable "subnet_ids"   { type = list(string) default = [] }