'use strict';

describe('Service: apiCall', function() {
  // load the service's module
  beforeEach(module('log3900App.apiCall'));

  // instantiate service
  var apiCall;
  beforeEach(inject(function(_apiCall_) {
    apiCall = _apiCall_;
  }));

  it('should do something', function() {
    !!apiCall.should.be.true;
  });
});
