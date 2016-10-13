'use strict';

describe('Component: UserComponent', function() {
  // load the controller's module
  beforeEach(module('log3900App.user'));

  var UserComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($componentController) {
    UserComponent = $componentController('user', {});
  }));

  it('should ...', function() {
    1.should.equal(1);
  });
});
