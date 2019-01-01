# bookmymovie
Book your favorite movies

bookmymovie is a REST based web application that can be used by customers to book a movie online. Any available movie can be booked from the city of your choice.

=========================================
bookmymovie Web Application Specification
=========================================

1. Introduction
===============
bookmymovie is a REST application that has the following features:

  a. Register(add) a newly released movie. This is done only once when a movie is released.
  b. Register a new screen(movie hall) that can show movies. A screen has a defined seating capacity and typically
  shows multiple movies in a day. Each show is called a showtime in this application. A screen is registered only
  once when the movie hall is ready to show movies.
  c.  Register a new showtime. A showtime is a movie running at a specific screen at a specific time. Tickets can be
  booked by customers for a showtime.
  d. Ticket booking and cancellation - This is the main usecase of this application. Customers can book or cancel
  tickets for a given showtime.


  Assumptions
  ===========
  As this is an initial prototype of the bookmymovie application, certain assumptions have been made to simplify the
  implementation and to focus on the main use case of showtime bookings by customers. The code is however is not
  temporary and can be easily extended to a full fledged production grade application.

  1. A movie can be registered. No APIs have been added to update or delete a movie.
  2. A screen (movie hall) can be registered. No APIs have been added to update or delete a screen.
  3. Customer management APIs have not been provided. It is assumed that customers with unique
  Ids are registered in the system.
  4. User authentication and API authorization for users have not been added.
  5. A web based user interface is not implemented. The backend REST APIs are tested using a REST client like Postman.
  6. A screen (movie hall) is assumed to be a rectangular hall with rows of seats and fixed number of seats per row. Also,
  all seats are considered the same. There is no support for pricing rows of seats differently based on class like "gold",
  "gallery" etc. However, the design can be extended to support multiple classes of seats.
  7. The application has been locally tested and has not been tested in the cloud but with a little more effort can be deployed
  on a cloud.

  Technology stack
  ================
  The backend is developed in Node.js and Mongodb. The UI although not implemented can be developed using AngularJs or similar UI
  frameworks. Multiple technologies were evaluated - Java Springboot, Java Jersey with Weblogic or Tomcat,
  Google Go and Node.js for the application server and MongoDb for noSql and MariaDB and MySql for sql.

  Node.js and mongodb were chosen for the following reasons:
  1. Node.js is ideal for applications that are not compute intensive. bookmymovie is REST application with a lot database
  processing and very few compute only tasks. Node.js scales very well for such applications with a low resource footprint
  2. Mongodb is a fast noSql database server that works well with Node.js and has support for sharding that allows it to
  scale well horizontally.
  3. Rapid development - The effort needed to setup the infrastructure for writing REST APIs is minimal with Node.js and
  so was the ideal choice to build an early prototype.
  4. Node.js uses the same programming language (Javascript) as some of the popular Web UI frameworks like AngularJs and
  is so easier to integrate with the UI layer.


2. bookmymovie REST APIs
=======================

The backend supports 9 REST APIs that the UI can call for the bookmymovie application. Please see sections 2A to 2I
for details.

2A. Movie registration - POST on bookmymovie/v1/movie
A newly released movie can registered using this API. This is usually a
one time activity for a movie when it is launched. For details, please check mongoose schema defined in models/movie.js.

A movie is stored in the MOVIES collection.
Sample request payload:
{

    "movieName" : "spiderman - into the verse",
    "languages" : ["english, hindi", "telugu", "tamil"],
    "genres"    : ["action, adventure", "animation"],
    "durationInMins" :  117,
    "shortSummary" : "Young Miles Morales has just realized his spider powers. Watch him get trained under Peter Parker to
     understand what it means to be Spider-man.",
    "cast"      : ["Lieve Schrieber", "Maheshala Ali"]

}


2B. Screen registration - POST on bookmymovie/v1/screen
Registers a newly launched screen (movie hall). This is usually a one time activity when a new movie hall or mall showing
movies comes up in a city. For details, please check mongoose schema defined in models/screen.js

