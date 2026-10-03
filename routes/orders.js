// routes for orders
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool
const { ensureAuthenticated } = require('../middleware/auth');

// columns returned for an order, shared by both routes
const ORDER_COLUMNS = 'id, customer_id, customer_name, customer_address, email_address, date, status, total';

// load the order, checking the id, that it exists, and that it belongs to the logged-in user
async function loadOrder(req, res, next){
    const { orderId } = req.params; // get the order id from the url
    // check for a valid order id
    if(!/^\d+$/.test(orderId)){
        return res.status(400).json({ message: 'Invalid order id' });
    }

    try{
        const result = await db.query(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`, [orderId]);
        const order = result.rows[0];
        // order doesn't exist
        if(!order) return res.status(404).json({ message: 'Order not found' });
        // order belongs to someone else
        if(order.customer_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
        req.order = order;
        next();
    } catch (err){
        next(err);
    }
}

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Get a list of orders
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: A list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 */

router.get('/', ensureAuthenticated, async function (req, res, next) {
    // wrap in try-catch to handle errors
    try{
        // only the logged-in user's orders, newest first
        const result = await db.query(
            `SELECT ${ORDER_COLUMNS} FROM
            orders WHERE customer_id = $1 ORDER BY date DESC, id DESC`,
            [req.user.id]
        );
        return res.status(200).json(result.rows);
    } catch (err){
        next(err);
    }
});

/**
 * @openapi
 * /orders/{orderId}:
 *   get:
 *     summary: Get an order by id
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrderIdParam'
 *     responses:
 *       200:
 *         description: The order
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/OrderDetail' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

router.get('/:orderId', ensureAuthenticated, loadOrder, async function (req, res, next) {
    // wrap in try-catch to handle errors
    try{
        // use oi.price (the price at checkout), not a.price (today's price)
        const items = await db.query(
            `SELECT oi.album_id, a.name, oi.item_quantity, oi.price,
            (oi.price * oi.item_quantity)::numeric(10,2) AS line_total
            FROM order_items oi
            JOIN albums a ON a.id = oi.album_id
            WHERE oi.order_id = $1
            ORDER BY a.name`,
            [req.order.id]
        );
        return res.status(200).json({ ...req.order, items: items.rows });

    } catch (err){
        next(err);
    }
});


module.exports = router;