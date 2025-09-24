# Website Integration Instructions

## Copy this prompt to use in your website repository:

---

I need to integrate my static HTML website with our ERP system to automatically capture leads from form submissions and track page analytics. The ERP system is already configured with the necessary API endpoints.

## Current Setup:
- Website URL: https://111-consulting-group.github.io/ots-website/
- ERP API URL: http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com
- API Key: ots-website-2024-prod
- Website Type: Static HTML with Tailwind CSS (no framework)

## Integration Tasks:

### 1. Add the ERP Integration Script
Create a new file `js/erp-integration.js` with the following configuration at the top:

```javascript
const CONFIG = {
  ERP_API_URL: 'http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com',
  API_KEY: 'ots-website-2024-prod',
  DEBUG: false // Set to true for testing
};
```

The script should:
- Track page views automatically on load
- Generate and persist visitor IDs (localStorage) and session IDs (sessionStorage)
- Capture UTM parameters from URLs
- Send analytics data to `${ERP_API_URL}/api/public/analytics`

### 2. Update All HTML Pages
Add before the closing `</body>` tag in ALL HTML files:
```html
<script src="js/erp-integration.js"></script>
```

Files to update:
- index.html
- about.html
- services.html
- contact.html
- All files in services/ folder

### 3. Update Contact Form
The contact form (in contact.html) needs these specific field names for the integration to work:

```html
<form id="contact-form">
  <input name="firstName" required>
  <input name="lastName" required>
  <input name="email" type="email" required>
  <input name="phone" type="tel" required>
  <input name="companyName"> <!-- optional -->

  <select name="serviceType">
    <option value="general-inquiry">General Inquiry</option>
    <option value="panel-upgrade">Panel Upgrade</option>
    <option value="ev-charger">EV Charger Installation</option>
    <!-- add more service options -->
  </select>

  <select name="urgency">
    <option value="LOW">Low Priority</option>
    <option value="MEDIUM">Medium Priority</option>
    <option value="HIGH">High Priority</option>
    <option value="EMERGENCY">Emergency</option>
  </select>

  <textarea name="description" required></textarea>

  <button type="submit">Submit</button>
</form>
```

### 4. Form Submission Handler
The script should:
- Prevent default form submission
- Collect form data and enrich with metadata (page URL, referrer, UTM params)
- POST to `${ERP_API_URL}/api/public/forms` with x-api-key header
- Show success/error messages to user
- Clear form on success
- Track form starts and abandons for analytics

### 5. Analytics Events to Track
- `page_view` - Every page load
- `form_start` - When user focuses on first form field
- `form_abandon` - When user leaves page with unsubmitted form (use beforeunload event)
- Form submissions automatically create leads in ERP

### 6. Success/Error UI
Add styled success and error messages that appear after form submission:

```javascript
// Success message
<div class="bg-green-500 text-white p-4 rounded-lg mt-4">
  <strong>✅ Thank you!</strong><br>
  Your request has been received. We will contact you shortly.<br>
  <small>Expected response time: 24 hours</small>
</div>

// Error message
<div class="bg-red-500 text-white p-4 rounded-lg mt-4">
  <strong>❌ Error</strong><br>
  Failed to submit. Please try again or call us at (402) 625-2233
</div>
```

### 7. Test the Integration
After implementing, test by:
1. Opening browser console (F12)
2. Submitting the contact form
3. Checking for success message
4. Verifying no CORS errors in console

## Expected Behavior:
- Every page visit is tracked in the ERP analytics
- Form submissions create leads in the ERP system
- Emergency requests are flagged as high priority
- UTM parameters from marketing campaigns are captured
- Visitor and session IDs persist appropriately

## Files Provided:
I have the complete `erp-integration.js` script ready that just needs the CONFIG section updated with the production URLs. The script handles all the tracking, form submission, and error handling automatically.

Please implement this integration across all pages of the website and ensure the contact form has the correct field names and ID.

---