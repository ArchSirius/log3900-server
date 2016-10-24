'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './user.routes';

export class UserComponent {
  /*@ngInject*/
  constructor($scope, $state, apiCall) {
    this.$scope = $scope;
    this.$state = $state;
    this.apiCall = apiCall;

    $scope.user = {};
  }

  $onInit() {
    const username = this.$state.params.username;
    this.apiCall.getUserByUsername(username)
    .then(result => {
      console.log(result);  // TEST
      this.$scope.user = result;
    }, error => {
      console.log('error', error);
    });
  }
}

export default angular.module('log3900App.user', [uiRouter])
  .config(routes)
  .component('user', {
    template: require('./user.html'),
    controller: UserComponent,
    controllerAs: 'userCtrl'
  })
  .name;
