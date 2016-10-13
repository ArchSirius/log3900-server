var jwt    = require('jsonwebtoken');
var secret = require('../config.js').secret;
var User   = require('../app/user/user.model.js');

exports.authenticate = function(req, res) {
	// find the user
	User.findOne({ username: req.body.username }, function(err, user) {
		if (err) {
			return res.status(500).json({
				success: false,
				time: new Date().getTime(),
				message: 'An error has occured.',
				err: err
			});
		}

		if (!user) {
			return res.status(404).json({
				success: false,
				time: new Date().getTime(),
				message: 'Authentication failed. User not found.'
			});
		}

		// check if password matches
		if (!user.authenticate(req.body.password)) {
			if (user.facebookId) {
				return res.status(401).json({
					success: false,
					time: new Date().getTime(),
					message: 'Authentication failed. Try to login with Facebook then reset your password.'
				});
			}
			return res.status(401).json({
				success: false,
				time: new Date().getTime(),
				message: 'Authentication failed. Wrong password.'
			});
		}

		// if user is found and password is right
		// create a token
		var token = exports.signToken(user);
		// return the information including token as JSON
		return res.status(200).json({
			success: true,
			time: new Date().getTime(),
			data: {
				token: token,
				user: user.details
			}
		});
	});
};

exports.isAuthenticated = function(req, res, next) {
	// check header or url parameters or post parameters for token
	var token = req.body.token || req.query.token || req.headers['x-access-token'];
	// decode token
	if (token) {
		// verifies secret and checks exp
		jwt.verify(token, secret, function(err, decoded) {
			if (err) {
				return res.status(403).json({
					success: false,
					time: new Date().getTime(),
					message: 'Failed to authenticate token.'
				});
			}
			else {
				// if everything is good, save to request for use in other routes
				req.decoded = decoded;
				next();
			}
		});
	}
	else {
		// if there is no token
		// return an error
		return res.status(403).json({
			success: false, 
			time: new Date().getTime(),
			message: 'No token provided.'
		});
	}
};

exports.isSelf = function(req, res, next) {
	if (req.decoded && req.params.id) {
		if (req.decoded._id === req.params.id) {
			next();
		}
		else {
			return res.status(403).json({
				success: false,
				time: new Date().getTime(),
				message: 'User ID mismatch.'
			});
		}
	}
	else {
		return res.status(400).json({
			success: false,
			time: new Date().getTime(),
			message: 'Invalid parameters.'
		});
	}
};

exports.signToken = function(user) {
	return jwt.sign(user.token, secret, {
		expiresIn: '60d'
	});
};
