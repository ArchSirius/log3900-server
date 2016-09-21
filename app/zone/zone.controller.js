/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/zones              ->  index
 * POST    /api/zones              ->  create
 * GET     /api/zones/:id          ->  show
 * PUT     /api/zones/:id          ->  update
 * DELETE  /api/zones/:id          ->  destroy
 */

'use strict';

var _ = require('lodash');
var Zone = require('./zone.model');

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
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
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// Gets a list of Zones
exports.index = function(req, res) {
  return Zone.find().exec()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Zone from the DB
exports.show = function(req, res) {
  return Zone.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Zone in the DB
exports.create = function(req, res) {
  if (req.body.hasOwnProperty('_id')) {
    delete req.body._id;
  }
  return Zone.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Updates an existing Zone in the DB
exports.update = function(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  return Zone.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Zone from the DB
exports.destroy = function(req, res) {
  return Zone.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
