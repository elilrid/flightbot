var express = require('express');
var app = express();
var fs = require("fs");

app.get('/getFlights', function (req, res) {
   res.status(code || 500).json({"error": message});
   fs.readFile( __dirname + "/" + "flights.json", 'utf8', function (err, data) {
       console.log( data );
       res.end( data );
   });
})



var server = app.listen(process.env.PORT || 8080, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})
