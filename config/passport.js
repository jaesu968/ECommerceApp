// this will set up the passport local strategy
const passport = require('passport'); 
const LocalStrategy = require('passport-local').Strategy; 
const bcrypt = require('bcrypt'); 
const db = require('../db/pool');

// set up the local strategy 
passport.use(new LocalStrategy(async (username, password, done) => {
    const message = 'Incorrect username or password'; 
    // use try block to catch errors
    try {
        // query customers by username ($1 placeholder)
        const result = await db.query("SELECT id, username, email_address, name, address, password_hash FROM customers WHERE username = $1", [username]);
        // grab the first result
        const user = result.rows[0]; // result.rows is an array so the first result is at index 0 
        // check if the user exists
        if(!user){
            // if no user , return done(null, false) for callback and a message for the client
            return done(null, false, {message: `${message}`});
        }
        // check if the password is correct , using bcrypt for secure passwords
        const isMatch = await bcrypt.compare(password, user.password_hash);
        // if user is found , but password is incorrect, return done(null, false) for callback and a message for the client
        if(!isMatch){
            return done(null, false, {message: `${message}`});
        }
        // if user is found and password is correct, return done(null, user) for callback
        return done(null, user);
    } catch (error) {
        // if there is an error, return done(error) for callback
        return done(error);
    }
})); 

// Serialize the user to enable persisting the session
passport.serializeUser((user, done) => {
    // store the id and never the object
    // otherwise a profile edit leaves a stale copy in the session 
    // and you'd be placing a password hash in the session storage
    done(null, user.id);
});

// Deserialize the user from the session to persist the session
passport.deserializeUser(async (id, done) => {
    // use a try block to catch errors
    try {
        // SELECT id, username, email_address, name, address FROM customers WHERE id = $1
        const result = await db.query("SELECT id, username, email_address, name, address FROM customers WHERE id = $1", [id]);
        // grab the first result 
        const user = result.rows[0];
        // return done(null, user) for callback
        return done(null, user);
    } catch (error) {
        // if there is an error, return done(error) for callback
        return done(error);
    }
});

// export the passport middleware
module.exports = passport;