# Variables for staging environment

variable "aws_region" {
  description = "AWS region for staging resources"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ots-arp-aws"
}

variable "budget_alert_emails" {
  description = "List of email addresses to receive budget alerts"
  type        = list(string)
  default     = []
  # Example: ["admin@example.com", "finance@example.com"]
}

variable "vpc_id" {
  description = "VPC ID for staging environment"
  type        = string
  default     = ""
}

variable "github_personal_access_token" {
  description = "GitHub personal access token for Amplify"
  type        = string
  sensitive   = true
  default     = ""
}