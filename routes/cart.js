// routes for the shopping cart
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool

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
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 */

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
 *             schema: { $ref: '#/components/schemas/CartItemInput' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 */

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
 *      401: { $ref: '#/components/responses/Unauthorized' }
 *      403: { $ref: '#/components/responses/Forbidden' }
 *      404: { $ref: '#/components/responses/NotFound' }
 */

/**
 * @openapi
 * /cart/{cartId}/checkout:
 *   post:
 *     summary: creates an Order
 *     description: creates an Order
 *     tags: [Cart]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CartIdParam'
 *     responses:
 *       201:
 *         description: Your order
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

module.exports = router;