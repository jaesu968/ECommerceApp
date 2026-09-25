// routes for orders
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool

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


module.exports = router;