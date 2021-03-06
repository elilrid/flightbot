import { FormData } from 'then-request';
import request from 'then-request';
import util from 'util';
import { Config } from './config';

export class SkyScanner {

  private static _instance: SkyScanner;

  public static get Instance(): SkyScanner {
    if (!this._instance) {
      this._instance = new SkyScanner();
      this._instance.setApiKey(Config.getSkyscannerApiKey());
    }
    return this._instance;
  }

  private apiKey: string = '';
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  getLocations(searchLocation: string): Promise<{ id: string, name: string }[]> {
    var url = util.format(
      'http://partners.api.skyscanner.net/apiservices/autosuggest/v1.0/TR/TRY/tr-TR/?query=%s&apiKey=%s',
      encodeURIComponent(searchLocation),
      this.apiKey
    );

    var url = util.format(
      'http://partners.api.skyscanner.net/apiservices/autosuggest/v1.0/TR/TRY/tr-TR/?query=%s&apiKey=%s',
      encodeURIComponent(searchLocation),
      this.apiKey);

    return request('GET', url).then(response => {
      var data = JSON.parse(response.getBody().toString());
      return data.Places.map((loc: any) => {
        return {
          id: loc.PlaceId,
          name: loc.PlaceName
        };
      });
    })
      .catch(err => []);
  }

  searchCache(fromLocation: string, toLocation: string, fromDate: string, toDate: string) {
    var url = util.format(
      'http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/TR/TRY/tr-TR/%s/%s/%s/%s?apiKey=%s',
      encodeURIComponent(fromLocation),
      encodeURIComponent(toLocation),
      encodeURIComponent(fromDate),
      encodeURIComponent(toDate),
      this.apiKey);

    return request('GET', url).then(response => {
      return JSON.parse(response.getBody().toString());
    });
  }

  searchLive(fromLocation: string, toLocation: string, fromDate: string, toDate: string, adults: number, children: number, infants: number, fastMode: boolean) {
    var apiKey = this.apiKey;
    var delay = 1000;
    var pull = this.pull;

    var form = new FormData({});

    form.append('cabinclass', 'Economy');
    form.append('country', 'TR');
    form.append('currency', 'TRY');
    form.append('locale', 'tr-TR');
    form.append('locationSchema', 'iata');
    form.append('originplace', fromLocation);
    form.append('destinationplace', toLocation);
    form.append('outbounddate', fromDate);
    form.append('inbounddate', toDate);
    form.append('adults', adults || 1);
    form.append('children', children || 0);
    form.append('infants', infants || 0);
    form.append('', toDate);
    form.append('apikey', apiKey);
    form.append('GroupPricing', 'false');

    var options = {
      form: form
    };

    return request('POST', 'http://partners.api.skyscanner.net/apiservices/pricing/v1.0', options).then(session => {
      return pull(session.url, pull, delay, fastMode).then(response => {
        var data = JSON.parse(response.getBody());
        var toReturn = data.Itineraries.map((itin: any) => {
          var outboundLeg = data.Legs.filter((leg: any) => leg.Id === itin.OutboundLegId)[0];
          var inboundLeg = data.Legs.filter((leg: any) => leg.Id === itin.InboundLegId)[0];

          var segments = outboundLeg.SegmentIds.concat(inboundLeg.SegmentIds).map((segmentId: any, index: number) => {
            var segment = data.Segments.filter((seg: any) => seg.Id === segmentId)[0];
            var departAirport = data.Places.filter((place: any) => place.Id === segment.OriginStation)[0];
            var arriveAirport = data.Places.filter((place: any) => place.Id === segment.DestinationStation)[0];

            var departCity = !departAirport.ParentId
              ? departAirport
              : data.Places.filter((place: any) => place.Id === departAirport.ParentId)[0];

            var arriveCity = !arriveAirport.ParentId
              ? arriveAirport
              : data.Places.filter((place: any) => place.Id === arriveAirport.ParentId)[0];

            var carriers = [
              ...response.data.Carriers.filter((carry: any) => carry.Id === segment.OperatingCarrier),
              ...response.data.Carriers.filter((carry: any) => carry.Id === segment.Carrier)
            ];

            return {
              group: index < outboundLeg.SegmentIds.length ? 1 : 2,
              departAirport: {
                code: departAirport.Code,
                name: departAirport.Name,
              },
              arriveAirport: {
                code: arriveAirport.Code,
                name: arriveAirport.Name,
              },
              departCity: {
                code: departCity.Code,
                name: departCity.Name,
              },
              arriveCity: {
                code: arriveCity.Code,
                name: arriveCity.Name,
              },
              departTime: segment.DepartureDateTime,
              arriveTime: segment.ArrivalDateTime,
              carrier: carriers.map((c) => c.Name),
            };
          });

          return {
            segments: segments,
            price: itin.PricingOptions[0].Price,
            url: itin.PricingOptions[0].DeeplinkUrl,
          };
        });

        return toReturn;
      });
    });
  }


  private pull(url: string, self: Function, delayAmount: number, fastMode: boolean) {
    var pullinner = () => {
      var currentRequest = request('GET', url);
      return currentRequest.then(
        response => {
          var data = JSON.parse(response.getBody().toString());
          if (fastMode && data.Itineraries.length) {
            return currentRequest;
          } else if (data.Status === 'UpdatesPending') {
            return self(url, self, delayAmount);
          } else if (data.Status === 'UpdatesComplete') {
            return currentRequest;
          } else {
            return null;
          }
        },
        error => {
          if (error.statusCode === 304) {
            return self(url, self, delayAmount);
          } else if (error.statusCode === 429) {
            return self(url, self, 60000);
          } else {
            return null;
          }
        }
      );
    };

    return new Promise(resolve => setTimeout(resolve, delayAmount)).then(pullinner);
  }

}