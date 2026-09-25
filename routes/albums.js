// file for albums routing
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool

// helper function to validate an album
function validateAlbumBody({ name, genre, price, artist_band_id}){
    // return an error message if any of the required fields are missing, or null if valid
    if(!name || price === undefined || price === null || !artist_band_id){
        return 'Name, genre, price, are required';
    }
    // validate price further , must be a number and must be positive
    if (isNaN(Number(price)) || Number(price) < 0){
        return 'Price must be a positive number';
    }
    // validate name of band futher, make sure it is not longer than 100 characters
    if(name.length > 100){
        return 'Album name must be 100 characters or less';
    }
    // validate genre further, make sure it is not longer than 25 characters
    if(genre && genre.length > 25){
        return 'Genre must be 25 characters or less';
    }
    // validate artist band futher, make sure it is not malformed (it is a number)
    // using regex
    if(artist_band_id && !/^\d+$/.test(String(artist_band_id))){
        return 'Invalid artist/band id';
    }
    return null;
}

// helper function to validate an album id
function validateAlbumId(id){
    // return an error message if the id is not valid, or null if valid
    // use regex to check if the id is a number
    if(!/^\d+$/.test(id)){
        return 'Invalid album id';
    }
    return null;
}


/**
 * @openapi
 * /albums:
 *   get:
 *     summary: List albums, optionally filtered
 *     tags: [Albums]
 *     parameters:
 *       - in: query
 *         name: genre
 *         schema: { type: string }
 *         description: Exact genre match
 *         example: Jazz
 *       - in: query
 *         name: artist
 *         schema: { type: integer }
 *         description: Filter by artist_band id
 *     responses:
 *        200:
 *          description: Albums ordered by name
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                items: { $ref: '#/components/schemas/Album' }
 *        400: { $ref: '#/components/responses/BadRequest' }
 *
 */
