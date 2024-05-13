import * as yup from 'yup';

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

    console.log('Pass verify hook', shop.id);
    return next();
  } catch (e) {
    console.error(e);
    return (ctx.body = {success: false, message: e.message});
  }
}
