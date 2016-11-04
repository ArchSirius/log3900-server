const User = require('../app/user/user.model');
const Zone = require('../app/zone/zone.model');

// export function for listening to the socket
module.exports = function (socket) {
	const controller = require('./socket.controller')(socket);
	const usersCtrl  = require('./socket.users.controller');

	const userId = socket.decoded_token._id;
	var username = '';
	// Fetch user infos
	User.findById(userId, '-salt -password')
	.then(user => {
// START TODO move to controller and implement chatrooms logic
		if (user) {
			username = user.username;
			usersCtrl.join(user); // TODO handle return

			const time = new Date().getTime();

			// send the new user their name and a list of users
			socket.emit('init', {
				name: username,
				users: usersCtrl.getNames(),
				time: time
			});

			// notify other clients that a new user has joined
			socket.broadcast.emit('user:join', {
				name: username,
				time: time
			});
		} // If user does not exist, abort
	})
	// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
	.catch(error => {
		console.log('SERVER ERROR in constructor', error);
	});

	// broadcast a user's message to other users
	socket.on('send:message', function (data) {
		const time = new Date().getTime();
		socket.broadcast.emit('send:message', {
			user: username,
			text: data.message,
			time: time
		});
		socket.emit('send:message', {
			user: username,
			text: data.message,
			time: time
		});
	});

	// clean up when a user leaves, and broadcast it to other users
	socket.on('disconnect', function () {
		const time = new Date().getTime();
		socket.broadcast.emit('user:left', {
			name: username,
			time: time
		});
		usersCtrl.leave(userId);
		const zoneId = usersCtrl.getZoneId(userId);
		if (zoneId) {
			socket.to(zoneId).emit('leave:zone', {
				userId: userId,
				time: time
			});
		}
	});
// END TODO

	socket.on('join:zone', controller.joinZone);
	socket.on('leave:zone', controller.leaveZone);
	socket.on('edit:nodes', controller.editNodes);
	socket.on('create:nodes', controller.createNodes);
	socket.on('delete:nodes', controller.deleteNodes);
	socket.on('lock:nodes', controller.lockNodes);
	socket.on('unlock:nodes', controller.unlockNodes);
	socket.on('ping:position', controller.pingPosition);
};
