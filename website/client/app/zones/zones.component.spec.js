'use strict';

describe('Component: ZonesComponent', function() {
  // load the controller's module
  beforeEach(module('log3900App.zones'));

  var ZonesComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($componentController) {
    ZonesComponent = $componentController('zones', {});
  }));

  it('should ...', function() {
    1.should.equal(1);
  });
});
