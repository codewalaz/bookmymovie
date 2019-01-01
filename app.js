//require the mongoClient from mongodb module
var MongoClient = require('mongodb').MongoClient;


var express = require("express");
var app = express();
var bodyParser = require("body-parser")
var mongoose =  require("mongoose")

const uuidv1 = require('uuid/v1');

app.use(express.static(__dirname+'/client'));
app.use(bodyParser.json());

// db mongoose model modules
var movieModule = require("./models/movie")
var screenModule = require("./models/screen")
var showtimeModule = require("./models/showtime")

// Connect to mongodb
var connectionUrl = 'mongodb://localhost:27017';
mongoose.connect("mongodb://localhost:27017/bookmymovie");
var db = mongoose.connection;

// Create movie document
app.post('/bookmymovie/v1/movie', (req, res) => {

  var movieJson = req.body;
  console.log("Request is " + JSON.stringify(movieJson, null, 4));
  console.log("Adding movie " + movieJson.movieName );

  movieModule.addMovie(movieJson, (err, respJson) => {

    if(err){
      res.json({"error" : err});
      console.log("Failed to add movie " + movieJson.movieName + " Error: " + JSON.stringify(err));
    }else {
      res.json(movieJson);
      console.log("Added movie " + movieJson.movieName + " successfully.");
    }

  });

});

// Create screen document
app.post('/bookmymovie/v1/screen', (req, res) => {

  var screenJson = req.body;
  console.log("Request is " + JSON.stringify(screenJson, null, 4));
  console.log("Adding screen " + screenJson.screenName);

  screenModule.addScreen(screenJson, (err, respJson) => {

    if(err){
      res.json({"error" : err});
      console.log("Failed to add screen " + screenJson.screenName + " Error: " + JSON.stringify(err));
    }else {
      res.json(screenJson);
      console.log("Added screen " + screenJson.screenName + " successfully.");
    }

  });

});

function validateAddShowTimeRequest(reqJson, callback) {

  if(!reqJson["showStartTime"]) {
    callback("Invalid request", "Missing field: showStartTime");
  }else {
    var showStartTimeTs = Date.parse(reqJson["showStartTime"]);
    if(isNaN(showStartTimeTs)) {
      callback("Invalid request", "Invalid value for showStartTime: " + reqJson["showStartTime"]);
    }else if(showStartTimeTs < Date.now()){
      // A new show cannot be registered for a past time
      callback("Invalid request", "Invalid value for showStartTime: value cannot be in the past. "
          + " Current UTC TS: " + Date.now() + ". Requested showStartTime UTC TS: " + showStartTimeTs);
    }else {
      reqJson["showStartTime"] = showStartTimeTs;
      // Validate movieName
      if(! reqJson["movieName"]) {
        callback("Invalid request", "Missing field: movieName}");
      }else {
        movieModule.getMovieByName(reqJson.movieName, (err, movieRespJson) => {
          if(err) {
            callback(err, movieRespJson);
          }else {
            console.log("ERR: " + err);
            console.log("Found movie: " + reqJson.movieName + " Resp: " + JSON.stringify(movieRespJson)
                        + ". Validating screen name: " + reqJson.screenName);
            // Validate screenName
            if(! reqJson["screenName"]) {
              jsonErr["error"] = "Invalid request";
              jsonErr["details"] = "Missing field: screenName";
              callback(jsonErr, jsonErr);
            }else {
              screenModule.getScreenByName(reqJson.screenName, (err, screenRespJson) => {
                if(err) {
                  callback(err, screenRespJson);
                }else {
                  console.log("Found screen: " + reqJson.screenName + ". resp: " + JSON.stringify(screenRespJson));
                  respJson = {}
                  respJson["movie"] = movieRespJson;
                  respJson["screen"] = screenRespJson;
                  callback(null, respJson);
                }
              });
            }
          }
        });
      }
    }

  }

}


