// cart testing file
const request = require('supertest');
const app = require('../app');
const db = require('../db/pool'); // database to work with db pool
const { makeUser } = require('./helpers');

// variables to keep track of the user
let user;
let firstCartId;

// before all set up a user that can be worked with
beforeAll(async () => {
    user = await makeUser('a');
});
// after all clear the query and the db connection
afterAll(async () => {
    await db.query("DELETE FROM cart_items WHERE cart_id IN (SELECT c.id FROM cart c JOIN customers u ON u.id = c.customer_id WHERE u.username LIKE 'ut\\_%')");
    await db.query("DELETE FROM cart WHERE customer_id IN (SELECT id FROM customers WHERE username LIKE 'ut\\_%')");
    await db.query("DELETE FROM customers WHERE username LIKE 'ut\\_%'");
    await db.end();
});

// testing for cart
describe('Cart', () => {

    // testing the failure path for POST /cart
    test('POST /cart with no session should return 401', async () => {
        // set up a request
        const res = await request(app).post('/cart');
        // check the response
        expect(res.status).toBe(401);
    });

    // testing the success path for POST /cart , should return 201 for first time
    test('POST /cart with session should return 201 the first time', async () => {
        // set up a request
        const res = await user.agent.post('/cart');
        // check for 201 status code
        expect(res.status).toBe(201);
        expect(res.body.customer_id).toBe(user.id); // check for customer_id
        firstCartId = res.body.id; // keep track of the first cart id
    });

    // testing POST /cart again but with the same cart, should return 200
    test('POST /cart with session should return 200', async () => {
        // set up a request
        const res = await user.agent.post('/cart'); // request the cart again
        // check for 200
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(firstCartId); // check for cart id
    });

    // testing GET /:cartId  to get the current cart by id
    test('GET /:cartId should return the current cart', async () => {
        // set up a request
        const res = await user.agent.get(`/cart/${firstCartId}`);
        // check for 200
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]); // check for empty array, cart should be empty
        expect(res.body.total).toBe(`0.00`); // check for total , should be 0 if empty
    });

    // testing POST /:cartId/items , adding an item to the cart
    test('POST /:cartId/items should add an item to the cart', async () => {
        // grab the album id
        const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/items`).send({ album_id: album.rows[0].id, item_quantity: 2 });
        // check for 200
        expect(res.status).toBe(200);
        // check to make sure items are in the items array
        expect(res.body.items).toHaveLength(1);
        // check that there are two items
        expect(res.body.items[0].item_quantity).toBe(2);
        // check for items price to be '36.00'
        expect(res.body.items[0].line_total).toBe(`36.00`);
        // check for total to be '36.00'
        expect(res.body.total).toBe(`36.00`);
    });

    // adding the same album, expect 3 total and '54.00'
    test('POST /:cartId/items should add another item to the cart', async () => {
        // grab the album id
        const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/items`).send({ album_id: album.rows[0].id, item_quantity: 1 });
        // check for 200
        expect(res.status).toBe(200);
        // check to make sure items are in the items array
        expect(res.body.items).toHaveLength(1);
        // check that there are two items
        expect(res.body.items[0].item_quantity).toBe(3);
        // check for items price to be '54.00'
        expect(res.body.items[0].line_total).toBe(`54.00`);
        // check for total to be '54.00'
        expect(res.body.total).toBe(`54.00`);

    });

    // try adding an album but 0 quantity, failure route , expect 400
    // guards against the CHECK constraint producing a 500 error
    test('POST /:cartId/items should fail to add an item to the cart when quantity is 0', async () => {
        // grab the album id
        const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/items`).send({ album_id: album.rows[0].id, item_quantity: 0 });
        // check for 400
        expect(res.status).toBe(400);
    });

    // test adding an album with an invalid album id, failure path, expect 400
    test('POST /:cartId/items returns 400 when the album does not exist', async () => {
        const album = 99999; // invalid album id
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/items`).send({ album_id: album, item_quantity: 1 });
        // check for 400
        expect(res.status).toBe(400);
    });

    // test put path , with updating the Blue Hour album to having quantity of 5
    test('PUT /:cartId/items should update an item in the cart', async () => {
        const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
        // set up a request
        const res = await user.agent.put(`/cart/${firstCartId}/items/${album.rows[0].id}`).send({ item_quantity: 5 });
        // check for 200
        expect(res.status).toBe(200);
        // check to make sure items are in the items array
        expect(res.body.items).toHaveLength(1);
        // check that there are two items
        expect(res.body.items[0].item_quantity).toBe(5);
        // check for items price to be '90.00'
        expect(res.body.items[0].line_total).toBe(`90.00`);
        // check for total to be '90.00'
        expect(res.body.total).toBe(`90.00`);
    });

    // test put route again, but doesn't put the album in the cart, should return 404
    // guards agains the RETURNING check
    test('PUT /:cartId/items returns 404 when the album is not in the cart', async () => {
        const album = 99999; // invalid album id
        // set up a request
        const res = await user.agent.put(`/cart/${firstCartId}/items/${album}`).send({ item_quantity: 5 });
        // check for 404
        expect(res.status).toBe(404);
    });

    // test deletion of Blue Hour, shoudl exxpect 200, empty items array, and total of '0.00'
    test('DELETE /:cartId/items should delete an item from the cart', async () => {
        const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
        // set up a request
        const res = await user.agent.delete(`/cart/${firstCartId}/items/${album.rows[0].id}`);
        // check for 200
        expect(res.status).toBe(200);
        // check to make sure no items are in the items array
        expect(res.body.items).toEqual([]); // check for empty array, cart should be empty
        // check for items price to be '0.00'
        expect(res.body.total).toBe(`0.00`);
    });

    // test trying to delete Blue Hour again, should expect a 404 error
    test('DELETE /:cartId/items returns 404 when the album is not in the cart', async () => {
        const album = 99999; // invalid album id
        // set up a request
        const res = await user.agent.delete(`/cart/${firstCartId}/items/${album}`);
        // check for 404
        expect(res.status).toBe(404);
    });

    // GET route, for /cart/abc , shoudl expect 400, this guards agains the /^d+$/ regex typo
    test('GET /abc should return 400', async () => {
        const cartId = 'abc'; // invalid cart id
        // set up a request
        const res = await user.agent.get(`/cart/${cartId}`);
        // check for 400
        expect(res.status).toBe(400);
    });

    // test another failure path, user B tries to add to A's cart , should return a 403 error
    // this guards agains a write route missing loadCart middleware
    test('GET /:cartId should return 403 for another user\'s cart', async () => {
        // make another user
        const other = await makeUser('b');
        // set up a request
        const res = await other.agent.get(`/cart/${firstCartId}`);
        // check for 403
        expect(res.status).toBe(403);
    });
    // test another failure path, user B tries to add to C's cart , same as above but with a different cart
    test('POST /:cartId/items should return 403 when adding to another user\'s cart', async () => {
        const other = await makeUser('c');
        const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
        // set up a request
        const res = await other.agent.post(`/cart/${firstCartId}/items`).send({ album_id: album.rows[0].id, item_quantity: 1 });
        // check for 403
        expect(res.status).toBe(403);
    })

    // test checkout , with placeholder since order checkout is not implemented yet, expect a 501 error
    // this guards agains the placeholder, update when checkout ships
    test('POST /:cartId/checkout should return 501', async () => {
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/checkout`);
        // check for 501
        expect(res.status).toBe(501);
    });
});