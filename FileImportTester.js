var fs = require('fs'),
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
	dbConnStr = 'mongodb://localhost/poker',
	filePath = './poker_files/hand-history.txt';

mongoose.connect(dbConnStr); 
console.log('hello');

//read an process each hand history file one at a time
/*var dir = 'poker_files/', 
	historyFiles = fs.readdirSync(dir);

for (var i = historyFiles.length - 1; i >= 0; i--) {
	console.log('Processing file:', historyFiles[i]);
	processFile(readFileSync(dir + historyFiles[i]));
};
//processFile(readFileSync(dir + 'hand-history.txt'));

console.log('Number Of Files Processed:', historyFiles.length);*/

fs.readFileSync(filePath, 'utf-8', function (err, data) {
	numHands += HandReader.processFile(data);
	console.log('numHands', numHands);
});