const request = require('supertest');
const app = require('../app');
const db = require('../db/pool');

// Unique per run so repeated runs never collide on the UNIQUE constraints.
// "test_" + 13-digit timestamp = 18 chars, inside username's varchar(20).
const stamp = `test_${Date.now()}`;
const newUser = {
  username: stamp,
  password: 'secret123',
  email_address: `${stamp}@example.com`,
};

afterAll(async () => {
  // "\\_" escapes the underscore, which is a single-char wildcard in LIKE
  await db.query("DELETE FROM customers WHERE username LIKE 'test\\_%'");
  await db.end();
});

describe('POST /register', () => {
  test('creates a user and never returns the password hash', async () => {
    const res = await request(app).post('/register').send(newUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.username).toBe(newUser.username);
    expect(res.body.email_address).toBe(newUser.email_address);
    expect(res.body).not.toHaveProperty('password_hash');
    expect(res.body).not.toHaveProperty('password');
  });

  test('rejects a duplicate username with 409', async () => {
    const res = await request(app)
      .post('/register')
      .send({ ...newUser, email_address: `other_${stamp}@example.com` });

    expect(res.status).toBe(409);
  });

  test('rejects missing fields with 400', async () => {
    const res = await request(app).post('/register').send({ username: 'nopassword' });
    expect(res.status).toBe(400);
  });

  test('rejects a username longer than 20 chars with 400', async () => {
    const res = await request(app).post('/register').send({
      username: 'a'.repeat(21),
      password: 'secret123',
      email_address: 'longname@example.com',
    });
    // 400, not 500 — the guard must catch it before Postgres does
    expect(res.status).toBe(400);
  });
});

describe('POST /login', () => {
  test('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: newUser.username, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('rejects an unknown username with 401', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'nobody_here', password: 'secret123' });

    expect(res.status).toBe(401);
  });

  test('accepts correct credentials and never returns the password hash', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: newUser.username, password: newUser.password });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(newUser.username);
    expect(res.body).not.toHaveProperty('password_hash');
  });
});

describe('session lifecycle', () => {
  // An agent keeps cookies between requests — the supertest equivalent of curl -c/-b
  const agent = request.agent(app);
  const sessionUser = {
    username: `${stamp}s`,
    password: 'secret123',
    email_address: `${stamp}s@example.com`,
  };

  beforeAll(async () => {
    await agent.post('/register').send(sessionUser);
  });

  test('GET /me is 401 before logging in', async () => {
    const res = await agent.get('/me');
    expect(res.status).toBe(401);
  });

  test('GET /me returns the user after logging in', async () => {
    const login = await agent
      .post('/login')
      .send({ username: sessionUser.username, password: sessionUser.password });
    expect(login.status).toBe(200);

    // This is the deserializeUser proof: a separate request that only
    // works if the session cookie round-tripped and rehydrated req.user
    const me = await agent.get('/me');
    expect(me.status).toBe(200);
    expect(me.body.username).toBe(sessionUser.username);
    expect(me.body).not.toHaveProperty('password_hash');
  });

  test('GET /me is 401 again after logging out', async () => {
    const out = await agent.post('/logout');
    expect(out.status).toBe(200);

    const me = await agent.get('/me');
    expect(me.status).toBe(401);
  });
});
