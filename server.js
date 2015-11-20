var express = require('express'), 
	app = express(),
	server = require('http').createServer(app),
	_ = require('underscore'),
	fs = require('fs'),
	async = require('async'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	handSchema = new Schema({
		id: { type: String, unique: true },
		position: String,
		sequence: String,
		hero: String,
		villain: String,
		game: String,
		stakes: String,
		date: String,
		story: String
	}),
	Hand = mongoose.model('Hand', handSchema),
	HandReader = require('./HandReader.js'),
	dbConnStr = process.env.MONGOLAB_URI ||
		process.env.MONGOHQ_URL ||
		'mongodb://localhost/poker',
	heros = {
		'Elon': ['@elonmusk', '@reallifeironman'], 
		'Jay': ['@jtollerene', '@futureteslaemployee'] 
	};


//define www as static directory
app.use(express.static('www'));
app.use(express.static('bower_components'));
//middleware needed for file upload
app.use(express.bodyParser());

//create db connection
mongoose.connect(dbConnStr); 
var db = mongoose.connection;

//Routes
//default route returns the index html page
app.get('/', function(req, res){
	res.sendfile('www/index.html');
});

//routes that will return json from db queries
app.get('/data', function(req, res) {
    var	position = req.query.pos,
    	villain = req.query.villain,
    	hero = req.query.hero,
    	game = req.query.game,
    	stakes = req.query.stakes,
    	from = req.query.from,
    	to = req.query.to,
    	query = {};

	//build the query object
	query.position = position;
	query.villain = villain;
	query.hero = { $in: heros[hero] };
	if (game !== 'All') query.game = game;
	if (stakes !== 'All') query.stakes = stakes;

	var dateFilter = function(doc) {
		var thisDate = new Date(doc.date),
			fromDate = from ? new Date(from) : new Date(),
			toDate = to ? new Date(to) : new Date();

		if (from && to) return thisDate >= fromDate && thisDate <= toDate;
		else if (from) return thisDate >= fromDate;
		else if (to) return thisDate <= toDate;
		else return true;
	};

	// Locate all the entries using find
	Hand.find(query, 
	{ 
		_id: 0, 
		sequence: 1,
		date: 2
	},
	function(err, results) {
		//console.dir(results);
		var filtered = _.filter(results, dateFilter),
			sequences = _.pluck(filtered, 'sequence'),
			rollup = _.countBy(sequences, function(seq){
				return seq;
			});
		res.send(rollup);
	});
	/*.$where(function() {
		console.log('test2');
		return false;
		var thisDate = new Date(this.date),
			fromDate = new Date(from),
			toDate = new Date(to);
		if (from && to)
			return thisDate >= fromDate && thisDate <= toDate;
		else 
			return true;
	});*/      
});

app.get('/opponents', function(req, res) {
    Hand.distinct('villain', 
    	{ hero: { $in: heros[req.query.hero] } }, 
    	function(err, result) {
	    	res.send(result);
		}
    );
});

app.get('/games', function(req, res) {
    Hand.distinct('game', function(err, result) {
	    res.send(result);
    });
});

app.get('/stakes', function(req, res) {
    Hand.distinct('stakes', function(err, result) {
	    res.send(result);
    });
});

var numHands;

//file upload handler
app.post('/upload',function(req,res)
{
	numHands = 0;
	//console.log(req.files);
	var upload = _.isArray(req.files.pokerfiles) ?
			req.files.pokerfiles : 
			[req.files.pokerfiles];

	async.each(upload, saveFileToDB, function(err) {
	  	res.send('Success! ' + numHands + ' hands were added to the database.');
	});
});

function saveFileToDB (item, callback) {
	fs.readFile(item.path, 'utf-8', function (err, data) {
  		numHands += HandReader.processFile(data);
  		console.log('numHands', numHands);
		callback();
	});
}

//server.listen(8000);

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
