'use strict';

var proxyquire = require('proxyquire').noPreserveCache();

var zoneCtrlStub = {
  index: 'zoneCtrl.index',
  show: 'zoneCtrl.show',
  create: 'zoneCtrl.create',
  update: 'zoneCtrl.update',
  destroy: 'zoneCtrl.destroy'
};

var routerStub = {
  get: sinon.spy(),
  put: sinon.spy(),
  patch: sinon.spy(),
  post: sinon.spy(),
  delete: sinon.spy()
};

// require the index with our stubbed out modules
var zoneIndex = proxyquire('./index.js', {
  'express': {
    Router: function() {
      return routerStub;
    }
  },
  './zone.controller': zoneCtrlStub
});

describe('Zone API Router:', function() {

  it('should return an express router instance', function() {
    zoneIndex.should.equal(routerStub);
  });

  describe('GET /api/zones', function() {

    it('should route to zone.controller.index', function() {
      routerStub.get
        .withArgs('/', 'zoneCtrl.index')
        .should.have.been.calledOnce;
    });

  });

  describe('GET /api/zones/:id', function() {

    it('should route to zone.controller.show', function() {
      routerStub.get
        .withArgs('/:id', 'zoneCtrl.show')
        .should.have.been.calledOnce;
    });

  });

  describe('POST /api/zones', function() {

    it('should route to zone.controller.create', function() {
      routerStub.post
        .withArgs('/', 'zoneCtrl.create')
        .should.have.been.calledOnce;
    });

  });

  describe('PUT /api/zones/:id', function() {

    it('should route to zone.controller.update', function() {
      routerStub.put
        .withArgs('/:id', 'zoneCtrl.update')
        .should.have.been.calledOnce;
    });

  });

  describe('PATCH /api/zones/:id', function() {

    it('should route to zone.controller.update', function() {
      routerStub.patch
        .withArgs('/:id', 'zoneCtrl.update')
        .should.have.been.calledOnce;
    });

  });

  describe('DELETE /api/zones/:id', function() {

    it('should route to zone.controller.destroy', function() {
      routerStub.delete
        .withArgs('/:id', 'zoneCtrl.destroy')
        .should.have.been.calledOnce;
    });

  });

});
