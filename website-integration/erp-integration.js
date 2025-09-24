// ERP Integration Script for Ortmeier Technical Services Website
// Include this file in your HTML pages to enable form submission and analytics tracking

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // For local development
    ERP_API_URL: 'http://localhost:3000',
    // For production (update when ERP is deployed)
    // ERP_API_URL: 'http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com',
    API_KEY: 'ots-website-2024-prod',
    DEBUG: true // Set to false in production
  };

  // Utility functions
  const log = (message, data = null) => {
    if (CONFIG.DEBUG) {
      console.log(`[ERP Integration] ${message}`, data || '');
    }
  };

  const generateId = (prefix) => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get or create visitor ID (persists for 1 year)
  const getVisitorId = () => {
    let visitorId = localStorage.getItem('ots_visitor_id');
    if (!visitorId) {
      visitorId = generateId('visitor');
      localStorage.setItem('ots_visitor_id', visitorId);
      log('Created new visitor ID:', visitorId);
    }
    return visitorId;
  };

  // Get or create session ID (persists for browser session)
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('ots_session_id');
    if (!sessionId) {
      sessionId = generateId('session');
      sessionStorage.setItem('ots_session_id', sessionId);
      log('Created new session ID:', sessionId);
    }
    return sessionId;
  };

  // Parse UTM parameters from URL
  const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmTerm: params.get('utm_term'),
      utmContent: params.get('utm_content')
    };
  };

  // Track page views and events
  window.OTSAnalytics = {
    track: async function(eventType = 'page_view', eventData = {}) {
      try {
        const response = await fetch(`${CONFIG.ERP_API_URL}/api/public/analytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CONFIG.API_KEY
          },
          body: JSON.stringify({
            pageUrl: window.location.href,
            pageTitle: document.title,
            referrer: document.referrer || 'direct',
            sessionId: getSessionId(),
            visitorId: getVisitorId(),
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            eventType: eventType,
            eventData: eventData,
            ...getUTMParams()
          })
        });

        if (response.ok) {
          log(`Event tracked: ${eventType}`, eventData);
        } else {
          console.error('[ERP Integration] Failed to track event:', await response.text());
        }
      } catch (error) {
        console.error('[ERP Integration] Analytics error:', error);
      }
    },

    // Track form started
    trackFormStart: function(formId) {
      this.track('form_start', { formId });
    },

    // Track form abandoned (call on page unload if form was started but not submitted)
    trackFormAbandon: function(formId) {
      this.track('form_abandon', { formId });
    }
  };

  // Submit service request form to ERP
  window.OTSForms = {
    submitServiceRequest: async function(formData) {
      try {
        // Add metadata to form data
        const enrichedData = {
          ...formData,
          formId: formData.formId || 'contact-form',
          pageUrl: window.location.href,
          referrer: document.referrer || 'direct',
          ...getUTMParams()
        };

        log('Submitting service request:', enrichedData);

        const response = await fetch(`${CONFIG.ERP_API_URL}/api/public/forms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CONFIG.API_KEY
          },
          body: JSON.stringify(enrichedData)
        });

        const result = await response.json();

        if (response.ok) {
          log('Service request submitted successfully:', result);
          return {
            success: true,
            data: result
          };
        } else {
          console.error('[ERP Integration] Form submission failed:', result);
          return {
            success: false,
            error: result.error || 'Failed to submit form',
            details: result.details
          };
        }
      } catch (error) {
        console.error('[ERP Integration] Form submission error:', error);
        return {
          success: false,
          error: 'Network error. Please try again or call us directly.'
        };
      }
    },

    // Attach to existing contact form
    attachToContactForm: function(formId = 'contact-form') {
      const form = document.getElementById(formId);
      if (!form) {
        log(`Form with ID "${formId}" not found`);
        return;
      }

      let formStarted = false;

      // Track form interaction
      form.addEventListener('focusin', function(e) {
        if (!formStarted && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          formStarted = true;
          OTSAnalytics.trackFormStart(formId);
        }
      });

      // Handle form submission
      form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        // Collect form data
        const formData = new FormData(form);
        const data = {
          firstName: formData.get('firstName') || formData.get('name')?.split(' ')[0] || '',
          lastName: formData.get('lastName') || formData.get('name')?.split(' ').slice(1).join(' ') || '',
          email: formData.get('email') || '',
          phone: formData.get('phone') || '',
          companyName: formData.get('company') || '',
          serviceType: formData.get('service') || formData.get('serviceType') || 'general-inquiry',
          urgency: formData.get('urgency') || 'MEDIUM',
          preferredDate: formData.get('preferredDate') || '',
          preferredTime: formData.get('preferredTime') || '',
          street: formData.get('street') || formData.get('address') || '',
          city: formData.get('city') || '',
          state: formData.get('state') || 'NE',
          zip: formData.get('zip') || '',
          description: formData.get('message') || formData.get('description') || '',
          formId: formId
        };

        // Submit to ERP
        const result = await OTSForms.submitServiceRequest(data);

        // Reset button
        submitButton.textContent = originalText;
        submitButton.disabled = false;

        if (result.success) {
          // Show success message
          const successMessage = document.createElement('div');
          successMessage.className = 'bg-green-500 text-white p-4 rounded-lg mt-4';
          successMessage.innerHTML = `
            <strong>✅ Thank you!</strong><br>
            ${result.data.message}<br>
            <small>Expected response time: ${result.data.estimatedResponseTime}</small>
          `;
          form.parentNode.insertBefore(successMessage, form.nextSibling);

          // Clear form
          form.reset();
          formStarted = false;

          // Remove success message after 10 seconds
          setTimeout(() => successMessage.remove(), 10000);
        } else {
          // Show error message
          const errorMessage = document.createElement('div');
          errorMessage.className = 'bg-red-500 text-white p-4 rounded-lg mt-4';
          errorMessage.innerHTML = `
            <strong>❌ Error</strong><br>
            ${result.error}<br>
            <small>Please try again or call us at (402) 625-2233</small>
          `;
          form.parentNode.insertBefore(errorMessage, form.nextSibling);

          // Remove error message after 10 seconds
          setTimeout(() => errorMessage.remove(), 10000);
        }
      });

      // Track form abandonment on page unload
      window.addEventListener('beforeunload', function() {
        if (formStarted) {
          // Use sendBeacon for reliable tracking
          const data = JSON.stringify({
            pageUrl: window.location.href,
            pageTitle: document.title,
            sessionId: getSessionId(),
            visitorId: getVisitorId(),
            eventType: 'form_abandon',
            eventData: { formId: formId }
          });

          navigator.sendBeacon(`${CONFIG.ERP_API_URL}/api/public/analytics`, data);
        }
      });

      log(`Form tracking attached to: ${formId}`);
    }
  };

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    log('Initializing ERP integration');

    // Track page view
    OTSAnalytics.track('page_view');

    // Attach to contact form if it exists
    if (document.getElementById('contact-form')) {
      OTSForms.attachToContactForm('contact-form');
    }

    // Also try common form IDs
    if (document.getElementById('contactForm')) {
      OTSForms.attachToContactForm('contactForm');
    }

    log('ERP integration initialized', {
      visitorId: getVisitorId(),
      sessionId: getSessionId()
    });
  });

})();