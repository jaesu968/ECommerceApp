// route for authentication
const express = require('express'); // import express
const router = express.Router(); // import router for routing
const passport = require('passport'); // import passport for authentication / authorization flow
const bcrypt = require('bcrypt'); // import bcrypt for secure passwords
// import db to query the database
const db = require('../db/pool'); // can use the db pool to query the database

/**
 * @openapi
 * /register:
 *   post:
 *     summary: register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: The user was registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */

/* POST /register , registering a new user*/
router.post('/register', async function(req, res, next) {
    // destructure username, password, and email_address from req.body
    const { username, password, email_address } = req.body;
    // validate that all 3 of these are present , if not throw a 400 error
    if(!username || !password || !email_address){
        return res.status(400).json({message: 'Username, password, and email address are required'});
    } else if (username.length > 20){
        return res.status(400).json({message: 'Username must be 20 characters or less'});
    } else if (email_address.length > 50){
        return res.status(400).json({message: 'Email address must be less than 50 characters'});
    }
    // store a hash of the password using bcrypt
    const password_hash = await bcrypt.hash(password, 10);
    // next use a try-catch block for db insertion
    try {
        // make a query to insert the user into the db
        const result = await db.query("INSERT INTO customers (username, email_address, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email_address",
            [username, email_address, password_hash]
        );
        // return the user to the client
        return res.status(201).json(result.rows[0]);
    } catch (err) {
        if(err.code === '23505'){
            // err.constraint tells you username vs email - respond with 409
            return res.status(409).json({message: 'Username or email address already exists'});
        }
        next(err); // anything else is a genuine server error
    }

});

/**
 * @openapi
 * /login:
 *   post:
 *     summary: login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: The user was logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */

// next , POST /login , logging in a user
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        // if err -> next(err); no user -> 401 with info.message; else req.logIn(user, cb)
        // })(req, res, next);
        if(err){
            next(err);
        } else if(!user){
            return res.status(401).json(info);
        } else {
            req.logIn(user, (err) => {
                if(err){
                    next(err);
                } else {
                    // send only fields that are safe to be public
                    return res.status(200).json({ id: user.id, username: user.username, email_address: user.email_address});
                }
            });
        }
    })(req, res, next);
});

/**
 * @openapi
 * /logout:
 *   post:
 *     summary: logout a user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: The user was logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: {type: string, example: Successfully logged out }
 */

// POST /logout , logging out a user
router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if(err){
            return next(err);
        } else {
            return res.json({ message: "Successfully logged out"});
        }
    });
});



module.exports = router;
