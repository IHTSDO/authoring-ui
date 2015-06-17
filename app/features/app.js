'use strict';

/**
 * @ngdoc overview
 * @name angularAppTemplateApp
 * @description
 * # angularAppTemplateApp
 *
 * Main module of the application.
 */
angular
    .module('angularAppTemplateApp', [
    'ngAnimate',
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    //Insert any created modules here. Ideally one per major feature.
    'angularAppTemplateApp.home',
    'angularAppTemplateApp.about'
    ])
    .config(function ($routeProvider) {
    var imsUrl = 'https://dev-ims.ihtsdotools.org/#/';
    var imsUrlParams = '?serviceReferer=' + window.location.href;
    $routeProvider
        .when('/login', {
            redirectTo: function(){ window.location = decodeURIComponent(imsUrl + 'login' + imsUrlParams);}
          })
        .when('/logout', {
            redirectTo: function(){ window.location = imsUrl + 'logout' + imsUrlParams;}
          })
        .when('/settings', {
            redirectTo: function(){ window.location = imsUrl + 'settings' + imsUrlParams;}
          })
        .when('/register', {
            redirectTo: function(){ window.location = imsUrl + 'register' + imsUrlParams;}
          })
          .otherwise({
            redirectTo: '/home'
          });
    })
    .run( function run () {
    })

    .controller( 'AppCtrl', function AppCtrl ( $scope, $location ) {
      $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
        if ( angular.isDefined( toState.data.pageTitle ) ) {
          $scope.pageTitle = toState.data.pageTitle + ' | titleSetInAppCtrl.js' ;
        }
      });
    })
;