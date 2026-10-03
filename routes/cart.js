// routes for the shopping cart
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool
const { ensureAuthenticated } = require('../middleware/auth'); // import middleware for authentication

// helper functions

// load up the cart
async function loadCart(req, res, next){
    const { cartId } = req.params; // get the cart id from the url
    // check for a valid cart id
    if (!/^\d+$/.test(cartId)){
        return res.status(400).json({
            message: "Invalid cart id"
        });
    }
    // use a try-catch block to handle errors
    try{
        const result = await db.query(`SELECT id, customer_id FROM cart WHERE id = $1`, [cartId]);
        // grab cart and put in variable for tracking
        const cart = result.rows[0];
        // if cart does not exist, throw error
        if (!cart) return res.status(404).json({ message: "Cart not found" });
        // if cart.customer_id and req.user.id do not match, throw error
        if (cart.customer_id !== req.user.id) return res.status(403).json({ message: "Forbidden"});
        // if cart exists, update it
        req.cart = cart;
        next();
    } catch (err){
        next(err); // anything else is a genuine server error
    }
};

// validate album id
// true for 1, 2, "3"; false for 0, -1, 1.5, "1e3", "abc", undefined
function isPositiveInteger(value) {
    return /^[1-9]\d*$/.test(String(value));
}

// grab cart details
async function getCartDetail(cart){
    // get items in cart
    const items = await db.query(
        `SELECT ci.album_id, a.name, a.price, ci.item_quantity,
        (a.price * ci.item_quantity)::numeric(10,2) AS line_total
        FROM cart_items ci
        JOIN albums a ON a.id = ci.album_id
        WHERE ci.cart_id = $1
        ORDER BY a.name`,
        [cart.id]
    );
    // get the cart total
    const total = await db.query(
        `SELECT COALESCE(SUM(a.price * ci.item_quantity), 0)::numeric(10,2) AS total
        FROM cart_items ci
        JOIN albums a ON a.id = ci.album_id
        WHERE ci.cart_id = $1`,
        [cart.id]
    );
    // return the cart details
    return {
        id: cart.id,
        customer_id: cart.customer_id,
        items: items.rows,
        total: total.rows[0].total
    };
};

