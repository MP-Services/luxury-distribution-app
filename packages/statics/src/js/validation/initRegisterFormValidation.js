import {hideValidate} from './hideValidate';
import {validate} from './validate';
import {showValidate} from './showValidate';

export function initRegisterFormValidation(button, input) {
  button.on('click', function(event) {
    let check = true;

    for (let i = 0; i < input.length; i++) {
      if (validate(input[i]) === false) {
        showValidate(input[i]);
        check = false;
        event.stopImmediatePropagation();
      }
    }

    return check;
  });

  $('#avada-register-page .Avada-Validate__Form .Avada-Login__Input').each(
    function() {
      $(this).focus(function() {
        hideValidate(this);
      });
    }
  );
}
