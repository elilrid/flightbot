import config from 'config';
import { log, Wit } from "node-wit";
import { actions } from './flight-actions';

export class FlightWit {
  private _wit: Wit | undefined;
  // Setting up our bot
  public static get Wit(): Wit {
    if (!this._wit) {
      this._wit = new Wit({
        accessToken: config.get('witApiToken'),
        actions,
        logger: new log.Logger(log.INFO),
      });
    }

    return this._wit;
  }
}