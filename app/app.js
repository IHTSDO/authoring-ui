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
    'ui.tree',
    'ui.tinymce',

    //Insert any created modules here. Ideally one per major feature.,
    'singleConceptAuthoringApp.home',
    'singleConceptAuthoringApp.project',
    'singleConceptAuthoringApp.projects',
    'singleConceptAuthoringApp.myProjects',
    'singleConceptAuthoringApp.reviewTasks',
    'singleConceptAuthoringApp.projectMerge',
    'singleConceptAuthoringApp.about',
    'singleConceptAuthoringApp.edit',
    'singleConceptAuthoringApp.test',
    'singleConceptAuthoringApp.sidebar',
    'singleConceptAuthoringApp.sidebarEdit',
    'singleConceptAuthoringApp.taxonomyPanel',
    'singleConceptAuthoringApp.searchPanel',
    'singleConceptAuthoringApp.savedList',
    'singleConceptAuthoringApp.taskDetail',
    'singleConceptAuthoringApp.conceptInformationModal'
  ])
  .factory('httpRequestInterceptor', function () {
    return {
      request: function (config) {
        config.headers['Authorization'] = 'Basic c25vd293bDpzbm93b3ds ';
        return config;
      }
    };
  })


  .config(function ($rootScopeProvider, $provide, $routeProvider, $modalProvider, $httpProvider) {

    console.log('Configuring application');

    // up the digest limit to account for extremely long depth of SNOMEDCT trees leading to spurious errors
    // this is not an ideal solution, but this is a known edge-case until Angular 2.0 (see https://github.com/angular/angular.js/issues/6440)
    $rootScopeProvider.digestTtl(20);

    $provide.factory('$routeProvider', function () {
      return $routeProvider;
    });
    $provide.decorator('$exceptionHandler',
      ['$delegate', '$window', extendExceptionHandler]);
    //intercept requests to add hardcoded authorization header to work around the spring security popup
    $httpProvider.interceptors.push('httpRequestInterceptor');

    // modal providers MUST not use animation
    // due to current angular-ui bug where the
    // animation prevents removal of grey backdrop on close
    $modalProvider.options.animation = false;

    $provide.decorator('taOptions', ['taRegisterTool', '$delegate', function (taRegisterTool, taOptions) {
      // $delegate is the taOptions we are decorating
      // register the tool with textAngular
      taRegisterTool('taxonomy', {
        iconclass: "fa-sca fa-link",
        action: function (scope) {
          window.alert('Not yet functional.  Use input box to access search widget');
          // DOes not work, too easy but had to try :D  scope.openSearchModal();
        }
      });
      // add the button to the default toolbar definition
      taOptions.toolbar[1].push('taxonomy');
      var index = taOptions.toolbar[1].indexOf('undo');    // <-- Not supported in <IE9
      if (index !== -1) {
        taOptions.toolbar[1].splice(index, 1);
      }
      index = taOptions.toolbar[1].indexOf('redo');    // <-- Not supported in <IE9
      if (index !== -1) {
        taOptions.toolbar[1].splice(index, 1);
      }

      // set false to allow the textAngular-sanitize provider to be replaced
      // see https://github.com/fraywing/textAngular/wiki/Setting-Defaults
      taOptions.forceTextAngularSanitize = false;

      return taOptions;
    }]);

  })

  .run(function ($routeProvider, $rootScope, configService, scaService, snowowlService, notificationService, accountService, metadataService, $cookies, $timeout, $location, $window, $sce) {

    console.log('Running application');

    $window.ga('create', 'UA-41892858-21', 'auto');
    // track pageview on state change
    $rootScope.$on('$locationChangeSuccess', function (event) {
      $window.ga('send', 'pageview', $location.path());
    });
    $window.onerror = function handleGlobalError(message, fileName, lineNumber, columnNumber, error) {
      console.log('error');
      if (!error) {
        error = new Error(message);
        error.fileName = fileName;
        error.lineNumber = lineNumber;
        error.columnNumber = ( columnNumber || 0 );
      }
      $window.ga('send', 'error', error)
    };

    $routeProvider.otherwise({
      redirectTo: '/home'
    });

    $rootScope.notProd = false;
    $timeout(function () {
      var env = $location.host().split(/[.]/)[0];
      if (env === 'local' || env === 'dev-term' || env === 'dev-authoring') {
        $rootScope.development = true;
        $rootScope.notProd = true;
      }
      else if (env === 'uat-term' || env === 'uat-authoring') {
        $rootScope.uat = true;
        $rootScope.notProd = true;
      }
      else {
        $rootScope.notProd = false;
        $rootScope.uat = false;
        $rootScope.development = false;
      }
    }, 3000);


    // get endpoint information and set route provider options
    configService.getEndpoints().then(
      // Success block -- config properties retrieved
      function (response) {
        var endpoints = response;
        console.log(response);
        var accountUrl = endpoints.imsEndpoint + 'api/account';
        var imsUrl = endpoints.imsEndpoint;
        $rootScope.collectorUrl = $sce.trustAsResourceUrl(endpoints.collectorEndpoint);
        $("<script>").attr({src: $rootScope.collectorUrl}).appendTo("body");
        var imsUrlParams = '?serviceReferer=' + window.location.href;

        // don't want either true or false here please!
        $rootScope.loggedIn = null;

        // get the account details
        accountService.getAccount(accountUrl).then(function (account) {

          // get the user preferences (once logged in status confirmed)
          accountService.getUserPreferences().then(function (preferences) {

            // apply the user preferences
            // NOTE: Missing values or not logged in leads to defaults
            accountService.applyUserPreferences(preferences).then(function (appliedPreferences) {

              // check for modification by application routine
              if (appliedPreferences !== preferences) {
                accountService.saveUserPreferences(appliedPreferences);
              }
            })
          });

        }, function (error) {
          // apply default preferences
          accountService.applyUserPreferences(preferences).then(function (appliedPreferences) {

          })
        });


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
      },

      // ERROR block -- if config properties cannot be retrieved
      function (error) {
        notificationService.sendError('Fatal error: ' + error);
      });

    // TODO Move these into the configuration success block once fully wired
    // Moved outside to prevent irritating issue on dev where projects and polling fail to instantiate due to
    // grunt not serving the config properties file

    // begin polling the sca endpoint at 10s intervals
    scaService.startPolling(10000);

    ///////////////////////////////////////////
    // Cache local data
    ///////////////////////////////////////////
    scaService.getProjects().then(function (response) {
      metadataService.setProjects(response);
    });




    ///////////////////////////////////////////
    // Instantiate basic metadata in SnowOwl //
    ///////////////////////////////////////////

  })
  .controller('AppCtrl', ['$scope', 'rootScope', '$location', function AppCtrl($scope, $rootScope, $location) {
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
      if (angular.isDefined(toState.data.pageTitle)) {
        $scope.pageTitle = toState.data.pageTitle + ' | thisIsSetInAppCtrl.js';
      }
    });


  }]);

// Extend the $exceptionHandler service to also display a toast.
function extendExceptionHandler($delegate, $window) {
  return function (exception, cause) {
    $delegate(exception, cause);
    console.log(exception.toString());
    $window.ga('send', '_trackEvent', 'JavaScript Error', exception.toString(), true)
  };
};
