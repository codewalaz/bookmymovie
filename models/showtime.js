/******************************************************************************
* movie.js
* The showtimes db collection that stores all the ticket information about a show.
* This is the most used collection for booking a ticket.
* Author: Brijai Sudarsan
* Change history:
* Date          Comments
* 29-Dec-2018   Creation
*
*******************************************************************************/

const mongoose = require('mongoose');
/*
{

    "movieUuid" :   "<MOVIE.movieName>",
    "screenUuid":   "<SCREEN.screenName>",
    "movieLanguage"  :   "english",
    "screenCity"      :   "bangalore",
    "showStartTime" : <timestamp>,
    "tickets" :  [
        {
            "customerId" : "Ravi Kumar",
            "price"       : "250",
            "seatRowNum"   : 10,
            "seatNumInRow" : 25,
            "status"  : "AVAILABLE|RESERVED"
        }
    ]

}

}
*/

// schema for the internal ticket document in screen
const ticketSchema = mongoose.Schema( {

	ticketId:{
		type: String,
		required: true,
	},
	ticketIndex:{
		type: String,
		required: true,
	},
	customerId:{
		type: String,
		required: false,
	},
	seatRowNum:{
		type: Number,
		required: true,
	},
	seatNumInRow:{
		type: Number,
		required: true,
	},
	status:{
		type: String,
		enum: ['AVAILABLE', 'RESERVED'],
		default: 'AVAILABLE'
	}

});

// The showtime schema
const showtimeSchema = mongoose.Schema({
	movieName:{
		type: String,
		required: true,
		lowercase: true
	},
	screenName:{
		type: String,
		required: true,
		lowercase: true
	},
	screenCity:{
		type: String,
		required: true,
		lowercase: true
	},
	movieLanguage:{
		type: String,
		required: true,
		lowercase: true
	},
	showStartTime:{
		type: Number,
		required: true
	},
	price:{
		type: Number,
		required: true,
	},
	transactionId:{
		type: String,
		required: true,
	},
	tickets: [ticketSchema]
});

const showtimeModel = module.exports = mongoose.model('showtime', showtimeSchema);

// Create a new showtime.
module.exports.addShowtime = (showtime, callback) => {
	showtimeModel.create(showtime, callback);
}

// Get screen by name
module.exports.getShowById = (showId, callback) => {

	showtimeModel.findById(showId, (err, result) => {
		if(err) {
			callback(err, "A db error occurred. Failed to find showtime: " + showId);
		}else if(result == null){
			callback("Showtime not found: " + showId, "Please specify a valid show id");
		}else {
			callback(err, result);
		}
	});

}

// Fetch all running movies showtimes for a given city and language
module.exports.getAllShows = (city, language, callback) => {

	var currTimeInMs = Date.now();
	// Fetch movies for the next one week.
	var currTimePlus7DaysInMs = currTimeInMs + 7*24*3600*1000;
	var query = showtimeModel.find(
		{
			screenCity: city, movieLanguage: language,
			showStartTime: { $gte : currTimeInMs, $lte : currTimePlus7DaysInMs }
		},
		 {
			 movieName:1, screenName:1, showStartTime:1
		 }
	 );

	query.exec((err, result) => {

		if(err) {
			callback(err, "A db error occurred. Failed to find showtimes for city: "
			      + city + " Language: " + language);
		}else if(result == null){
			callback("Failed to find showtime", "No showtimes found for city: " + city + " Language: " + language);
		}else {
			callback(err, result);
		}

	});

}

module.exports.updateTicketsForShow = (currTransactionId, payload, callback) => {

		showtimeModel.updateOne({transactionId : currTransactionId}, payload, (err, result) => {

			if(err) {
				callback(err, "A db error occurred. Failed to book tickets for show: " + showId);
			}else if(result == null){
				// TRANSACTION_OVERWRITTEN: Another request has booked the tickets for the same show
				// Caller should re-read the showtime, check if the same tickets are AVAILABLE and
				// retry the update. This is a lockless way to ensure there is no duplicate ticket booking.
				callback("TRANSACTION_OVERWRITTEN",
								 "Transaction not found:" + currTransactionId
								 + " and may have been updated by another request. Please retry.");
			}else {
				callback(err, result);
			}

		});


}


// Fetch  tickets for a given show id.
// showId is the _id key of the showtimes collection
module.exports.getTicketsForShow = (showId, callback) => {

	showtimeModel.findById(showId, (err, result) => {

		if(err) {
			callback(err, "A db error occurred. Failed to find tickets for show: " + showId);
		}else if(result == null){
			callback("Failed to find showtime", "No showtime found for id: " + showId);
		}else {
			callback(err, result);
		}

	});

}


// Fetch booked shows for a customer in the future
module.exports.getShowsForCustomer = (customerId, city, callback) => {

	var currTimeInMs = Date.now();
	// Fetch movies for the next one week.
	var currTimePlus7DaysInMs = currTimeInMs + 7*24*3600*1000;
	console.log("Fetching shows for customer: " + customerId + " city:" + city
	    + " from now: " + currTimeInMs + " to " + currTimePlus7DaysInMs);
	var query = showtimeModel.find(
		{
			screenCity: city,
			showStartTime: { $gte : currTimeInMs, $lte : currTimePlus7DaysInMs },
			'tickets.customerId' : customerId
		},
		 {
			 movieName:1, screenName:1, showStartTime:1, movieLanguage:1
		 }
	 );

	query.exec((err, result) => {

		if(err) {
			callback(err, "A db error occurred. Failed to find showtimes for customer: " + customerId + " city: " + city);
		}else if(result == null){
			callback("Failed to find showtimes for customer", "No showtimes found for customer: " + customerId + " city: " + city);
		}else {
			callback(null, result);
		}

	});
}
