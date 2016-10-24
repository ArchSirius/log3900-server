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
  }

  $onInit() {
    const id = this.$state.params.id;
    this.apiCall.getZone(id)
    .then(result => {
      console.log(result);  // TEST
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
