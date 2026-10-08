// Angular's development server uses port 4200; the deployed build shares its server origin.
export const BACKEND_URL = window.location.port === '4200'
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : window.location.origin;
