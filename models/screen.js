/******************************************************************************
* movie.js
* The screen db collection that stores static information about a movie theater.
* Author: Brijai Sudarsan
* Change history:
* Date          Comments
* 29-Dec-2018   Creation
*
*******************************************************************************/

const mongoose = require('mongoose');
/*
{

	"screenName": "PVR screen1",
	"screenUuid": "",
	"screenCity": "Bangalore",
	"screenLocation": "Forum mall, Koramangala",
	"numRows": 20,
	"numSeatsPerRow": 30

}
*/

// The screen schema
const screenSchema = mongoose.Schema({
	screenName:{
		type: String,
		required: true,
		lowercase: true
	},
	screenCity:{
		type: String,
		required: true
	},
	screenLocation:{
		type: String,
		required: true
	},
	numRows:{
		type: Number,
		required: true
	},
	numSeatsPerRow:{
		type: String,
		required : true
	}
});

const screenModel = module.exports = mongoose.model('screen', screenSchema);

// Add a screen to the screens collection.
module.exports.addScreen = (screen, callback) => {

	screenModel.create(screen, callback);

}

// Get screen by name
module.exports.getScreenByName = (screenName, callback) => {

	screenModel.findOne({screenName: screenName}, (err, result) => {
		if(err) {
			callback(err, "A db error occurred. Failed to find screen: " + screenName);
		}else if(result == null){
			callback("Screen not found: " + screenName, "Please specify a valid screen name");
		}else {
			callback(err, result);
		}
	});

}
