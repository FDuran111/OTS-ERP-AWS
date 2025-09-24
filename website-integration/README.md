# Website to ERP Integration Guide

## Quick Start for Static HTML Website

### 1. Copy Integration Files
Copy these files to your website repository:
```bash
# From ERP repo
cp website-integration/erp-integration.js ~/path/to/ots-website/js/
cp website-integration/contact-form-update.html ~/path/to/ots-website/
```

### 2. Add Script to Your HTML Pages

Add this line before the closing `</body>` tag in all your HTML files:

```html
<!-- ERP Integration for Analytics and Forms -->
<script src="js/erp-integration.js"></script>
</body>
</html>
```

### 3. Update Your Contact Form

Your existing contact.html form needs these modifications:

```html
<!-- Add an ID to your form if it doesn't have one -->
<form id="contact-form" class="your-existing-classes">

  <!-- Map your existing fields to these names, or add hidden fields -->
  <input type="text" name="firstName" placeholder="First Name" required>
  <input type="text" name="lastName" placeholder="Last Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <input type="tel" name="phone" placeholder="Phone" required>

  <!-- Optional fields -->
  <input type="text" name="company" placeholder="Company">

  <!-- Service type - can be a select or hidden field -->
  <select name="serviceType">
    <option value="general-inquiry">General Inquiry</option>
    <option value="panel-upgrade">Panel Upgrade</option>
    <option value="ev-charger">EV Charger Installation</option>
    <option value="lighting">Lighting Installation</option>
    <option value="emergency">Emergency Service</option>
  </select>

  <!-- Message/Description -->
  <textarea name="message" placeholder="How can we help?" required></textarea>

  <button type="submit">Send Message</button>
</form>
```

### 4. Test Locally

1. **Run the ERP system:**
   ```bash
   cd ~/Desktop/ortmeier-job-management
   npm run dev  # Runs on http://localhost:3000
   ```

2. **Run your website on a different port:**
   ```bash
   cd ~/path/to/ots-website
   python3 -m http.server 3001
   # Visit http://localhost:3001
   ```

3. **Test the form:**
   - Open http://localhost:3001/contact.html
   - Fill out and submit the form
   - Check the browser console for debug messages
   - Check the ERP database for new leads

### 5. Configuration for Production

When deploying, update the configuration in `erp-integration.js`:

```javascript
const CONFIG = {
  // Change this to your production ERP URL
  ERP_API_URL: 'https://your-erp-domain.com',
  API_KEY: 'ots-website-2024-prod', // Change this in production
  DEBUG: false // Turn off debug logs in production
};
```

## What This Integration Does

### Automatic Tracking
- **Page Views**: Every page load is tracked with visitor ID, session ID, and UTM parameters
- **Form Interactions**: Tracks when users start filling forms
- **Form Abandonment**: Tracks if users leave without submitting

### Lead Generation
- **Form Submissions**: Automatically creates leads in the ERP
- **Priority Handling**: Emergency requests are flagged for immediate attention
- **Response Time**: Users get estimated response times based on urgency

### Data Collected
- Visitor identification (anonymous ID stored in browser)
- Session tracking
- UTM campaign parameters
- Form field data
- Page URLs and referrers
- Screen resolution and user agent

## Deployment Strategy

### Option 1: Both Repos on Same Server
If deploying both website and ERP to AWS:
1. Deploy ERP to ECS (already done)
2. Deploy static website to S3 + CloudFront
3. Use the ALB URL for API calls

### Option 2: Separate Hosting
If website is hosted elsewhere (Netlify, Vercel, etc.):
1. Ensure CORS is configured (already done)
2. Use the public ERP URL for API calls
3. Consider adding CloudFlare for additional security

### Option 3: GitHub Pages
For GitHub Pages deployment:
1. Website runs from GitHub Pages
2. ERP runs on AWS ECS
3. Use HTTPS for both (GitHub Pages provides SSL)

## Security Considerations

1. **API Key**: Change the default API key in production
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **CORS**: Already configured to accept requests from common local ports and production domain

## Testing Checklist

- [ ] Form submission creates lead in database
- [ ] Page views are tracked in CustomerActivity table
- [ ] Form abandonment is tracked
- [ ] Success/error messages display correctly
- [ ] UTM parameters are captured
- [ ] Emergency submissions are flagged properly

## Troubleshooting

### CORS Errors
Already configured to accept localhost:3001, 3002, 4000. If using a different port, update the CORS configuration in:
- `/src/app/api/public/forms/route.ts`
- `/src/app/api/public/analytics/route.ts`

### Form Not Submitting
Check browser console for:
- Network errors (is ERP running?)
- Validation errors (required fields)
- API key issues

### No Analytics Data
Verify:
- Script is loaded on all pages
- No JavaScript errors in console
- Correct ERP URL in configuration