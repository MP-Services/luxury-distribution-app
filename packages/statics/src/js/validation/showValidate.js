export function showValidate(input) {
  const thisAlert = $(input).parent();
  const errorMessage = $(thisAlert).data('validate');
  $(thisAlert)
    .find('.input-errors')
    .html(errorMessage);
}
