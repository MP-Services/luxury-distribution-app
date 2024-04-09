export function validate(input) {
  if ($(input).attr('type') === 'email' || $(input).attr('name') === 'email') {
    if (
      $(input)
        .val()
        .trim()
        .match(
          /^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/
        ) == null
    ) {
      return false;
    }
  } else if (
    $(input).attr('type') === 'password' &&
    $(input).attr('name') === 'pass'
  ) {
    const password = $(input).val();
    if (password.trim().match(/(?=.{8,})/) === null) return false;

    return true;
  } else if (
    $(input).attr('type') === 'password' &&
    $(input).attr('name') === 're-pass'
  ) {
    const repass = $(input).val();
    const password = $('#password').val();
    if (repass !== password) return false;

    return true;
  } else if (
    $(input).attr('type') === 'text' &&
    $(input).attr('name') === 'domain'
  ) {
    if (
      $(input)
        .val()
        .trim()
        .match(
          /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/g
        ) == null
    )
      return false;
  } else if (
    $(input)
      .val()
      .trim() === ''
  ) {
    return false;
  }
}
