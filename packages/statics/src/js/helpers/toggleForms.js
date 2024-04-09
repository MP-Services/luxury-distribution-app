const shopifyLogin = $('#shopify-login-form');
const emailLogin = $('#email-login-form');
const googleLogin = $('#google-login-form');

$('.btn-shopify').on('click', () => {
  emailLogin.hide();
  googleLogin.hide();
  shopifyLogin.show();
});
$('.btn-email').on('click', () => {
  shopifyLogin.hide();
  googleLogin.hide();
  emailLogin.show();
});
$('.btn-google').on('click', () => {
  shopifyLogin.hide();
  emailLogin.hide();
  googleLogin.show();
});

$('.btn-login-source').on('click', function() {
  $('.btn-login-source.btn-selected').removeClass('btn-selected');
  $(this).addClass('btn-selected');
});
