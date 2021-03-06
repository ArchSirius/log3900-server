'use strict';

import User from './user.model';
import config from '../../config/environment';
import jwt from 'jsonwebtoken';
import _ from 'lodash';

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json({
        success: true,
        time: new Date().getTime(),
        data: entity
      });
    }
  };
}

function saveUpdates(updates) {
  return function(entity) {
    var updated = _.extend(entity, updates);
    return updated.save()
      .then(updated => {
        return updated;
      });
  };
}

function validationError(res, statusCode) {
  statusCode = statusCode || 422;
  return function(err) {
    return res.status(statusCode).json(err);
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    return res.status(statusCode).send(err);
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if(!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

/**
 * Get list of users
 */
export function index(req, res) {
  return User.find({}, '-salt -password').exec()
    .then(users => {
      res.status(200).json(users);
    })
    .catch(handleError(res));
}

/**
 * Creates a new user
 */
export function create(req, res) {
  var newUser = new User(req.body);
  newUser.provider = 'local';
  newUser.role = 'user';
  newUser.save()
    .then(function(user) {
      var token = jwt.sign({ _id: user._id }, config.secrets.session, {
        expiresIn: 60 * 60 * 5
      });
      res.json({ token });
    })
    .catch(validationError(res));
}

/**
 * Get a single user by id
 */
export function show(req, res, next) {
  var userId = req.params.id;

  return User.findById(userId).exec()
    .then(user => {
      if(!user) {
        return res.status(404).end();
      }
      res.json(user.profile);
    })
    .catch(err => next(err));
}

/**
 * Get a single user by username
 */
export function findByUsername(req, res, next) {
  var username = req.params.username;

  return User.findOne({ username : username }).exec()
    .then(user => {
      if(!user) {
        return res.status(404).end();
      }
      res.json(user.profile);
    })
    .catch(err => next(err));
}

/**
 * Deletes a user
 * restriction: 'admin'
 */
export function destroy(req, res) {
  return User.findByIdAndRemove(req.params.id).exec()
    .then(function() {
      res.status(204).end();
    })
    .catch(handleError(res));
}

/**
 * Change a users password
 */
export function changePassword(req, res) {
  var userId = req.user._id;
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  return User.findById(userId).exec()
    .then(user => {
      if(user.authenticate(oldPass)) {
        user.password = newPass;
        return user.save()
          .then(() => {
            res.status(204).end();
          })
          .catch(validationError(res));
      } else {
        return res.status(403).end();
      }
    });
}

/**
 * Get my info
 */
export function me(req, res, next) {
  var userId = req.user._id;

  return User.findOne({ _id: userId }, '-salt -password').populate('friends', '-salt -password -friends').exec()
    .then(user => { // don't ever give out the password or salt
      if(!user) {
        return res.status(401).end();
      }
      res.json(user);
    })
    .catch(err => next(err));
}

// Upserts the given User in the DB at the specified ID
export function updateUserInfos(req, res) {
  const userId = req.user._id;
  if(req.body._id) {
    delete req.body._id;
  }
  if(req.body.salt) {
    delete req.body.salt;
  }
  if(req.body.password) {
    delete req.body.password;
  }
  return User.findById(userId).exec()
    .then(user => {
      user = _.extend(user, req.body);
      return user.save()
        .then(() => {
          res.status(204).end();
        })
        .catch(validationError(res));
    });
}

/**
 * Add a new friend
 * restriction: authenticated
 */
exports.addFriend = function(req, res) {
  const friendId = req.body.userId;
  var update;
  return User.findById(req.user._id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(user => {
      update = user;
      return User.findById(friendId, '-salt -password').exec()
      .then(handleEntityNotFound(res))
      .then(friend => {
        if (!update.friends) { // for old model
          update.friends = [];
        }
        if (update.friends.indexOf(friend._id) === -1) {
          update.friends.push(friend);
        }
        return user;
      });
    })
    .then(saveUpdates(update))
    .then(respondWithResult(res))
    .catch(validationError(res));
}

/**
 * Remove a friend
 * restriction: authenticated
 */
exports.removeFriend = function(req, res) {
  const friendId = req.body.userId;
  var update;
  return User.findById(req.user._id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(user => {
      update = user;
        if (!update.friends) { // for old model
          return user;
        }
        var index = -1;
        for (var i = 0; i < update.friends.length; ++i) {
          if (String(update.friends[i]) === friendId) {
            index = i;
            break;
          }
        }
        if (index !== -1) {
          update.friends.splice(index, 1);
        }
        return user;
    })
    .then(saveUpdates(update))
    .then(respondWithResult(res))
    .catch(validationError(res));
}

/**
 * Authentication callback
 */
export function authCallback(req, res) {
  res.redirect('/');
}
