import Router from 'koa-router';
import jsonType from '../middleware/jsonType';
import * as shopController from '@functions/controllers/shopController';
import * as signUpController from '@functions/controllers/signUpController';
import * as syncSettingController from '@functions/controllers/settings/syncController';
import * as brandSettingController from '@functions/controllers/settings/brandController';
import {getApiPrefix} from '@functions/const/app';

export default function apiRouter(isEmbed = false) {
  const router = new Router({prefix: getApiPrefix(isEmbed)});

  router.get('/shops', shopController.getUserShops);
  router.get('/luxuryInfos', shopController.luxuryInfos);
  router.post('/signup', jsonType, signUpController.signUp);
  router.get('/setting/sync', syncSettingController.get);
  router.post('/setting/sync', jsonType, syncSettingController.save);
  router.get('/setting/brandfilter', brandSettingController.get);
  router.get('/setting/brandlist', brandSettingController.getLXBrand);

  return router;
}
