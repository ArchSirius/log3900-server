import angular from 'angular';
import uiRouter from 'angular-ui-router';
import routing from './main.routes';

export class MainController {
  members = [{
    name: 'Maxime Clavel',
    info: 'Client léger'
  }, {
    name: 'Philippe Fortin',
    info: 'Client lourd'
  }, {
    name: 'Pierre-Olivier Guimond-Cataford',
    info: 'Client léger'
  }, {
    name: 'Jennifer Khoury',
    info: 'Client Léger'
  }, {
    name: 'Louis Racicot',
    info: 'Client Lourd'
  }, {
    name: 'Samuel Rondeau',
    info: 'Serveur et site web'
  }];
}

export default angular.module('log3900App.main', [uiRouter])
  .config(routing)
  .component('main', {
    template: require('./main.html'),
    controller: MainController
  })
  .name;
