# Outputs for staging environment

output "budget_name" {
  description = "Name of the staging budget"
  value       = aws_budgets_budget.staging.name
}

output "budget_arn" {
  description = "ARN of the staging budget"
  value       = aws_budgets_budget.staging.arn
}

output "budget_limit" {
  description = "Monthly budget limit in USD"
  value       = aws_budgets_budget.staging.limit_amount
}

output "budget_alerts" {
  description = "Budget alert thresholds"
  value = {
    warning_threshold = "80% ($28)"
    critical_threshold = "100% ($35)"
    forecast_alert = "Enabled"
  }
}