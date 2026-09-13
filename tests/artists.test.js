// testing for artists and bands
const request = require('supertest');
const app = require('../app');
const db = require('../db/pool'); // database to work with db pool

// create a new artist or band object to work with 
const newArtist = {
    name: 'Test Artist',
    genre: 'Test Genre'
}; 

// variable to hold created id 
let createdId;

// before all set up an artist or band that can be worked with 
beforeAll(async () => {
    const res = await request(app).post('/artists').send(newArtist);
    createdId = res.body.id;
}); 

// after all clear the query and the db connection 
afterAll(async () => {
    await db.query("DELETE FROM artist_band WHERE name = $1", [newArtist.name]);
    await db.end();
}); 

// get requests' tests 
describe('GET /artists', () => {
    // test loading all the artists and bands 
    test('GET /artists, should return a list of artists and bands', async () => {
        const res = await request(app).get('/artists');
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });
    // test loading artists / bands with a specific genre
    test(`GET /artists?genre=Rock, should return a list of artists and bands with a specific genre`, async () => {
        const res = await request(app).get(`/artists?genre=Rock`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });
    // test loading the albums (make sure the array exists) of a specific band or artist 
    test(`GET /artists/:id, should return a specific artist or band`, async () => {
        const res = await request(app).get(`/artists/${createdId}`);
        const albums = res.body.albums;
        
        expect(res.status).toBe(200);
        expect(Array.isArray(albums)).toBe(true);
        expect(res.body.name).toBe(newArtist.name);
        expect(res.body.genre).toBe(newArtist.genre);
    }); 
    // test loading the albums where the array is not empty for a specific band or artist 
    test(`GET /artists/2, should return a specific artist or band with albums`, async () => {
        const res = await request(app).get(`/artists/2`);
        const albums = res.body.albums;
        
        expect(res.status).toBe(200);
        expect(Array.isArray(albums)).toBe(true);
        expect(albums.length).toBeGreaterThan(0);
    }); 
    // test that a specific artist or band id that does not exist but is valid
    test(`GET /artists/99999, should return a 404 status code for an invalid artist or band id`, async () => {
        const res = await request(app).get(`/artists/99999`);
        expect(res.status).toBe(404);
    });
    // test that an artist/band that doesn't exist returns 400 status code
    test(`GET /artists/abc, should return a 400 status code for an artist or band that doesn't exist`, async () => {
        const res = await request(app).get(`/artists/abc`);
        expect(res.status).toBe(400);
    });
    // test failure path of an invalid artist / band id 
    test(`GET /artists/1e3, should return a 400 status code for an invalid artist or band id`, async () => {
        const res = await request(app).get(`/artists/1e3`);
        expect(res.status).toBe(400);
    })
});

// tests for Post requests
describe('POST /artists', () => {
    // test creating a new artist or band and returning a 201 status code
    test('POST /artists, should create a new artist or band', async () => {
        const res = await request(app).post('/artists').send(newArtist);
        expect(res.status).toBe(201);
        expect(res.body.name).toBe(newArtist.name);
        expect(res.body.genre).toBe(newArtist.genre);
    });
    // test failure path , no name 
    test('POST /artists, rejects a missing name', async () => {
        const res = await request(app).post('/artists').send({ ...newArtist, name: '' });
        expect(res.status).toBe(400);
    });
    // test failure path, name is too long (120 characters)
    test('POST /artists, rejects a name that is over 100 characters long', async () => {
        const res = await request(app).post('/artists').send({ ...newArtist, name: 'a'.repeat(121) });
        expect(res.status).toBe(400);
    });
    // test failure path, genre is too long (30 characters)
    test('POST /artists, rejects a genre over 25 characters long', async () => {
        const res = await request(app).post('/artists').send({ ...newArtist, genre: 'a'.repeat(30) });
        expect(res.status).toBe(400);
    });
    // test path where genre is omitted and still returns 201 status code
    test('POST /artists, return a 201 status code even if genre is omitted', async () => {
        const { genre, ...noGenre } = newArtist;
        const res = await request(app).post('/artists').send(noGenre);
        expect(res.status).toBe(201);
    });
}); 

// test for Put requests 
describe('PUT /artists/:id', () => {
    // test a successful update to an existing artist or band
    // updating the name 
    test('PUT /artists/:id, should update an existing artist or band', async () => {
        const res = await request(app).put(`/artists/${createdId}`).send(newArtist);
        expect(res.status).toBe(200);
        expect(res.body.name).toBe(newArtist.name);
        expect(res.body.genre).toBe(newArtist.genre);
    }); 
    // test failure path, trying to update an artist or band that doesn't exist
    test('PUT /artists/abc, should return a 400 status code', async () => {
        const res = await request(app).put(`/artists/abc`).send(newArtist);
        expect(res.status).toBe(400);
    });
    // test failure path, trying to update an artist or band with an invalid id
    test('PUT /artists/99999, should return a 404 status code', async () => {
        const res = await request(app).put(`/artists/99999`).send(newArtist);
        expect(res.status).toBe(404);
    }); 
}); 

// test for delete requests 
describe('DELETE /artists/:id', () => {
    // test deleting an artist or band 
    test('DELETE /artists/:id, should delete an artist or band', async () => {
        const res = await request(app).delete(`/artists/${createdId}`);
        expect(res.status).toBe(200);
    });
    // test failure path, trying to delete an artist or band that's id does not exist
    test('DELETE /artists/99999, return a 404 when deleting an artist or band that does not exist', async () => {
        const res = await request(app).delete(`/artists/99999`);
        expect(res.status).toBe(404);
    }); 
    // test failure path, trying to delete an artist or band that has albums 
    test('DELETE /artists/1, return a 409 when deleting an artist or band with albums', async () => {
        const res = await request(app).delete(`/artists/1`);
        expect(res.status).toBe(409);
    });
});