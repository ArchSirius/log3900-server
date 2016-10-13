'use strict';

describe('Component: UsersComponent', function() {
  // load the controller's module
  beforeEach(module('log3900App.users'));

  var UsersComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($componentController) {
    UsersComponent = $componentController('users', {});
  }));

  it('should ...', function() {
    1.should.equal(1);
  });
});
