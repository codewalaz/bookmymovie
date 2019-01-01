/******************************************************************************
* movie.js
* The movie db collection that stores static information about a movie.
* Author: Brijai Sudarsan
* Change history:
* Date          Comments
* 29-Dec-2018   Creation
*
*******************************************************************************/

const mongoose = require('mongoose');
/*
{

    "movieName" : "spiderman - into the verse",
    "languages" : ["english, hindi", "telugu", "tamil"],
    "genres"    : ["action, adventure", "animation"],
    "durationInMins" :  117,
    "shortSummary" : "Young Miles Morales has just realized his spider powers. Watch him get trained under Peter Parker to understand what it means to be Spider-man.",
    "cast"      : ["Lieve Schrieber", "Maheshala Ali"]

}
*/
// The movie schema
const movieSchema = mongoose.Schema({
	movieName:{
		type: String,
		required: true,
		lowercase: true
	},
	languages:{
		type: [String],
		required: true
	},
	genres:{
		type: [String],
		required: true
	},
	durationInMins:{
		type: Number,
		required: true
	},
	shortSummary:{
		type: String,
		required : true
	},
	cast:{
		type: [String],
		required : false
	}
});

const movieModel = module.exports = mongoose.model('Movie', movieSchema);

// Add a movie to the movies collection
module.exports.addMovie = (movie, callback) => {
	movieModel.create(movie, callback);
}

module.exports.getMovieByName = (movieName, callback) => {
	movieModel.findOne({movieName: movieName}, (err, result) => {
		if(err) {
			callback(err, "A db error occurred. Failed to find movie: " + movieName);
		}else if(result == null){
			callback("Movie not found: " + movieName, "Please specify a valid movie name");
		}else {
			callback(err, result);
		}
	});
}
