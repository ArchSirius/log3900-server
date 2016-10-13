'use strict';
const angular = require('angular');

const uiRouter = require('angular-ui-router');

import routes from './zones.routes';
import ZoneComponent from './zone/zone.component';

export class ZonesComponent {
  /*@ngInject*/
  constructor() {
    this.message = 'Hello';
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
