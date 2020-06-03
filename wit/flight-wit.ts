import { log, Wit } from "node-wit";
import { Config } from '../config';
import { actions } from './flight-actions';

export class FlightWit {
  private static _wit: Wit | undefined;
  // Setting up our bot
  public static get Wit(): Wit {
    if (!this._wit) {
      this._wit = new Wit({
        accessToken: Config.getWitApiToken(),
        actions,
        logger: new log.Logger(log.INFO),
      });
    }

    return this._wit;
  }
}