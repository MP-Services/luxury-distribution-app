import Router from 'koa-router';
import jsonType from '../middleware/jsonType';
import * as productController from '@functions/controllers/productController';

const router = new Router({prefix: '/rest_api/v1'});

router.post('/shopify/product/update', jsonType, productController.update);
export default router;