// Generate ticket info. Although there is
// n^2 processing involved here, n is usually quite small(<50) and this is called
// only for creating a show. Can be optimized by using a 2-D mongodb array instead.
function generateTicketsForShow(reqJson, screen) {

  var rows = screen.numRows;
  var numSeatsPerRow = screen.numSeatsPerRow;
  reqJson.tickets = [];
  var ticketIndex = 0;
  for(var i = 1; i <= screen.numRows; i++) {
    for(var j = 1; j <= screen.numSeatsPerRow; j++) {
       var ticket = {};
       ticket.ticketId = uuidv1();
       // Customer id is set only for a RESERVED ticket
       ticket.customerId = undefined;
       ticket.seatRowNum = i;
       ticket.seatNumInRow = j;
       ticket.status = 'AVAILABLE';
       // ticket's index position in the array
       ticket.ticketIndex = ticketIndex;
       ticketIndex++;
       reqJson.tickets.push(ticket);
    }
  }
}


// Create a new showtime
app.post('/bookmymovie/v1/showtime', (req, res) => {

  var showtimeJson = req.body;
  console.log("Request is " + JSON.stringify(showtimeJson, null, 4));
  console.log("Adding showtime. Movie: " + showtimeJson.movieName + " Screen: " + showtimeJson.screenName);
  validateAddShowTimeRequest(showtimeJson, (err, result) => {
    if(err) {
      res.status(400).json(result);
      //res.status(400);
      console.log("Invalid request. Failed to add showtime. Error: " + JSON.stringify(result));
    }else {
      // TODO: isShowtimeSlotFree() - Check if the screen is showing another movie.
      generateTicketsForShow(showtimeJson, result.screen);
      console.log("Request is " + JSON.stringify(showtimeJson, null, 4));
      // The initial transaction id. Every booking for the show should update the
      // transaction id to ensure there are no duplicate bookings.
      showtimeJson.transactionId = uuidv1();
      showtimeModule.addShowtime(showtimeJson, (err, respJson) => {

        if(err){
          res.json({"error" : err});
          console.log("Failed to add showtime. Movie: " + showtimeJson.movieName
          + " Screen: " + showtimeJson.screenName + " Error: " + JSON.stringify(err));
        }else {
          var clientResponseJson = {};
          clientResponseJson.showId = respJson._id;
          clientResponseJson.movieName = respJson.movieName;
          clientResponseJson.screenName = respJson.screenName;
          // client can do the date conversion. Added for testing purpose.
          clientResponseJson.showStartTime = new Date(respJson.showStartTime).toUTCString();
          clientResponseJson.movieLanguage = respJson.movieLanguage;
          // All tickets are assumed to have the same price
          clientResponseJson.price = respJson.price;
          clientResponseJson.tickets = respJson.tickets;
          res.json(clientResponseJson);
          console.log("Added showtime. Movie: " + showtimeJson.movieName + " Screen: " + showtimeJson.screenName);
        }

      });

    }
  });

});

// Get running shows for a given city and language
app.get('/bookmymovie/v1/showtime', (req, res) => {

  var showtimesQueryJsonReq = req.query;
  console.log("GET Request is " + JSON.stringify(showtimesQueryJsonReq, null, 4));
  if(!req.query["city"]) {
    res.status(400).json({"error" : "Missing query param: city"});
  }else if(!req.query["language"]) {
    res.status(400).json({"error" : "Missing query param: language"});
  }else {
    var city = req.query["city"];
    var language = req.query["language"];
    showtimeModule.getAllShows(city.toLowerCase(), language.toLowerCase(), (err, respJson) => {

      if(err){
        res.json({"error" : err});
        console.log("Failed to fetch showtimes for city " + city + " language: " + language
           + " Error: " + JSON.stringify(err, null, 4));
      }else {
        res.json(respJson);
        console.log("Returning showtimes: " + JSON.stringify(respJson, null, 4));
      }

    });

  }

});


