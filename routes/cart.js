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
 *     summary: Creates an Order
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
 *         description: Payment was declined
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post('/:cartId/checkout', ensureAuthenticated, loadCart, async function(req, res, next){
    return res.status(501).json({
        message: `Checkout not implemented yet`
    });
});

module.exports = router;