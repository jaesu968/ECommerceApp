const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({
    status: 'OK',
    apiName: 'Ecommerce API', 
    apiVersion: '1.0.0'
  }); 
});

module.exports = router;
