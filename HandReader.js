var fs = require('fs'),
	_ = require('underscore'),
	S = require('string'),
	mongoose = require('mongoose'),
 	Hand = mongoose.model('Hand'),
 	GAME_TYPES = {
 		'Pot Limit Omaha Hi': 'PLO',
 		'Omaha Pot Limit': 'PLO',
 		'PL Omaha Hi': 'PLO',
 		'CAP PL Omaha Hi': 'CAP PLO',
 		'Hold\'em No Limit': 'NL'
	};

function addGameSequence(sequenceStr) {
	if (sequenceStr) {
    	if (games[sequenceStr]) games[sequenceStr]++;
    	else games[sequenceStr] = 1;
	}
}

function readFileSync(file) {
	return fs.readFileSync(file, 'utf8');
}

function getSiteIdentifier(str) {
	//console.log(str.split(' ')[0]);
	if (str.split(' ')[0].trim() === 'PokerStars') return 'ps';
	if (str.split(' ')[0].trim() === 'Full') return 'ft';
	return '';
}

function getGameType(str, site) {
	var gameType = '';
	if (site === 'ps') {
		//the game type string is located between the first ':' and the first '('
		//in a pokerstars file
		gameType = str.substring(str.indexOf(':') + 1, str.indexOf('(')).trim();
	}
	if (site === 'ft') {
		var strAfterFirstDash = str.substr(str.indexOf('-') + 1);
		gameType = strAfterFirstDash.match(/[\bA-z][A-z\s]{0,25}\b/).shift();
	}
	//only use one name for game type
	return _.has(GAME_TYPES, gameType) ? GAME_TYPES[gameType] : gameType;
}

function getStakes(str) {
	return str.match(/[\b$][\w/$]{0,25}/).shift();
}

function getDate(str) {
	return str.match(/[\b0-9]{4}\/[0-9]{2}\/[0-9]{2}/).shift();
}

function getHandNumber(str) {
	var words = str.split(' '),
		num;

	for (var i = 0; i < words.length; i++) {
		var word = words[i];
		if (word.charAt(0) === '#') {
			num = word.substr(1, words.length - 1);
			break;
		}
	}

	return num;
}

function isStartOfNewHand(line) {
	return line.search('Game #') !== -1 || 
		(line.search('Hand #') !== -1 && !S(line).startsWith('Dealer:'));	
}

exports.processFile = function(data) {
	var lines = data.split('\n'),
		flopped = false,
		turned = false,
		rivered = false,
		hand = {},
		site = getSiteIdentifier(lines[0]),
		n = 0,
		HERO,
		VILLAIN,
		sequence = '',
		handText = '';

	console.log('Lines in file:', lines.length);

	for (var i = 0; i <= lines.length - 1; i++) {
		
		//use the string wrapper library to get more functions
		var line = S(lines[i]),
			startOfHand = isStartOfNewHand(line.s),
			isLastHand = i === lines.length - 1;

		//we will store the text for each hand
		if (!startOfHand && !line.isEmpty()) handText += line.s.concat('\n');

		//console.log(line);

	    if (startOfHand || isLastHand) {
	    	//if it's not the first iteration, let's capture the previous game
	    	//before starting the new one
	    	if (sequence) {
	    		//console.log(sequence);
	    		hand.position = sequence.substr(0,2);
	    		hand.sequence = sequence.substr(3);
	    		//console.log(hand.sequence)
	    		hand.hero = HERO;
	    		hand.villain = VILLAIN;
	    		hand.story = handText;
	    		//console.log(handText);

			    Hand.update(
			    	{ id: hand.id }, 
			    	hand, 
			    	{ upsert: true }, 
			    	function(err) {
			    		if (err) {
			    			console.log(err);
			    		}
			    	}
		    	);
		    	//increment the game counter
		    	n++;
		    	//if last hand we are done
		    	if (isLastHand) continue;
	    	}
	    	//clear out the old hand text and start the next hand
	    	handText = '';
	    	handText = line.concat('\n');
	    	//clear out the old sequence before starting the new one
	    	sequence = '';
	    	//reset the flags that prevent multiple flop/turn/river (run it twice)
	    	flopped = false; 
	    	turned = false; 
	    	rivered = false;
	    	//capture the unique game #
	    	hand.id = site + getHandNumber(line.s);
	    	//capture other game info
	    	hand.game = getGameType(line.s, site);
	    	hand.stakes = getStakes(line.s);
	    	hand.date = getDate(line.s);
	    	//continue to next iteration to prevent unnecessary code execution
	    	continue;
	    } 

	    if (line.contains('FLOP') && !flopped) {
	    	step = 'flop';
	    	sequence += '-' + step;
	    	flopped = true;
	    	continue;
	    }
	    if (line.contains('TURN') && !turned) {
	    	step = 'turn';
	    	sequence += '-' + step;
	    	turned = true;
	    	continue;
	    }
	    if (line.contains('RIVER') && !rivered) {
	    	step = 'river';
	    	sequence += '-' + step;
	    	rivered = true;
	    	continue;
	    }

		//figure out who the players are if we don't know yet
		if (!VILLAIN || !HERO) {
			if (line.startsWith('Seat') && !line.contains('is sitting out')) {
				var player = line
						.between(':', '(')
						.trim().s;

				if (player === '@elonmusk') HERO = player;
				else VILLAIN = player;
			}
		}

		if (line.startsWith(HERO + ' posts the small')) sequence += 'sb';
		else if (line.startsWith(HERO + ' posts the big')) sequence += 'bb';
		else if (line.startsWith(HERO + ': posts small')) sequence += 'sb';
		else if (line.startsWith(HERO + ': posts big')) sequence += 'bb';
		else if (line.startsWith(HERO + ' bets')) sequence += '-hr';
		else if (line.startsWith(HERO + ' raises')) sequence += '-hr';
		else if (line.startsWith(HERO + ' folds')) sequence += '-hf';
		else if (line.startsWith(HERO + ' checks')) sequence += '-hc';
		else if (line.startsWith(HERO + ' calls')) sequence += '-hc';
		else if (line.startsWith(HERO + ': bets')) sequence += '-hr';
		else if (line.startsWith(HERO + ': raises')) sequence += '-hr';
		else if (line.startsWith(HERO + ': folds')) sequence += '-hf';
		else if (line.startsWith(HERO + ': checks')) sequence += '-hc';
		else if (line.startsWith(HERO + ': calls')) sequence += '-hc';
		else if (line.startsWith(VILLAIN + ' bets')) sequence += '-vr';
		else if (line.startsWith(VILLAIN + ' raises')) sequence += '-vr';
		else if (line.startsWith(VILLAIN + ' folds')) sequence += '-vf';
		else if (line.startsWith(VILLAIN + ' checks')) sequence += '-vc';
		else if (line.startsWith(VILLAIN + ' calls')) sequence += '-vc';
		else if (line.startsWith(VILLAIN + ': bets')) sequence += '-vr';
		else if (line.startsWith(VILLAIN + ': raises')) sequence += '-vr';
		else if (line.startsWith(VILLAIN + ': folds')) sequence += '-vf';
		else if (line.startsWith(VILLAIN + ': checks')) sequence += '-vc';
		else if (line.startsWith(VILLAIN + ': calls')) sequence += '-vc';
	}
	//return the number of games processed
	return 	n;
}
