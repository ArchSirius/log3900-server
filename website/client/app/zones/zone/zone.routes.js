'use strict';

export default function($stateProvider) {
  'ngInject';
  $stateProvider
    .state('zone', {
      url: '/zone/:id',
      template: '<zone></zone>',
      authenticate: true
    });
}
