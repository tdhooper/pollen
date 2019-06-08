
global.firebase = require('firebase/app');
require('firebase/auth');
require('firebase/storage');
require('firebase/firestore');

firebase.initializeApp(require('./firebase-config'));
firebase.auth().signInAnonymously().catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  // ...
});