// Get booked shows for a given customer
// After making this call customer can fetch tickets for a particular
// show to view ticket or cancel the ticket
// Example: http://localhost:8085/bookmymovie/v1/showtime/customerbookings?customerId=ravi.kumar@gmail.com&city=bangalore
app.get('/bookmymovie/v1/showtime/customerbookings', (req, res) => {

  console.log("customerbookings  request is " + JSON.stringify(req.query, null, 4));
  if(!req.query["customerId"]) {
    res.status(400).json({"error" : "Missing query param: customerId"});
  }else if(!req.query["city"]) {
    res.status(400).json({"error" : "Missing query param: city"});
  }else {

    var customerId = req.query["customerId"];
    var movieCity = req.query["city"];
    console.log("Fetching shows for customer: " + customerId + " for city: " + movieCity);
    showtimeModule.getShowsForCustomer(customerId, movieCity, (err, respJson) => {

      if(err){
        res.json({"error" : err});
        console.log("Failed to fetch showtimes for customer id: " + customerId
           + " Error: " + JSON.stringify(err, null, 4));
      }else {
        res.json(respJson);
        console.log("Returning showtimes for customer id: " + customerId + " Response:" + JSON.stringify(respJson, null, 4));
      }

    });

  }

});

// Fetch tickets for a customer given the show id. The show id can be fetched
// by the user by calling customerbookings API.
app.get('/bookmymovie/v1/showtime/customertickets', (req, res) => {

  console.log("customertickets  request is " + JSON.stringify(req.query, null, 4));
  if(!req.query["customerId"]) {
    res.status(400).json({"error" : "Missing query param: customerId"});
  }else if(!req.query["showId"]) {
    res.status(400).json({"error" : "Missing query param: showId"});
  }else {

    var customerId = req.query["customerId"];
    var showId = req.query["showId"];
    console.log("Fetching tickets for customer: " + customerId + " for show: " + showId);
    showtimeModule.getShowById(showId, (err, respJson) => {

      if(err){
        res.status(500).json({"error" : err});
        console.log("Failed to fetch ticket info for customer id: " + customerId + " for show: " + showId
           + " Error: " + JSON.stringify(err, null, 4));
      }else {
        var clientResponseJson = {};
        clientResponseJson.showId = respJson._id;
        clientResponseJson.movieName = respJson.movieName;
        clientResponseJson.screenName = respJson.screenName;
        // client can do the date conversion. Added for testing purpose.
        clientResponseJson.showStartTime = new Date(respJson.showStartTime).toUTCString();
        clientResponseJson.movieLanguage = respJson.movieLanguage;
        // All tickets are assumed to have the same price
        clientResponseJson.price = respJson.price;
        clientResponseJson.tickets = [];
        for(var i = 0; i < respJson.tickets.length; i++) {
            var respTicket = respJson.tickets[i];
            if(respTicket.status == 'RESERVED' && respTicket.customerId == customerId) {
              clientResponseJson.tickets.push(respTicket);
            }
        }
        res.json(clientResponseJson);
        console.log("Returning tickets for customer id: " + customerId + " show: " + showId
                     + " Response:" + JSON.stringify(respJson, null, 4));
      }

    });

  }

});


// Get tickets for a given show id
app.get('/bookmymovie/v1/showtime/tickets', (req, res) => {

  var showtimesQueryJsonReq = req.query;
  console.log("GET Request is " + JSON.stringify(showtimesQueryJsonReq, null, 4));
  if(!req.query["showid"]) {
    res.status(400).json({"error" : "Missing query param: showid"});
  }else {
    var showId = req.query["showid"];
    console.log("Fetching tickets for show with id: " + showId);
    showtimeModule.getTicketsForShow(showId, (err, respJson) => {

      if(err){
        res.json({"error" : err});
        console.log("Failed to fetch tickets for show id: " + showId
           + " Error: " + JSON.stringify(err, null, 4));
      }else {
        var clientResponseJson = {};
        clientResponseJson.showId = respJson._id;
        clientResponseJson.movieName = respJson.movieName;
        clientResponseJson.screenName = respJson.screenName;
        // client can do the date conversion. Added for testing purpose.
        clientResponseJson.showStartTime = new Date(respJson.showStartTime).toUTCString();
        clientResponseJson.movieLanguage = respJson.movieLanguage;
        // All tickets are assumed to have the same price
        clientResponseJson.price = respJson.price;
        clientResponseJson.tickets = respJson.tickets;
        res.json(clientResponseJson);
        console.log("Returning tickets for show id: " + showId + " Response:" + JSON.stringify(clientResponseJson, null, 4));
      }

    });

  }

});


