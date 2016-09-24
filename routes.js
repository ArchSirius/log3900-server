module.exports = function(app) {
	app.use('/api/users', require('./app/user'));
	app.use('/api/zones', require('./app/zone'));
	app.use('/auth', require('./auth'));
	app.route('/').get(index);
	app.route('/*').get(index);
};

function index(req, res) {
	res.render('index');
}
