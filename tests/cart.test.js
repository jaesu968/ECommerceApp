// cart testing file
const request = require('supertest');
const app = require('../app');
const db = require('../db/pool'); // database to work with db pool
const { makeUser } = require('./helpers');

// variables to keep track of the user
let user;
let firstCartId;

// variables to keep track order
let orderId;
// a payment that passes validation and doesn't decline
const validPayment = { card_number: '4242424242424242', expiry: '12/30', cvc: '123' };

// before all set up a user that can be worked with
beforeAll(async () => {
    user = await makeUser('a');
});
// after all clear the query and the db connection
afterAll(async () => {
    await db.query("DELETE FROM order_items WHERE order_id IN (SELECT o.id FROM orders o JOIN customers u ON u.id = o.customer_id WHERE u.username LIKE 'ut\\_%')");
    await db.query("DELETE FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE username LIKE 'ut\\_%')");
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

    // GET route, for /cart/abc , should expect 400, this guards agains the /^d+$/ regex typo
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
    });

});

// testing checkout route
describe('Checkout', () => {

    // test for an empty cart , it should send back 400 error
    test('POST /:cartId/checkout should return 400 for an empty cart', async () => {
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/checkout`).send(validPayment);
        // check for 400
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Your cart is empty');
    });

    // test for a card number that does not have enough digits , should return 400
    test('POST /:cartId/checkout should return 400 for an invalid card number', async () => {
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/checkout`).send({...validPayment, card_number: '123412341234123'});
        // check for 400
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('card_number must be 16-digit string');
    });

    // test for expiration to be wrong , returns a 400 and guards against the month regex
    test('POST /:cartId/checkout should return 400 for an invalid expiration date', async () => {
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/checkout`).send({...validPayment, expiry: '13/28'});
        // check for 400
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('expiry must be in MM/YY format');
    });

    // test for numeric card_number, it should be a string, so expect this to return 400
    test('POST /:cartId/checkout should return 400 for a numeric card number', async () => {
        // set up a request
        const res = await user.agent.post(`/cart/${firstCartId}/checkout`).send({...validPayment, card_number: 1234123412341234});
        // check for 400
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('card_number must be 16-digit string');
    });

    // test for a declined card , should return a 402 error , and leave the cart untouched
    test('POST /:cartId/checkout should return 402 for a declined card', async () => {
        // add an item to the cart
        const album = await db.query("SELECT id FROM albums WHERE name = 'Blue Hour'");
        await user.agent.post(`/cart/${firstCartId}/items`).send({ album_id: album.rows[0].id, item_quantity: 2 });
        // try to check out with the test card that always declines
        const res = await user.agent.post(`/cart/${firstCartId}/checkout`).send({...validPayment, card_number: '4000000000000002'});
        // check for 402
        expect(res.status).toBe(402);
        // expect message to be 'Payment was declined'
        expect(res.body.message).toBe('Payment was declined');
        // the cart should be untouched, which shows the rollback worked
        const cartRes = await user.agent.get(`/cart/${firstCartId}`);
        expect(cartRes.status).toBe(200);
        expect(cartRes.body.items).toHaveLength(1);
        expect(cartRes.body.total).toBe(`36.00`);
    });

    // test for other user trying to checkout with a cart that isn't theirs , should return 403
    test('POST /:cartId/checkout should return 403 for another user\'s cart', async () => {
        const other = await makeUser('d');
        // try to check out with the test card that always declines
        const res = await other.agent.post(`/cart/${firstCartId}/checkout`).send({validPayment});
        // check for 403
        expect(res.status).toBe(403);
    });

    // test for a valid checkout, return 201
    test('POST /:cartId/checkout should return 201 for a valid checkout', async () => {
        // try to check out with the test card that always declines
        const res = await user.agent.post(`/cart/${firstCartId}/checkout`).send(validPayment);
        orderId = res.body.id; // save first so the snapshot test can use it
        // check for 201
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('paid');
        expect(res.body.total).toBe(`36.00`);


    });

    // Test for cart being emptied
    test('GET /:cartId is empty after checkout', async () => {
        const res = await user.agent.get(`/cart/${firstCartId}`);
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(0);
        expect(res.body.total).toBe(`0.00`);
    });

    // test for price snapshot , query the db directly and compare against the album's price
    test('checkout stores each album\'s price in order_items', async () => {
        const rows = await db.query(
            `SELECT oi.item_quantity, oi.price, a.price AS album_price
            FROM order_items oi JOIN albums a ON a.id = oi.album_id
            WHERE oi.order_id = $1`,
            [orderId]
        );
        // expect 1 row, quantity 2, and price equal to album_price ('18.00')
        expect(rows.rows).toHaveLength(1);
        expect(rows.rows[0].item_quantity).toBe(2);
        expect(rows.rows[0].price).toBe(rows.rows[0].album_price);
        expect(rows.rows[0].album_price).toBe(`18.00`);

    });


});