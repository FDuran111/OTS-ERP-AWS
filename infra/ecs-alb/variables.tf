variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Name of the project for resource naming"
  type        = string
  default     = "ots-erp"
}

variable "vpc_id" {
  description = "VPC ID where resources will be deployed"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ALB placement"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "db_secret_arn" {
  description = "ARN of the database secret in AWS Secrets Manager"
  type        = string
}

variable "jwt_secret_arn" {
  description = "ARN of the JWT secret in AWS Secrets Manager"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 bucket for file storage"
  type        = string
  default     = ""
}

variable "container_port" {
  description = "Port on which the container listens"
  type        = number
  default     = 3000
}

variable "health_check_path" {
  description = "Path for ALB health checks"
  type        = string
  default     = "/api/healthz"
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS listener"
  type        = string
  default     = ""
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "ots-erp-cluster"
}

variable "ecr_repo_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "ots-erp/app"
}

variable "container_image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "app_version" {
  description = "Application version for environment variable"
  type        = string
  default     = "dev"
}

variable "desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 1
}