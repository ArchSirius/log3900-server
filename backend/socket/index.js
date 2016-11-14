const User = require('../app/user/user.model');

// export function for listening to the socket
module.exports = function (socket) {
	const controller = require('./socket.controller')(socket);

	const userId = socket.decoded_token._id;
	// Fetch user infos
	User.findById(userId, '-salt -password')
	.then(user => {
		if (user) {

			controller.onInit(user);

		} // If user does not exist, abort
	})
	// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
	.catch(error => {
		console.log('SERVER ERROR in constructor', error);
	});

	socket.on('disconnect', controller.disconnect);
	socket.on('join:chatroom', controller.joinChatroom);
	socket.on('leave:chatroom', controller.leaveChatroom);
	socket.on('send:group:message', controller.sendGroupMessage);
	socket.on('send:private:message', controller.sendPrivateMessage);
	socket.on('send:message', controller.sendMessage);

	socket.on('join:zone', controller.joinZone);
	socket.on('leave:zone', controller.leaveZone);
	socket.on('edit:nodes', controller.editNodes);
	socket.on('create:nodes', controller.createNodes);
	socket.on('delete:nodes', controller.deleteNodes);
	socket.on('lock:nodes', controller.lockNodes);
	socket.on('unlock:nodes', controller.unlockNodes);
	socket.on('ping:position', controller.pingPosition);
};