// helpers for payment validation
function validatePayment({ card_number, expiry, cvc }){
    // make sure all fields have valid strings
    // check for valid card number
    if(typeof card_number !== 'string' || !/^\d{16}$/.test(card_number)) return 'card_number must be 16-digit string';
    // check for valid expiry date, should be in MM/YY format
    if(typeof expiry !== 'string' || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return 'expiry must be in MM/YY format';
    // check for valid cvc, should be 3-4 digits
    if(typeof cvc !== 'string' || !/^\d{3,4}$/.test(cvc)) return 'cvc must be 3-4 digits';

    return null; // no errors
};

// test card that always declines (Stripe-style)
const DECLINED_TEST_CARD = `4000000000000002`;
// charge the card
function chargeCard(card_number, amount){
    // if the card number is not the declined test card, return success
    return { success: card_number !== DECLINED_TEST_CARD };
}

/**
 * @openapi
 * /cart:
 *   post:
 *     summary: Get or create your cart
 *     description: Each customer has one cart. Return the existing one if it exists.
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Your existing cart
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 *       201:
 *         description: Your new cart
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 */
router.post('/', ensureAuthenticated, async function(req, res, next){
    // use try catch to handle errors
    try{
        const inserted = await db.query(
            `INSERT INTO cart (customer_id) VALUES ($1)
            ON CONFLICT (customer_id) DO NOTHING
            RETURNING id, customer_id`,
            [req.user.id]
        );
        // check for row insertion
        if(inserted.rows[0]){
            // if row was inserted, return it
            return res.status(201).json(inserted.rows[0]);
        }
        // grab existing cart to show to user
        const existing = await db.query(
            `SELECT id, customer_id FROM cart WHERE customer_id = $1`,
            [req.user.id]
        );
        return res.status(200).json(existing.rows[0]); // return existing cart
    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /cart/{cartId}:
 *   get:
 *     summary: Get your cart by id
 *     description: Get the cart by id and show the cart with items and total price.
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CartIdParam'
 *     responses:
 *       200:
 *         description: Your existing cart
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CartDetail' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 */
router.get('/:cartId', ensureAuthenticated,loadCart, async function(req, res, next){
    // wrap in try-catch to handle errors
    try{
        return res.status(200).json(await getCartDetail(req.cart));
    } catch (err){
        next(err);
    }
});

/**
 * @openapi
 * /cart/{cartId}/items:
 *   post:
 *     summary: Add an album to your cart
 *     description: Add an album to your cart
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CartIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CartItemInput' }
 *     responses:
 *       200:
 *         description: Your cart with the new album
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CartDetail' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 */
router.post('/:cartId/items', ensureAuthenticated, loadCart, async function(req, res, next){
     // variables to keep track of errors
    const { album_id, item_quantity } = req.body;
    // check if item is valid
    if(!isPositiveInteger(album_id)){
        return res.status(400).json({
            message: `album_id must be a positive integer`});
    }
    // check if quantity is valid
    if(!isPositiveInteger(item_quantity)){
        return res.status(400).json({
            message: `item_quantity must be a positive integer`});
    }
    try {
        // insert the album into the cart and update quantity if it already exists
        await db.query(
            `INSERT INTO cart_items (cart_id, album_id, item_quantity)
            VALUES ($1, $2, $3)
            ON CONFLICT (cart_id, album_id)
            DO UPDATE SET item_quantity = cart_items.item_quantity + EXCLUDED.item_quantity`,
            [req.cart.id, album_id, item_quantity]
        )
        return res.status(200).json(await getCartDetail(req.cart));

    } catch (err){
        // fires if album_id does not reference an existing album
        if(err.code === '23503'){
            return res.status(400).json({
                message: `album_id does not reference an existing album`
            });
        }
        next(err);
    }
});

/**
 * @openapi
 * /cart/{cartId}/items/{albumId}:
 *   put:
 *    summary: set quantity
 *    description: set quantity
 *    tags: [Cart]
 *    security:
 *      - cookieAuth: []
 *    parameters:
 *      - $ref: '#/components/parameters/CartIdParam'
 *      - $ref: '#/components/parameters/AlbumIdParam'
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema: { $ref: '#/components/schemas/QuantityInput' }
 *    responses:
 *      200:
 *        description: Your cart with the updated quantity
 *        content:
 *          application/json:
 *            schema: { $ref: '#/components/schemas/CartDetail' }
 *      400: { $ref: '#/components/responses/BadRequest' }
 *      401: { $ref: '#/components/responses/Unauthorized' }
 *      403: { $ref: '#/components/responses/Forbidden' }
 *      404: { $ref: '#/components/responses/NotFound' }
 *
 */
router.put('/:cartId/items/:albumId', ensureAuthenticated,loadCart, async function(req, res, next){
    // variables to keep track of album id and item quantity
    const { albumId } = req.params;
    const { item_quantity } = req.body;
    // check if item is valid
    if(!isPositiveInteger(albumId)){
        return res.status(400).json({
            message: `Invalid album id`});
    }
    // check if quantity is valid
    if(!isPositiveInteger(item_quantity)){
        return res.status(400).json({
            message: `item_quantity must be a positive integer`});
    }
    // wrap in try-catch to handle errors
    try{
        // update the quantity of the album in the cart
        const result = await db.query(
            `UPDATE cart_items SET item_quantity = $1
            WHERE cart_id = $2 AND album_id = $3
            RETURNING album_id`,
            [item_quantity, req.cart.id, albumId]
        );
        // if there is no result, throw error
        if(!result.rows[0]){
            return res.status(404).json({
                message: "That album is not in your cart"
            });
        }
        // if cart and item exist, return the cart with the item
        return res.status(200).json(await getCartDetail(req.cart));
    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /cart/{cartId}/items/{albumId}:
 *   delete:
 *    summary: Remove an album from your cart
 *    description: Remove an album from your cart
 *    tags: [Cart]
 *    security:
 *      - cookieAuth: []
 *    parameters:
 *      - $ref: '#/components/parameters/CartIdParam'
 *      - $ref: '#/components/parameters/AlbumIdParam'
 *    responses:
 *      200:
 *        description: Your cart with the album removed
 *        content:
 *          application/json:
 *            schema: { $ref: '#/components/schemas/CartDetail' }
 *      400: { $ref: '#/components/responses/BadRequest' }
 *      401: { $ref: '#/components/responses/Unauthorized' }
 *      403: { $ref: '#/components/responses/Forbidden' }
 *      404: { $ref: '#/components/responses/NotFound' }
 */
router.delete('/:cartId/items/:albumId', ensureAuthenticated, loadCart, async function(req, res, next){
    // get the album id and place it in a variable
    const { albumId } = req.params;
    // check if the album id is valid
    if(!isPositiveInteger(albumId)){
        return res.status(400).json({
            message: `Invalid album id`});
    }
    // try-catch to handle errors
    try{
        const result = await db.query(
            `DELETE FROM cart_items
            WHERE cart_id = $1 AND album_id = $2
            RETURNING album_id`,
            [req.cart.id, albumId]
        );
        // if there is no result, throw error
        if(!result.rows[0]){
            return res.status(404).json({
                message: "That album is not in your cart"
            });
        }
        // if cart and item exist, return the cart with the item removed
        return res.status(200).json(await getCartDetail(req.cart));

    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /cart/{cartId}/checkout:
 *   post:
 *     summary: Check out your cart.
 *     description: Charges the payment details, turns the cart into an order, and empties the cart. Returns 400 if the cart is empty.
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CartIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CheckoutInput' }
 *     responses:
 *       201:
 *         description: Your order
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment was declined. Use test card 4000000000000002 to trigger this.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/:cartId/checkout', ensureAuthenticated, loadCart, async function(req, res, next){
    // validdate payment before taking a connection from the pool
    const paymentError = validatePayment(req.body);
    if (paymentError) return res.status(400).json({ message: paymentError });

    // variable to keep track of the client
    let client;

    // use try-catch to handle errors
    try{
        // make a dedicated connection, so every query below runs in the same transaction
        client = await db.connect();
        // start a transaction
        await client.query('BEGIN');

        // lock the cart row so 2 checkouts of the same cart can't run at once
        await client.query('SELECT id FROM cart WHERE id = $1 FOR UPDATE', [req.cart.id]);

        // count the lines and total the cart in SQL
        const summary = await client.query(
            `SELECT COUNT(*)::int AS line_count,
            COALESCE(SUM(a.price * ci.item_quantity), 0)::numeric(10,2) AS total
            FROM cart_items ci
            JOIN albums a ON a.id = ci.album_id
            WHERE ci.cart_id = $1`,
            [req.cart.id]
        );
        // get the line count and total from the summary
        const { line_count, total } = summary.rows[0];
        // check for empty cart , now there is nothing buy
        if(line_count === 0){
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: "Your cart is empty"
            });
        }

        // charge the card once, only after we know there is something to pay for
        const charge = chargeCard(req.body.card_number, total);
        if(!charge.success){
            await client.query('ROLLBACK');
            return res.status(402).json({
                message: "Payment was declined"
            });
        }

        // create the order, snapshotting the customer's details at the time of purchase
        const orderResult = await client.query(
            `INSERT INTO orders (customer_id, customer_name, customer_address, email_address, status, total)
            VALUES ($1, $2, $3, $4, 'paid', $5)
            RETURNING id, customer_id, customer_name, customer_address, email_address, date, status, total`,
            [req.user.id, req.user.name, req.user.address, req.user.email_address, total]
        );
        // grab the order and put in a variable to work with
        const order = orderResult.rows[0];

        // copy the cart lines into order_items, snapshotting each album's current price
        await client.query(
            `INSERT INTO order_items (order_id, album_id, item_quantity, price)
            SELECT $1, ci.album_id, ci.item_quantity, a.price
            FROM cart_items ci
            JOIN albums a ON a.id = ci.album_id
            WHERE ci.cart_id = $2`,
            [order.id, req.cart.id]
        );

        // empty the cart
        await client.query(
            `DELETE FROM cart_items
            WHERE cart_id = $1`,
            [req.cart.id]
        );

        // commit the transaction
        await client.query('COMMIT');
        // return the order
        return res.status(201).json(order);


    } catch(err){
        // only roll back if we actually got a connection
        if(client) await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release(); // release the connection
    }

});

module.exports = router;