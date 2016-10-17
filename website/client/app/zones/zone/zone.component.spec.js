'use strict';

describe('Component: ZoneComponent', function() {
  // load the controller's module
  beforeEach(module('log3900App.zone'));

  var ZoneComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($componentController) {
    ZoneComponent = $componentController('zone', {});
  }));

  it('should ...', function() {
    1.should.equal(1);
  });
});
