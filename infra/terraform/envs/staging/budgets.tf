# AWS Budgets configuration for staging environment
# Monitors costs and sends alerts to prevent overspending

resource "aws_budgets_budget" "staging" {
  name              = "ots-arp-aws-staging-budget"
  budget_type       = "COST"
  limit_amount      = "35.0"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = formatdate("YYYY-MM-01_00:00", timestamp())

  cost_filter {
    name = "TagKeyValue"
    values = [
      "Environment$staging",
      "Environment$Staging"
    ]
  }

  # Alert at 80% of budget ($28)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  # Alert at 100% of budget ($35)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.budget_alert_emails
  }

  # Forecasted alert at 100% (warns if trending to exceed)
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = var.budget_alert_emails
  }

  cost_types {
    include_credit             = false
    include_discount           = true
    include_other_subscription = true
    include_recurring          = true
    include_refund             = false
    include_subscription       = true
    include_support            = true
    include_tax                = true
    include_upfront            = true
    use_amortized              = false
    use_blended                = false
  }

  tags = {
    Name        = "ots-arp-aws-staging-budget"
    Environment = "staging"
    Purpose     = "cost-control"
    Threshold   = "35-usd"
    ManagedBy   = "terraform"
  }
}