/* Get albums listing. */
router.get('/', async function(req, res, next) {
    // destructure genre and artist from req.query
    const { genre, artist } = req.query;
    // variable to hold conditions
    const conditions = [];
    // variable to hold values
    const values = [];

    // validation to see if genre or artist is present
    // check if the there is a genre or not
    if(genre) {
        values.push(genre);
        conditions.push(`a.genre = $${values.length}`);
    }
    // check if there is artist
    if(artist){
        values.push(artist);
        conditions.push(`a.artist_band_id = $${values.length}`);
    }
    // validation to see if there is malformed genre or artist, check if it is Numeric or a string
    // check using regex
    if(artist && !/^\d+$/.test(artist)){
        return res.status(400).json({message: 'Invalid artist id'});
    }
    // use try-catch block to catch errors in case get query fails
    try {
        // create a variable to assist query
        const where = conditions.length ? `WHERE ${conditions.join( ' AND ')}` : '';
        // variable to hold actual query
        const sql = `SELECT a.id, a.name, a.genre, a.price, a.artist_band_id FROM albums a ${where} ORDER BY a.name`;
        const result = await db.query(sql, values);
        // return the albums if they are found
        return res.status(200).json(result.rows);
    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /albums/{id}:
 *   get:
 *     summary: Get one album with its songs
 *     tags: [Albums]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: The album, with a nested songs array
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Album'
 *                 - type: object
 *                   properties:
 *                     artist_band_name: { type: string, nullable: true }
 *                     songs:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Song' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

/* Get 1 album by id with it's artist and songs */
router.get('/:id', async function(req, res, next) {
    // grab id from params and put into a variable for tracking
    const id = req.params.id;


    // before the query is made, check for a malformed id
    const error = validateAlbumId(id);
    if(error){
        return res.status(400).json({message: error});
    }

    // use try-catch block to catch errors in case get query fails
    try {
        // variable for actual query
        const sql = `SELECT a.id, a.name, a.genre, a.price, ab.id as artist_band_id, ab.name as artist_band_name FROM albums a LEFT JOIN artist_band ab ON a.artist_band_id = ab.id WHERE a.id = $1`;
        const result = await db.query(sql, [id]);
        // after query is made , check if valid id, but not such row exists
        const album = result.rows[0];
        if(!album){
            return res.status(404).json({message: 'Album not found'});
        }
        // grab songs from db based on album id
        const songs = await db.query('SELECT * FROM songs WHERE album_id = $1', [id]);
        album.songs = songs.rows;
        // return the album if it is found
        return res.status(200).json(album);
    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /albums:
 *   post:
 *     summary: Create a new album
 *     tags: [Albums]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlbumInput'
 *     responses:
 *       201:
 *         description: The album was created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Album'
 *       400: { $ref: '#/components/responses/BadRequest' }
 */

// Post route to create a new album
router.post('/', async function(req, res, next) {
    // destructure name, genre, price from req.body
    const { name, genre, price, artist_band_id } = req.body;
    // validate the album body using helper function
    const error = validateAlbumBody({ name, genre, price, artist_band_id });
    if(error){
        return res.status(400).json({message: error});
    }

    // use try-catch block to catch errors in case get query fails
    try {
        // variable for actual query
        const sql = `INSERT INTO albums (name, genre, price, artist_band_id) VALUES ($1, $2, $3, $4) RETURNING id, name, genre, price, artist_band_id`;
        const result = await db.query(sql, [name, genre, price, artist_band_id]);
        // return the album if it is found
        return res.status(201).json(result.rows[0]);
    } catch (err){
        if(err.code === '23503'){
            return res.status(400).json({message: 'artist_band_id does not reference an existing artist/band'});
        }
        next(err); // anything else is a genuine server error
    }

});

/**
 * @openapi
 * /albums/{id}:
 *   put:
 *     summary: Update an existing album
 *     description: Replaces the whole record. Any field left out is cleared, so send genre again if you want to keep it.
 *     tags: [Albums]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlbumInput'
 *     responses:
 *       200:
 *         description: The album was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Album'
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// Put route to update an existing album
router.put('/:id', async function(req, res, next) {
    // grab id from params and put into a variable for tracking
    const id = req.params.id;
    // before the query is made, check for a malformed id using helper function above
    const idError = validateAlbumId(id);
    if(idError){
        return res.status(400).json({message: idError});
    }
    // destructure name, genre, price from req.body
    const { name, genre, price, artist_band_id } = req.body;
    // validate the album body using helper function
    const bodyError = validateAlbumBody({ name, genre, price, artist_band_id });
    if(bodyError){
        return res.status(400).json({message: bodyError});
    }

    // use try-catch block to catch errors in case get query fails
    try {
        // variable for actual query
        const sql = `UPDATE albums SET name = $1, genre = $2, price = $3, artist_band_id = $4 WHERE id = $5 RETURNING id, name, genre, price, artist_band_id`;
        const result = await db.query(sql, [name, genre, price, artist_band_id, id]);
        // found album put into a variable
        const album = result.rows[0];
        // if the album is not found, throw a 404 error
        if(!album)return res.status(404).json({message: 'Album not found'});
        // return the album if it is found
        return res.status(200).json(album);
    } catch (err){
        // err.constraint to tell the user they are trying to reference an artist/band that doesn't exist
        if(err.code === '23503'){
            return res.status(400).json({message: 'artist_band_id does not reference an existing artist/band'});
        }
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /albums/{id}:
 *   delete:
 *     summary: Delete an existing album
 *     tags: [Albums]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: The album was deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Album'
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */

// DELETE route to delete an album
router.delete('/:id', async function(req, res, next) {
    // grab the id from params and put into a variable for tracking
    const id = req.params.id;
    // before the query is made, check for a malformed id using helper function above
    const error = validateAlbumId(id);
    if(error){
        return res.status(400).json({message: error});
    }
    // use try-catch block to catch error in case query fails
    try{
        const sql = `DELETE FROM albums WHERE id = $1 RETURNING id, name, genre, price, artist_band_id`;
        const result = await db.query(sql, [id]);
        // found album put into a variable
        const album = result.rows[0];
        // if the album is not found, throw a 404 error
        if(!album)return res.status(404).json({message: 'Album not found'});
        // return the album if it is found
        return res.status(200).json(album);
    } catch (err){
        // err.constraint to tell the user they are trying to delete an album that has songs, cart items, or orders
        if(err.code === '23503'){
            return res.status(409).json({message: 'Cannot delete an album that has songs, cart items, or orders'});
        }
        next(err); // anything else is a genuine server error
    }
});

module.exports = router;