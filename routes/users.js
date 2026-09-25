// authorization routes for users (can they actually do something?)
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool


// helper functions

// ensure authenticated
function ensureAuthenticated(req, res, next) {
  // 401 for not authorized because not logged in
  if(!req.isAuthenticated()){
    return res.status(401).json({message: 'You are not logged in'});
  }
  next(); // move on to next middleware
}

// ensure they are who they say they are
function ensureSelf(req, res, next){
  // 403 for I know who you are but you can't do that
  if(req.user.id !== Number(req.params.id)){
    return res.status(403).json({message: `Forbidden: You are not authorized`});
  }
  next(); // move on to next middleware
}

// verify user has a valid user id
function validateUserId(id){
  // return an error message if id is not valid
  // use regex to check if the id is a number
  if(id && !(/^\d+$/.test(id))){
    return 'Invalid user id';
  }
  return null;
}

// validate user body
function validateUserBody({ name, address, email_address}){
  // validate email
  if (!email_address) return 'Email address is required';
  if (email_address.length > 50) return 'Email address must be 50 characters or less';
  // validate name
  if(name && name.length > 100) return 'Name must be 100 characters or less';
  // validate address
  if(address && address.length > 100) return 'Address must be 100 characters or less';
  return null;
}


/* GET requests */
/* for security only return current user not the whole user list  after login*/

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Get the current user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: The current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */

// return current user if they are logged in
router.get('/me', ensureAuthenticated, (req, res) => {
  // return the user to the client if they are logged in
  return res.status(200).json(req.user);
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Get one specific user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: The user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */

router.get('/:id', ensureAuthenticated, ensureSelf,  async function(req, res, next) {
  // grab the id from params and put into a variable for tracking
  const id = req.params.id;
  // use try-catch block to catch error in case query fails
  try{
    const sql = `SELECT id, name, address, username, email_address FROM customers WHERE id = $1`;
    const result = await db.query(sql, [id]);
    // grab the user if it is found
    const user = result.rows[0];
    // if the user is not found, throw a 404 error
    if(!user)return res.status(404).json({message: 'User is not found'});
    // return the user if it is found
    return res.status(200).json(user);
  } catch (err){
    next(err); // anything else is a genuine server error
  }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Update a specific user
 *     description: Replaces the whole record. Any field left out is cleared.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *     responses:
 *       200:
 *         description: The updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */

/* PUT request */
// update the user's information
router.put('/:id', ensureAuthenticated, ensureSelf, async function(req, res, next) {
  // grab the id from params and put into a variable for tracking
  const id = req.params.id;
  // before the query is made, check for a malformed id using helper function above
  const error = validateUserId(id);
  if(error){
    return res.status(400).json({message: error});
  }
  // destructure username and email_address from req.body
  const { name, address, email_address } = req.body;
  // use helper function to validate user body
  const bodyError = validateUserBody({ name, address, email_address });
  if(bodyError){
    return res.status(400).json({message: bodyError});
  }
  // use try-catch block to catch error in case query fails
  try{
    // form sql query to update the customer's name, address, and email address
    const sql = `UPDATE customers SET name = $1, address = $2, email_address = $3 WHERE id = $4 RETURNING id, username, name, address, email_address`;
    const result = await db.query(sql, [name, address, email_address, id]);
    // grab the user if it is found
    const user = result.rows[0];
    // if the user is not found, throw a 404 error
    if(!user)return res.status(404).json({message: 'User is not found'});
    // return the user if it is found
    return res.status(200).json(user);
  } catch (err){
    // if email_address is already in use, throw an 409 error
    if(err.code === '23505'){
      return res.status(409).json({message: 'Email address already in use'});
    }
    next(err); // anything else is a genuine server error
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete an existing user
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: The user was deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Customer'
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */

/* DELETE request*/
router.delete('/:id', ensureAuthenticated, ensureSelf, async function(req, res, next) {
  // grab the id from params and put into a variable for tracking
  const id = req.params.id;

  // use try-catch block to catch error in case query fails
  try{
    const sql = `DELETE FROM customers WHERE id = $1 RETURNING id, username, email_address`;
    const result = await db.query(sql, [id]);
    // grab the user if it is found
    const user = result.rows[0];
    // if the user is not found, throw a 404 error
    if(!user)return res.status(404).json({message: 'User is not found'});
    // return the user if it is found
    return res.status(200).json(user);
  } catch (err){
    // if user has orders or items in cart, throw a 409 error
    if(err.code === '23503'){
      return res.status(409).json({message: 'Cannot delete a user that has orders or items in cart'});
    }
    next(err); // anything else is a genuine server error
  }
})


module.exports = router;
