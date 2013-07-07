// required
var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);
var fs = require('fs');

// static server
var static = require('node-static');
var http = require('http');
var util = require('util');

// server vars
var webroot = '/var/www';
var port = 8080;
var file = new(static.Server)(webroot, {
  //cache: 600,
  headers: { 'X-Powered-By': 'hopes-and-dreams' }
});

// http handler function
function handler (req, res) {
  req.addListener('end', function() {
    file.serve(req, res, function(err, result) {
      if (err) {
        console.error('Error serving %s - %s', req.url, err.message);
        if (err.status === 404 || err.status === 500) {
          file.serveFile(util.format('/%d.html', err.status), err.status, {}, req, res);
        } else {
          res.writeHead(err.status, err.headers);
          res.end();
        }
      } else {
        console.log('%s - %s', req.url, res.message);
      }
    });
  });

}

// http server
app.listen(port);
console.log('node-static running at http://localhost:%d', port);












// vars
var game_status = 'closed';
var players = 0;
var votes = 0;
var green_votes = 0;
var red_votes = 0;
var round = 0;

// sockets
io.sockets.on('connection', function (socket) {

	io.sockets.sockets[socket.id]['socket_id'] = socket.id;
	io.sockets.sockets[socket.id]['registered'] = 0;
	io.sockets.sockets[socket.id]['points_tally'] = 0;

	io.sockets.sockets[socket.id].emit("console", "Your socket id is "+socket.id);
	console.log("Your socket id is "+socket.id);

	socket.on('get-game-status', function () {
	  	socket.emit('get-game-status', game_status);
	});

	socket.on('message', function (message) {
	  socket.broadcast.emit('message', message);
	  console.log('message ', message);
	});

	socket.on('gravatar', function (gravatar_hash) {
		console.log(gravatar_hash);
		socket.broadcast.emit('gravatar', gravatar_hash); // send to clients
		socket.set('gravatar_hash_session', gravatar_hash, function () {}); // create a session var 

		io.sockets.sockets[socket.id]['gravatar_hash'] = gravatar_hash;
		io.sockets.sockets[socket.id]['registered'] = 1;

		players++;
		console.log('players = '+players);	

	});

	socket.on('open-game', function (data) {
	  if(game_status=='closed' || game_status=='kill'){
	  	socket.broadcast.emit('open-game');
	  	game_status = 'open';
	  }
	});

	socket.on('start-game', function (data) {
	  if(game_status=='open'){
	  	socket.broadcast.emit('start-game');
	  	game_status = 'start';

	  	socket.emit('round',1);
	  	socket.broadcast.emit('round',1);

	  }
	});

	socket.on('kill-game', function (data) {
	  if(game_status=='open' || game_status=='start'){
	  	socket.broadcast.emit('kill-game');
	  	game_status = 'kill';

	  for (var socket_id_loop in io.sockets.sockets ){
	  	io.sockets.sockets[socket_id_loop]['registered']=null;
	  	io.sockets.sockets[socket_id_loop]['gravatar_hash']=null;
	  	io.sockets.sockets[socket_id_loop]['vote_time']=null;
	  	io.sockets.sockets[socket_id_loop]['vote']=null;
	  }

	  votes=0;
	  players=0;
	  round=0;
	  
	  }
	});

	socket.on('close-game', function (data) {
	  if(game_status=='open' || game_status=='start'){
	  	socket.broadcast.emit('close-game');
	  	game_status = 'closed';

	  for (var socket_id_loop in io.sockets.sockets ){
	  	io.sockets.sockets[socket_id_loop]['registered']=null;
	  	io.sockets.sockets[socket_id_loop]['gravatar_hash']=null;
	  	io.sockets.sockets[socket_id_loop]['vote_time']=null;
	  	io.sockets.sockets[socket_id_loop]['vote']=null;
	  }

	  votes=0;
	  players=0;
	  round=0;
	  
	  }
	});

	socket.on('vote', function (vote) {

		// only voting on open games
		if(game_status!='start' ){
			return;
		}

		socket.get('gravatar_hash_session', function (err, gravatar_hash) {
			console.log('vote of '+vote+' by '+socket.id);
			socket.broadcast.emit('vote', {gravatar_hash: gravatar_hash, vote: vote}); // send to clients

			// has this user voted yet?
			if(io.sockets.sockets[socket.id]['vote_time']!=undefined){
				// is the vote different?
				if(io.sockets.sockets[socket.id]['vote']!=vote){
					// user changed vote
					io.sockets.sockets[socket.id]['vote_time'] = new Date().getTime();
					io.sockets.sockets[socket.id]['vote'] = vote;

					if(vote=='green'){
						green_votes++;
						red_votes--;
					}

					if(vote=='red'){
						green_votes--;
						red_votes++;
					}

				}
			}
			else{
				// first time voter
				io.sockets.sockets[socket.id]['vote_time'] = new Date().getTime();
				io.sockets.sockets[socket.id]['vote'] = vote;
				votes++;

				if(vote=='green'){
					green_votes++;
				}

				if(vote=='red'){
					red_votes++;
				}

			}

			console.log(votes+' votes out of '+players+' players');

			// everyone has voted (end of a round)
			if(votes==players){

				round++;

				socket.broadcast.emit('console', 'Round '+round+' is over!');
				io.sockets.sockets[socket.id].emit('console', 'Round '+round+' is over! (You were the last voter, sucks to be you)');

				var votes_green = new Array();
				var votes_red = new Array();
				
				for (var socket_id_loop in io.sockets.sockets ){
					
					if(io.sockets.sockets[socket_id_loop]['registered']==1){

						if(io.sockets.sockets[socket_id_loop]['vote']=='green'){
							votes_green.push({ socket_id: io.sockets.sockets[socket_id_loop]['socket_id'], 
								               vote_time: io.sockets.sockets[socket_id_loop]['vote_time'],
								               vote: io.sockets.sockets[socket_id_loop]['vote']
								          });	
						}

						if(io.sockets.sockets[socket_id_loop]['vote']=='red'){
							votes_red.push({ socket_id: io.sockets.sockets[socket_id_loop]['socket_id'], 
								               vote_time: io.sockets.sockets[socket_id_loop]['vote_time'],
								               vote: io.sockets.sockets[socket_id_loop]['vote']
								          });	
						}

						io.sockets.sockets[socket_id_loop]['vote_time']=undefined;
						io.sockets.sockets[socket_id_loop]['vote']==undefined;

					}

				}

				function assign_points(votes_array,losers,round){

					votes_array.sort(function(a,b) { return a.vote_time - b.vote_time; });

					var x = 0;
					for (var this_vote in votes_array){
						
						var tmp_socket_id = votes_array[x]['socket_id'];
						var tmp_points = parseInt(votes_array.length)-parseInt(x);
						io.sockets.sockets[tmp_socket_id]['points_tally'] += tmp_points;
						console.log('-----> ASSIGN SOME POINTS <----- points tally for '+tmp_socket_id+' = '+io.sockets.sockets[tmp_socket_id]['points_tally']);
						console.log('tmp_points = '+tmp_points);

						io.sockets.sockets[tmp_socket_id].emit('points', { round: round, points: tmp_points } );
						
						// final round
						if(round==3){							 
							io.sockets.sockets[tmp_socket_id].emit('tally', io.sockets.sockets[tmp_socket_id]['points_tally']);
						}

						x++;

					}

					x=0;
					// assign zero points for all members of losing team
					for (var this_vote in losers){

						var tmp_socket_id = losers[x]['socket_id'];
						var tmp_points = 0;
						io.sockets.sockets[tmp_socket_id]['points_tally'] += tmp_points;
						console.log('-----> ASSIGN SOME POINTS <----- points tally for '+tmp_socket_id+' = '+io.sockets.sockets[tmp_socket_id]['points_tally']);
						console.log('tmp_points = '+tmp_points);

						io.sockets.sockets[tmp_socket_id].emit('points', { round: round, points: tmp_points } );
						
						// final round
						if(round==3){							 
							io.sockets.sockets[tmp_socket_id].emit('tally', io.sockets.sockets[tmp_socket_id]['points_tally']);
						}

						x++;

					}


				}

				console.log('green_votes='+green_votes+' and red_votes='+red_votes);

				// green wins
				if(green_votes>red_votes){
					console.log('green wins');
					assign_points(votes_green,votes_red,round);
				}
				// red wins
				else if(red_votes>green_votes){
					console.log('red wins');
					assign_points(votes_red,votes_green,round);
				}
				// same votes
				else if(red_votes==green_votes){
					// last vote is losing team
					console.log('draw, who got there first?');
					if(vote=='green'){
						console.log('red wins');
						assign_points(votes_red,votes_green,round);
					}
					else if(vote=='red'){
						console.log('green wins');
						assign_points(votes_green,votes_red,round);
					}
					else{
						console.log('------------------ SOMETHING WENT HORRIBLY WRONG ---------------------- STOP EVERYTHING, DRINK SOME V, AND FIX IT! -----');
					}
				}

				// reset some counters etc and open up voting again
				votes=0;
				green_votes=0;
				red_votes=0;
				
				// need to get highest/lowest scores to notify users, also should probably sort by highest scored on presentation screen. just do a sort of the data.		

				if(round==3){
					console.log('---------------> round THREE so kill game');
					console.log('-------------------------------------------------------');
					
					socket.broadcast.emit('close-game');
					socket.emit('close-game');
					  	game_status = 'closed';

					  for (var socket_id_loop in io.sockets.sockets ){
					  	io.sockets.sockets[socket_id_loop]['registered']=null;
					  	io.sockets.sockets[socket_id_loop]['gravatar_hash']=null;
					  	io.sockets.sockets[socket_id_loop]['vote_time']=null;
					  	io.sockets.sockets[socket_id_loop]['vote']=null;
					  	io.sockets.sockets[socket_id_loop]['points_tally']=null;
					  }

					  votes = 0;
					  players = 0;
					  round=0;

				}else{
				  	socket.emit('round',round);
				  	socket.broadcast.emit('round',round);						
				}

			}

		});		

	});

    // user disconnected
    socket.on('disconnect', function () {
        if(io.sockets.sockets[socket.id]['registered']==1){
        	players--;
        }
        console.log('user DISCONNECTED ... players = '+players);
    });

});







