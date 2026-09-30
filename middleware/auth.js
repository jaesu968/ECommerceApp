// imports for authentication
const express = require('express');
const router = express.Router();
const db = require('../db/pool'); // database to work with db pool

// shared authentication middleware

// ensure authenticated
function ensureAuthenticated(req, res, next) {
  // 401 for not authorized because not logged in
  if(!req.isAuthenticated()){
    return res.status(401).json({message: 'You are not logged in'});
  }
  next(); // move on to next middleware
}

module.exports = { ensureAuthenticated };