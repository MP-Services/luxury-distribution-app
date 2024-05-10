import Router from 'koa-router';
import jsonType from '../middleware/jsonType';
import * as productController from '@functions/controllers/restApi/productController';

const router = new Router({prefix: '/rest_api/v1'});

router.post('/shopify/product/webhook', jsonType, productController.webhook);
export default router;
