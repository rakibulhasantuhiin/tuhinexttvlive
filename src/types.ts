export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  isHidden: boolean;
  order: number;
}

export interface AppSettings {
  appName: string;
  appLogo: string;
}
