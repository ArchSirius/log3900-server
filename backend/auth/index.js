var express     = require('express');
var auth        = require('./auth.service.js');
var router      = express.Router();

router.post('/login', auth.authenticate);

module.exports = router;
