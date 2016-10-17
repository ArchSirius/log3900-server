'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './zones.routes';

import ZoneComponent from './zone/zone.component';

export class ZonesComponent {
  /*@ngInject*/
  constructor($scope, $state, apiCall) {
    this.$scope = $scope;
    this.$state = $state;
    this.apiCall = apiCall;

    $scope.zones = [];

    $scope.select = function(zone) {
      $state.go('zone', { 'id' : zone._id });
    };
  }

  $onInit() {
    this.apiCall.getZones()
    .then(result => {
      console.log(result);  // TEST
      this.$scope.zones = result;
    }, error => {
      console.log('error', error);
    });
  }
}

export default angular.module('log3900App.zones', [uiRouter, ZoneComponent])
  .config(routes)
  .component('zones', {
    template: require('./zones.html'),
    controller: ZonesComponent,
    controllerAs: 'zonesCtrl'
  })
  .name;
