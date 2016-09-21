module.exports = function(app) {
	app.use('/api/users', require('./app/user'));
	app.use('/api/zones', require('./app/zone'));
	app.use('/', index);
	app.use('*', index);
};

function index(req, res) {
	res.render('index');
}
