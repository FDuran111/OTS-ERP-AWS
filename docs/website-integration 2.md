# Website to ERP Integration Guide

## Overview
This guide explains how to integrate your company website with the ERP system to track page views, form submissions, and automatically create leads.

## API Endpoints

### 1. Form Submission Endpoint
**URL:** `https://your-erp-domain.com/api/public/forms`
**Method:** POST
**Headers:**
- `x-api-key: ots-website-2024-prod` (configure in .env as WEBSITE_API_KEY)
- `Content-Type: application/json`

### 2. Analytics Tracking Endpoint
**URL:** `https://your-erp-domain.com/api/public/analytics`
**Method:** POST (for tracking) / GET (for retrieving metrics)
**Headers:**
- `x-api-key: ots-website-2024-prod`
- `Content-Type: application/json`

## Website Integration Code

### 1. Basic HTML Form Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Service Request Form</title>
  <script src="https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js"></script>
</head>
<body>
  <form id="serviceRequestForm">
    <input type="text" name="firstName" placeholder="First Name" required>
    <input type="text" name="lastName" placeholder="Last Name" required>
    <input type="email" name="email" placeholder="Email" required>
    <input type="tel" name="phone" placeholder="Phone" required>
    <input type="text" name="companyName" placeholder="Company (Optional)">

    <select name="serviceType" required>
      <option value="">Select Service Type</option>
      <option value="lawn-care">Lawn Care</option>
      <option value="landscaping">Landscaping</option>
      <option value="snow-removal">Snow Removal</option>
      <option value="irrigation">Irrigation</option>
      <option value="maintenance">General Maintenance</option>
    </select>

    <select name="urgency">
      <option value="LOW">Low Priority</option>
      <option value="MEDIUM" selected>Medium Priority</option>
      <option value="HIGH">High Priority</option>
      <option value="EMERGENCY">Emergency</option>
    </select>

    <input type="date" name="preferredDate" placeholder="Preferred Date">
    <input type="time" name="preferredTime" placeholder="Preferred Time">

    <input type="text" name="street" placeholder="Street Address">
    <input type="text" name="city" placeholder="City">
    <input type="text" name="state" placeholder="State">
    <input type="text" name="zip" placeholder="ZIP Code">

    <textarea name="description" placeholder="Describe your service needs" required></textarea>

    <button type="submit">Submit Request</button>
  </form>

  <script>
    // Configuration
    const ERP_API_URL = 'https://your-erp-domain.com';
    const API_KEY = 'ots-website-2024-prod';

    // Generate or retrieve visitor ID
    function getVisitorId() {
      let visitorId = Cookies.get('visitor_id');
      if (!visitorId) {
        visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        Cookies.set('visitor_id', visitorId, { expires: 365 });
      }
      return visitorId;
    }

    // Generate session ID
    function getSessionId() {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    }

    // Track page view
    async function trackPageView() {
      const urlParams = new URLSearchParams(window.location.search);

      await fetch(`${ERP_API_URL}/api/public/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({
          pageUrl: window.location.href,
          pageTitle: document.title,
          referrer: document.referrer,
          sessionId: getSessionId(),
          visitorId: getVisitorId(),
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          utmSource: urlParams.get('utm_source'),
          utmMedium: urlParams.get('utm_medium'),
          utmCampaign: urlParams.get('utm_campaign'),
          eventType: 'page_view'
        })
      });
    }

    // Track form interactions
    let formStarted = false;
    document.getElementById('serviceRequestForm').addEventListener('focus', async function(e) {
      if (!formStarted && e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        formStarted = true;
        await fetch(`${ERP_API_URL}/api/public/analytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify({
            pageUrl: window.location.href,
            pageTitle: document.title,
            sessionId: getSessionId(),
            visitorId: getVisitorId(),
            eventType: 'form_start',
            eventData: { formId: 'serviceRequestForm' }
          })
        });
      }
    }, true);

    // Handle form submission
    document.getElementById('serviceRequestForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(e.target);
      const urlParams = new URLSearchParams(window.location.search);

      const data = {
        ...Object.fromEntries(formData),
        formId: 'serviceRequestForm',
        pageUrl: window.location.href,
        referrer: document.referrer,
        utmSource: urlParams.get('utm_source'),
        utmMedium: urlParams.get('utm_medium'),
        utmCampaign: urlParams.get('utm_campaign')
      };

      try {
        const response = await fetch(`${ERP_API_URL}/api/public/forms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
          },
          body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
          alert(`Thank you! ${result.message} Expected response time: ${result.estimatedResponseTime}`);
          e.target.reset();
          formStarted = false;
        } else {
          alert('Error: ' + (result.error || 'Failed to submit form'));
        }
      } catch (error) {
        console.error('Form submission error:', error);
        alert('Failed to submit form. Please try again or call us directly.');
      }
    });

    // Track page abandonment
    window.addEventListener('beforeunload', function() {
      if (formStarted) {
        // Use sendBeacon for reliable tracking on page exit
        const data = JSON.stringify({
          pageUrl: window.location.href,
          pageTitle: document.title,
          sessionId: getSessionId(),
          visitorId: getVisitorId(),
          eventType: 'form_abandon',
          eventData: { formId: 'serviceRequestForm' }
        });

        navigator.sendBeacon(`${ERP_API_URL}/api/public/analytics`, data);
      }
    });

    // Initialize tracking on page load
    trackPageView();
  </script>
</body>
</html>
```

### 2. React/Next.js Integration Example

```typescript
// utils/erp-integration.ts
const ERP_API_URL = process.env.NEXT_PUBLIC_ERP_API_URL || 'https://your-erp-domain.com';
const API_KEY = process.env.NEXT_PUBLIC_ERP_API_KEY || 'ots-website-2024-prod';

export interface ServiceRequestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  serviceType: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  preferredDate?: string;
  preferredTime?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  description: string;
}

export async function submitServiceRequest(data: ServiceRequestData) {
  const response = await fetch(`${ERP_API_URL}/api/public/forms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({
      ...data,
      formId: 'service-request-form',
      pageUrl: window.location.href,
      referrer: document.referrer,
      utmSource: new URLSearchParams(window.location.search).get('utm_source'),
      utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
      utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit form');
  }

  return response.json();
}

export async function trackPageView(eventType = 'page_view', eventData?: any) {
  try {
    await fetch(`${ERP_API_URL}/api/public/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        pageUrl: window.location.href,
        pageTitle: document.title,
        referrer: document.referrer,
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        eventType,
        eventData,
        ...getUTMParams(),
      }),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

function getVisitorId(): string {
  const stored = localStorage.getItem('visitor_id');
  if (stored) return stored;

  const visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('visitor_id', visitorId);
  return visitorId;
}

function getSessionId(): string {
  const stored = sessionStorage.getItem('session_id');
  if (stored) return stored;

  const sessionId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('session_id', sessionId);
  return sessionId;
}

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmTerm: params.get('utm_term'),
    utmContent: params.get('utm_content'),
  };
}
```

```tsx
// components/ServiceRequestForm.tsx
import { useState } from 'react';
import { submitServiceRequest, trackPageView } from '@/utils/erp-integration';

export function ServiceRequestForm() {
  const [loading, setLoading] = useState(false);
  const [formStarted, setFormStarted] = useState(false);

  const handleFocus = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackPageView('form_start', { formId: 'service-request' });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData) as any;

    try {
      const result = await submitServiceRequest(data);
      alert(`Success! ${result.message}`);
      (e.target as HTMLFormElement).reset();
      setFormStarted(false);
    } catch (error) {
      alert('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} onFocus={handleFocus}>
      {/* Form fields here */}
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
}
```

## Environment Variables

Add to your website's `.env` file:

```env
# For Next.js/React
NEXT_PUBLIC_ERP_API_URL=https://your-erp-domain.com
NEXT_PUBLIC_ERP_API_KEY=ots-website-2024-prod

# For the ERP system
WEBSITE_API_KEY=ots-website-2024-prod
WEBSITE_URL=https://your-website.com
```

## Security Notes

1. **API Key:** The provided API key (`ots-website-2024-prod`) should be changed in production
2. **CORS:** The ERP endpoints include CORS headers to allow cross-origin requests
3. **Rate Limiting:** Consider implementing rate limiting on the ERP side
4. **HTTPS:** Always use HTTPS in production for both website and ERP

## Testing

Test the integration locally:

1. Update WEBSITE_API_KEY in your ERP .env.local
2. Run the ERP system locally
3. Use the provided HTML example or React components
4. Submit a test form and check the Lead table in your database
5. Check analytics data in the CustomerActivity table

## Monitoring

View submitted leads in the ERP system:
- Navigate to the Leads section
- Filter by source "Website Form"
- Check LeadActivity for form submission details

View analytics:
- GET `/api/public/analytics?startDate=2024-01-01&endDate=2024-12-31`
- Returns daily metrics, top pages, and form completion rates