import {Test, TestingModule} from '@nestjs/testing';
import {INestApplication} from '@nestjs/common';
import request from 'supertest';
import {AppModule} from '../src/app.module';
import {randomUUID} from "node:crypto";

export async function register(app: INestApplication, email: string, password: string) {
    await request(app.getHttpServer()).post('/auths/register').send({email, password}).expect(201);
}

export async function login(app: INestApplication, email: string, password: string): Promise<string> {
    const res = await request(app.getHttpServer()).post('/auths/login').send({email, password});
    if (res.statusCode !== 201) {
        throw new Error(`Login failed for ${email}: ${res.statusCode}`);
    }
    return res.body.access_token as string;
}

export async function adminLogin(app: INestApplication) {
    return await login(app, 'admin@mail.com', 'admin');
}

describe('Auth (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({imports: [AppModule]}).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
    });

    it('register -> login', async () => {
        const email = `test-${randomUUID()}@mail.com`;
        const password = `test-${randomUUID()}`;

        await request(app.getHttpServer()).post('/auths/register').send({email, password}).expect(201);

        const res = await request(app.getHttpServer()).post('/auths/login').send({email, password}).expect(201);
        expect(res.body.access_token).toBeDefined();
    });

    it('rejects duplicate registration', async () => {
        const email = `dup-${randomUUID()}@mail.com`;
        const password = `pw-${randomUUID()}`;
        await request(app.getHttpServer()).post('/auths/register').send({email, password}).expect(201);
        await request(app.getHttpServer()).post('/auths/register').send({email, password}).expect(400);
    });

    it('login fails with wrong password', async () => {
        const email = `badpw-${randomUUID()}@mail.com`;
        const password = `pw-${randomUUID()}`;
        await request(app.getHttpServer()).post('/auths/register').send({email, password}).expect(201);
        await request(app.getHttpServer()).post('/auths/login').send({email, password: 'wrong'}).expect(401);
    });

    it('login fails for non-existing user', async () => {
        await request(app.getHttpServer()).post('/auths/login').send({
            email: `nouser-${randomUUID()}@mail.com`,
            password: 'x'
        }).expect(401);
    });
});