Sample request payload:
{

	"screenName": "PVR Matrix screen1",
	"screenCity": "Bangalore",
	"screenLocation": "Forum mall, Koramangala",
	"numRows": 2,
	"numSeatsPerRow": 5

}

A screen is stored in the SCREENS collection.

2C. Showtime registration - POST on bookmymovie/v1/showtime
Registers a showtime for a movie at a screen (movie hall) at a given time. Tickets are also generated as part of the
showtime registration for each seat in the movie hall. All tickets are in state AVAILABLE when a showtime is registered.
Schema details are defined in models/showtime.js.

When the UI registers a showtime, the corresponding movie and screen should be fetched first to ensure that a showtime
is correctly registered using a valid movie (including other details like valid language) and screen.

A showtime is stored in the SHOWTIMES collection.

2D. Fetch showtimes - GET on bookmymovie/v1/showtime?city=<city>&language=<lang>
The Web UI can call this API to fetch all running movies in a city for a specific language. The API does not support
all languages for the first prototype but it should be quite easy to make the language param optional. This API queries
the SHOWTIMES collection for all shows from current time till the next 7 days and returns the movie list along with a unique
showtime id. This showtime id should be used by the UI to check availability of tickets and to book tickets.

Sample response with 2 showtimes. The UI can aggregate this response to show as a Tree: movies -> screenName -> showtimes or this can
be done in the backend as well. This is a TODO given that UI integration is not done.
[
    {
        "_id": "5c299ea40588293bf6d08970",
        "movieName": "spiderman - into the verse",
        "screenName": "pvr matrix screen1",
        "showStartTime": 1546259400000
    },
    {
        "_id": "5c299ec70588293bf6d0897b",
        "movieName": "spiderman - into the verse",
        "screenName": "pvr matrix screen1",
        "showStartTime": 1546432200000
    }
]

2E. Fetch tickets for a showtime - GET on bookmymovie/v1/showtime/tickets?showid=<showId>
The Web UI can call this API post calling the "Fetch showtimes" (see 2D) to fetch all tickets for the given showtime. Using this API,
the UI can show the seats that are AVAILABLE and others that are RESERVED.

Sample response:
{
    "showId": "5c29d4fdc3c87f3d30323827",
    "movieName": "spiderman - into the verse",
    "screenName": "pvr matrix screen1",
    "showStartTime": "Mon, 31 Dec 2018 12:30:00 GMT",
    "movieLanguage": "english",
    "price": 200,
    "tickets": [
        {
            "status": "AVAILABLE",
            "_id": "5c29d4fdc3c87f3d30323831",
            "ticketId": "21fbe8d0-0cd7-11e9-8ba0-e16d06ae205a",
            "seatRowNum": 1,
            "seatNumInRow": 1,
            "ticketIndex": "0"
        },
        {
            "status": "AVAILABLE",
            "_id": "5c29d4fdc3c87f3d30323830",
            "ticketId": "21fbe8d1-0cd7-11e9-8ba0-e16d06ae205a",
            "seatRowNum": 1,
            "seatNumInRow": 2,
            "ticketIndex": "1"
        } ...
      ]
}

2F. Book tickets - PUT on bookmymovie/v1/showtime/book
Once the user has selected the seats to book from "Fetch tickets for a showtime" (see 2E) on the UI, this API can be
called to book tickets. The API will check if the requested tickets are available, and if available, book the tickets
(mark tickets are RESERVED).

Tickets are booked without using locks. The SHOWTIMES collection has an internal transactionId. A request will update
the transactionId every time a SHOWTIMES document is updated. The update is done atomically using mongoDB's
updateOne({{transactionId : currTransactionId}}) API where currTransactionId is the transaction Id that was read by the
request before trying an update. If another request has done an update, the transactionId would have changed and the requested
will need to re-read the document and retry the update till it succeeds.

