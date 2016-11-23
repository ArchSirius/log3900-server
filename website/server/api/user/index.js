'use strict';

import {Router} from 'express';
import * as controller from './user.controller';
import * as auth from '../../auth/auth.service';

var router = new Router();

router.get('/', auth.isAuthenticated(), controller.index);
router.delete('/:id', auth.hasRole('admin'), controller.destroy);
router.get('/me', auth.isAuthenticated(), controller.me);
router.put('/:id/password', auth.isAuthenticated(), controller.changePassword);
router.get('/:id', auth.isAuthenticated(), controller.show);
router.get('/username/:username', auth.isAuthenticated(), controller.findByUsername);
router.post('/', controller.create);
router.put('/:id', auth.isAuthenticated(), controller.updateUserInfos);
router.post('/friend', auth.isAuthenticated(), controller.addFriend);
router.post('/unfriend', auth.isAuthenticated(), controller.removeFriend);

module.exports = router;
