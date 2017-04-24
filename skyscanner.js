var promise = require('bluebird');
var util = require('util');
var _ = require('lodash');
var request = require('sync-request');

module.exports = {

  setApiKey: function(apiKey) {
    this.apiKey = apiKey;
  },

  getLocation: function(searchLocation) {

    var url = util.format(
      'http://partners.api.skyscanner.net/apiservices/autosuggest/v1.0/TR/TRY/tr-TR/?query=%s&apiKey=%s',
      encodeURIComponent(searchLocation),
      this.apiKey);

    var res = request('GET', url);
    var response = res.getBody();

    return JSON.parse(response);

    /*var url = util.format(
      'http://partners.api.skyscanner.net/apiservices/autosuggest/v1.0/TR/TRY/tr-TR/?query=%s&apiKey=%s',
      encodeURIComponent(searchLocation),
      this.apiKey);

    return request(url).then(function(body) {
      var data = JSON.parse(body);

      return data.Places.map(function(loc) {
        return {
          id: loc.PlaceId,
          name: loc.PlaceName
        };
      });
    });*/
  },

  searchCache: function(fromLocation, toLocation, fromDate, toDate) {

    var url = util.format(
      'http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/TR/TRY/tr-TR/%s/%s/%s/%s?apiKey=%s',
      encodeURIComponent(fromLocation),
      encodeURIComponent(toLocation),
      encodeURIComponent(fromDate),
      encodeURIComponent(toDate),
      this.apiKey);


    var res = request('GET', url);
    var response = res.getBody();

    return JSON.parse(response);


    /*
        var url = util.format(
          'http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/TR/TRY/tr-TR/%s/%s/%s/%s?apiKey=%s',
          encodeURIComponent(fromLocation),
          encodeURIComponent(toLocation),
          encodeURIComponent(fromDate),
          encodeURIComponent(toDate),
          this.apiKey);

        return request(url).then(function(body) {
          var data = JSON.parse(body);
          return data;
        });*/
  },

  searchLive: function(fromLocation, toLocation, fromDate, toDate, adults, children, infants, fastMode) {

    var apiKey = this.apiKey;
    var delay = 1000;
    var pull = this.pull;

    var options = {
      method: 'POST',
      uri: 'http://partners.api.skyscanner.net/apiservices/pricing/v1.0',
      form: {
        cabinclass: 'Economy',
        country: 'UK',
        currency: 'GBP',
        locale: 'en-GB',
        locationSchema: 'iata',
        originplace: fromLocation,
        destinationplace: toLocation,
        outbounddate: fromDate,
        inbounddate: toDate,
        adults: adults || 1,
        children: children || 0,
        infants: infants || 0,
        apikey: apiKey,
        GroupPricing: false
      },
      transform: function(body, response) {
        return {
          url: util.format('%s?apiKey=%s&pageIndex=0&pageSize=10', response.headers['location'], apiKey)
        };
      },
      json: false
    };

    return request(options, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log(JSON.parse(body)); // Print the google web page.
      } else if (!error && response.statusCode == 429) {
        console.log("Too many arg.");
      }
    }).then(function(session) {

      return pull(session.url, pull, delay, fastMode).then(function(body) {
        var data = JSON.parse(body);
        var toReturn = data.Itineraries.map(function(itin) {

          var outboundLeg = _.filter(data.Legs, {
            Id: itin.OutboundLegId
          })[0];
          var inboundLeg = _.filter(data.Legs, {
            Id: itin.InboundLegId
          })[0];

          var segments = outboundLeg.SegmentIds.concat(inboundLeg.SegmentIds).map(function(segmentId, index) {

            var segment = _.filter(data.Segments, {
              Id: segmentId
            })[0];
            var departAirport = _.filter(data.Places, {
              Id: segment.OriginStation
            })[0];
            var arriveAirport = _.filter(data.Places, {
              Id: segment.DestinationStation
            })[0];
            var departCity = !departAirport.ParentId ? departAirport : _.filter(data.Places, {
              Id: departAirport.ParentId
            })[0];
            var arriveCity = !arriveAirport.ParentId ? arriveAirport : _.filter(data.Places, {
              Id: arriveAirport.ParentId
            })[0];
            var carriers = _.union(_.filter(data.Carriers, {
              Id: segment.OperatingCarrier
            }), _.filter(data.Carriers, {
              Id: segment.Carrier
            }));

            return {
              group: index < outboundLeg.SegmentIds.length ? 1 : 2,
              departAirport: {
                code: departAirport.Code,
                name: departAirport.Name
              },
              arriveAirport: {
                code: arriveAirport.Code,
                name: arriveAirport.Name
              },
              departCity: {
                code: departCity.Code,
                name: departCity.Name
              },
              arriveCity: {
                code: arriveCity.Code,
                name: arriveCity.Name
              },
              departTime: segment.DepartureDateTime,
              arriveTime: segment.ArrivalDateTime,
              carrier: carriers.map(c => c.Name)
            };
          });

          return {
            segments: segments,
            price: itin.PricingOptions[0].Price,
            url: itin.PricingOptions[0].DeeplinkUrl
          };
        });

        return toReturn;
      });
    });
  },

  pull: function(url, self, delay, fastMode) {

    var pullinner = function() {

      var currentRequest = request(url);
      return currentRequest.then(function(body) {
        var data = JSON.parse(body);
        if (fastMode && data.Itineraries.length) {
          return currentRequest;
        } else if (data.Status === "UpdatesPending") {
          return self(url, self, delay);
        } else if (data.Status === "UpdatesComplete") {
          return currentRequest;
        } else {
          return null;
        }
      }, function(error) {
        if (error.statusCode === 304) {
          return self(url, self, delay);
        } else if (error.statusCode === 429) {
          return self(url, self, 60000);
        } else {
          return null;
        }
      });
    };

    return promise.delay(delay).then(pullinner);
  },
};
