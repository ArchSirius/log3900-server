const User      = require('../app/user/user.model');
const usersCtrl = require('./socket.users.controller');
const lockCtrl  = require('./socket.lock.controller');

// export function for listening to the socket
module.exports = function (socket) {
	const controller = require('./socket.controller')(socket);

	const userId = socket.decoded_token._id;
	// Fetch user infos
	User.findById(userId, '-salt -password')
	.then(user => {
		if (user) {

			controller.onInit(usersCtrl, user);

		} // If user does not exist, abort
	})
	// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
	.catch(error => {
		console.log('SERVER ERROR in constructor', error);
	});

	socket.on('init:chat', controller.initChat(usersCtrl));
	socket.on('disconnect', controller.disconnect(usersCtrl));
	socket.on('join:chatroom', controller.joinChatroom(usersCtrl));
	socket.on('leave:chatroom', controller.leaveChatroom(usersCtrl));
	socket.on('send:group:message', controller.sendGroupMessage(usersCtrl));
	socket.on('send:private:message', controller.sendPrivateMessage(usersCtrl));
	socket.on('send:message', controller.sendMessage(usersCtrl));

	socket.on('join:zone', controller.joinZone(usersCtrl, lockCtrl));
	socket.on('leave:zone', controller.leaveZone(usersCtrl, lockCtrl));
	socket.on('edit:nodes', controller.editNodes(usersCtrl, lockCtrl));
	socket.on('create:nodes', controller.createNodes(usersCtrl));
	socket.on('delete:nodes', controller.deleteNodes(usersCtrl, lockCtrl));
	socket.on('lock:nodes', controller.lockNodes(usersCtrl, lockCtrl));
	socket.on('unlock:nodes', controller.unlockNodes(usersCtrl, lockCtrl));
	socket.on('start:simulation', controller.startSimulation(usersCtrl));
	socket.on('end:simulation', controller.endSimulation(usersCtrl));
	socket.on('ping:position', controller.pingPosition(usersCtrl));
};