2G. Fetch booked shows for a customer  - GET on bookmymovie/v1/showtime/customerbookings?customerId=<customerId>&city=<city>
After a customer has booked tickets, the UI can call this API to display showtimes for a customer in a city.

Sample request: bookmymovie/v1/showtime/customerbookings?customerId=ravi.kumar@yahoo.com&city=bangalore
Sample response:
[
    {
        "_id": "5c29d4fdc3c87f3d30323827",
        "movieName": "spiderman - into the verse",
        "screenName": "pvr matrix screen1",
        "movieLanguage": "english",
        "showStartTime": 1546259400000
    }
]

The  customer ravi.kumar@yahoo.com has booked on movie "spiderman - into the verse" in Bangalore at 1546259400000(this is the
UTC timestamp that the UI can convert to a suitable human readable format. 5c29d4fdc3c87f3d30323827 is the unique showtime id.

2H. Fetch booked tickets for customer - GET on bookmymovie/v1/showtime/customertickets?customerId=<customerId>&showId=<showId>
After the UI displays the shows for a customer, the customer can choose to see tickets for a show using this API.

Sample request: bookmymovie/v1/showtime/customertickets?customerId=ravi.kumar@yahoo.com&showId=5c29d4fdc3c87f3d30323827
Sample response:
{
    "showId": "5c29d4fdc3c87f3d30323827",
    "movieName": "spiderman - into the verse",
    "screenName": "pvr matrix screen1",
    "showStartTime": "Mon, 31 Dec 2018 12:30:00 GMT",
    "movieLanguage": "english",
    "price": 200,
    "tickets": [
        {
            "status": "RESERVED",
            "_id": "5c29d4fdc3c87f3d30323831",
            "ticketId": "21fbe8d0-0cd7-11e9-8ba0-e16d06ae205a",
            "seatRowNum": 1,
            "seatNumInRow": 1,
            "ticketIndex": "0",
            "customerId": "ravi.kumar@yahoo.com"
        },
        {
            "status": "RESERVED",
            "_id": "5c29d4fdc3c87f3d30323830",
            "ticketId": "21fbe8d1-0cd7-11e9-8ba0-e16d06ae205a",
            "seatRowNum": 1,
            "seatNumInRow": 2,
            "ticketIndex": "1",
            "customerId": "ravi.kumar@yahoo.com"
        }
    ]
}

The customer ravi.kumar@yahoo.com has booked 2 tickets for the movie "spiderman - into the verse" at "pvr matrix screen1"
on "Mon, 31 Dec 2018 12:30:00 GMT".

2I. Cancel tickets - PUT on bookmymovie/v1/showtime/cancel
The user can cancel tickets using this API. Prior to calling this API, the UI should call
"Fetch booked tickets for customer" (see 2H) to get the list of tickets booked by a customer and send a subset of that for
cancellation as payload to this API.

Sample request:
{
    "showId": "5c29d4fdc3c87f3d30323827",
    "movieName": "spiderman - into the verse",
    "screenName": "pvr matrix screen1",
    "showStartTime": "Mon, 31 Dec 2018 12:30:00 GMT",
    "movieLanguage": "english",
    "price": 200,
    "customerId" : "ravi.kumar@yahoo.com",
    "tickets": [
        {
            "status": "RESERVED",
            "_id": "5c29d4fdc3c87f3d30323831",
            "ticketId": "21fbe8d0-0cd7-11e9-8ba0-e16d06ae205a",
            "seatRowNum": 1,
            "seatNumInRow": 1,
            "ticketIndex": "0",
            "customerId": "ravi.kumar@yahoo.com"
        },
        {
            "status": "RESERVED",
            "_id": "5c29d4fdc3c87f3d30323830",
            "ticketId": "21fbe8d1-0cd7-11e9-8ba0-e16d06ae205a",
            "seatRowNum": 1,
            "seatNumInRow": 2,
            "ticketIndex": "1",
            "customerId": "ravi.kumar@yahoo.com"
        }
    ]
}

The cancel flow also does not use locks and uses similar logic as the booking flow (see 2F).

