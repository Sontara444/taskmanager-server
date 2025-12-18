import request from 'supertest';
import mongoose from 'mongoose';
import appModule from '../src/app';
const app = appModule;

// Mock mongoose connection to avoid actual DB writes or use in-memory mongo
// For simplicity in this assessment, we might connect to a test DB or mock.
// Since requirement is "Unit tests", ideally we mock the service/model.
// But with the current structure (controller directly), integration tests are more practical 
// to verify the "business logic" in the controller without extensive refactoring.
// I will use a test database.

beforeAll(async () => {
    // Connect to a test database
    const url = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/taskmanager_test';
    await mongoose.connect(url);
});

afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.connection.close();
});

describe('Auth & Task API', () => {
    let token: string;
    let userId: string;

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('_id');
        expect(res.body).toHaveProperty('email', 'test@example.com');
    });

    it('should login the user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        // Token is in cookie, but we can't easily access it here without parsing set-cookie
        // However, we need the token for subsequent requests if we weren't using cookies or if supertest agent wasn't used.
        // Supertest agent persists cookies.
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
    });

    // Use agent for authenticated requests
    const agent = request.agent(app);

    it('should login with agent to persist cookie', async () => {
        await agent
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            })
            .expect(200);
    });

    it('should create a task', async () => {
        const res = await agent
            .post('/api/tasks')
            .send({
                title: 'Test Task',
                description: 'This is a test task',
                dueDate: new Date().toISOString(),
                priority: 'High'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('title', 'Test Task');
        expect(res.body).toHaveProperty('priority', 'High');
    });

    it('should get tasks', async () => {
        const res = await agent.get('/api/tasks');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });
});
