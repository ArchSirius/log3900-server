const User = require('./app/user/user.model');
const Zone = require('./app/zone/zone.model');
const Node = require('./app/node/node.model');

module.exports = function() {
	User.find().exec()
	.then(users => {
		users.forEach(user => {
			if (!user.hasOwnProperty('stats')) {
				user.stats = {
					playedGames: 0,
					playedTime: 0
				};
				user.save();
			}
		});
	})
	.catch(error => {
		console.log('SERVER ERROR in changelogManager', error);
	});
	Zone.find().exec()
	.then(zones => {
		zones.forEach(zone => {
			if (!zone.hasOwnProperty('stats')) {
				zone.stats = {
					playedGames: 0,
					playedTime: 0
				};
				zone.save();
			}
		});
	})
	.catch(error => {
		console.log('SERVER ERROR in changelogManager', error);
	});
};
