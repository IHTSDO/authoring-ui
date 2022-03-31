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
    'cfp.hotkeys',
    'LocalStorageModule',
    'angularjs-dropdown-multiselect',

    //Insert any created modules here. Ideally one per major feature.,
    'singleConceptAuthoringApp.home',
    'singleConceptAuthoringApp.project',
    'singleConceptAuthoringApp.codesystem',
    'singleConceptAuthoringApp.projects',
    'singleConceptAuthoringApp.codesystems',
    'singleConceptAuthoringApp.myProjects',
    'singleConceptAuthoringApp.reviewTasks',
    'singleConceptAuthoringApp.projectMerge',
    'singleConceptAuthoringApp.edit',
    'singleConceptAuthoringApp.sidebar',
    'singleConceptAuthoringApp.sidebarEdit',
    'singleConceptAuthoringApp.taxonomyPanel',
    'singleConceptAuthoringApp.searchPanel',
    'singleConceptAuthoringApp.savedList',
    'singleConceptAuthoringApp.taskDetail',
    'singleConceptAuthoringApp.conceptInformationModal',
    'singleConceptAuthoringApp.transformModal',
    'singleConceptAuthoringApp.transformationModal',
    'singleConceptAuthoringApp.uploadBatch',
    'singleConceptAuthoringApp.owlAxiomExpressionModal',
    'singleConceptAuthoringApp.descriptorRefsetModal'
  ])
  .factory('httpRequestInterceptor', function () {
    return {
      request: function (config) {
        if (config && config.headers && !config.headers.hasOwnProperty('Accept-Language')) {
          config.headers['Accept-Language'] = 'en-us;q=0.8,en-gb;q=0.5';
        }
        return config;
      }
    };
  })
  .constant('AppConstants', {
    AUTHORING_SERVICES_ENDPOINT: '/authoring-services/',
    AUTHORING_ACCEPTANCE_GATEWAY_ENDPOINT: '/authoring-acceptance-gateway/'
  })

  .config(function ($rootScopeProvider, $provide, $routeProvider, $modalProvider, $httpProvider, localStorageServiceProvider) {
    
    localStorageServiceProvider.setPrefix('singleConceptAuthoringApp')
                               .setStorageType('localStorage');

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

      taOptions.keyMappings = [
          { commandKeyCode: 'TabKey', testForKey: function (event) { return false; }
          },
          { commandKeyCode: 'ShiftTabKey', testForKey: function (event) { return false; }
          }
      ];

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

  .run(function ($routeProvider, $rootScope, configService, scaService, terminologyServerService, notificationService, accountService, metadataService, $timeout, $location, $window, $sce, hotkeys, cisService, crsService, aagService, rnmService, spellcheckService, AppConstants) {

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
      if (env === 'local' || env.startsWith('dev-')) {
        $rootScope.development = true;
        $rootScope.notProd = true;
      }
      else if (env.startsWith('uat-')) {
        $rootScope.uat = true;
        $rootScope.notProd = true;
      }
      else if (env.startsWith('training-')) {
        $rootScope.training = true;
        $rootScope.notProd = true;
      }
      else {
        $rootScope.notProd = false;
        $rootScope.uat = false;
        $rootScope.development = false;
        $rootScope.training = false;
      }
    }, 3000);

    // get endpoint information and set route provider options
    configService.getConfigurations().then(
      // Success block -- config properties retrieved
      function (response) {
        var endpoints = response.endpoints;
        $rootScope.endpoints = endpoints;

        scaService.setEndpoint('..' + AppConstants.AUTHORING_SERVICES_ENDPOINT);
        aagService.setEndpoint('..' + AppConstants.AUTHORING_ACCEPTANCE_GATEWAY_ENDPOINT);
        rnmService.setEndpoint('../release-notes/');
        spellcheckService.setEndpoint(AppConstants.AUTHORING_SERVICES_ENDPOINT + 'spelling/check');
        terminologyServerService.setEndpoint(endpoints.terminologyServerEndpoint);
        crsService.setCrsEndpoint(endpoints['crsEndpoint']);
        crsService.setUSCrsEndpoint(endpoints['crsEndpoint.US']);
        var accountUrl = endpoints.imsEndpoint + '/auth';
        var imsUrl = endpoints.imsEndpoint;
        var imsUrlParams = '?serviceReferer=' + window.location.href;
        $rootScope.collectorUrl = $sce.trustAsResourceUrl(endpoints.collectorEndpoint);
        $rootScope.msCollectorUrl = $sce.trustAsResourceUrl(endpoints.msCollectorEndpoint);

        // Footer information        
        if(endpoints.scaUserGuideEndpoint) {
          $("#user_guide").attr("href", endpoints.scaUserGuideEndpoint);
        }

        if(endpoints.contactUsEndpoint) {
          $("#contact_us").attr("href", endpoints.contactUsEndpoint)
        }

        // don't want either true or false here please!
        $rootScope.loggedIn = null;

        // get the account details
        accountService.getAccount(accountUrl).then(
          function (account) {

            if(!(account.roles.includes('ROLE_ihtsdo-sca-author'))) {
              window.location.href = decodeURIComponent(imsUrl + 'login');
            }

            if(account.roles.includes('ROLE_ms-users')) {
              $rootScope.managedServiceUser = true;
            }

            if ($rootScope.managedServiceUser) {
              $("<script>").attr({src: $rootScope.msCollectorUrl !== '' ? $rootScope.msCollectorUrl : $rootScope.collectorUrl}).appendTo("body");
            } else {
              $("<script>").attr({src: $rootScope.collectorUrl}).appendTo("body");
            }

            // Register Issue collector after retreiving account details
            window.ATL_JQ_PAGE_PROPS = {
              "triggerFunction": function (showCollectorDialog) {
                jQuery("#myCustomTrigger").click(function (e) {
                  e.preventDefault();
                  showCollectorDialog();
                });
              },
              fieldValues: {
                'fullname': $rootScope.accountDetails.firstName + ' ' + $rootScope.accountDetails.lastName,
                'email': $rootScope.accountDetails.email
              }
            };

            // start connecting websocket after retrieving user information
            scaService.connectWebsocket();       
          }, 
          function () {}
        );

        ///////////////////////////////////////////
        // Cache namespaces
        ///////////////////////////////////////////
        cisService.getAllNamespaces().then(function (response) {
          if(response.length > 0) {
            metadataService.setNamespaces(response);
          }
        });        

        ///////////////////////////////////////////
        // Cache local data
        ///////////////////////////////////////////
        scaService.getProjects(true).then(function (response) {
          metadataService.setProjects(response);
          metadataService.setProjectsLoaded(true);

          // get the user preferences (once logged in status confirmed)
          accountService.getUserPreferences().then(function (preferences) {

            if (preferences && preferences.minNetworkConnection) {
              window.minNetworkConnection = preferences.minNetworkConnection;
            }

            // apply the user preferences
            // NOTE: Missing values or not logged in leads to defaults
            accountService.applyUserPreferences(preferences).then(function (appliedPreferences) {

              // check for modification by application routine
              if (appliedPreferences !== preferences) {
                accountService.saveUserPreferences(appliedPreferences);
              }
            })
          }, function(error) {
            // apply default preferences
            var userPreferences = {};            
            accountService.applyUserPreferences(userPreferences).then(function (appliedPreferences) {
              accountService.saveUserPreferences(appliedPreferences).then(function() {});
            })
          });
        });

        ///////////////////////////////////////////
        // load semantic tags
        ///////////////////////////////////////////
        terminologyServerService.retrieveSemanticTags().then(function (response) {
          if(response.length !== 0) {
            response.sort(function (a, b) {
              return a.localeCompare(b);
            });            
          }
          metadataService.setSemanticTags(response);
        });

        ///////////////////////////////////////////
        // load code systems
        ///////////////////////////////////////////
        terminologyServerService.getAllCodeSystems().then(function (response) {        
          metadataService.setCodeSystems(response.items);
        });

        ///////////////////////////////////////////
        // Binding shortcut
        ///////////////////////////////////////////
        hotkeys.bindTo($rootScope)
          .add({
            combo: 'alt+h',
            description: 'Go to Home - My Tasks',
            callback: function() {$location.url('home');}
          })
          .add({
            combo: 'alt+b',
            description: 'Open TS Browser',
            callback: function() {window.open('/browser', '_blank');}
          })
          .add({
            combo: 'alt+p',
            description: 'Go to Projects',
            callback: function() {$location.url('projects');}
          })
          .add({
            combo: 'alt+w',
            description: 'Go to Review Tasks',
            callback: function() {$location.url('review-tasks');}
          }
        );

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
              window.location = imsUrl + '/settings' + imsUrlParams;
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
}
