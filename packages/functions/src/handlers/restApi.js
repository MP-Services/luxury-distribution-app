import Koa from 'koa';
import path from 'path';
import render from 'koa-ejs';
import cors from 'koa2-cors';
import router from '../routes/restApiV1';

const handler = new Koa();

render(handler, {
  root: path.join(__dirname, '../../views'),
  layout: false,
  viewExt: 'html',
  cache: false,
  debug: false
});
handler.use(cors());

handler.use(router.allowedMethods());
handler.use(router.routes());

export default handler;
