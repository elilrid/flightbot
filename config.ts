import config from 'config';

export class Config {
  public static get(configName: string) {
    return process.env[configName] || config.get(configName);
  }

  public static getAppSecret(): string {
    return process.env.appSecret || config.get('appSecret');
  }

  public static getPageAccessToken(): string {
    return process.env.pageAccessToken || config.get('pageAccessToken');
  }

  public static getValidationToken(): string {
    return process.env.validationToken || config.get('validationToken');
  }

  public static getServerURL(): string {
    return process.env.serverURL || config.get('serverURL');
  }

  public static getSkyscannerApiKey(): string {
    return process.env.skyscannerApiKey || config.get('skyscannerApiKey');
  }

  public static getWitApiToken(): string {
    return process.env.witApiToken || config.get('witApiToken');
  }
}