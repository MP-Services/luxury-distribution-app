export function handleError(loginBtn, message) {
  loginBtn.removeClass('running');
  $('#validations-errors')
    .show()
    .html(message);
}
