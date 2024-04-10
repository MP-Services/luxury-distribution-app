import Router from 'koa-router';
import jsonType from '../middleware/jsonType';
import * as signUpController from '@functions/controllers/signUpController';

export default function apiRouter(isEmbed = false) {
  const router = new Router();
  router.post('/signup', jsonType, signUpController.signUp )

  return router;
}
