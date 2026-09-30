const request = require('supertest');
const app = require('../app');

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

module.exports = { makeUser };