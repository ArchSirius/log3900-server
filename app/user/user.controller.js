'use strict';

var User = require('./user.model');
var auth = require('../../auth/auth.service')

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
      res.status(200).json({
        success: true,
        time: new Date().getTime(),
        data: users
      });
    })
    .catch(handleError(res));
}

/**
 * Creates a new user
 */
exports.create = function(req, res, next) {
  var newUser = new User(req.body);
  newUser.save()
    .then(function(user) {
      var token = auth.signToken(user);
      res.status(200).json({
        success: true,
        time: new Date().getTime(),
        data: {
          user: user.profile,
          token: token
        }
      });
    })
    .catch(validationError(res));
}

/**
 * Get a single user
 */
exports.show = function(req, res, next) {
  var userId = req.params.id;

  return User.findById(userId).exec()
    .then(user => {
      if (!user) {
        return res.status(404).json({
          success: false,
          time: new Date().getTime(),
          message: 'User not found.'
        });
      }
      res.status(200).json({
        success: false,
        time: new Date().getTime(),
        data: user.profile
      });
    })
    .catch(err => next(err));
}

/**
 * Deletes a user
 */
exports.destroy = function(req, res) {
  return User.findByIdAndRemove(req.params.id).exec()
    .then(function() {
      res.status(204).end();
    })
    .catch(handleError(res));
}

/**
 * Change a users password
 */
exports.changePassword = function(req, res, next) {
  var userId = req.params.id;
  console.log(userId);
  var oldPass = String(req.body.oldPassword);
  var newPass = String(req.body.newPassword);

  return User.findById(userId).exec()
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
    });
}

/**
 * Update user infos
 */
exports.update = function(req, res, next) {
  var userId = req.decoded._id;

  User.findOne({ _id: userId }, '-salt -password').exec()
    .then(user => {
      if (req.body.hasOwnProperty('username')) {
        user.username = req.body.username;
      }
      if (req.body.hasOwnProperty('email')) {
        user.email = req.body.email;
      }
      if (req.body.hasOwnProperty('name')) {
        user.name = req.body.name;
      }

      return user.save()
        .then(() => {
          res.status(200).json({
            success: true,
            time: new Date().getTime(),
            data: user
          });
        })
        .catch(validationError(res));
    });
}

/**
 * Get my info
 */
exports.me = function(req, res, next) {
  var userId = req.decoded._id;

  return User.findOne({ _id: userId }, '-salt -password').exec()
    .then(user => { // don't ever give out the password or salt
      if (!user) {
        return res.status(401).json({
          success: false,
          time: new Date().getTime(),
          message: 'User not found.'
        });
      }
      return res.json({
        success: true,
        time: new Date().getTime(),
        data: user
      });
    })
    .catch(err => next(err));
}

/**
 * Authentication callback
 */
exports.authCallback = function(req, res, next) {
  res.redirect('/');
}
