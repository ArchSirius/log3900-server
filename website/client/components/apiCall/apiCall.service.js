'use strict';
const angular = require('angular');

/*@ngInject*/
export function apiCallService($http) {
  // AngularJS will instantiate a singleton by calling "new" on this function

  /********
  * USERS *
  ********/

  // GET all users
  this.getUsers = function() {
    return $http.get('/api/users')
    .then(response => {
      return response.data;
    });
  };

  // GET one user
  this.getUser = function(id) {
    return $http.get('/api/users/' + id)
    .then(response => {
      return response.data;
    });
  };

  // GET one user by username
  this.getUserByUsername = function(username) {
    return $http.get('/api/users/username/' + username)
    .then(response => {
      return response.data;
    });
  };

  // POST new user
  this.createUser = function(user) {
    return $http.post('/api/users', user)
    .then(response => {
      return response.data;
    });
  };

  // PUT data in user
  this.updateUser = function(user) {
    return $http.put('/api/users/' + user._id, user)
    .then(response => {
      return response.data;
    });
  };

  // DELETE one user
  this.deleteUser = function(id) {
    return $http.delete('/api/users/' + id)
    .then(response => {
      return response.data;
    });
  };

  /********
  * ZONES *
  ********/

  // GET all zones
  this.getZones = function() {
    return $http.get('/api/zones')
    .then(response => {
      return response.data;
    });
  };

  // GET one zone
  this.getZone = function(id) {
    return $http.get('/api/zones/' + id)
    .then(response => {
      return response.data;
    });
  };

  // POST new zone
  this.createZone = function(zone) {
    return $http.post('/api/zones', zone)
    .then(response => {
      return response.data;
    });
  };

  // PUT data in zone
  this.updateZone = function(zone) {
    return $http.put('/api/zones/' + zone._id, zone)
    .then(response => {
      return response.data;
    });
  };

  // DELETE one zone
  this.deleteZone = function(id) {
    return $http.delete('/api/zones/' + id)
    .then(response => {
      return response.data;
    });
  };
}

export default angular.module('log3900App.apiCall', [])
  .service('apiCall', apiCallService)
  .name;
