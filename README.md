# CD Store E-Commerce API

A REST API for an online store that sells physical CDs. Customers can register, browse albums and artists, manage a shopping cart, check out with a (simulated) card payment, and view their past orders.

Built with **Node.js, Express, PostgreSQL, Passport** (session login), **Swagger** (API docs) and **Jest + Supertest** (tests).


## Setup

Requires Node.js and PostgreSQL.

1. Install dependencies:
    ```bash`
    `npm install`

2. Create the database and load the schema and sample data
- createdb PhysicalCDStore
- psql -d PhysicalCDStore -f db/schema.sql
- psql -d PhysicalCDStore -f db/seed.sql

3. Create your environment file and fill in your own values:
- cp .env.example .env
- SESSION_SECRET can be any long random string. The `DB_*` variables are your PostgreSQL connection details. Never commit .env.

4. Start the server
- `npm start` OR
- `npm run dev` (restarts on file changes)

## Using the API:
- Interactive docs are at `http://localhost:3000/api-docs`
1. Log in with POST /login in the docs page. The session cookie is then sent automatically. (NOTE: The Authorize button doesn't apply to cookie sessions.)
2. Checkout uses a fake payment. The test cards are as follows: `4242424242424242` succeeds , while `4000000000000002` fails (declines) giving a 402 error

## Endpoints
- Auth: `POST /register`, `POST /login`, and `POST /logout`
- Users: `GET /users/me`, `GET / PUT / DELETE /users/{id}`
- Albums: `GET /POST /albums`, `GET / PUT / DELETE /albums/{id}`
- Artists: `GET /POST /artists`, `GET / PUT / DELETE /artists/{id}`
- Cart: `POST /cart`, `GET /cart/{cartId}`, `POST /cart/{cartId}/items`, `PUT / DELETE /cart/{cartId}/items/{albumId}`, `POST /cart/{cartId}/checkout`
- Orders: `GET /orders`, `GET /orders/{orderId}`

## Testing:
- Run `npm test`. The tests need the seeded database.

## Design notes:
- One cart per customer: This is enforced by a UNIQUE constraint. Adding an album that's already in the cart increases its quantity instead of a duplicate line.
- Checkout is a single transaction: It locks the cart row (`SELECT ... FOR UPDATE`) so the same cart can't be checked out twice at once. If the payment is declined, everything rolls back and the cart is left untouched.
- Orders keeps a records of the sale: Each order stores the prices and customer details at the time of purchase, so later price changes or profile edits don't change past orders.
- Clean error codes:
  - `401` means you're not logged in.
  - `403` means you're logged in, but the resource belongs to someone else.
  - `404` means the resource doesn't exist
  - `400` means the input is invalid.
  - `409` means the request conflicts with existing data, such as a duplicate username or deleting an artist who still has albums.
- Passwords are hashed with bcrypt and never returned by the API.
- Currently Catalog write routes are unauthenticated for demo purposes; a production version would restrict them to admins.
