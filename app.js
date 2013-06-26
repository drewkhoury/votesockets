var fs = require('fs')
    , http = require('http')
    , socketio = require('socket.io');

// for heroku
var port = process.env.PORT || 5000;

var server = http.createServer(function(req, res) {
    res.writeHead(200, { 'Content-type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/index.html'));
}).listen(port, function() {
    console.log("Listening on " + port);
});

	var count_a =0;
	var count_b =0;

socketio.listen(server).on('connection', function (socket) {

	socket.on('set-nickname', function (name) {
		socket.set('nickname', name, function () { socket.broadcast.emit('name',name); });
	});

	socket.on('vote', function (vote) {
		socket.get('nickname', function (err, name) {

		  if (vote == 'a') {
		  	count_a++;
		  }

		  if (vote == 'b') {
		  	count_b++;
		  }

		  socket.broadcast.emit('vote', vote);

		  console.log('Vote by ', name);
		  console.log('Vote is ', vote);

		  console.log('count_a = ', count_a);
		  console.log('count_b = ', count_b);
		});
	});

});