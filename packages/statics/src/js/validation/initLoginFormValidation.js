import {hideValidate} from './hideValidate';
import {validate} from './validate';
import {showValidate} from './showValidate';

export function initLoginFormValidation(emailInput, shopifyInput) {
  $('#avada-login-page #email-login-form .Avada-Login__Button').on(
    'click',
    function(event) {
      let check = true;

      for (let i = 0; i < emailInput.length; i++) {
        if (validate(emailInput[i]) === false) {
          showValidate(emailInput[i]);
          check = false;
          event.stopImmediatePropagation();
        }
      }

      return check;
    }
  );
  $('#avada-login-page #shopify-login-form .Shopify-Login__Button').on(
    'click',
    function(event) {
      let check = true;
      for (let i = 0; i < shopifyInput.length; i++) {
        if (validate(shopifyInput[i]) === false) {
          event.preventDefault();
          showValidate(shopifyInput[i]);
          check = false;
          event.stopImmediatePropagation();
        }
      }

      return check;
    }
  );

  $(
    '#avada-login-page #email-login-form .Avada-Validate__Form .Avada-Login__Input'
  ).each(function() {
    $(this).focus(function() {
      hideValidate(this);
    });
  });
}
