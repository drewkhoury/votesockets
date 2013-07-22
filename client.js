(function($) {

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // everyone
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////
    // init
    ////////////////////

      var socket = io.connect();       
      url = $(location).attr('href').split("?"); // spit the url by the ? character    

    ////////////////////
    // functions
    ////////////////////

      function game_console (message) {
          $('#console ul li').removeClass('current');
          $("#console ul").prepend('<li class="current"><p>'+message+'</p></li>');
      }

      function points (round, points){
          $("#round_"+round).html(points);
      }

    ////////////////////
    // socket.on
    ////////////////////

      socket.on('connect', function () {
          socket.emit('get-game-status'); // ask for status of the game when we connect
      });  

      socket.on('console', function (message) {
          game_console(message);
      });  

      socket.on('points', function (data) {
          points(data.round, data.points);
          game_console(data.points + ' points awarded for round '+ data.round);
          
          $(".round-"+data.round).addClass('round-over');
          $(".round-"+data.round + ' h3').text(data.points);
          
          $('.vote-panel li').removeClass("vote-done");
      });

      socket.on('tally', function (tally) {
          points('tally', tally);
          game_console(tally + ' points awarded in total for the game');
          $('.game-total h3').text(tally);
      });

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // presentation screen only
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    if(url[1]=='presentation'){

      ////////////////////
      // init
      ////////////////////

        var regular_button_color = '#F1C40F';
        var this_game_status_color ='#2ECC71';

        $('#presentation').show(); // show presentation section
        $('#voters').hide(); // hide voters

      ////////////////////
      // functions
      ////////////////////

        function close_the_game(reason) {

              // presenters cant close games when the button is disabled
              if($('#game-closed').hasClass('disabled') && reason=='presenter-closed-the-game'){
                return;  
              }

              // we need to notify others when presenters close games
              if(reason=='presenter-closed-the-game'){
                socket.emit('close-game');
              }

              // this stuff gets done every time a game is closed
              $('#game-opened').css('background-color',regular_button_color);
              $('#game-started').css('background-color',regular_button_color);
              $('#game-closed').css('background-color',this_game_status_color);
              
              $('#game-opened').removeClass('disabled');
              $('#game-started').addClass('disabled');
              $('#game-closed').addClass('disabled');

              $('#presentation .button').show();

              $('#results .circular').removeClass('border-vote-option-1');
              $('#results .circular').removeClass('border-vote-option-2');

        }

        function create_player_icon(socket_id,gravatar_hash){
          $('#results').prepend('<div id="'+socket_id+'" class="square"> <div class="circular"></div> </div>');
          $('#'+socket_id+' .circular').css('background', 'url(http://gravatar.com/avatar/'+gravatar_hash+'?s=100&d=http://melbdev.files.wordpress.com/2013/07/logo100.png) no-repeat');   
        }

      ////////////////////
      // click events
      ////////////////////

        // open a new game (for registrations)
        $('#game-opened').click(function(event) {
          console.log(this);
            if(!$('#game-opened').hasClass('disabled')){
                socket.emit('open-game');
                
                $('#game-opened').css('background-color',this_game_status_color);
                $('#game-started').css('background-color',regular_button_color);
                $('#game-closed').css('background-color',regular_button_color);

                $('#game-opened').addClass('disabled');
                $('#game-started').removeClass('disabled');
                $('#game-closed').removeClass('disabled');

                $('#presentation .button').show();

            }
        });

        // start game (voting begins)
        $('#game-started').click(function(event) {
          console.log(this);
            if(!$('#game-started').hasClass('disabled')){
                
                socket.emit('start-game');

                $('#game-opened').css('background-color',regular_button_color);
                $('#game-started').css('background-color',this_game_status_color);
                $('#game-closed').css('background-color',regular_button_color);

                $('#game-opened').addClass('disabled');
                $('#game-started').addClass('disabled');
                $('#game-closed').removeClass('disabled');

                $('#presentation .button').show();
            }
        });

        // close game
        $('#game-closed').click(function(event) {
          close_the_game('presenter-closed-the-game');            
        });

      ////////////////////
      // socket.on
      ////////////////////

        // change output depending on the status of the game
        socket.on('get-game-status', function (game_status) {  
          console.log(game_status)  
            $('#game-'+game_status).trigger('click');    
        });
        
        // create a gravatar icon
        socket.on('update-player-icon', function (data) {
          create_player_icon(data.socket_id,data.gravatar_hash);
        });

        socket.on('connect', function () {
          console.log('connected so get-current-players');
          socket.emit('get-current-players'); // ask for current players when we connect
        });

        socket.on('here-are-the-current-players', function (data) {
            console.log('here-are-the-current-players');
            console.log(data);  
            
            for(var index in data){
              create_player_icon(data[index].socket_id,data[index].gravatar_hash);
              $('#'+data[index].socket_id+' .circular').addClass('border-'+data[index].vote);
            }

        });

        // change the color of the icon
        socket.on('vote', function (data) {              
            // remove other classes
            $('#'+data.socket_id+' .circular').removeClass('border-vote-option-1');
            $('#'+data.socket_id+' .circular').removeClass('border-vote-option-2');

            // add this class
            $('#'+data.socket_id+' .circular').addClass('border-'+data.vote);
        });

        // close game
        socket.on('close-game', function () {
            close_the_game('game-over');
        }); 

        socket.on('remove-this-player', function (socket_id) {
            console.log('remove '+socket_id);
            $('#'+socket_id).remove();
        });

        socket.on('round', function () {
            $('#results .circular').removeClass('border-vote-option-1');
            $('#results .circular').removeClass('border-vote-option-2');              
        });    

    }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // voters only
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    else { 

      ////////////////////
      // init
      ////////////////////

        var player_registered=false;

      ////////////////////
      // functions
      ////////////////////

        function start_game(){

            // if you dont have an icon, assume you don't deserve to vote
            if(!$('.user-prompt').hasClass('registered')){
                game_console('[STARTED] :( you did not register in time and your host has started the game without you. What a douche.'); 
                $('#game').hide();    
            }
            else { 
                game_console('[STARTED] Let the voting begin!');   
                $('#voting').show();
                $('#user_gravatar').html('');
                $('.vote-panel').addClass('voting-open');       
           }

        }

        function open_game(){
            game_console('[OPEN] Registration is now OPEN. Enter your email to begin.');
            
            $('#end-game-msg').hide();

            $('#game').show();
            $('.voting-container').show();
 
            $(".totals h3").html('-');
            $(".totals").removeClass('round-over');

            $(".vote-panel").removeClass('voting-open');

            $('.vote-panel li').removeClass("vote-done");
        }

        function close_game(){
            game_console('[CLOSED] There are no open games at this time');
            $('.voting-container').hide();      
        }

      ////////////////////
      // click events
      ////////////////////

        $('#go').click(function(event) {
            event.preventDefault();

            if(player_registered){
                return;
            }
            player_registered=true;

            var email         = $('#email').val();
            var email_clean   = $.trim(email).toLowerCase();
            var gravatar_hash = CryptoJS.MD5(email_clean).toString();

            // tell the server about a new player
            socket.emit('register-player', gravatar_hash);

            $('.user-prompt').addClass('registered');
            $('.user-prompt input').prop('disabled', true);

            // nice message and icon for user
            game_console('Thanks! Waiting for other players so we can start the game.');

        });

        // vote panel        
        $(".vote-panel").on('click', 'li', function() {

            if($(this).parent().hasClass('voting-open')){

              // unselct all others
              $(this).siblings().removeClass("vote-done");

              // if it isn't selected, select it
              if(!$(this).hasClass('vote-done')){
                $(this).addClass("vote-done");
                socket.emit('vote', $(this).attr('option') );
              }

            }

        });         

      ////////////////////
      // socket.on
      ////////////////////

        // change output depending on the status of the game
        socket.on('get-game-status', function (game_status) {
            if(game_status=='started'){
                start_game();
            }
            else if(game_status=='opened'){
                open_game();
            } 
            else if(game_status=='closed'){
                close_game();
            }     
        });

        // open a new game
        socket.on('open-game', function () {
            open_game();   
        }); 

        // start game
        socket.on('start-game', function () {
            start_game();
        }); 

        // close game
        socket.on('close-game', function () {
            close_game();
        }); 

        socket.on('countdown', function (message) {
            if( $('#timer:hidden') ){
              $('#timer').show();
            }

            if(message=='done'){
              $('#timer').hide();
            }
            else{
              $('#timer h1').html(message);  
            } 
        });

        socket.on('end-game-msg', function (message) {
            $('#end-game-msg').show();
            $('#end-game-msg h1').html('#'+message.h1);
            $('#end-game-msg h2').html(message.h2+' points');
        });

    }
  
})(jQuery);