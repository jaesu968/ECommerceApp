// testing for users 
const request = require('supertest');
const app = require('../app');
const db = require('../db/pool'); // database to work with db pool

// need to set up a user that can be worked with 
// first create a asynchronous function to make a user as needed
async function makeUser(tag){
    const agent = request.agent(app); // agent to keep cookies between requests
    const newUser = `${tag}${Date.now() % 100000}`; // unique per run so repeated runs never collide on the UNIQUE constraints
    const creds = {
        username: `ut_${newUser}`, 
        password: 'secret123',
        email_address: `ut_${newUser}@example.com`
    }; 
    const res = await agent.post('/register').send(creds);  // register the user
    await agent.post('/login').send({ username: creds.username, password: creds.password }); // log in the user
    return { agent, id: res.body.id, creds }; // return the user's id and credentials
}

// two users to work with 
let userA, userB; 
// before all set up two users that can be worked with
beforeAll(async () => {
    userA = await makeUser('a');
    userB = await makeUser('b');
});
// after all tests clear the query and the db connection
afterAll(async () => {
    await db.query("DELETE FROM cart WHERE customer_id IN (SELECT id FROM customers WHERE username LIKE 'ut\\_%')");
    await db.query("DELETE FROM customers WHERE username LIKE 'ut\\_%'");
    await db.end();
});

/* TEST GET requests */ 
describe('GET /users', () => {
    // test loading a user that has no session, should return 401
    test('GET /users/me, should return 401 when not logged in', async () => {
        const res = await request(app).get('/users/me');
        expect(res.status).toBe(401);
    });
    // test loading a user successfully, id === userA.id , no password_hash
    test('GET /users/me, should return a user when logged in', async () => {
        const res = await userA.agent.get('/users/me');
        expect (res.status).toBe(200);
        expect(res.body.id).toBe(userA.id);
        expect(res.body).not.toHaveProperty('password_hash');
    }); 
    // test loading /users/${userA.id} as A , expect 200 status code
    test('GET /users/${userA.id}, should return a user when logged in', async () => {
        const res = await userA.agent.get(`/users/${userA.id}`);
        expect (res.status).toBe(200);
        expect(res.body.id).toBe(userA.id);
    });
    // failure path - test loading /users/${userB.id} as A , should return 403 since B is not A
    test('GET /users/${userB.id}, should return 403 since B is not A', async () => {
        const res = await userA.agent.get(`/users/${userB.id}`);
        expect (res.status).toBe(403);
    }); 
    // test where user id has no session 
    test('GET /users/:id, should return 401 when not logged in', async () => {
        const res = await request(app).get(`/users/${userA.id}`);
        expect(res.status).toBe(401);
    });
}); 

/* TEST PUT requests */ 
describe('PUT /users/:id', () => {
    // test updating a user with valid name or address change
    test('PUT /users/:id, should the name of a user', async () => {
        const res = await userA.agent.put(`/users/${userA.id}`).send({ 
            name: 'updated name',
            address: '123 Main St',
            email_address: userA.creds.email_address
        });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('updated name');
        expect(res.body.address).toBe('123 Main St');
    });
    // test failure path, trying to update a user that doesn't exist 
    test('PUT /users/abc, rejects a malformed id with 403', async () => {
        const res = await userA.agent.put('/users/abc').send({ 
            name: 'updated name',
            address: '123 Main St',
            email_address: userA.creds.email_address
        });
        expect(res.status).toBe(403);
    }); 
    // test failure path, trying to update a different user's email address (i.e email already exists)
    test('PUT /users/:id, rejects an email already in use with 409', async () => {
       const res = await(userA.agent.put(`/users/${userA.id}`).send({
           name: 'updated name',
           address: '123 Main St',
           email_address: userB.creds.email_address
       }));
       expect(res.status).toBe(409);
    });
    // test trying to update current userA's id with userB's id returns 403 error
    test('PUT /users/${userB.id}, trying to update current user\'s id with userB\'s id returns 403 error', async () => {
        const res = await(userA.agent.put(`/users/${userB.id}`).send({
            name: 'updated name',
            address: '123 Main St',
            email_address: userA.creds.email_address
        }));
        expect(res.status).toBe(403);
    }); 
    // test failure path, trying to update a user that isn't logged in 
    test('PUT /users/:id, should return 401 when not logged in', async () => {
        const res = await request(app).put(`/users/${userA.id}`).send({
            email_address: 'x@example.com'
        }); 
        expect(res.status).toBe(401);
    }); 
    // test failure path, reject an empty body with 400 
    test('PUT /users/:id, reject an empty body with 400', async () => {
        const res = await userA.agent.put(`/users/${userA.id}`).send({});
        expect(res.status).toBe(400);
    }); 
});

/* Test DELETE requests */ 
describe('DELETE /users/:id', () => {
    // trying to delete a user that isn't the person logged in 
    test('DELETE /users/:id, trying to delete a user that isn\'t the person logged in, should return 403', async () => {
        const res = await userA.agent.delete(`/users/${userB.id}`);
        expect(res.status).toBe(403);
    });
    // test deleting a user , if it exists and is the person logged in, should return 200
    test('DELETE /users/:id, should delete a user', async () => {
        const temp = await makeUser('del'); // temporary user to delete
        const res = await temp.agent.delete(`/users/${temp.id}`);
        expect(res.status).toBe(200);
    });
    // test failure path, trying to delete a user that has a cart row , should return 409
    test('DELETE /users/:id, should return 409 when deleting a user with a cart row', async () => {
        const temp = await makeUser('fk'); // temporary user to delete
        await db.query('INSERT INTO cart (customer_id) VALUES ($1)', [temp.id]); // add a cart row
        const res = await temp.agent.delete(`/users/${temp.id}`);
        expect(res.status).toBe(409);
    })
});