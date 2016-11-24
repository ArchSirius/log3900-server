'use strict';

export default function($stateProvider) {
  'ngInject';
  $stateProvider
    .state('friends', {
      url: '/friends',
      template: '<friends></friends>'
    });
}
