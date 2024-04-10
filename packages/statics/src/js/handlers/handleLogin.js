import {handleError} from './handleError';

$('#luxury-distribution-login-wrapper .singup-action-submit').on('click', function(event) {
  event.preventDefault();
  const loginBtn = $(this);
  loginBtn.addClass('running');
  loginBtn.prop('disabled', true);
  const shopifyUrl = $('#shopify-url').val();
  const username = $('#username').val();
  const password = $('#password').val();
  fetch('https://api.luxury-distribution.com/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      password
    })
  })
    .then(response => response.json())
    .then(respData => {
      console.log(respData);

      fetch('')
    });
});

//   firebase
//     .auth()
//     .signInWithEmailAndPassword(email, password)
//     .then(result => {
//       const user = result.user;
//       const {email, displayName, uid, domain, vendor} = user;
//       document.querySelector('#PreLoading').style.display = 'flex';
//
//       if (user) {
//         fetch('/shop/create', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json'
//           },
//           body: JSON.stringify({
//             uid,
//             email,
//             name: displayName,
//             domain: domain || '',
//             login: true,
//             vendor: vendor || 'others'
//           })
//         })
//           .then(response => response.json())
//           .then(respData => {
//             const {shop} = respData;
//             user.getIdToken(false).then(token => {
//               window.location.replace(`/apiSa/switch/${shop}?token=${token}`);
//             });
//           });
//       }
//     })
//     .catch(function(error) {
//       return handleError(loginBtn, error.message);
//     });
// });

$('#shopify-login-form-el').on('submit', function() {
  $('.Shopify-Login__Button--Inner').addClass('running');
});
