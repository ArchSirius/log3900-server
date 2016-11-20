'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './zone.routes';

export class ZoneComponent {
  /*@ngInject*/
  constructor($scope, $state, apiCall) {
    this.$scope = $scope;
    this.$state = $state;
    this.apiCall = apiCall;

    $scope.zone = {};
    $scope.id = '';

    $scope.gotoUser = function(user) {
      $state.go('user', { 'username' : user.username });
    };
  }

  $onInit() {
    this.$scope.id = this.$state.params.id;
    this.apiCall.getZone(this.$scope.id)
    .then(result => {
      if (!result.thumbnail) {
        result.thumbnail = 'http://www.polymtl.ca/sc/img/logoType/logoPOLY/poly_bloc_rgb.png';
      }
      this.$scope.zone = result;
    }, error => {
      console.log('error', error);
    });
  }
}

export default angular.module('log3900App.zone', [uiRouter])
  .config(routes)
  .component('zone', {
    template: require('./zone.html'),
    controller: ZoneComponent,
    controllerAs: 'zoneCtrl'
  })
  .name;
