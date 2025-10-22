import {Test, TestingModule} from '@nestjs/testing';
import {INestApplication, ValidationPipe} from '@nestjs/common';
import request from 'supertest';
import {AppModule} from '../src/app.module';
import {randomUUID} from 'node:crypto';
import {adminLogin, login, register} from "./auth.e2e-spec";


describe('Post (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({imports: [AppModule]}).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({whitelist: true, transform: true}));
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    it('GET /posts requires auth and returns list', async () => {
        await request(app.getHttpServer()).get('/posts').expect(401);

        const email = `post-list-${randomUUID()}@mail.com`;
        const password = `pw-${randomUUID()}`;
        await register(app, email, password);
        const token = await login(app, email, password);

        const res = await request(app.getHttpServer())
            .get('/posts')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /posts creates a post and validates input', async () => {
        const email = `post-create-${randomUUID()}@mail.com`;
        const password = `pw-${randomUUID()}`;
        await register(app, email, password);
        const token = await login(app, email, password);

        // invalid
        await request(app.getHttpServer())
            .post('/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({content: ''})
            .expect(400);

        const res = await request(app.getHttpServer())
            .post('/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({content: 'Hello world'})
            .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body.content).toBe('Hello world');
        expect(res.body.authorId).toBeDefined();
    });

    it('PATCH /posts/:id enforces ownership; admin can update', async () => {
        const email1 = `post-upd-1-${randomUUID()}@mail.com`;
        const pass1 = `pw-${randomUUID()}`;
        await register(app, email1, pass1);
        const token1 = await login(app, email1, pass1);

        const post = await request(app.getHttpServer())
            .post('/posts')
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'original'})
            .expect(201)
            .then((r) => r.body as { id: string });

        const email2 = `post-upd-2-${randomUUID()}@mail.com`;
        const pass2 = `pw-${randomUUID()}`;
        await register(app, email2, pass2);
        const token2 = await login(app, email2, pass2);

        // other user forbidden
        await request(app.getHttpServer())
            .patch(`/posts/${post.id}`)
            .set('Authorization', `Bearer ${token2}`)
            .send({content: 'hacked'})
            .expect(403);

        // owner can update
        const updated = await request(app.getHttpServer())
            .patch(`/posts/${post.id}`)
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'updated'})
            .expect(200)
            .then((r) => r.body);
        expect(updated.content).toBe('updated');

        // admin can update others
        const adminToken = await adminLogin(app);
        const adminUpdated = await request(app.getHttpServer())
            .patch(`/posts/${post.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({content: 'admin-updated'})
            .expect(200)
            .then((r) => r.body);
        expect(adminUpdated.content).toBe('admin-updated');
    });

    it('DELETE /posts/:id enforces ownership; admin can delete', async () => {
        const email1 = `post-del-1-${randomUUID()}@mail.com`;
        const pass1 = `pw-${randomUUID()}`;
        await register(app, email1, pass1);
        const token1 = await login(app, email1, pass1);

        const post = await request(app.getHttpServer())
            .post('/posts')
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'to delete'})
            .expect(201)
            .then((r) => r.body as { id: string });

        // other user forbidden
        const email2 = `post-del-2-${randomUUID()}@mail.com`;
        const pass2 = `pw-${randomUUID()}`;
        await register(app, email2, pass2);
        const token2 = await login(app, email2, pass2);

        await request(app.getHttpServer())
            .delete(`/posts/${post.id}`)
            .set('Authorization', `Bearer ${token2}`)
            .expect(403);

        // owner can delete
        await request(app.getHttpServer())
            .delete(`/posts/${post.id}`)
            .set('Authorization', `Bearer ${token1}`)
            .expect(200);

        // admin can delete someone else's post
        const post2 = await request(app.getHttpServer())
            .post('/posts')
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'to delete by admin'})
            .expect(201)
            .then((r) => r.body as { id: string });

        const adminToken = await adminLogin(app);
        await request(app.getHttpServer())
            .delete(`/posts/${post2.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
    });
});

