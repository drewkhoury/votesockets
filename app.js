////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// static web server
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// node modules
	var app = require('http').createServer(handler);
	var fs = require('fs');
	var static = require('node-static');
	var util = require('util');

	// server vars
	var webroot = '/Users/drew/Desktop/votesockets';
	var port = 8080;
	var file = new(static.Server)(webroot, {
	  //cache: 600,
	  headers: { 'X-Powered-By': 'hopes-and-dreams' }
	});

	// http handler function (our static web server)
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

	// start http server
	app.listen(port);
	console.log('node-static running at http://localhost:%d', port);





////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// game
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// node modules
	var io = require('socket.io').listen(app);

	// vars
	var game_status = 'closed'; // closed opened started
	var players = 0;
	var votes_counter = 0;
	var option_1_counter = 0;
	var option_2_counter = 0;
	var round = 0;

	// each socket has the following vars
		// io.sockets.sockets[socket.id]['gravatar_hash']
		// io.sockets.sockets[socket.id]['registered']
		// io.sockets.sockets[socket.id]['vote']
		// io.sockets.sockets[socket.id]['vote_time']
		// io.sockets.sockets[socket.id]['points_tally']

	// when a client makes a socket connection, do this
	io.sockets.on('connection', function (socket) {

	    ////////////////////
	    // init
	    ////////////////////

			io.sockets.sockets[socket.id]['registered'] = 0;
			io.sockets.sockets[socket.id]['points_tally'] = 0;

			console.log('A new user has connected. Socket id is '+socket.id);
			io.sockets.sockets[socket.id].emit('console', 'Your socket id is '+socket.id);

	    ////////////////////
	    // functions
	    ////////////////////

			function countdown(message){
				socket.broadcast.emit('countdown',message);
				socket.emit('countdown',message);	
			}

	    ////////////////////
	    // socket.on
	    ////////////////////

	    	socket.on('get-game-status', function () {
			  	socket.emit('get-game-status', game_status);
			});

			socket.on('get-current-players', function () {

				var tmp_player_array = [];
				for (var socket_id_loop in io.sockets.sockets ){
					if(io.sockets.sockets[socket_id_loop]['registered']==1){
						tmp_player_array.push( {vote: io.sockets.sockets[socket_id_loop]['vote'],
						gravatar_hash: io.sockets.sockets[socket_id_loop]['gravatar_hash'],
						socket_id: socket_id_loop} );
					}
				}

				socket.emit('here-are-the-current-players', tmp_player_array);
			});

			socket.on('register-player', function (gravatar_hash) {
				
				console.log('A player has registered. The gravatar hash is '+gravatar_hash); // server debug
				socket.broadcast.emit('update-player-icon', {socket_id: socket.id, gravatar_hash:gravatar_hash} ); // send to clients
				
				io.sockets.sockets[socket.id]['gravatar_hash'] = gravatar_hash;
				io.sockets.sockets[socket.id]['registered'] = 1;

				players++;
				console.log('The player count is now '+players); // server debug	

			});

			socket.on('open-game', function (data) {
			  if(game_status=='closed'){
			  	socket.broadcast.emit('open-game');
			  	game_status = 'opened';
			  }
			});

			socket.on('start-game', function (data) {
			  if(game_status=='opened'){
			  	socket.broadcast.emit('start-game');
			  	game_status = 'started';

			  	socket.emit('round',1);
			  	socket.broadcast.emit('round',1);

				countdown('Ready!');
				setTimeout(function(){countdown('Set!')},1000);
				setTimeout(function(){countdown('Go!')},2000);
				setTimeout(function(){countdown('done')},3000);	
			  }
			});

			socket.on('close-game', function (data) {
			  if(game_status=='opened' || game_status=='started'){
			  	socket.broadcast.emit('close-game');
			  	game_status = 'closed';

			  for (var socket_id_loop in io.sockets.sockets ){
			  	io.sockets.sockets[socket_id_loop]['vote_time']=null;
			  	io.sockets.sockets[socket_id_loop]['vote']=null;
			  }

			  votes_counter=0;
			  round=0;
			  
			  }
			});

			socket.on('vote', function (vote) {

				console.log(vote);

				// only allow voting on open games
				if(game_status!='started' ){
					console.log('------ DANGER DANGER --------------------------------------------------------------------------');
					console.log('---------------------------- Someone tried to vote on a game that was not started -------------');
					console.log('-----------------------------------------------------------------------------------------------');
					return;
				}

				// only registered players can vote
				if(io.sockets.sockets[socket.id]['registered']!=1 ){
					console.log('------ DANGER DANGER --------------------------------------------------------------------------');
					console.log('---------------------------- Someone tried to vote on a game but they were not registered -----');
					console.log('-----------------------------------------------------------------------------------------------');
					return;
				}

				// functions
				function do_vote(type,vote){
					console.log(type+' '+vote);

					io.sockets.sockets[socket.id]['vote_time'] = new Date().getTime();
					io.sockets.sockets[socket.id]['vote'] = vote;

					if(vote=='vote-option-1'){
						option_1_counter++;
					}
					else if(vote=='vote-option-2'){
						option_2_counter++;
					}
					
					if(type=='new'){
						votes_counter++;
					}
					else if (type=='change'){

						if(vote=='vote-option-1'){
							option_2_counter--;
						}
						if(vote=='vote-option-2'){
							option_1_counter--;
						}
					}
				}

				console.log('Registered user, with socket-id of '+socket.id+' has cast a vote of '+vote); // server debug
				socket.broadcast.emit('vote', {socket_id: socket.id, gravatar_hash: io.sockets.sockets[socket.id]['gravatar_hash'], vote: vote}); // send to clients

				if(io.sockets.sockets[socket.id]['vote_time']!=undefined){ // has this user voted yet?
					if(io.sockets.sockets[socket.id]['vote']!=vote){ // user changed vote
						do_vote('change',vote);
					}
				}
				else{ // first time voter
					do_vote('new',vote);
				}

				console.log(votes_counter+' votes have been cast out of '+players+' registered players'); // server debug
			

				// everyone has voted (end of a round)
				if(votes_counter>=players){

					round++;

					socket.broadcast.emit('console', 'Round '+round+' is over!');
					
					io.sockets.sockets[socket.id].emit('console', 'Round '+round+' is over! (You were the last voter, sucks to be you)');
					
					function pick_winner(){

						// functions
						function assign_points(votes_array,losers,round){

							// assign points for winning team
							votes_array.sort(function(a,b) { return a.vote_time - b.vote_time; });
							var x = 0;
							for (var this_vote in votes_array){
								
								var tmp_socket_id = votes_array[x]['socket_id'];
								var tmp_points = parseInt(votes_array.length)-parseInt(x);
								
								//console.log(tmp_socket_id);
								io.sockets.sockets[tmp_socket_id]['points_tally'] += tmp_points;
								
								console.log('-----> ASSIGN SOME POINTS <----- points tally for '+tmp_socket_id+' = '+io.sockets.sockets[tmp_socket_id]['points_tally']);
								console.log('tmp_points = '+tmp_points);

								io.sockets.sockets[tmp_socket_id].emit('points', { round: round, points: tmp_points } ); // tell client about points
								
								// final round
								if(round==3){							 
									io.sockets.sockets[tmp_socket_id].emit('tally', io.sockets.sockets[tmp_socket_id]['points_tally']);
								}

								x++;

							}

							// assign zero points for all members of losing team
							x=0;
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
						
						// fill up each vote array with votes
						var tmp_option_1_votes = new Array();
						var tmp_option_2_votes = new Array();

						for (var socket_id_loop in io.sockets.sockets ){
							
							if(io.sockets.sockets[socket_id_loop]['registered']==1){

								if(io.sockets.sockets[socket_id_loop]['vote']=='vote-option-1'){
									tmp_option_1_votes.push({ socket_id: socket_id_loop, 
										               vote_time: io.sockets.sockets[socket_id_loop]['vote_time'],
										               vote: io.sockets.sockets[socket_id_loop]['vote']
										          });	
								}

								if(io.sockets.sockets[socket_id_loop]['vote']=='vote-option-2'){
									tmp_option_2_votes.push({ socket_id: socket_id_loop, 
										               vote_time: io.sockets.sockets[socket_id_loop]['vote_time'],
										               vote: io.sockets.sockets[socket_id_loop]['vote']
										          });	
								}

								// clear the votes in preperation for the next round
								io.sockets.sockets[socket_id_loop]['vote_time']=undefined;
								io.sockets.sockets[socket_id_loop]['vote']==undefined;

							}

						}

						console.log('option_1_counter='+option_1_counter+' and option_2_counter='+option_2_counter);

						// vote-option-1 wins
						if(option_1_counter>option_2_counter){

							console.log('vote-option-1 wins');
							console.log(tmp_option_1_votes);
							assign_points(tmp_option_1_votes, tmp_option_2_votes, round);

						}
						// vote-option-2 wins
						else if(option_2_counter>option_1_counter){

							console.log('vote-option-2 wins');
							assign_points(tmp_option_2_votes, tmp_option_1_votes, round);

						}
						// same votes so last to vote is losing team
						else if(option_2_counter==option_1_counter){
							
							console.log('draw, who got there first?');

							if(vote=='vote-option-1'){
								console.log('vote-option-2 wins');
								assign_points(tmp_option_2_votes, tmp_option_1_votes, round);
							}
							else if(vote=='vote-option-2'){
								console.log('vote-option-1 wins');
								assign_points(tmp_option_1_votes, tmp_option_2_votes, round);
							}
							else{
								console.log('------------------ SOMETHING WENT HORRIBLY WRONG ---------------------- STOP EVERYTHING, DRINK SOME V, AND FIX IT! -----');
							}

						}

					}

					pick_winner();

					// reset some counters etc and open up voting again
					votes_counter=0;
					option_1_counter=0;
					option_2_counter=0;
					
					if(round==3){
						console.log('-------------------------------------------------------');
						console.log('---------------> round THREE so close game');
						console.log('-------------------------------------------------------');
						
						socket.broadcast.emit('close-game');
						socket.emit('close-game');
						game_status = 'closed';

						  var tally_array = [];

						  for (var socket_id_loop in io.sockets.sockets ){

						  	if(io.sockets.sockets[socket_id_loop]['registered']==1){
						  		tally_array.push({socket_id: socket_id_loop, tally: io.sockets.sockets[socket_id_loop]['points_tally'] });
							}

						  	io.sockets.sockets[socket_id_loop]['vote_time']=null;
						  	io.sockets.sockets[socket_id_loop]['vote']=null;
						  	io.sockets.sockets[socket_id_loop]['points_tally']=null;
						  }

						  tally_array.sort(function(a,b) { return b.tally - a.tally; });

						  console.log('=====================> tally_array <=====================');
						  console.log(tally_array);
						  console.log('=========================================================');

						  var index=0;
						  for(var index in tally_array){
						  	var tally_obj = tally_array[index];
						  	index++;
						  	io.sockets.sockets[tally_obj.socket_id].emit('end-game-msg', {h1: index, h2: tally_obj.tally} );
						  }

						  votes_counter = 0;
						  //players = 0;
						  round=0;

					}else{
					  	socket.emit('round',round);
					  	socket.broadcast.emit('round',round);

						countdown('Ready!');
						setTimeout(function(){countdown('Set!')},1000);
						setTimeout(function(){countdown('Go!')},2000);
						setTimeout(function(){countdown('done')},3000);	
				  				
					}

				}	

			});

		    // user disconnected
		    socket.on('disconnect', function () {
		        if(io.sockets.sockets[socket.id]['registered']==1){
		        	players--;
		        	socket.broadcast.emit('remove-this-player', socket.id);
		        }

			  	io.sockets.sockets[socket.id]['registered']=null;
			  	io.sockets.sockets[socket.id]['gravatar_hash']=null;

		        console.log('A player has disconnected. The total player count is now '+players); // server debug
		    });

	});







