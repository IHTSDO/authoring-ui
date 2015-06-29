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
    //Insert any created modules here. Ideally one per major feature.
    'singleConceptAuthoringApp.home',
    'singleConceptAuthoringApp.about',
	  'singleConceptAuthoringApp.edit',
    'singleConceptAuthoringApp.taxonomy',
    'singleConceptAuthoringApp.search'
    ])
    .config(function ($provide, $routeProvider) {
        $provide.factory('$routeProvider', function () {
            return $routeProvider;
        });
    })

    .run(function($routeProvider, $rootScope, endpointService) {
        $routeProvider.otherwise({
                    redirectTo: '/home'
                  });
        endpointService.getEndpoints().then(function (data){
            $rootScope.endpoints = data.endpoints;
            var imsUrl = data.endpoints.imsEndpoint;
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
        });
})
.controller( 'AppCtrl', ['$scope', '$location', function AppCtrl ( $scope, $location) {
        $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
            if ( angular.isDefined( toState.data.pageTitle ) ) {
              $scope.pageTitle = toState.data.pageTitle + ' | thisIsSetInAppCtrl.js' ;
            }
        });
    }]);
