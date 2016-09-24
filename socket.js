var jwt    = require('jsonwebtoken');
var secret = require('./config.js').secret;
var User   = require('./app/user/user.model.js');

const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1N2Q5Yjc3NDRjNWQ2ZmRkMGM3OGMyZWEiLCJyb2xlIjoidXNlciIsImlhdCI6MTQ3NDQ5MjI1OCwiZXhwIjoxNDc5Njc2MjU4fQ.J4_RDmP7_uqhD78mKli6VYZF3ZfWr0rPiimvgPzkL2k';

// Keep track of which names are used so that there are no duplicates

const MAXCONNECTION = 4;
var connections = 0;

var userNames = (function () {

	var names = {};

	var claim = function (name) {
		connections++;
		console.log('claim()');
		console.log(name);
		if (!name || names[name]) {
			return false;
		} else {
			names[name] = true;
			return true;
		}
	};

	// find the lowest unused "guest" name and claim it
	var getGuestName = function () {
		var name,
			nextUserId = 1;

		do {
			name = 'Joueur ' + nextUserId;
			nextUserId += 1;
		} while (!claim(name));

		return name;
	};

	// serialize claimed names as an array
	var get = function () {
		var res = [];
		for (user in names) {
			res.push(user);
		}
		console.log('get()');
		console.log(user);
		return res;
	};

	var free = function (name) {
		connections--;
		if (names[name]) {
			delete names[name];
		}
	};

	return {
		claim: claim,
		free: free,
		get: get,
		getGuestName: getGuestName,
		getNames: names
	};
}());

// export function for listening to the socket
module.exports = function (socket) {
	var name = userNames.getGuestName();

	// send the new user their name and a list of users
	socket.emit('init', {
		name: name,
		users: userNames.get()
	});

	// notify other clients that a new user has joined
	socket.broadcast.emit('user:join', {
		name: name
	});

	// broadcast a user's message to other users
	socket.on('send:message', function (data) {
		getUser(TEST_TOKEN, user => {
			var name = user.username;
			console.log(name + ' is ready');
			socket.broadcast.emit('send:message', {
				user: name,
				text: "is ready to play"
			});
		});
	});

	// validate a user's name change, and broadcast it on success
	socket.on('change:name', function (data, fn) {
		if (userNames.claim(data.name)) {
			var oldName = name;
			userNames.free(oldName);

			name = data.name;

			socket.broadcast.emit('change:name', {
				oldName: oldName,
				newName: name
			});

			fn(true);
		} else {
			fn(false);
		}
	});

	// clean up when a user leaves, and broadcast it to other users
	socket.on('disconnect', function () {
		socket.broadcast.emit('user:left', {
			name: name
		});
		userNames.free(name);
	});
};

function getUser(token, callback) {
	if (!token) {
		return;
	}
	// decode token
	return jwt.verify(token, secret, function(err, decoded) {
		if (err) {
			return;
		}
		return User.findById(decoded._id, function(err, user) {
			if (err) {
				return;
			}
			if (callback) {
				callback(user);
			}
			return user;
		});
	});
}
