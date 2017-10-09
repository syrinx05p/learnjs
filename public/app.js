'use strict';

/* google+ */
function googleSignIn() {
  console.log(arguments);
  AWS.config.getCredentials(function (err) {
    if (err) console.log(err.stack); // credentials not loaded
    else console.log("Access Key:", AWS.config.credentials.accessKeyId);
  })
}

function googleSignIn(googleUser) {
  var id_token = googleUser.getAuthResponse().id_token;
  var expires_at = moment(googleUser.getAuthResponse().expires_at);
  console.log("Google+ id_token expires at: " + expires_at.format("YYYY/MM/DD HH:mm:ss.SSS ZZ"));
  console.log("Google+ id_token:" + id_token);
  AWS.config.update({
    region: 'ap-northeast-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: learnjs.poolId,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  })
  learnjs.awsRefresh().then(function (id) {
    learnjs.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    });
  });
  AWS.config.getCredentials(function (err) {
    if (err) console.log(err.stack); // credentials not loaded
    else console.log("AWS Access Key:", AWS.config.credentials.accessKeyId);
  })
}

function refresh() {
  return gapi.auth2.getAuthInstance().signIn({
    prompt: 'login'
  }).then(function (userUpdate) {
    var creds = AWS.config.credentials;
    var newToken = userUpdate.getAuthResponse().id_token;
    creds.params.Logins['accounts.google.com'] = newToken;
    return learnjs.awsRefresh();
  });
}

/* learnjs */
var learnjs = {
  poolId: 'ap-northeast-1:19e8291e-2141-4e32-9afc-7aad37025e2d'
};

learnjs.identity = new $.Deferred();

learnjs.addProfileLink = function(profile) {
  var link = learnjs.template('profile-link');
  link.find('a').text(profile.email);
  $('.signin-bar').prepend(link);
}

learnjs.awsRefresh = function () {
  var deferred = new $.Deferred();
  AWS.config.credentials.refresh(function (err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
}

/*

*/

learnjs.template = function (name) {
  return $(' .templates .' + name).clone();
}

/* events */
learnjs.appOnReady = function () {
  window.onhashchange = function () {
    learnjs.showView(window.location.hash);
  };
  learnjs.showView(window.location.hash);
  learnjs.identity.done(learnjs.addProfileLink);
}

learnjs.applyObject = function (obj, elem) {
  for (var key in obj) {
    elem.find('[data-name="' + key + '"]').text(obj[key]);
  }
};

learnjs.triggerEvent = function (name, args) {
  $('.view-container>*').trigger(name, args);
}

/* view */
learnjs.showView = function (hash) {
  // map hash and function
  var routes = {
    '': learnjs.landingView,
    '#': learnjs.landingView,
    '#problem': learnjs.problemView,
    '#profile': learnjs.profileView
  };

  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];

  if (viewFn) {
    learnjs.triggerEvent('removingView', []);
    $('.view-container').empty().append(viewFn(hashParts[1]));
  }
}

learnjs.triggerEvent = function (name, args) {
  $('.view-container>*').trigger(name, args);
}

learnjs.profileView = function () {
  var view = learnjs.template('profile-view');
  learnjs.identity.done(function (identity) {
    view.find('.email').text(identity.email);
  });
  return view;
}

learnjs.landingView = function () {
  return learnjs.template('landing-view');
}

learnjs.problemView = function (data) {
  var problemNumber = parseInt(data, 10);
  var view = learnjs.template('problem-view');
  var problemData = learnjs.problems[problemNumber - 1];
  var resultFlash = view.find('.result');

  function checkAnswer() {
    var answer = view.find('.answer').val();
    var test = problemData.code.replace('__', answer) + '; problem();';
    return eval(test);
  }

  function checkAnswerClick() {
    if (checkAnswer()) {
      /* simple 
      var correctFlash = learnjs.template('correct-flash');
      correctFlash.find('a').attr('href', '#problem-' + (problemNumber + 1));
      learnjs.flashElement(resultFlash, correctFlash);
      */
      var correctFlash = learnjs.buildCorrectFlash(problemNumber);
      learnjs.flashElement(resultFlash, correctFlash);
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!');
    }
    return false;
  }
  view.find('.check-btn').click(checkAnswerClick);
  view.find('.title').text('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);

  if (problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn');
    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
    $('.nav-list').append(buttonItem);
    view.bind('removingView', function () {
      buttonItem.remove();
    });
  }

  return view;
}

learnjs.buildCorrectFlash = function (problemNum) {
  var correctFlash = learnjs.template('correct-flash');
  var link = correctFlash.find('a');
  if (problemNum < learnjs.problems.length) {
    link.attr('href', '#problem-' + (problemNum + 1));
  }
  else {
    link.attr('href', '');
    link.text("You're Finished!");
  }
  return correctFlash;
}

learnjs.flashElement = function (elem, content) {
  elem.fadeOut('fast', function () {
    elem.html(content);
    elem.fadeIn();
  });
}

/* data */
//source[learnjs/3100/public/app.js]{
learnjs.problems = [
  {
    description: "What is truth?",
    code: "function problem() { return __; }"
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 === 6 * __; }"
  }
];
//}


