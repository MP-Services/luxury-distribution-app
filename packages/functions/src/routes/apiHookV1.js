import Router from 'koa-router';
import * as orderController from '../controllers/apiHookV1/orderController';
import verifyHook from '../middleware/webhook/verifyHook';

const router = new Router({prefix: '/app/api/v1'});

// ---------------------- Webhook endpoints ----------------------
router.post('/orders', verifyHook, orderController.handleOrder);

export default router;
