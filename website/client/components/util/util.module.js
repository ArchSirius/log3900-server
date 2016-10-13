'use strict';

import angular from 'angular';
import {
  UtilService
} from './util.service';

export default angular.module('log3900App.util', [])
  .factory('Util', UtilService)
  .name;