function validateCancelRequest(reqJson, callback) {

  if(!reqJson["showId"]) {
    callback("Invalid request", "Missing field: showId");
  }else if(!reqJson["tickets"]) {
    callback("Invalid request", "Missing field: tickets");
  } else if(reqJson.tickets.length < 1) {
    callback("Invalid request", "No tickets specified for cancellation");
  }
  else if(!reqJson["customerId"]) {
      callback("Invalid request", "Missing field: customerId");
  }
  else {
    console.log("Tickets requested for cancellation: " + reqJson.tickets.length);
    var showId = reqJson["showId"];
    showtimeModule.getTicketsForShow(showId, (err, respJson) => {
      if(err){
        console.log("Booking cancellation failed. Unable to find show with id: " + showId
           + " Error: " + JSON.stringify(err, null, 4));
        callback("Booking cancellation failed",
              "Unable to find show with id: " + showId + " Error: " + JSON.stringify(err, null, 4));
      }else {
            callback(null, respJson);
      }

    });
  }

}

function validateBookingRequest(reqJson, callback) {

  if(!reqJson["showId"]) {
    callback("Invalid request", "Missing field: showId");
  }else if(!reqJson["tickets"]) {
    callback("Invalid request", "Missing field: tickets");
  } else if(!reqJson["customerId"]) {
      callback("Invalid request", "Missing field: customerId");
  }
  else {
    console.log("Tickets requested for booking: " + reqJson.tickets.length);
    var showId = reqJson["showId"];
    showtimeModule.getTicketsForShow(showId, (err, respJson) => {
      if(err){
        console.log("Booking failed. Unable to find show with id: " + showId
           + " Error: " + JSON.stringify(err, null, 4));
        callback("Booking failed",
              "Unable to find show with id: " + showId + " Error: " + JSON.stringify(err, null, 4));
      }else {
            callback(null, respJson);
      }

    });
  }

}

// Book tickets for a given show. User can book one or more tickets that
// are available. The booking will succeed only if all the requested tickets are
// available.
app.put('/bookmymovie/v1/showtime/book', (req, res) => {

  var showtimeBookJson = req.body;

  console.log("Showtime booking request is " + JSON.stringify(showtimeBookJson, null, 4));
  // Retry the booking upto maxRetries if another request has done an update
  // while this booking is in progress.
  var maxRetries = 10;
  var retries = 0;
  function bookTickets() {

    validateBookingRequest(showtimeBookJson, (err, respJson) => {

      // The current transaction id. This will be updated once this booking is done.
      var currTransactionId = respJson.transactionId;

      if(err) {
        res.status(400).json(respJson);
        console.log("Invalid request. Failed to book tickets. Error: " + JSON.stringify(respJson));
      }else {
        var showId = showtimeBookJson["showId"];
        console.log("showtime record from db is: " + JSON.stringify(respJson, null, 4));
        var reqTickets = showtimeBookJson.tickets;
        var ticketPool = respJson.tickets;
        var ticketsAvailable = 0;
        for(var i = 0; i < reqTickets.length; i++) {
            var reqTicket = reqTickets[i];
            if(reqTicket.ticketIndex > ticketPool.length - 1) {
              res.status(400).json("Invalid ticket index: " + JSON.stringify(reqTicket));
            }else {
              var currTicketInDb = ticketPool[reqTicket.ticketIndex];
              if(currTicketInDb.status != "AVAILABLE")  {
                console.log("Ticket is booked by another customer: " + JSON.stringify(currTicketInDb));
                i = reqTickets.length;
                // Do not send status to client as part of error response.
                reqTicket.status = undefined;
                res.status(400).json({error: "Booking failed. Please retry. Ticket is booked by another customer: " + JSON.stringify(reqTicket)});
              }else {
                currTicketInDb.status = 'RESERVED';
                currTicketInDb.customerId = showtimeBookJson.customerId;
                ticketsAvailable++;
              }
            }
        }
        if(ticketsAvailable == reqTickets.length) {
          console.log("Booking tickets. New ticket pool: " + respJson);
          // set a new transaction id
          respJson.transactionId = uuidv1();
          showtimeModule.updateTicketsForShow(currTransactionId, respJson, (err, bookingRespJson) => {
            if(err){
              if(err != "TRANSACTION_OVERWRITTEN") {
                res.status(500).json("Failed to book tickets", "Error: " + JSON.stringify(err));
              }else {
                console.log("Received TRANSACTION_OVERWRITTEN.");
                // retry the transaction
                if(retries < maxRetries) {
                  retries++;
                  console.log("Retring on TRANSACTION_OVERWRITTEN. Retry number: " + retries);
                  // Retry after 10 milliseconds
                  setTimeout(bookTickets, 10);
                }else {
                  res.status(500).json("Failed to book tickets", "Please retry after some time");
                }
              }
            }else {
              res.status(200).json("Successfully booked " + reqTickets.length + " tickets.");
            }
          });
        }


      }
    });

  }// End bookTickets()

  bookTickets();

});


