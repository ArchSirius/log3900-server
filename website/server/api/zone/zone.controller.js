/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/zones              ->  index
 * POST    /api/zones              ->  create
 * GET     /api/zones/:id          ->  show
 * PUT     /api/zones/:id          ->  upsert
 * PATCH   /api/zones/:id          ->  patch
 * DELETE  /api/zones/:id          ->  destroy
 */

'use strict';

import jsonpatch from 'fast-json-patch';
import Node from './node.model';
import Zone from './zone.model';

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if(entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function patchUpdates(patches) {
  return function(entity) {
    try {
      jsonpatch.apply(entity, patches, /*validate*/ true);
    } catch(err) {
      return Promise.reject(err);
    }

    return entity.save();
  };
}

function removeEntity(res) {
  return function(entity) {
    if(entity) {
      return entity.remove()
        .then(() => {
          res.status(204).end();
        });
    }
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

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// Gets a list of Zones
export function index(req, res) {
  return Zone.find()
    .populate('nodes')
    .populate('createdBy updatedBy', 'username').exec()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single Zone from the DB
export function show(req, res) {
  return Zone.findById(req.params.id)
  .populate('nodes')
  .populate('createdBy updatedBy', 'username').exec()
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Creates a new Zone in the DB
export function create(req, res) {
  return Zone.create(req.body)
    .then(respondWithResult(res, 201))
    .catch(handleError(res));
}

// Upserts the given Zone in the DB at the specified ID
export function upsert(req, res) {
  if(req.body._id) {
    delete req.body._id;
  }
  return Zone.findOneAndUpdate({_id: req.params.id}, req.body, {upsert: true, setDefaultsOnInsert: true, runValidators: true})
    .populate('nodes')
    .populate('createdBy updatedBy', 'username').exec()

    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Updates an existing Zone in the DB
export function patch(req, res) {
  if(req.body._id) {
    delete req.body._id;
  }
  return Zone.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(patchUpdates(req.body))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Deletes a Zone from the DB
export function destroy(req, res) {
  return Zone.findById(req.params.id).exec()
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
}
