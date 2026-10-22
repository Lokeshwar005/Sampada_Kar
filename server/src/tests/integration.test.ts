import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../db/prisma.js';

describe('Sampada Kar API Integration & Role Isolation Tests', () => {
  let citizenToken = '';
  let officerToken = '';
  let adminToken = '';
  let citizenUserId = '';
  let officerUserId = '';

  beforeAll(async () => {
    // 1. Log in as Demo Citizen
    const citizenRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'citizen.rajesh@gmail.com', password: 'CitizenPassword@123' });

    expect(citizenRes.status).toBe(200);
    citizenToken = citizenRes.body.token;
    citizenUserId = citizenRes.body.user.id;

    // 2. Log in as Demo Ward Officer (W-01, W-02)
    const officerRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'officer.sharma@sampadakar.gov.in', password: 'OfficerPassword@123' });

    expect(officerRes.status).toBe(200);
    officerToken = officerRes.body.token;
    officerUserId = officerRes.body.user.id;

    // 3. Log in as Super Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@sampadakar.gov.in', password: 'AdminPassword@123' });

    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;
  });

  it('Health endpoint returns ONLINE', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ONLINE');
  });

  it('Public Check-Your-Tax lookup works without authentication for PROP-W01-1001', async () => {
    const res = await request(app).get('/api/properties/public/lookup/PROP-W01-1001');
    expect(res.status).toBe(200);
    expect(res.body.property.propertyId).toBe('PROP-W01-1001');
    expect(res.body.taxBreakdown).toBeDefined();
    expect(res.body.taxBreakdown.baseTax).toBe(12000);
  });

  it('Role Guard: Citizen is blocked from accessing Admin User Management (/api/users)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('Role Guard: Citizen is blocked from accessing Defaulters List (/api/defaulters)', async () => {
    const res = await request(app)
      .get('/api/defaulters')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(403);
  });

  it('Role Isolation: Citizen only sees their own properties in /api/properties', async () => {
    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    const properties = res.body.properties;
    expect(properties.length).toBeGreaterThan(0);
    for (const prop of properties) {
      expect(prop.ownerId).toBe(citizenUserId);
    }
  });

  it('Role Isolation: Ward Officer only sees properties in assigned wards (W-01, W-02)', async () => {
    const res = await request(app)
      .get('/api/properties')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    const properties = res.body.properties;
    expect(properties.length).toBeGreaterThan(0);
    for (const prop of properties) {
      expect(['W-01', 'W-02']).toContain(prop.wardNumber);
    }
  });

  it('Admin can view all properties and reports dashboard', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.kpis.totalProperties).toBeGreaterThanOrEqual(15);
    expect(res.body.charts.wardCollectionChart).toBeDefined();
  });

  it('Payment verification generates valid unique receipt with amount in words', async () => {
    // Find an unpaid property belonging to citizen or senior
    const property = await prisma.property.findFirst({
      where: {
        propertyId: 'PROP-W04-1017', // Rajesh's residential house in W-04
      },
    });

    expect(property).toBeDefined();

    const payRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        propertyId: property!.id,
        paymentMode: 'MOCK_GATEWAY',
        isMock: true,
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.receiptNumber).toMatch(/^ST-2026-\d{4}$/);
    expect(payRes.body.payment.amountInWords).toContain('Rupees');
    expect(payRes.body.payment.amountInWords).toContain('Only');

    // Retrieve printable receipt
    const receiptRes = await request(app).get(`/api/payments/receipt/${payRes.body.receiptNumber}`);
    expect(receiptRes.status).toBe(200);
    expect(receiptRes.body.receipt.receiptNumber).toBe(payRes.body.receiptNumber);
  });
});
