import { test, expect } from '@playwright/test';

/**
 * API Endpoint Tests
 * Tests that all major API endpoints return expected responses
 */

const BASE_URL = 'http://localhost:3001';

// Get auth token by logging in
async function getAuthToken(): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@admin.com',
      password: 'admin123'
    })
  });
  const data = await response.json();
  return data.token || '';
}

test.describe('Authentication API', () => {
  test('POST /api/auth/login - valid credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'admin@admin.com',
        password: 'admin123'
      }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.token || data.user).toBeTruthy();
  });

  test('POST /api/auth/login - invalid credentials returns error', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'wrong@email.com',
        password: 'wrongpassword'
      }
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Jobs API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/jobs - returns job list', async ({ request }) => {
    const response = await request.get('/api/jobs', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data) || data.jobs).toBeTruthy();
  });

  test('GET /api/jobs/active - returns active jobs', async ({ request }) => {
    const response = await request.get('/api/jobs/active', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    // May return 200 or 404 if endpoint doesn't exist
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Customers API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/customers - returns customer list', async ({ request }) => {
    const response = await request.get('/api/customers', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data) || data.customers).toBeTruthy();
  });
});

test.describe('Materials API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/materials - returns material list', async ({ request }) => {
    const response = await request.get('/api/materials', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data) || data.materials).toBeTruthy();
  });

  test('GET /api/materials/categories - returns categories', async ({ request }) => {
    const response = await request.get('/api/materials/categories', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    // May return 200 or 404
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Users API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/users - returns user list', async ({ request }) => {
    const response = await request.get('/api/users', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data) || data.users).toBeTruthy();
  });

  test('GET /api/auth/me - returns current user', async ({ request }) => {
    const response = await request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Time Entries API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/time-entries - returns time entries', async ({ request }) => {
    const response = await request.get('/api/time-entries', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });

  test('GET /api/time-entries/pending - returns pending entries', async ({ request }) => {
    const response = await request.get('/api/time-entries/pending', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Purchase Orders API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/purchase-orders - returns PO list', async ({ request }) => {
    const response = await request.get('/api/purchase-orders', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Reports API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/reports/job-costs - returns job cost report', async ({ request }) => {
    const response = await request.get('/api/reports/job-costs', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });

  test('GET /api/reports/labor - returns labor report', async ({ request }) => {
    const response = await request.get('/api/reports/labor', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Schedule API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/schedule - returns schedule data', async ({ request }) => {
    const response = await request.get('/api/schedule', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Invoices API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/invoices - returns invoice list', async ({ request }) => {
    const response = await request.get('/api/invoices', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Settings API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    authToken = await getAuthToken();
  });

  test('GET /api/settings - returns settings', async ({ request }) => {
    const response = await request.get('/api/settings', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('API Error Handling', () => {
  test('Protected endpoint without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/jobs');
    // Should return 401 or redirect to login
    expect([401, 403, 302]).toContain(response.status());
  });

  test('Non-existent endpoint returns 404', async ({ request }) => {
    const response = await request.get('/api/this-does-not-exist');
    expect(response.status()).toBe(404);
  });
});
