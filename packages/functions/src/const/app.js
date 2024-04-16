export const apiPrefix = {
  embed: '/api',
  standalone: '/apiSa'
};

export const getApiPrefix = isEmbedApp => (isEmbedApp ? apiPrefix.embed : apiPrefix.standalone);

export const LUXURY_API_URL = 'https://api.luxury-distribution.com/api';
export const LUXURY_API_V1_URL = 'https://api.luxury-distribution.com/api/v1';
