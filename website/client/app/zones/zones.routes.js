'use strict';

export default function($stateProvider) {
  'ngInject';
  $stateProvider
    .state('zones', {
      url: '/zones',
      template: '<zones></zones>'
    });
}
