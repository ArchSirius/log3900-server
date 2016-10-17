'use strict';

import angular from 'angular';

export default angular.module('log3900App.constants', [])
  .constant('appConfig', require('../../server/config/environment/shared'))
  .name;
