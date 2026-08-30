const createError = require('http-errors');
const express = require('express');
const passport = require('passport'); // import passport
const logger = require('morgan');
const dotenv = require('dotenv').config(); // import dotenv


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// setup express session 
app.use(require('express-session')({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
})); 

// wire up the passport strategy
require('./config/passport');

// intialize passport 
app.use(passport.initialize());
app.use(passport.session()); 


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/', authRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({ error: err.message });
});

module.exports = app;
