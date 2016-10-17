'use strict';

import angular from 'angular';
import routes from './admin.routes';
import AdminController from './admin.controller';

export default angular.module('log3900App.admin', ['log3900App.auth', 'ui.router'])
  .config(routes)
  .controller('AdminController', AdminController)
  .name;
