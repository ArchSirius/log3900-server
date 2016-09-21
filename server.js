var express    = require('express');
var http       = require('http');
var app        = express();
var bodyParser = require('body-parser');
var morgan     = require('morgan');
var mongoose   = require('mongoose');
var socket     = require('./socket.js');
var config     = require('./config');

var port = process.env.PORT || 5000;

mongoose.connect(config.mongo.uri);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {
    layout: false
});
app.use(express.static(__dirname + '/public'));

require('./routes.js')(app);

var server = http.createServer(app);
var io = require('socket.io').listen(server);
io.sockets.on('connection', socket);

server.listen(port);
console.log('Magic happens at http://localhost:' + port);
