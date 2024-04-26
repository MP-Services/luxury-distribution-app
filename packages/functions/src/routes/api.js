import Router from 'koa-router';
import jsonType from '../middleware/jsonType';
import * as shopController from '@functions/controllers/shopController';
import * as signUpController from '@functions/controllers/signUpController';
import * as syncSettingController from '@functions/controllers/settings/syncController';
import * as brandSettingController from '@functions/controllers/settings/brandController';
import * as generalSettingController from '@functions/controllers/settings/generalController';
import * as categorySettingController from '@functions/controllers/settings/categoryController';
import {getApiPrefix} from '@functions/const/app';
import {getDropShipperCategory, getList} from '@functions/controllers/settings/categoryController';

export default function apiRouter(isEmbed = false) {
  const router = new Router({prefix: getApiPrefix(isEmbed)});

  router.get('/shops', shopController.getUserShops);
  router.get('/luxuryInfos', shopController.luxuryInfos);
  router.post('/signup', jsonType, signUpController.signUp);
  router.get('/setting/sync', syncSettingController.get);
  router.post('/setting/sync', jsonType, syncSettingController.save);
  router.get('/setting/brandfilter', brandSettingController.get);
  router.post('/setting/brandfilter', jsonType, brandSettingController.save);
  router.get('/setting/brandlist', brandSettingController.getLXBrand);
  router.get('/setting/general', generalSettingController.get);
  router.post('/setting/general', jsonType, generalSettingController.save);
  router.get(
    '/setting/categorymapping/collections',
    categorySettingController.getDropShipperCategory
  );
  router.get('/setting/categorymapping/retailercat', categorySettingController.getRetailerCat);
  router.get('/setting/categorymapping', categorySettingController.getList);
  router.post('/setting/categorymapping', jsonType, categorySettingController.save);
  router.delete('/setting/categorymapping/delete/:id', jsonType, categorySettingController.deleteOne);

  return router;
}
