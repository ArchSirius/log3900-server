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
var Node = require('../node/node.model');
var Zone = require('./zone.model');

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      if (entity.salt) {
        delete entity.salt;
      }
      if (entity.password) {
        delete entity.password;
      }
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
  return Zone.find({}, '-salt -password')
    .populate('nodes')
    .populate('createdBy updatedBy', 'username').exec()
    .then(zones => {
      zones.forEach((zone, index) => {
        zones[index].salt = undefined;
        zones[index].password = undefined;
        if (zones[index].private) {
          zones[index].nodes = undefined;
        }
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
  return Zone.findById(req.params.id)
    .populate('nodes')
    .populate('createdBy updatedBy', 'username').exec()
    .then(handleEntityNotFound(res))
    .then(zone => {
      if (zone) {
        if (zone.private && !zone.authenticate(req.headers.password)) {
          return res.status(401).json({
            success: false,
            time: new Date().getTime(),
            data: {}
          });
        }
        zone.salt = undefined;
        zone.password = undefined;
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
  // Update user fields
  const userId = req.decoded._id;
  req.body.createdBy = userId;
  req.body.updatedBy = userId;
  const nodes = req.body.nodes;
  if (req.body.nodes) {
    delete req.body.nodes;
  }
  var zone = new Zone(req.body);
  if (nodes) {
    if (!zone.nodes) {
      zone.nodes = [];
    }
    nodes.forEach(node => {
      node.createdBy = userId;
      node.updatedBy = userId;
      zone.nodes.push(new Node(node));
    });
  }
  if (req.body.private && ! req.body.password) {
    return res.status(401).json({
      success: false,
      time: new Date().getTime(),
      data: {}
    });
  }
  return zone.save()
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
  // Update user fields
  const userId = req.decoded._id;
  req.body.updatedBy = req.decoded._id;
  if (req.body.nodes) {
    req.body.nodes.forEach(node => {
      if (!node.createdBy) {
        node.createdBy = userId;
      }
      node.updatedBy = userId;
    });
  }
  return Zone.findById(req.params.id)
    .populate('nodes')
    .populate('createdBy updatedBy', 'username').exec()
    .then(handleEntityNotFound(res))
    .then(zone => {
      if (zone && !zone.private && req.body.private && !req.body.password) {
        return res.status(401).json({
          success: false,
          time: new Date().getTime(),
          data: {}
        });
      }
      if (zone && zone.private && !zone.authenticate(req.headers.password)) {
        return res.status(401).json({
          success: false,
          time: new Date().getTime(),
          data: {}
        });
      }
      return zone;
    })
    .then(saveUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

/**
 * Deletes a zone
 * restriction: authenticated
 */
exports.destroy = function(req, res) {
  return Zone.findById(req.params.id, '-salt -password').populate('nodes').exec()
    .then(handleEntityNotFound(res))
    .then(zone => {
      if (zone.nodes) {
        zone.nodes.forEach(node => {
          node.remove();
        });
      }
      return zone;
    })
    .then(removeEntity(res))
    .catch(handleError(res));
}
