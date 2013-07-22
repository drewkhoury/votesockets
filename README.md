# Information

This project was made as a proof of concept for the Melborne Developer Meetup, MelbDev.io

The code does not take advantage of javascript application frameworks to keep things simple.

The backend is written in nodejs (Javascript) and the frontend is also striaght Javascript.

A few libraries were used to help keep things simple. These include jQuery, Socket.io & FlatUI.

The FlatUI files are included in this project and are not modified in any way.

The node_modules folder is included to assist with a speedy setup.

The VoteSockets game consists of a CLIENT and a SERVER.

# Example URLS

Go here to host a game: http://localhost:8080/?presentation
Go here to play a game: http://localhost:8080/

You can substitute localhost with your IP or domain name depending on how you setup your server. The port is configuratble.

# How it works?

Only one game can be played at a time, and anyone with the link can join.
Somebody hosts a game by going to the presentation url and clicking “Open”.
Players register by entering their email (you don’t need an email, any random thing you type will work).
Once all the players have registered the host clicks “Start” and the game begins.

There are three rounds.
Pick a color!
You get more points for picking before others.
You are only eligible for points if you’re on the winning team (majority rules).
Ties are decided by the team that was formed first (ie: in the case of a draw the last voter is actually part of the losing team).

# The CLIENT

	index.html

		The index file calls the following CSS:
			Flat-UI-master/bootstrap/css/bootstrap.css
			Flat-UI-master/css/flat-ui.css
			votesockets.css (custom CSS)

		The index file calls the following JS:
			Flat-UI-master/js/jquery-1.8.3.min.js
			http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/md5.js (MD5 is used to create a hash of the email for Gravatar)
			/socket.io/socket.io.js
			client.js (custom JS)


	votesockets.css
		After the bootstrap & flatui CSS are included the custom CSS is called.

	client.js
		Logic for the client. This includes two views, presentation & voter. This file is seperated into "init", "functions", "click events" and "socket.on".

# The SERVER

	app.js

	The server is started by running the following command in the terminal:
		node app.js

	app.js consists of a static web server & the game logic.

	The web server has a few variaibles which need to be configured. webroot & port are the most important ones.

	The game keeps all data in Javascript variables and arrays, so all data is lost when the server restarts.

	The game is seperated into three sections "init", "functions", "socket.on"


# Installation

	package.json & Profile can assist with automated deployments (for systems like Heroku)

	This is a rough guide to help with Linux installations:

	You will need a few packages to begin:
		apt-get update
		sudo apt-get upgrade
		sudo apt-get install build-essential libssl-dev curl git-core
		sudo apt-get install git
		sudo apt-get install nodejs
		sudo apt-get install node
		sudo ln -s /usr/bin/nodejs /usr/local/bin/node
		sudo apt-get install npm

	You may need to install a few packages for node:
		npm install socket.io
		sudo npm install forever

	You will need to setup a web root:
		mkdir /var/www
		chown -R /var/www ubuntu 
		chown -R ubuntu /var/www

	Start the node app:
		cd /var/www; node app.js

	Start the node app using forever (so your server doesn't stop when your terminal session dies)
		cd /var/www; forever start app.js
	
	Stop the app (if you started it with forever)
		forever stop 0


