// orders testing file
const request = require('supertest');
const app = require('../app');
const db = require('../db/pool'); // database to work with db pool
const { makeUser } = require('./helpers');

// users and the order shared across tests
let owner;
let other;
let orderId;

// before all: create two users, and have the owner place one order
beforeAll(async () => {
    // user creation
    owner = await makeUser('o');
    other = await makeUser('p');

    // owner creates a cart and adds Blue Hour x2
    const cart = await owner.agent.post('/cart');
    const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
    await owner.agent.post(`/cart/${cart.body.id}/items`).send({ album_id: album.rows[0].id, item_quantity: 2 });

    // check out with a valid card; the response body is the new order
    const checkout = await owner.agent.post(`/cart/${cart.body.id}/checkout`)
    .send({ card_number: '4242424242424242', expiry: '12/30', cvc: '123' });
    // if the checkout status does not evaluate to 201, throw an error
    if(checkout.status !== 201){
        throw new Error(`Setup failed: checkout returned ${checkout.status} ${JSON.stringify(checkout.body)}`);
    }
    // save the order id so it can be used in the snapshot test
    orderId = checkout.body.id;
});

// after all tests close the db connection and clear out SQL
afterAll(async () => {
    await db.query("DELETE FROM order_items WHERE order_id IN (SELECT o.id FROM orders o JOIN customers u ON u.id = o.customer_id WHERE u.username LIKE 'ut\\_%')");
    await db.query("DELETE FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE username LIKE 'ut\\_%')");
    await db.query("DELETE FROM cart_items WHERE cart_id IN (SELECT c.id FROM cart c JOIN customers u ON u.id = c.customer_id WHERE u.username LIKE 'ut\\_%')");
    await db.query("DELETE FROM cart WHERE customer_id IN (SELECT id FROM customers WHERE username LIKE 'ut\\_%')");
    await db.query("DELETE FROM customers WHERE username LIKE 'ut\\_%'");
    await db.end();
});

// tests for ORDERS
describe('Orders', () => {

    // Failure path: GET /orders without logging in returns a 401 error
    test('GET /orders without logging in should return 401', async () => {
        const res = await request(app).get('/orders');
        expect(res.status).toBe(401);
    });

    // Success path: GET /orders as the owner returns 200 and an array of length 1 , whose id is orderId
    test('GET /orders as the owner should return 200 and an array of length 1', async () => {
        const res = await owner.agent.get('/orders');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].id).toBe(orderId);
    });

    // Success path: GET /orders as the other user returns 200 with [] because they have no orders
    // this proces the ' WHERE customer_id' filter part of the query works
    test('GET /orders as the other user should return 200 and an empty array', async () => {
        const res = await other.agent.get('/orders');
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(0);
    });

    // Success path: GET /orders/${orderId} as the owner returns 200 with items of length 1,
    // item_quantity 2, price '18.00', and line_total '36.00'
    test('GET /orders/:orderId as the owner returns the order with its items', async () => {
        const res = await owner.agent.get(`/orders/${orderId}`);
        expect(res.status).toBe(200);
        expect(res.body.items.length).toBe(1);
        expect(res.body.items[0].item_quantity).toBe(2);
        expect(res.body.items[0].price).toBe('18.00');
        expect(res.body.items[0].line_total).toBe('36.00');
    });

    // Failure path: GET /orders/${orderId} as the other user should return 403 because they don't own the order
    test('GET /orders/:orderId as the other user should return 403', async () => {
        const res = await other.agent.get(`/orders/${orderId}`);
        expect(res.status).toBe(403);
    });

    // Failure path: GET /orders/abc returns 400 because abc is not a valid order id
    test('GET /orders/abc should return 400', async () => {
        const res = await owner.agent.get('/orders/abc');
        expect(res.status).toBe(400);
    });

    // Failure path: GET /orders/99999 returns a 404 because 99999 is not a valid order id
    test('GET /orders/99999 should return 404', async () => {
        const res = await owner.agent.get('/orders/99999');
        expect(res.status).toBe(404);
    });

});

