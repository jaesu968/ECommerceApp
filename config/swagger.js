// Swagger file for testing end points
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Physical CD Store API',
            version: '1.0.0',
            description: 'E-Commerce REST API for a physical CD store',
        },
        servers: [{ url: 'http://localhost:3000' }],
        components: {
            parameters: {
                IdParam: {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'integer' }
                },
                CartIdParam: {
                    in: 'path',
                    name: 'cartId',
                    required: true,
                    schema: { type: 'integer' }
                },
                AlbumIdParam: {
                    in: 'path',
                    name: 'albumId',
                    required: true,
                    schema: { type: 'integer' }
                },
            },
            schemas: {
                AlbumInput: {
                    type: 'object',
                    required: ['name', 'price', 'artist_band_id'],
                    properties: {
                        name: { type: 'string', maxLength: 100, example: 'Blue Hour'},
                        genre: { type: 'string', maxLength: 25, example: 'Rock' },
                        price: { type: 'number', minimum: 0, example: '18.99'},
                        artist_band_id: { type: 'integer', example: 2},
                    },
                },
                Album: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 3},
                        name: { type: 'string', maxLength: 100, example: 'Blue Hour'},
                        genre: { type: 'string', maxLength: 25, nullable: true },
                        price: { type: 'string', example: '18.99'},
                        artist_band_id: { type: 'integer', nullable: true },
                    },
                },
                ArtistBandInput: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', maxLength: 100, example: 'Ana Vasquez'},
                        genre: { type: 'string', maxLength: 25, example: 'Jazz' },
                    },
                },
                ArtistBand: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1},
                        name: { type: 'string', maxLength: 100, example: 'The Midnight Signal'},
                        genre: { type: 'string', maxLength: 25, nullable: true },
                    },
                },
                Song: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 5},
                        name: { type: 'string', maxLength: 50, example: 'Blue Hour'},
                        album_id: { type: 'integer', example: 3},
                    },
                },
                Customer: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1},
                        username: { type: 'string', maxLength: 20, example: 'johndoe'},
                        name: { type: 'string', maxLength: 100, example: 'John Doe'},
                        address: { type: 'string', maxLength: 100, example: '123 Main St'},
                        email_address: { type: 'string', maxLength: 50, example: 'x@example.com'},
                    },
                },
                Cart: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1},
                        customer_id: { type: 'integer', example: 1},
                    },
                },
                Order: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1},
                        customer_id: { type: 'integer', example: 1},
                        customer_name: { type: 'string', maxLength: 100, example: 'John Doe'},
                        customer_address: { type: 'string', maxLength: 100, example: '123 Main St'},
                        email_address: { type: 'string', maxLength: 50, example: 'x@example.com'},
                        date: { type: 'string', format: 'date-time', example: '2026-09-25T12:00:00.000Z'},
                        status: { type: 'string', example: 'pending'},
                        total: { type: 'string', example: '18.99'},
                    },
                },
                OrderItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1},
                        order_id: { type: 'integer', example: 1},
                        album_id: { type: 'integer', example: 1},
                        item_quantity: { type: 'integer', example: 1},
                        price: { type: 'string', example: '18.99'},
                    },
                },
                RegisterInput: {
                    type: 'object',
                    required: ['username', 'password', 'email_address'],
                    properties: {
                        username: { type: 'string', maxLength: 20, example: 'johndoe'},
                        password: { type: 'string', format: 'password', example: 'secret123'},
                        email_address: { type: 'string', maxLength: 50, example: 'x@example.com'},
                    },
                },
                LoginInput: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                        username: { type: 'string', example: 'johndoe'},
                        password: { type: 'string', format: 'password', example: 'secret123'},
                    },
                },
                UserUpdateInput: {
                    type: 'object',
                    required: ['email_address'],
                    properties: {
                        name: { type: 'string', maxLength: 100, nullable: true },
                        address: { type: 'string', maxLength: 100, nullable: true },
                        email_address: { type: 'string', maxLength: 50},
                    },
                },
                CartItemInput: {
                    type: 'object',
                    required: ['album_id', 'item_quantity'],
                    properties: {
                        album_id: { type: 'integer', example: 3},
                        item_quantity: { type: 'integer', minimum: 1, example: 2},
                    },
                },
                QuantityInput: {
                    type: 'object',
                    required: ['item_quantity'],
                    properties: {
                        item_quantity: { type: 'integer', minimum: 1, example: 2},
                    },
                },
                CartLine: {
                    type: 'object',
                    properties: {
                        album_id: { type: 'integer', example: 3},
                        name: { type: 'string', maxLength: 100, example: 'Blue Hour'},
                        price: { type: 'string', example: '18.99'},
                        item_quantity: { type: 'integer', example: 2},
                        line_total: { type: 'string', example: '36.00'},
                    },
                },
                CartDetail: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1},
                        customer_id: { type: 'integer', example: 7},
                        items: { type: 'array', items: { $ref: '#/components/schemas/CartLine' } },
                        total: { type: 'string', example: '36.00'},
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        message: { type: 'string'},
                    },
                },
            },
            responses: {
                BadRequest: { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                Unauthorized: { description: 'Not logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                Forbidden: { description: 'Not your record', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                Conflict: { description: 'Conflicts with existing data', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            },
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid',
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Registration, login, logout'},
            { name: 'Users', description: 'User profiles'},
            { name: 'Albums', description: 'Product catalog'},
            { name: 'Artists', description: 'Artists and bands'},
            { name: 'Cart', description: 'Shopping cart and checkout'},
        ]
    },
    apis: [path.join(__dirname, '../routes/*.js')],
};

module.exports = swaggerJsdoc(options);