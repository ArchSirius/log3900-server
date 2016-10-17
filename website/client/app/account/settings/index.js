'use strict';

import angular from 'angular';
import SettingsController from './settings.controller';

export default angular.module('log3900App.settings', [])
  .controller('SettingsController', SettingsController)
  .name;
