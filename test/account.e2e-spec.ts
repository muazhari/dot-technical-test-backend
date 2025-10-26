import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { randomUUID } from 'node:crypto';
import { adminLogin, login, register } from './auth.e2e-spec';

describe('Account (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /accounts/me returns current account and requires auth', async () => {
    // unauthorized
    await request(app.getHttpServer()).get('/accounts/me').expect(401);

    const email = `acc-me-${randomUUID()}@mail.com`;
    const password = `pw-${randomUUID()}`;
    await register(app, email, password);
    const token = await login(app, email, password);

    const res = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({ email, role: 'user' });
    expect(res.body.id).toBeDefined();
  });

  it('GET /accounts lists all accounts (admin only)', async () => {
    const userEmail = `acc-list-${randomUUID()}@mail.com`;
    const userPassword = `pw-${randomUUID()}`;
    await register(app, userEmail, userPassword);
    const userToken = await login(app, userEmail, userPassword);

    // user forbidden
    await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const adminToken = await adminLogin(app);
    const res = await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('email');
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('role');
  });

  it('PATCH /accounts/:id allows self-update; forbids updating others (non-admin)', async () => {
    const email1 = `acc-upd-1-${randomUUID()}@mail.com`;
    const pass1 = `pw-${randomUUID()}`;
    await register(app, email1, pass1);
    const token1 = await login(app, email1, pass1);

    // get own id
    const me = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${token1}`)
      .expect(200)
      .then((r) => r.body);

    // self update email
    const newEmail = `new-${email1}`;
    const updated = await request(app.getHttpServer())
      .patch(`/accounts/${me.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: newEmail })
      .expect(200)
      .then((r) => r.body);
    expect(updated.email).toBe(newEmail);

    // create another user and get their id
    const email2 = `acc-upd-2-${randomUUID()}@mail.com`;
    const pass2 = `pw-${randomUUID()}`;
    await register(app, email2, pass2);
    const token2 = await login(app, email2, pass2);
    const me2 = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200)
      .then((r) => r.body);

    // user1 attempts to update user2 -> forbidden
    await request(app.getHttpServer())
      .patch(`/accounts/${me2.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ email: `x-${email2}` })
      .expect(403);
  });

  it('PATCH /accounts/:id admin can update others', async () => {
    const victimEmail = `acc-admin-upd-${randomUUID()}@mail.com`;
    const victimPass = `pw-${randomUUID()}`;
    await register(app, victimEmail, victimPass);

    const adminToken = await adminLogin(app);
    // fetch victim id via admin list
    const list = await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .then((r) => r.body as Array<{ id: string; email: string }>);

    const victim = list.find((a) => a.email === victimEmail)!;
    const newEmail = `adm-${victimEmail}`;
    const res = await request(app.getHttpServer())
      .patch(`/accounts/${victim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: newEmail })
      .expect(200);
    expect(res.body.email).toBe(newEmail);
  });

  it('DELETE /accounts/:id allows self delete and admin delete', async () => {
    const email = `acc-del-${randomUUID()}@mail.com`;
    const password = `pw-${randomUUID()}`;
    await register(app, email, password);
    const token = await login(app, email, password);

    const me = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .then((r) => r.body);

    // self delete
    await request(app.getHttpServer())
      .delete(`/accounts/${me.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // token still present but me should now return 404 (user deleted)
    await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    // admin deletes someone else
    const victimEmail = `acc-del-victim-${randomUUID()}@mail.com`;
    const victimPass = `pw-${randomUUID()}`;
    await register(app, victimEmail, victimPass);

    const adminToken = await adminLogin(app);
    const list = await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .then((r) => r.body as Array<{ id: string; email: string }>);

    const victim = list.find((a) => a.email === victimEmail)!;
    await request(app.getHttpServer())
      .delete(`/accounts/${victim.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
