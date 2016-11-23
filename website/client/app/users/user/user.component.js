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
      console.log('CALLED', $scope.isFriend);
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
        console.log('CALLING FRIEND', $scope.user._id);
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
      //this.setIsFriend();
    }, error => {
      console.log('error', error);
    });
  }

  setIsFriend() {
    console.log('setting friend');
    this.Auth.getCurrentUser(currentUser => {
      currentUser.friends.forEach(friend => {
        if (friend._id === $scope.user._id) {
          console.log('IS FRIEND');
          this.$scope.isFriend = true;
        }
      });
      console.log('NOT FRIEND');
      this.$scope.isFriend = false;
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
