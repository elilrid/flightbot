var skyscanner = require('./skyscanner');
var util = require('util');
var promise = require('bluebird');
var request = require('request-promise');
var _ = require('lodash');

// This API key is shared in API documentation, you should register your own
skyscanner.setApiKey('fl989112564576873089361895446787');

/*skyscanner.getLocation('esenboğa').then(function (data) {
    console.log(data);
});*/

skyscanner.searchCache('IST-sky','KFS-sky', '2017-05-29', '2017-06-21').then(function (data){
    //data is the response of skyscanner
    //console.log is a function that prints the terminal.
    //console.log(data);
    //priceAndDate is the splitted version of data.
    var detailInformation = data.Quotes.map(function (quote) {

        var segments = [quote.OutboundLeg, quote.InboundLeg].map(function (segment, index) {

            var departPlace = _.filter(data.Places, { PlaceId: segment.OriginId })[0];
            var arrivePlace = _.filter(data.Places, { PlaceId: segment.DestinationId })[0];
            var carriers = segment.CarrierIds.map(c => _.filter(data.Carriers, { CarrierId: c })[0].Name);

            return {
                group: index + 1,
                departAirport: { code: departPlace.IataCode, name: departPlace.Name },
                arriveAirport: { code: arrivePlace.IataCode, name: arrivePlace.Name },
                departCity: { code: departPlace.CityId, name: departPlace.CityName },
                arriveCity: { code: arrivePlace.CityId, name: arrivePlace.CityName },
                departTime: segment.DepartureDate,
                carriers: carriers
            };
        });
        console.log(segments);
        return {
            //segments: segments,
            price: quote.MinPrice,
            direct: quote.Direct,
        }
    });
    console.log(detailInformation);
});
//This is example and it is suspended.
/*skyscanner.searchLive('IST-sky','ESB-sky', '2017-06-20', '2017-06-30', 1, 0, 0, true).then(function (data) {
    console.log(util.inspect(data[0], false, 99999));
});*/
