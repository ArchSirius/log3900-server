var User    = require('./app/user/user.model.js');

const MAXCONNECTION = 4;
var connections = 0;

var userNames = (function() {

	var names = {};

	var claim = function (name) {
		connections++;
		console.log('claim(\'' + name + '\')');
		if (!name || names[name]) {
			return false;
		}
		else {
			names[name] = true;
			return true;
		}
	};

	var get = function() {
		var res = [];
		for (user in names) {
			res.push(user);
		}
		console.log('get()');
		return res;
	};

	var free = function(name) {
		connections--;
		if (names[name]) {
			delete names[name];
		}
	};

	return {
		claim: claim,
		free: free,
		get: get
	};
}());

// export function for listening to the socket
module.exports = function (socket) {
	var name = '';
	// broadcast a user's message to other users
	socket.on('send:message', function (data) {
		socket.broadcast.emit('send:message', {
			user: name,
			text: data.message,
			time: new Date()
		});
	});

	// clean up when a user leaves, and broadcast it to other users
	socket.on('disconnect', function () {
		socket.broadcast.emit('user:left', {
			name: name,
			time: new Date()
		});
		userNames.free(name);
	});

	socket.on('reserve:name', function (data) {
		if (userNames.claim(data.name)) {
			name = data.name;
			socket.emit('reserve:name', {
				success: true
			});
			// send the new user their name and a list of users
			socket.emit('init', {
				name: name,
				users: userNames.get(),
				time: new Date()
			});

			// notify other clients that a new user has joined
			socket.broadcast.emit('user:join', {
				name: name,
				time: new Date()
			});
		}
		else {
			socket.emit('reserve:name', {
				success: false
			});
		}
	});
};
