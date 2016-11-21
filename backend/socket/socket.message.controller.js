const Channel        = require('../app/channel/channel.model');
const ChatRelation   = require('../app/chatRelation/chatRelation.model');
const Message        = require('../app/message/message.model');
const PendingMessage = require('../app/pendingMessage/pendingMessage.model');

/**
 * Send group message in socket room.
 * @param {string} senderId - The sender's unique _id.
 * @param {Object} senderSocket - The sender's socket.
 * @param {string} room - The room to broadcast in.
 * @param {string} text - The message to send.
 */
exports.sendGroupMessage = function(usersCtrl, senderId, senderSocket, room, text) {
	if (!(senderId && senderSocket && room && text)) {
		return;
	}
	findOrCreateChannel(room, false, senderId, channel => {
		broadcastMessage(usersCtrl, senderId, senderSocket, room, text);
		archiveMessage(senderId, channel, text);
	});
};

/**
 * Send private message to a user.
 * @param {string} senderId - The sender's unique _id.
 * @param {string} recipientId - The recipient's unique _id.
 * @param {string} text - The message to send.
 */
exports.sendPrivateMessage = function(usersCtrl, senderId, recipientId, text) {
	if (!(senderId && recipientId && text)) {
		return;
	}
	findOrCreateChatRelation(senderId, recipientId, chatRelation => {
		const sentLive = emitMessage(usersCtrl, senderId, recipientId, text);
		if (sentLive) {
			archiveMessage(senderId, chatRelation.channel, text);
		}
		else {
			pendMessage(senderId, recipientId, chatRelation.channel, text);
		}
	});
};

/**
 * Fetch a channel's latest messages.
 * @param {string} name - The room to fetch.
 * @param {callback} callback - The callback that handles the response.
 * @param {integer} [limit=100] - The maximum amount of messages to fetch by most recent.
 */
exports.fetchGroupMessages = function(name, callback, limit) {
	if (!(name || callback)) {
		return;
	}
	Channel.findOne({ name: name }).exec()
	.then(channel => {
		if (channel) {
			Message
			.find({ channel: channel })
			.sort({ createdAt: 1 })
			.limit(limit || 100)
			.populate({
				path: 'createdBy',
				select: 'username'
			})
			.select('text createdBy createdAt')
			.exec()
			.then(messages => {
				if (callback) {
					callback(messages);
				}
			});
		}
		else if (callback) {
			callback([]);
		}
	})
	.catch(error => {
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		console.log('SERVER ERROR in socket.message.controller#fetchGroupMessages', error);
	});
};

/**
 * Fetch a user's pending messages.
 * @param {string|Object} user - The user or its unique _id.
 * @param {callback} [callback] - The callback that handles the response.
 * @returns {Promise} A promise to return the pending messages.
 */
exports.fetchPendingMessages = function(user, callback) {
	const query = PendingMessage.find({ user: user })
	.sort({ createdAt: 1 })
	.populate({
		path: 'message',
		populate: {
			path: 'createdBy',
			select: 'username'
		}
	});
	query.exec().then(messages => {
		if (callback) {
			callback(messages);
		}
		query.remove().exec();
	});
	return query.exec();
};

/**
 * Find a channel if it exists or create it if it does not.
 * @private
 * @param {string} name - The name of the channel, e.g. a zone's _id.
 * @param {boolean} [private=false] - The private status of a new chanel.
 * @param {string|string[]|Object|Object[]} [users=[]] - A user or list of users or their _id to be allowed if private.
 * @param {callback} [callback] - The callback that handles the response.
 * @returns {Object} A channel.
 */
const findOrCreateChannel = function(name, private, users, callback) {
	return Channel.findOne({ name: name }).exec()
	.then(channel => {
		if (channel) {
			if (callback) {
				callback(channel);
			}
			return channel;
		}
		if (users && !Array.isArray(users)) {
			users = [users];
		}
		return Channel.create({
			name: name,
			private: private,
			users: users
		})
		.then(channel => {
			if (callback) {
				callback(channel);
			}
			return channel;
		});
	});
};

/**
 * Find a chat relation if it exists or create it if it does not.
 * @private
 * @param {string|Object} sender - The sender or its unique _id.
 * @param {string|Object} recipient - The recipient or its unique _id.
 * @param {callback} [callback] - The callback that handles the response.
 * @returns {Object} A chat relation.
 */
const findOrCreateChatRelation = function(sender, recipient, callback) {
	return ChatRelation.get(sender, recipient).exec()
	.then(chatRelation => {
		if (chatRelation) {
			if (callback) {
				callback(chatRelation);
			}
			return chatRelation;
		}
		const s1 = typeof sender === 'object' ? sender._id : sender;
		const s2 = typeof recipient === 'object' ? recipient._id : recipient;
		return Channel.create({
			name: s1 + '-' + s2,
			private: true,
			users: [sender, recipient]
		})
		.then(channel => {
			return ChatRelation.create({
				channel: channel,
				userA: sender,
				userB: recipient
			})
			.then(chatRelation => {
				if (callback) {
					callback(chatRelation);
				}
				return chatRelation;
			});
		});
	});
};

/**
 * Broadcast a message to all users in a room.
 * @private
 * @param {string} senderId - The sender's unique _id.
 * @param {Object} senderSocket - The sender's socket.
 * @param {string} room - The room to broadcast in.
 * @param {string} text - The message to send.
 */
const broadcastMessage = function(usersCtrl, senderId, senderSocket, room, text) {
	senderSocket.broadcast.to(room).emit('send:group:message', {
		from: usersCtrl.getUser(senderId),
		room: room,
		text: text,
		time: new Date().getTime()
	});
};

/**
 * Emit a private message to a user if connected.
 * @private
 * @param {string} senderId - The sender's unique _id.
 * @param {string} recipientId - The recipient's unique _id.
 * @param {string} text - The message to send.
 * @returns {boolean} true if the message was sent live; false if user was offline.
 */
const emitMessage = function(usersCtrl, senderId, recipientId, text) {
	const sockets = usersCtrl.getChatSockets(recipientId);
	if (sockets) {
		var sent = false;
		sockets.forEach(socket => {
			socket.emit('send:private:message', {
				from: usersCtrl.getUser(senderId),
				to: usersCtrl.getUser(recipientId),
				text: text,
				time: new Date().getTime()
			});
			sent = true;
		});
		return sent;
	}
	return false;
};

/**
 * Save a message to the database.
 * @private
 * @param {string|Object} sender - The sender or its unique _id.
 * @param {string|Object} channel - The channel holding the message or its unique _id.
 * @param {string} text - The message to send.
 * @returns {Promise} A promise to return the created message.
 */
const archiveMessage = function(sender, channel, text) {
	return Message.create({
		channel: channel,
		text: text,
		createdBy: sender
	})
	.catch(error => {
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		console.log('SERVER ERROR in socket.message.controller#archiveMessage', error);
	});
};

/**
 * Save a message to the database and to the pending messages collection.
 * @private
 * @param {string|Object} sender - The sender or its unique _id.
 * @param {string|Object} recipient - The recipient or its unique _id.
 * @param {string|Object} channel - The channel holding the message or its unique _id.
 * @param {string} text - The message to send.
 * @returns {Promise} A promise to return the created pending message.
 */
const pendMessage = function(sender, recipient, channel, text) {
	return archiveMessage(sender, channel, text)
	.then(message => {
		return PendingMessage.create({
			user: recipient,
			message: message
		});
	})
	.catch(error => {
		// Catch server errors. If ANY is detected, the code has to be fixed ASAP.
		console.log('SERVER ERROR in socket.message.controller#pendMessage', error);
	});
};
