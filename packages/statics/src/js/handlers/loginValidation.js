import {initLoginFormValidation} from '../validation/initLoginFormValidation';

const loginEmailFormInput = $(
  '#avada-login-page #email-login-form .Avada-Validate__Input .Avada-Login__Input'
);
const loginShopifyFormInput = $(
  '#avada-login-page #shopify-login-form .Avada-Validate__Input .Avada-Login__Input'
);
initLoginFormValidation(loginEmailFormInput, loginShopifyFormInput);
