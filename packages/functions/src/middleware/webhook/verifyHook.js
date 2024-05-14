import * as yup from 'yup';
import {getShopByField} from '../../repositories/shopRepository';
import {isWebhookLogExist, saveWebhookLog} from '../../repositories/webhookLogRepository';

export default async function verifyHook(ctx, next) {
  try {
    const shopifyDomain = ctx.req.header('X-Shopify-Shop-Domain');
    const topic = ctx.req.header('X-Shopify-Topic');
    console.log('Verify hook', topic, shopifyDomain);

    const headerSchema = yup.object().shape({
      'x-shopify-shop-domain': yup
        .string()
        .lowercase()
        .required('X-Shopify-Shop-Domain header is missing'),
      'x-shopify-hmac-sha256': yup
        .string()
        .lowercase()
        .required('X-Shopify-Hmac-Sha256 header is missing')
    });
    await headerSchema.validate(ctx.req.headers);

    const webhookId = ctx.req.header('X-Shopify-Webhook-Id');
    const isExist = await isWebhookLogExist(shopifyDomain, webhookId);
    if (isExist) {
      console.log(
        '=== duplicated hook',
        shopifyDomain,
        webhookId,
        ctx.req.body.admin_graphql_api_id
      );
      return ctx.res.status(200).json({success: false, message: 'Webhook duplicated'});
    }

    const [shop] = await Promise.all([
      getShopByField(ctx.req.header('X-Shopify-Shop-Domain')),
      saveWebhookLog({shopifyDomain, webhookId, topic})
    ]);

    ctx.state.shop = shop;
    ctx.state.apiData = {
      status: true,
      message: 'Sync successfully',
      version: 'v1',
      shopId: shop.id,
      topic,
      requestBody: JSON.stringify(ctx.req.body),
      requestHeaders: JSON.stringify(ctx.req.headers)
    };

    if (ctx.req.header('X-Joy-Connection-Test') === 'true') {
      return (ctx.body = {success: true, message: 'Test successfully!'});
    }

    console.log('Pass verify hook', shop.id);
    return next();
  } catch (e) {
    console.error(e);
    return (ctx.body = {success: false, message: e.message});
  }
}
