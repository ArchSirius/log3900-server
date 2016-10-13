'use strict';

import angular from 'angular';
import LoginController from './login.controller';

export default angular.module('log3900App.login', [])
  .controller('LoginController', LoginController)
  .name;
