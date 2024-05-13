import * as functions from 'firebase-functions';
import apiHandler from './handlers/api';
import apiSaHandler from './handlers/apiSa';
import authHandler from './handlers/auth';
import authSaHandler from './handlers/authSa';
import apiHookV1Handler from './handlers/apiHookV1';
import restApiHandler from './handlers/restApi';
import syncProductData from './handlers/schedule/syncProduct';
import subscribeBrandFilterCreateHandling from './handlers/pubsub/subscribeBrandFilterCreateHandling';
import subscribeBrandFilterUpdateHandling from './handlers/pubsub/subscribeBrandFilterUpdateHandling';

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
export const syncProduct = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.schedule('* * * * *')
  .onRun(syncProductData);

// ---------------------- Subscriber handlers ----------------------
export const brandFilterCreateHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('brandFilterCreateHandling')
  .onPublish(subscribeBrandFilterCreateHandling);

export const brandFilterUpdateHandling = functions
  .runWith({timeoutSeconds: 540, memory: '2GB'})
  .pubsub.topic('brandFilterUpdateHandling')
  .onPublish(subscribeBrandFilterUpdateHandling);
