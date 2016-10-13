'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './zone.routes';

export class ZoneComponent {
  /*@ngInject*/
  constructor() {
    this.message = 'Hello';
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
