'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './users.routes';

import UserComponent from './user/user.component';

export class UsersComponent {
  /*@ngInject*/
  constructor($scope, $state, apiCall) {
    this.$scope = $scope;
    this.$state = $state;
    this.apiCall = apiCall;

    $scope.users = [];

    $scope.select = function(user) {
      $state.go('user', { 'username' : user.username });
    };
  }

  $onInit() {
    this.apiCall.getUsers()
    .then(result => {
      this.$scope.users = result;
    }, error => {
      console.log('error', error);
    });
  }
}

export default angular.module('log3900App.users', [uiRouter, UserComponent])
  .config(routes)
  .component('users', {
    template: require('./users.html'),
    controller: UsersComponent,
    controllerAs: 'usersCtrl'
  })
  .name;
