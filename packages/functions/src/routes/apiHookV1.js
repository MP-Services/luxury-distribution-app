import Router from 'koa-router';
import * as orderController from '../controllers/apiHookV1/orderController';
import * as collectionController from '../controllers/apiHookV1/collectionController';
import verifyHook from '../middleware/webhook/verifyHook';

const router = new Router({prefix: '/app/api/v1'});

// ---------------------- Webhook endpoints ----------------------
router.post('/orders', verifyHook, orderController.handleOrder);
router.post('/collections', verifyHook, collectionController.handleCollection);

export default router;
