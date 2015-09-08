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
/*    'ngAnimate',*/
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
    'monospaced.elastic',
    'textAngular',

    //Insert any created modules here. Ideally one per major feature.,
    'singleConceptAuthoringApp.home',
    'singleConceptAuthoringApp.project',
    'singleConceptAuthoringApp.projects',
    'singleConceptAuthoringApp.projecttasks',
    'singleConceptAuthoringApp.projectDetail',
    'singleConceptAuthoringApp.about',
    'singleConceptAuthoringApp.edit',
    'singleConceptAuthoringApp.taxonomy',
    'singleConceptAuthoringApp.search',
    'singleConceptAuthoringApp.searchModal',
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

    $provide.decorator('taOptions', ['taRegisterTool', '$delegate', function(taRegisterTool, taOptions){
      // $delegate is the taOptions we are decorating
      // register the tool with textAngular
      taRegisterTool('taxonomy', {
        iconclass: "fa fa-link",
        action: function(scope){
          window.alert('Not yet functional.  Use input box to access search widget');
          // DOes not work, too easy but had to try :D  scope.openSearchModal();
        }
      });
      // add the button to the default toolbar definition
      taOptions.toolbar[1].push('taxonomy');
      return taOptions;
    }]);

  })

  .run(function ($routeProvider, $rootScope, endpointService, scaService, snowowlService, notificationService, accountService, $cookies, $timeout) {

    // set the default redirect/route
    $routeProvider.otherwise({
      redirectTo: '/home'
    });

    // begin polling the sca endpoint at 10s intervals
    scaService.startPolling(10000);

    // get endpoint information and set route provider options
    endpointService.getEndpoints().then(function (data) {
      $rootScope.endpoints = data.endpoints;
      var accountUrl = data.endpoints.imsEndpoint + 'api/account';
      var imsUrl = data.endpoints.imsEndpoint;
      var imsUrlParams = '?serviceReferer=' + window.location.href;

      // don't want either true or false here please!
      $rootScope.loggedIn = null;

      accountService.getAccount(accountUrl);

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

    ///////////////////////////////////////////
    // Instantiate basic metadata in SnowOwl //
    ///////////////////////////////////////////

    var baseModules = [
      '900000000000207008', '900000000000012004'
    ];

    var baseLanguages = [ 'en' ];

    var baseDialects = [ 'EN-US', 'EN-GB', 'EN-GB and EN-US'];

    // TODO Leave MAIN here?
    snowowlService.addModules(baseModules, 'MAIN');
    snowowlService.addLanguages(baseLanguages);
    snowowlService.addDialects(baseDialects);

  })
  .controller('AppCtrl', ['$scope', '$location', function AppCtrl($scope, $location) {
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | thisIsSetInAppCtrl.js';
      }
    });
  }]);
