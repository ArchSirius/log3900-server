'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './user.routes';

export class UserComponent {
  /*@ngInject*/
  constructor($scope, $state, apiCall, Auth) {
    this.$scope = $scope;
    this.$state = $state;
    this.apiCall = apiCall;
    this.Auth = Auth;

    $scope.user = {};
    $scope.getCurrentUser = Auth.getCurrentUserSync;
    $scope.isFriend = false;
    $scope.friend = function() {
      if ($scope.isFriend) {
        apiCall.unfriend($scope.user._id)
        .then(result => {
          $scope.isFriend = false;
          console.log(result);
        }, error => {
          console.log('error', error);
        });
      }
      else {
        apiCall.friend($scope.user._id)
        .then(result => {
          $scope.isFriend = true;
          console.log(result);
        }, error => {
          console.log('error', error);
        });
      }
    };
  }

  $onInit() {
    const username = this.$state.params.username;
    this.apiCall.getUserByUsername(username)
    .then(result => {
      this.$scope.user = result;
      this.setIsFriend();
    }, error => {
      console.log('error', error);
    });
  }

  setIsFriend() {
    this.Auth.getCurrentUser(currentUser => {
      for (var i = 0; i < currentUser.friends.length; ++i) {
        if (currentUser.friends[i] === this.$scope.user._id) {
          this.$scope.isFriend = true;
          return true;
        }
      }
      this.$scope.isFriend = false;
      return false;
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
