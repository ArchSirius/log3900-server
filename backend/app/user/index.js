'use strict';

var express    = require('express');
var controller = require('./user.controller');
var auth       = require('../../auth/auth.service');
var router     = express.Router();

router.get('/', auth.isAuthenticated, controller.index);
router.delete('/:id', auth.isAuthenticated, auth.isSelf, controller.destroy);
router.get('/me', auth.isAuthenticated, controller.me);
router.put('/:id/password', auth.isAuthenticated, auth.isSelf, controller.changePassword);
router.put('/:id', auth.isAuthenticated, auth.isSelf, controller.update);
router.get('/:id', auth.isAuthenticated, controller.show);
router.post('/', controller.create);
router.post('/friend', auth.isAuthenticated, controller.addFriend);
router.post('/unfriend', auth.isAuthenticated, controller.removeFriend);

module.exports = router;
