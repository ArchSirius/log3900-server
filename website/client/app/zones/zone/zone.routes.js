'use strict';

export default function($stateProvider) {
  'ngInject';
  $stateProvider
    .state('zone', {
      url: '/zone',
      template: '<zone></zone>'
    });
}
