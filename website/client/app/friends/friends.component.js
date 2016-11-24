'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './friends.routes';

export class FriendsComponent {
  /*@ngInject*/
  constructor($scope, $state, apiCall) {
    this.$scope = $scope;
    this.apiCall = apiCall;

    $scope.friends = [];

    $scope.select = function(user) {
      $state.go('user', { 'username' : user.username });
    };
  }

  $onInit() {
    this.apiCall.getMe()
    .then(currentUser => {
      this.$scope.friends = currentUser.friends;
    }, error => {
      console.log('error', error);
    });
  }
}

export default angular.module('log3900App.friends', [uiRouter])
  .config(routes)
  .component('friends', {
    template: require('./friends.html'),
    controller: FriendsComponent,
    controllerAs: 'friendsCtrl'
  })
  .name;
