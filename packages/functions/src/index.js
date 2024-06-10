import * as functions from 'firebase-functions';
import apiHandler from './handlers/api';
import apiSaHandler from './handlers/apiSa';
import authHandler from './handlers/auth';
import authSaHandler from './handlers/authSa';
import apiHookV1Handler from './handlers/apiHookV1';
import restApiHandler from './handlers/restApi';
import syncProductData from './handlers/schedule/syncProduct';
import syncOrderData from './handlers/schedule/syncOrder';
import deleteProductData from './handlers/schedule/deleteProduct';
import createCurrenciesData from './handlers/schedule/createCurrencies';
import initProductQueueData from './handlers/schedule/initProductQueue';
import deleteLogsData from './handlers/schedule/deleteLogsData';
import subscribeBrandFilterCreateHandling from './handlers/pubsub/subscribeBrandFilterCreateHandling';
import subscribeBrandFilterUpdateHandling from './handlers/pubsub/subscribeBrandFilterUpdateHandling';
import subscribeCategoryMappingSaveHandling from './handlers/pubsub/subscribeCategoryMappingSaveHandling';
import subscribeGeneralSettingSaveHandling from './handlers/pubsub/subscribeGeneralSettingSaveHandling';
import subscribeAttributeMappingSaveHandling from './handlers/pubsub/subscribeAttributeMappingSaveHandling';
import subscribeSyncSettingsSaveHandling from './handlers/pubsub/subscribeSyncSettingsSaveHandling';

export const api = functions.https.onRequest(apiHandler.callback());
export const apiSa = functions.https.onRequest(apiSaHandler.callback());

export const auth = functions.https.onRequest(authHandler.callback());
export const authSa = functions.https.onRequest(authSaHandler.callback());

export const apiHookV1 = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .https.onRequest(apiHookV1Handler.callback());

export const restApi = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .https.onRequest(restApiHandler.callback());

// ---------------------- Cron schedule handlers ----------------------

export const initProductQueue = functions
  .runWith({timeoutSeconds: 60, memory: '1GB'})
  .pubsub.schedule('* * * * *')
  .onRun(initProductQueueData);

export const syncProduct = functions
  .runWith({timeoutSeconds: 60, memory: '2GB'})
  .pubsub.schedule('* * * * *')
  .onRun(syncProductData);

export const deleteProduct = functions
  .runWith({timeoutSeconds: 60, memory: '1GB'})
  .pubsub.schedule('* * * * *')
  .onRun(deleteProductData);

export const syncOrder = functions
  .runWith({timeoutSeconds: 60, memory: '2GB'})
  .pubsub.schedule('* * * * *')
  .onRun(syncOrderData);

export const createCurrencies = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.schedule('0 0 * * *')
  .onRun(createCurrenciesData);

export const deleteLogs = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.schedule('0 0 1 * *')
  .onRun(deleteLogsData);

// ---------------------- Subscriber handlers ----------------------
export const brandFilterCreateHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('brandFilterCreateHandling')
  .onPublish(subscribeBrandFilterCreateHandling);

export const brandFilterUpdateHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('brandFilterUpdateHandling')
  .onPublish(subscribeBrandFilterUpdateHandling);

export const categoryMappingSaveHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('categoryMappingSaveHandling')
  .onPublish(subscribeCategoryMappingSaveHandling);

export const generalSettingSaveHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('generalSettingSaveHandling')
  .onPublish(subscribeGeneralSettingSaveHandling);

export const attributeMappingSaveHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('attributeMappingSaveHandling')
  .onPublish(subscribeAttributeMappingSaveHandling);

export const syncSettingsSaveHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('syncSettingsSaveHandling')
  .onPublish(subscribeSyncSettingsSaveHandling);
