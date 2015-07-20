'use strict';

/**
 * @ngdoc overview
 * @name singleConceptAuthoringApp
 * @description
 * # singleConceptAuthoringApp
 *
 * Main module of the application.
 */
angular
  .module('singleConceptAuthoringApp', [
    'ngAnimate',
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'mgcrea.ngStrap',
    'jcs-autoValidate',
    'ngTable',
    'ui.bootstrap',
    'ui.sortable',
    'ang-drag-drop',


    //Insert any created modules here. Ideally one per major feature.
    'singleConceptAuthoringApp.home',
	'singleConceptAuthoringApp.projects',
    'singleConceptAuthoringApp.about',
    'singleConceptAuthoringApp.edit',
    'singleConceptAuthoringApp.taxonomy',
    'singleConceptAuthoringApp.search',
    'singleConceptAuthoringApp.savedList',
    'singleConceptAuthoringApp.taskDetail'
  ])
  .config(function ($provide, $routeProvider, $modalProvider) {
    $provide.factory('$routeProvider', function () {
      return $routeProvider;
    });

    // modal providers MUST not use animation
    // due to current angular-ui bug where the
    // animation prevents removal of grey backdrop on close
    $modalProvider.options.animation = false;

  })

  .run(function ($routeProvider, $rootScope, endpointService, scaService, accountService, $cookies) {
    $routeProvider.otherwise({
      redirectTo: '/home'
    });
    endpointService.getEndpoints().then(function (data) {
      $rootScope.endpoints = data.endpoints;
      var accountUrl = data.endpoints.imsEndpoint + 'api/account';
      var imsUrl = data.endpoints.imsEndpoint;
      var imsUrlParams = '?serviceReferer=' + window.location.href;

      // don't want either true or false here please!
      $rootScope.loggedIn = null;

     /* accountService.getAccount(accountUrl).success(function (data) {
            $rootScope.accountDetails = data.data;
            console.log("LoggedIn");
                $rootScope.loggedIn = true;
        }).error(function () {
            console.log("LoggedOut");
                $rootScope.loggedIn = false;
      });*/

      // add required endpoints to route provider
      $routeProvider
        .when('/login', {
          redirectTo: function () {
            window.location = decodeURIComponent(imsUrl + 'login' + imsUrlParams);
          }
        })
        .when('/logout', {
          redirectTo: function () {
            window.location = decodeURIComponent(imsUrl + 'logout' + imsUrlParams);
          }
        })
        .when('/settings', {
          redirectTo: function () {
            window.location = imsUrl + 'settings' + imsUrlParams;
          }
        })
        .when('/register', {
          redirectTo: function () {
            window.location = decodeURIComponent(imsUrl + 'register' + imsUrlParams);
          }
        });
    });
  })
  .controller('AppCtrl', ['$scope', '$location', function AppCtrl($scope, $location) {
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      if (angular.isDefined(toState.data.pageTitle)) {
        console.debug('changing pageTitle to:', toState.data.pageTitle);
        $scope.pageTitle = toState.data.pageTitle + ' | thisIsSetInAppCtrl.js';
      }
    });
  }]);
