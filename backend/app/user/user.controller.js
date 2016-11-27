/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/users              ->  index
 * POST    /api/users              ->  create
 * GET     /api/users/me           ->  me
 * GET     /api/users/:id          ->  show
 * PUT     /api/users/:id          ->  update
 * DELETE  /api/users/:id          ->  destroy
 * PUT     /api/users/:id/password ->  password
 */

'use strict';

var _    = require('lodash');
var User = require('./user.model');
var auth = require('../../auth/auth.service')

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

function removeEntity(res) {
  return function(entity) {
    if (entity) {
      return entity.remove()
        .then(() => {
          res.status(204).json({
            success: true,
            time: new Date().getTime()
          });
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if (!entity) {
      res.status(404).json({
        success: false,
        time: new Date().getTime(),
        message: 'User not found.'
      });
      return null;
    }
    return entity;
  };
}

function validationError(res, statusCode) {
  statusCode = statusCode || 422;
  return function(err) {
    res.status(statusCode).json(err);
  }
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

/**
 * Get list of users
 * restriction: authenticated
 */
exports.index = function(req, res) {
  return User.find({}, '-salt -password').exec()
    .then(users => {
      users.forEach((user, index) => {
        users[index] = user.profile;
      });
      return users;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Creates a new user
 */
exports.create = function(req, res) {
  return User.create(req.body)
    .then(user => {
      user.salt = undefined;
      user.password = undefined;
      var token = auth.signToken(user);
      return { user: user, token: token };
    })
    .then(respondWithResult(res, 201))
    .catch(validationError(res));
}

/**
 * Get a single user
 * restriction: authenticated
 */
exports.show = function(req, res) {
  return User.findById(req.params.id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(user => {
      if (user) {
        user = user.profile
      }
      return user;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Deletes a user
 * restriction: authenticated
 * restriction: self
 */
exports.destroy = function(req, res) {
  return User.findById(req.params.id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}

/**
 * Change a users password
 * restriction: authenticated
 * restriction: self
 */
exports.changePassword = function(req, res) {
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  return User.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(user => {
      if (user.authenticate(oldPass)) {
        user.password = newPass;
        return user.save()
          .then(() => {
            res.status(200).json({
              success: true,
              time: new Date().getTime()
            });
          })
          .catch(validationError(res));
      }
      else {
        return res.status(403).json({
          success: false,
          time: new Date().getTime(),
          message: 'Authentication failed.'
        });
      }
    })
    .catch(handleError(res));
}

/**
 * Update user infos
 * restriction: authenticated
 */
exports.update = function(req, res) {
  if (req.body.hasOwnProperty('_id')) {
    delete req.body._id;
  }
  User.findById(req.params.id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(validationError(res));
}

/**
 * Get my info
 * restriction: authenticated
 */
exports.me = function(req, res) {
  return User.findById(req.decoded._id, '-salt -password').populate('friends', '-salt -password -friends').exec()
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(validationError(res));
}

/**
 * Add a new friend
 * restriction: authenticated
 */
exports.addFriend = function(req, res) {
  const friendId = req.body.userId;
  var update;
  return User.findById(req.decoded._id, '-salt -password').exec()
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
  return User.findById(req.decoded._id, '-salt -password').exec()
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
exports.authCallback = function(req, res, next) {
  res.redirect('/');
}
