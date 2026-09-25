// file for artist and bands routing
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool

// helper function to validate an arist_band id
function validateArtistBandId(id){
    // return an error message if any of the required fields are missing, or null if valid
    // use regex to check if the id is a number
    if(id && !(/^\d+$/.test(id))){
        return 'Invalid artist/band id';
    }
    return null;
}

// helper function to valide name and genre
function validateNameGenre(name, genre){
    // return an error message if any of the required fields are missing, or null if valid
    if(!name) return 'Name is required';
    if(name.length > 100) return 'Name must be 100 characters or less';
    if(genre && genre.length > 25) return 'Genre must be 25 characters or less';
    return null;
}

/**
 * @openapi
 * /artists:
 *   get:
 *     summary: Get a list of artist/bands
 *     tags: [Artists]
 *     parameters:
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *     responses:
 *       200:
 *         description: A list of artist/bands
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ArtistBand'
 *       400: { $ref: '#/components/responses/BadRequest' }
 */

// get the artist/band listing
router.get('/', async function(req, res, next) {
    // destructure genre and artist from req.query
    const { genre } = req.query;
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

    // use try-catch block to catch errors in case get query fails
    try {
        // create a variable to assist query
        const where = conditions.length ? `WHERE ${conditions.join( ' AND ')}` : '';
        // variable to hold actual query
        const sql = `SELECT a.id, a.name, a.genre FROM artist_band a ${where} ORDER BY a.name`;
        const result = await db.query(sql, values);
        // return the artist/bands if they are found
        return res.status(200).json(result.rows);
    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /artists/{id}:
 *   get:
 *     summary: Get one specific artist or band with their albums
 *     tags: [Artists]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *        description: the artist or band, with nested albums array
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/ArtistBand'
 *                - type: object
 *                  properties:
 *                    albums:
 *                      type: array
 *                      items: { $ref: '#/components/schemas/Album' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// get a specific artist/band by id
router.get('/:id', async function(req, res, next) {
    // grab the id from params and put into a variable for tracking
    const id = req.params.id;
    // before the query is made, check for a malformed id using helper function above
    const error = validateArtistBandId(id);
    if(error){
        return res.status(400).json({message: error});
    }

    // use try-catch block to catch error in case query fails
    try{
        const sql = `SELECT id, name, genre FROM artist_band WHERE id = $1`;
        const result = await db.query(sql, [id]);
        // grab the artist/band if it is found
        const artistBand = result.rows[0];
        // if the artist/band is not found, throw a 404 error
        if(!artistBand)return res.status(404).json({message: 'Artist or Band is not found'});
        // get albums for the artist/band
        const albums = await db.query(`SELECT id, name, genre, price FROM albums WHERE artist_band_id = $1 ORDER BY name`, [id]);
        artistBand.albums = albums.rows; // add albums to artist/band
        // return the artist/band if it is found
        return res.status(200).json(artistBand);
    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /artists:
 *   post:
 *     summary: Create a new artist or band
 *     tags: [Artists]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ArtistBandInput'
 *     responses:
 *       201:
 *         description: the new artist or band
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistBand'
 *       400: { $ref: '#/components/responses/BadRequest' }
 */

// post request, create a new artist or band
router.post('/', async function(req, res, next) {
    // destructure name and genre from req.body
    const { name, genre } = req.body;
    // validate name and genre using helper function
    const bodyError = validateNameGenre(name, genre);
    if(bodyError){
        return res.status(400).json({message: bodyError});
    }
    // use try-catch block to catch error in case query fails
    try{
        const sql = `INSERT INTO artist_band (name, genre) VALUES ($1, $2) RETURNING id, name, genre`;
        const result = await db.query(sql, [name, genre]);
        // return the artist/band if it is found
        return res.status(201).json(result.rows[0]);
    } catch (err){
        next(err); // anything else is a genuine server error
    }
});

/**
 * @openapi
 * /artists/{id}:
 *   put:
 *     summary: Update an existing artist or band
 *     description: Replaces the whole record. Any field left out is cleared, so send genre again if you want to keep it.
 *     tags: [Artists]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ArtistBandInput'
 *     responses:
 *       200:
 *         description: The artist or bamnd was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistBand'
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */

// put request, update an existing artist or band
router.put('/:id', async function(req, res, next) {
    // grab the id from req params
    const id = req.params.id;
    // destructure name and genre from req.body
    const { name, genre } = req.body;
    // before the query is made, check for a malformed id using helper function above
    const idError = validateArtistBandId(id);
    if(idError){
        return res.status(400).json({message: idError});
    }
    // validate name and genre using helper function
    const bodyError = validateNameGenre(name, genre);
    if(bodyError){
        return res.status(400).json({message: bodyError});
    }
    // use try-catch block to catch error in case query fails
    try{
        const sql = `UPDATE artist_band SET name = $1, genre = $2 WHERE id = $3 RETURNING id, name, genre`;
        const result = await db.query(sql, [name, genre, id]);
        // grab the artist/band if it is found
        const artistBand = result.rows[0];
        // if the artist/band is not found, throw a 404 error
        if(!artistBand)return res.status(404).json({message: 'Artist or Band is not found'});
        // return the artist/band if it is found
        return res.status(200).json(artistBand);
    } catch (err){
        next(err); // anything else is a genuine server error
}
});

/**
 * @openapi
 * /artists/{id}:
 *   delete:
 *     summary: Delete an existing artist or band
 *     tags: [Artists]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: The artist or band was deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistBand'
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */

// delete request, delete an artist or band from the database
router.delete('/:id', async function(req, res, next) {
        // grab the id from params and put into a variable for tracking
    const id = req.params.id;
    // before the query is made, check for a malformed id using helper function above
    const error = validateArtistBandId(id);
    if(error){
        return res.status(400).json({message: error});
    }
    // use try-catch block to catch error in case query fails
    try{
        const sql = `DELETE FROM artist_band WHERE id = $1 RETURNING id, name, genre`;
        const result = await db.query(sql, [id]);
        // found album put into a variable
        const artistBand = result.rows[0];
        // if the album is not found, throw a 404 error
        if(!artistBand)return res.status(404).json({message: 'Artist or Band is not found'});
        // return the album if it is found
        return res.status(200).json(artistBand);
    } catch (err){
        // err.constraint to tell the user they are trying to delete an artist or band that has albums, songs, cart items, or orders (currently in user cart)
        if(err.code === '23503'){
            return res.status(409).json({message: 'Cannot delete an artist or band that has albums, songs, cart items, or orders'});
        }
        next(err); // anything else is a genuine server error
    }
})

// export for use in app.js
module.exports = router;
