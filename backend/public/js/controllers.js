'use strict';

/* Controllers */
function AppCtrl($scope, socket) {

  const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1N2Q5Yjc3NDRjNWQ2ZmRkMGM3OGMyZWEiLCJyb2xlIjoidXNlciIsImlhdCI6MTQ3NDQ5MjI1OCwiZXhwIjoxNDc5Njc2MjU4fQ.J4_RDmP7_uqhD78mKli6VYZF3ZfWr0rPiimvgPzkL2k';

  // Socket listeners
  // ================

  socket.on('connect', function () {
    socket.emit('authenticate', { token: TEST_TOKEN });
  });

  socket.on('init', function (data) {
    console.log(data);
    $scope.name = data.name;
    $scope.users = data.users;
  });

  socket.on('send:message', function (message) {
    $scope.messages.push(message);
  });

  socket.on('user:join', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + data.name + ' has joined.'
    });
    $scope.users.push(data.name);
  });

  // add a message to the conversation when a user disconnects or leaves the room
  socket.on('user:left', function (data) {
    $scope.messages.push({
      user: 'chatroom',
      text: 'User ' + data.name + ' has left.'
    });
    var i, user;
    for (i = 0; i < $scope.users.length; i++) {
      user = $scope.users[i];
      if (user === data.name) {
        $scope.users.splice(i, 1);
        break;
      }
    }
  });

  // Private helpers
  // ===============

  // Methods published to the scope
  // ==============================

  $scope.messages = [];

  $scope.sendMessage = function () {
    socket.emit('send:message', {
      message: $scope.message
    });

    // clear message box
    $scope.message = '';
  };
}
