/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/zones              ->  index
 * POST    /api/zones              ->  create
 * GET     /api/zones/:id          ->  show
 * PUT     /api/zones/:id          ->  update
 * DELETE  /api/zones/:id          ->  destroy
 */

'use strict';

var _    = require('lodash');
var Zone = require('./zone.model');

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

/**
 * Get list of zones
 * restriction: authenticated
 */
exports.index = function(req, res) {
  return Zone.find({}, '-salt -password').exec()
    .then(zones => {
      zones.forEach((zone, index) => {
        zones[index] = zone.public;
      });
      return zones;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Get a single zone
 * restriction: authenticated
 */
exports.show = function(req, res) {
  return Zone.findById(req.params.id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(zone => {
      if (zone) {
        zone = zone.public
      }
      return zone;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Creates a new zone
 * restriction: authenticated
 */
exports.create = function(req, res) {
  if (req.body.hasOwnProperty('_id')) {
    delete req.body._id;
  }
  req.body.createdBy = req.decoded._id;
  return Zone.create(req.body)
    .then(zone => {
      zone.salt = undefined;
      zone.password = undefined;
      return zone;
    })
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

/**
 * Updates a zone
 * restriction: authenticated
 */
exports.update = function(req, res) {
  if (req.body.hasOwnProperty('_id')) {
    delete req.body._id;
  }
  req.body.updatedBy = req.decoded._id;
  return Zone.findById(req.params.id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Deletes a zone
 * restriction: authenticated
 */
exports.destroy = function(req, res) {
  return Zone.findById(req.params.id, '-salt -password').exec()
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
