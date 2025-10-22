import {Test, TestingModule} from '@nestjs/testing';
import {INestApplication} from '@nestjs/common';
import request from 'supertest';
import {AppModule} from '../src/app.module';
import {randomUUID} from 'node:crypto';
import {adminLogin, login, register} from "./auth.e2e-spec";


describe('Comment (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({imports: [AppModule]}).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    async function createPost(token: string, content = 'post-' + randomUUID()) {
        return request(app.getHttpServer())
            .post('/posts')
            .set('Authorization', `Bearer ${token}`)
            .send({content})
            .expect(201)
            .then((r) => r.body as { id: string });
    }

    it('GET /posts/:postId/comments requires auth and lists comments', async () => {
        const email = `c-list-${randomUUID()}@mail.com`;
        const password = `pw-${randomUUID()}`;
        await register(app, email, password);
        const token = await login(app, email, password);

        const post = await createPost(token, 'hello');

        await request(app.getHttpServer()).get(`/posts/${post.id}/comments`).expect(401);

        const res = await request(app.getHttpServer())
            .get(`/posts/${post.id}/comments`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /posts/:postId/comments creates a comment and validates input', async () => {
        const email = `c-create-${randomUUID()}@mail.com`;
        const password = `pw-${randomUUID()}`;
        await register(app, email, password);
        const token = await login(app, email, password);

        const post = await createPost(token);

        await request(app.getHttpServer())
            .post(`/posts/${post.id}/comments`)
            .set('Authorization', `Bearer ${token}`)
            .send({content: ''})
            .expect(400);

        const res = await request(app.getHttpServer())
            .post(`/posts/${post.id}/comments`)
            .set('Authorization', `Bearer ${token}`)
            .send({content: 'Nice!'})
            .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body.content).toBe('Nice!');
        expect(res.body.authorId).toBeDefined();
    });

    it('PATCH /posts/:postId/comments/:id enforces ownership; admin can update', async () => {
        const email1 = `c-upd-1-${randomUUID()}@mail.com`;
        const pass1 = `pw-${randomUUID()}`;
        await register(app, email1, pass1);
        const token1 = await login(app, email1, pass1);

        const post = await createPost(token1);

        const comment = await request(app.getHttpServer())
            .post(`/posts/${post.id}/comments`)
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'original'})
            .expect(201)
            .then((r) => r.body as { id: string });

        const email2 = `c-upd-2-${randomUUID()}@mail.com`;
        const pass2 = `pw-${randomUUID()}`;
        await register(app, email2, pass2);
        const token2 = await login(app, email2, pass2);

        await request(app.getHttpServer())
            .patch(`/posts/${post.id}/comments/${comment.id}`)
            .set('Authorization', `Bearer ${token2}`)
            .send({content: 'hacked'})
            .expect(403);

        const updated = await request(app.getHttpServer())
            .patch(`/posts/${post.id}/comments/${comment.id}`)
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'updated'})
            .expect(200)
            .then((r) => r.body);
        expect(updated.content).toBe('updated');

        const adminToken = await adminLogin(app);
        const adminUpdated = await request(app.getHttpServer())
            .patch(`/posts/${post.id}/comments/${comment.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({content: 'admin-updated'})
            .expect(200)
            .then((r) => r.body);
        expect(adminUpdated.content).toBe('admin-updated');
    });

    it('DELETE /posts/:postId/comments/:id enforces ownership; admin can delete', async () => {
        const email1 = `c-del-1-${randomUUID()}@mail.com`;
        const pass1 = `pw-${randomUUID()}`;
        await register(app, email1, pass1);
        const token1 = await login(app, email1, pass1);

        const post = await createPost(token1);

        const comment = await request(app.getHttpServer())
            .post(`/posts/${post.id}/comments`)
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'to delete'})
            .expect(201)
            .then((r) => r.body as { id: string });

        const email2 = `c-del-2-${randomUUID()}@mail.com`;
        const pass2 = `pw-${randomUUID()}`;
        await register(app, email2, pass2);
        const token2 = await login(app, email2, pass2);

        await request(app.getHttpServer())
            .delete(`/posts/${post.id}/comments/${comment.id}`)
            .set('Authorization', `Bearer ${token2}`)
            .expect(403);

        await request(app.getHttpServer())
            .delete(`/posts/${post.id}/comments/${comment.id}`)
            .set('Authorization', `Bearer ${token1}`)
            .expect(200);

        const comment2 = await request(app.getHttpServer())
            .post(`/posts/${post.id}/comments`)
            .set('Authorization', `Bearer ${token1}`)
            .send({content: 'to delete by admin'})
            .expect(201)
            .then((r) => r.body as { id: string });

        const adminToken = await adminLogin(app);
        await request(app.getHttpServer())
            .delete(`/posts/${post.id}/comments/${comment2.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
    });
});
