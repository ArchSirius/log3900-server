'use strict';

export default function($stateProvider) {
  'ngInject';
  $stateProvider
    .state('user', {
      url: '/user',
      template: '<user></user>'
    });
}
