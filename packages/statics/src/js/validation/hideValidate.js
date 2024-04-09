export function hideValidate(input) {
  const thisAlert = $(input);
  $(thisAlert)
    .parent()
    .find('.input-errors')
    .html('');
}
