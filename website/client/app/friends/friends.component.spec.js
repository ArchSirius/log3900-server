'use strict';

describe('Component: FriendsComponent', function() {
  // load the controller's module
  beforeEach(module('log3900App.friends'));

  var FriendsComponent;

  // Initialize the controller and a mock scope
  beforeEach(inject(function($componentController) {
    FriendsComponent = $componentController('friends', {});
  }));

  it('should ...', function() {
    1.should.equal(1);
  });
});
