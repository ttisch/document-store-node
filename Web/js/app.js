var app = angular.module('documentStoreApp',['ngRoute', 'ngFileUpload', 'cgNotify']);

app.config(['$routeProvider',
function($routeProvider, $httpProvider) {

  //  $httpProvider.interceptors.push('authInterceptorService');

  $routeProvider.
  when('/documents', {
    templateUrl: '../partials/documents-search.html',
    controller: 'DocumentCtrl',
    authenticate: false
  }).
  when('/documents/upload', {
    templateUrl: '../partials/documents-upload.html',
    controller: 'DocumentCtrl',
    authenticate: false
  }).
  when('/documents/:docId', {
    templateUrl: '../partials/documents-details.html',
    controller: 'DocumentCtrl',
    authenticate: false
  }).
  when('/login', {
    templateUrl: '../partials/login.html',
    controller: 'LoginCtrl',
    authenticate: false
  }).
  otherwise({
    redirectTo: '/login'
  });
}]);


app.run( function($rootScope, $location) {

  // register listener to watch route changes
  $rootScope.$on( "$routeChangeStart", function(event, next, current) {
    if ( current && current.authenticate && sessionStorage.getItem('accessToken') == null ) {
      // no logged user, we should be going to #login
      if ( next.templateUrl == "partials/login.html" ) {
        // already going to #login, no redirect needed
      } else {
        // not going to #login, we should redirect now
        $location.path( "/login" );
      }
    }
  });
})

// Login Service
app.service('loginService', function ($http) {
  this.register = function (userInfo) {
    var resp = $http({
      url: "http://localhost:8082/api/Account/Register",
      method: "POST",
      data: userInfo,
    });
    return resp;
  };

  this.login = function (userlogin) {

    var resp = $http({
      url: "http://localhost:8082/TOKEN",
      method: "POST",
      data: $.param({ grant_type: 'password', username: userlogin.username, password: userlogin.password }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return resp;
  };
});

// Document service
app.service('documentService', function ($http) {
  this.getDocuments = function (q) {
    var resp = $http({
      url: "http://localhost:8082/api/documents",
      method: "GET",
      isArray: true,
      params: {"n": 9, "q": q},
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('accessToken'),
        'Content-type': 'application/json'
      }
    });
    return resp;
  };
});

app.controller('DocumentCtrl', ['$scope', '$http', 'documentService', 'Upload', 'notify',
function ($scope, $http, documentService, Upload, notify) {

  documentService.getDocuments($scope.q).then(function(res){
    $scope.docs = res.data;
  });

  $scope.getIconName = function(filename) {
    if(filename.endsWith(".jpg")) return "image";
    else if(filename.endsWith(".jpeg")) return "image";
    else if(filename.endsWith(".png")) return "image";
    else return "document";
  }

  $scope.search = function(){
    documentService.getDocuments($scope.q).then(function(res){
      $scope.docs = res.data;
    });
  };

  // upload later on form submit or something similar
  $scope.submit = function() {
    if ($scope.form.file.$valid && $scope.file) {
      $scope.upload($scope.file);
    }
  };

  // upload on file select or drop
  $scope.upload = function (file) {
    Upload.upload({
      // url: 'http://localhost:8082/api/files/uploadfile',
      url: 'http://localhost:8082/api/documents',
      data: {'name': $scope.filename, 'tags': $scope.tags, file: file},
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('accessToken'),
        //'Content-type': 'multipart/form-data'
      }
    }).then(function (resp) {
      console.log('Success ' + resp.config.data.file.name + 'uploaded. Response: ' + resp.data);
      notify('Dokument erfolgreich hochgeladen!');
      // Reset the form
      $scope.filename = "";
      $scope.tags = "";
      $scope.form.$setPristine();
      $scope.form.$setUntouched();
    }, function (resp) {
      console.log('Error status: ' + resp.status);
    }, function (evt) {
      var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
      console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
    });
  };

  $scope.clickFileInput = function() {
    $('#file').click();
  }

  $scope.downloadFile = function(id) {
    window.open("http://localhost:8082/api/documents/" + id, '_main', '');

    /*return Restangular.one("http://localhost:8082/api/files", id).withHttpConfig({responseType: 'arraybuffer'}).get().then(function(data){
    console.log(data)
    var blob = new Blob([data], {
    type: "application/force-download"
  });
  //saveAs provided by FileSaver.js
  saveAs(blob, id + '.txt');
})*/
};

}]);

app.controller('LoginCtrl', ['$scope', 'loginService', '$rootScope', '$location', function ($scope, loginService, $rootScope, $location) {

  //Scope Declaration
  $scope.responseData = "";

  $scope.userName = "";

  $scope.userRegistrationEmail = "";
  $scope.userRegistrationPassword = "";
  $scope.userRegistrationConfirmPassword = "";

  $scope.userLoginEmail = "";
  $scope.userLoginPassword = "";

  $scope.accessToken = "";
  $scope.refreshToken = "";
  //Ends Here

  //Function to register user
  $scope.registerUser = function () {

    $scope.responseData = "";

    //The User Registration Information
    var userRegistrationInfo = {
      Email: $scope.userRegistrationEmail,
      Password: $scope.userRegistrationPassword,
      ConfirmPassword: $scope.userRegistrationConfirmPassword
    };

    var promiseregister = loginService.register(userRegistrationInfo);

    promiseregister.then(function (resp) {
      $scope.responseData = "User is Successfully";
      $scope.userRegistrationEmail="";
      $scope.userRegistrationPassword="";
      $scope.userRegistrationConfirmPassword="";
    }, function (err) {
      $scope.responseData="Error " + err.status;
    });
  };


  $scope.redirect = function () {
    window.location.href = '/documents';
  };

  //Function to Login. This will generate Token
  $scope.login = function () {
    //This is the information to pass for token based authentication
    var userLogin = {
      grant_type: 'password',
      username: $scope.userRegistrationEmail,
      password: $scope.userRegistrationPassword
    };

    var promiselogin = loginService.login(userLogin);

    promiselogin.then(function (resp) {

      $rootScope.userName = resp.data.userName;
      $rootScope.loggedIn = true;
      $scope.userName = resp.data.userName;
      //Store the token information in the SessionStorage
      //So that it can be accessed for other views
      sessionStorage.setItem('userName', resp.data.userName);
      sessionStorage.setItem('accessToken', resp.data.access_token);
      sessionStorage.setItem('refreshToken', resp.data.refresh_token);
      $location.path('/documents');
    }, function (err) {

      $scope.responseData="Error " + err.status;
    });

  };
}]);
