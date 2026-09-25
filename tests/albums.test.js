// testing for albums
const request = require('supertest');
const app = require('../app');
const db = require('../db/pool'); // database to work with db pool

// unique per run so repeated runs never collide on the UNIQUE constraints
const newAlbum = {
    name: 'Test Album',
    genre: 'Test Genre',
    price: '9.99',
    artist_band_id: null // set in beforeAll from the seeded artist
};

// variable to hold created id
let createdId;
// seeded rows are looked up by name, because their ids change whenever the seed is re-run
let seededAlbumWithSongsId;

// before all set up an album that can be worked with
beforeAll(async () => {
    const artist = await db.query("SELECT id FROM artist_band WHERE name = 'The Midnight Signal'");
    const album = await db.query("SELECT id FROM albums WHERE name = 'Neon Overpass'");
    if (!artist.rows[0] || !album.rows[0]) {
        throw new Error('Seed data missing: run psql -d PhysicalCDStore -f db/seed.sql');
    }
    newAlbum.artist_band_id = artist.rows[0].id;
    seededAlbumWithSongsId = album.rows[0].id;

    const res = await request(app).post('/albums').send(newAlbum);
    createdId = res.body.id;
})

// after all clear the query and the db connection 
afterAll(async () => {
    await db.query("DELETE FROM albums WHERE name = $1", [newAlbum.name]);
    await db.end();
}); 

// get requests
describe('GET request to get albums', () => {

    // test the get route for albums
    test('GET /albums, returns all albums', async () => {
        const response = await request(app).get('/albums');
        const found = response.body.find(album => album.id === createdId);

        expect(found).toBeDefined();
        expect(found.name).toBe(newAlbum.name);
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);
    });

    // test the get route where a specific genre is requested
    test('GET /albums?genre=Rock, returns albums of a specific genre', async () => {
        const response = await request(app).get('/albums?genre=Rock');
        const found = response.body.find(album => album.genre === 'Rock');

        expect(found).toBeDefined();
        expect(response.statusCode).toBe(200);
        expect(response.body.length).toBeGreaterThan(0);

    });

    // test failure of get route to id that does not exist
    test('GET /albums/99999, returns a 400 status code when an id does not exist', async () => {
        const response = await request(app).get('/albums/99999');
        expect(response.statusCode).toBe(404);
    });

    // test the get route where the artist or band does not exist , expect a 400 status code
    test('GET /albums?artist=abc, returns a 400 status code when an artist or band does not exist', async () => {
        const response = await request(app).get(`/albums?artist=abc`);
        expect(response.statusCode).toBe(400);
    });

    // test the get route to get a specific album 
    test('GET /albums/:id, returns a specific album', async () => {
        const response = await request(app).get(`/albums/${createdId}`);
        // check for songs array
        expect(Array.isArray(response.body.songs)).toBe(true);
        // check for album
        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(newAlbum.name);
        expect(response.body.genre).toBe(newAlbum.genre);
        expect(response.body.price).toBe(newAlbum.price);
        expect(response.body.artist_band_id).toBe(newAlbum.artist_band_id);
    });  

    // test the get route to get a specific album with songs 
    test('GET /albums/:id, returns a specific album with songs', async () => {
        const seededAlbum = await request(app).get(`/albums/${seededAlbumWithSongsId}`);
        expect(seededAlbum.body.songs.length).toBeGreaterThan(0);
    })
    // test failure path for when an invalid album id is passed 
    test('GET /albums/1e3, returns a 400 status code when an invalid album id is passed', async () => {
        const response = await request(app).get('/albums/1e3');
        expect(response.statusCode).toBe(400);
        
    })
}); 

// Post request to create a new album
describe('POST request to create a new album', () => {
    // test creating a new album 
    test('POST /albums, creates a new album', async () => {
        const response = await request(app).post('/albums').send(newAlbum);
        expect(response.statusCode).toBe(201);
        expect(response.body.name).toBe(newAlbum.name);
        expect(response.body.genre).toBe(newAlbum.genre);
        expect(response.body.price).toBe(newAlbum.price);
        expect(response.body.artist_band_id).toBe(newAlbum.artist_band_id);
    });
    // test where the price is 0 still shows a 201 status code 
    test('POST /albums, creates a new album with a price of 0', async () => {
        const response = await request(app).post('/albums').send({ ...newAlbum, price: 0 });
        expect(response.statusCode).toBe(201);
    }); 
    // test where the price is negative and it returns a 400 status code
    test('POST /albums, return a 400 status code if price is negative', async () => {
        const response = await request(app).post('/albums').send({ ...newAlbum, price: -5 });
        expect(response.statusCode).toBe(400);
    });
    // test where no name was provided and returns a 400 status code
    test('POST /albums, return a 400 status code if name of the album is omitted', async () => {
        const response = await request(app).post('/albums').send({ ...newAlbum, name: '' });
        expect(response.statusCode).toBe(400);
    });
    // test where no genre was provided but still returns 201 status code, guarding again genre.length crash 
    test('POST /albums, creates a new album with no genre even if genre is omitted', async () => {
        const { genre, ...noGenre } = newAlbum;
        const response = await request(app).post('/albums').send(noGenre);
        expect(response.statusCode).toBe(201);
    })
    // test where there is an invalid artist_band_id, should return 400 status code
    test('POST /albums, returns a 400 status code when trying to create a new album with an invalid artist_band_id', async () => {
        const response = await request(app).post('/albums').send({ ...newAlbum, artist_band_id: 99999 });
        expect(response.statusCode).toBe(400);
    });
});


// Put request to update an existing album 
describe('PUT request to update an existing album', () => {
    // test updating an existing album successfully 
    test('PUT /albums/:id, updates an existing album', async () => {
        const response = await request(app).put(`/albums/${createdId}`).send(newAlbum);
        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(newAlbum.name);
        expect(response.body.genre).toBe(newAlbum.genre);
        expect(response.body.price).toBe(newAlbum.price);
        expect(response.body.artist_band_id).toBe(newAlbum.artist_band_id);
    });
    // test where the album name is incorrect , should return a 400 status code
    test('PUT /albums/abc, returns a 400 status code when trying to update an album name with a name that does not exist', async () => {
        const response = await request(app).put('/albums/abc').send(newAlbum);
        expect(response.statusCode).toBe(400);
    });
    // test incorrect album id # is given , should return a 404 status code
    test('PUT /albums/99999, returns 404 when trying to update an album with an incorrect id', async () => {
        const response = await request(app).put('/albums/99999').send(newAlbum);
        expect(response.statusCode).toBe(404);
    });

});

// DELETE request to delete an album 
describe('DELETE request to delete an album', () => {
    // test to see if an album can be deleted succesfully 
    test('DELETE /albums/:id, deletes an album', async () => {
        const response = await request(app).delete(`/albums/${createdId}`);
        expect(response.statusCode).toBe(200);
    });
    // test where the album id is incorrect , should return a 404 status code
    test('DELETE /albums/99999, returning a 404 status code when trying to delete an album with an incorrect id', async () => {
        const response = await request(app).delete('/albums/99999');
        expect(response.statusCode).toBe(404);
    });
    // test where a seeded album with songs 
    test('DELETE /albums/:id, return a 409 status code when trying to delete an album with songs', async () => {
        const response = await request(app).delete(`/albums/${seededAlbumWithSongsId}`);
        expect(response.statusCode).toBe(409);
    })
});

