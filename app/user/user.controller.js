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
          res.status(204).end();
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
  var newUser = new User(req.body);
  return newUser.save()
    .then(function(user) {
      var token = auth.signToken(user);
      return { user: user, token: token };
    })
    .then(respondWithResult(res, 201))
    .catch(validationError(res));
}

/**
 * Get a single user
 */
exports.show = function(req, res) {
  return User.findById(req.params.id).exec()
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
 */
exports.destroy = function(req, res) {
  return User.findByIdAndRemove(req.params.id).exec()
    .then(() => {
      res.status(204).json({
        success: true,
        time: new Date().getTime()
      });
    })
    .catch(handleError(res));
}

/**
 * Change a users password
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
 */
exports.update = function(req, res) {
  if (req.body.hasOwnProperty('_id')) {
    delete req.body._id;
  }
  User.findOne({ _id: req.params.id }, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(validationError(res));
}

/**
 * Get my info
 */
exports.me = function(req, res) {
  return User.findOne({ _id: req.decoded._id }, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res)) // don't ever give out the password or salt
    .catch(validationError(res));
}

/**
 * Authentication callback
 */
exports.authCallback = function(req, res, next) {
  res.redirect('/');
}
