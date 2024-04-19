import Router from 'koa-router';
import jsonType from '../middleware/jsonType';
import * as shopController from '@functions/controllers/shopController';
import * as signUpController from '@functions/controllers/signUpController';
import * as syncSettingController from '@functions/controllers/settings/syncController';
import {getApiPrefix} from '@functions/const/app';

export default function apiRouter(isEmbed = false) {
  const router = new Router({prefix: getApiPrefix(isEmbed)});

  router.get('/shops', shopController.getUserShops);
  router.get('/luxuryInfos', shopController.luxuryInfos);
  router.post('/signup', jsonType, signUpController.signUp);
  router.post('/setting/sync', jsonType, syncSettingController.addSyncSetting);

  return router;
}