// Cancel tickets for a given show. User can cancel one/more/all tickets that
// were booked. The cncellation will succeed only if all the requested tickets are
// already RESERVED.
app.put('/bookmymovie/v1/showtime/cancel', (req, res) => {

  var showtimeCancelJson = req.body;

  console.log("Showtime booking cancellation request is " + JSON.stringify(showtimeCancelJson, null, 4));
  // Retry the booking upto maxRetries if another request has done an update
  // while this booking is in progress.
  var maxRetries = 10;
  var retries = 0;
  function bookTickets() {

    validateCancelRequest(showtimeCancelJson, (err, respJson) => {

      // The current transaction id. This will be updated once this booking is done.
      var currTransactionId = respJson.transactionId;

      if(err) {
        res.status(400).json(respJson);
        console.log("Invalid request. Failed to book tickets. Error: " + JSON.stringify(respJson));
      }else {
        var showId = showtimeCancelJson["showId"];
        console.log("showtime record from db is: " + JSON.stringify(respJson, null, 4));
        var reqTickets = showtimeCancelJson.tickets;
        var ticketPool = respJson.tickets;
        var ticketsCancelled = 0;
        for(var i = 0; i < reqTickets.length; i++) {
            var reqTicket = reqTickets[i];
            if(reqTicket.ticketIndex > ticketPool.length - 1) {
              res.status(400).json("Invalid ticket index: " + JSON.stringify(reqTicket));
            }else {
              var currTicketInDb = ticketPool[reqTicket.ticketIndex];
              if(currTicketInDb.status != "RESERVED")  {
                console.log("Ticket is not booked: " + JSON.stringify(currTicketInDb));
                i = reqTickets.length;
                // Do not send status to client as part of error response.
                reqTicket.status = undefined;
                res.status(400).json({error: "Booking cancellation failed. Ticket is already cancelled: " + JSON.stringify(reqTicket)});
              }else {
                currTicketInDb.status = 'AVAILABLE';
                currTicketInDb.customerId = undefined;
                ticketsCancelled++;
              }
            }
        }
        if(ticketsCancelled == reqTickets.length) {
          console.log("Cancelling tickets. New ticket pool: " + respJson);
          // set a new transaction id
          respJson.transactionId = uuidv1();
          showtimeModule.updateTicketsForShow(currTransactionId, respJson, (err, bookingRespJson) => {
            if(err){
              if(err != "TRANSACTION_OVERWRITTEN") {
                res.status(500).json("Failed to cancel tickets", "Error: " + JSON.stringify(err));
              }else {
                console.log("Received TRANSACTION_OVERWRITTEN.");
                // retry the transaction
                if(retries < maxRetries) {
                  retries++;
                  console.log("Retring on TRANSACTION_OVERWRITTEN. Retry number: " + retries);
                  // Retry after 10 milliseconds
                  setTimeout(bookTickets, 10);
                }else {
                  res.status(500).json("Failed to cancel tickets", "Please retry after some time");
                }
              }
            }else {
              res.status(200).json("Successfully cancelled " + reqTickets.length + " tickets.");
            }
          });
        }


      }
    });

  }// End bookTickets()

  bookTickets();

});


const SERVICE_PORT = 8085;
app.listen(SERVICE_PORT,
  () => {
      console.log(`bookmymovie service running on port ${SERVICE_PORT}`);
    }

);
