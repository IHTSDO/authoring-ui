'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.about', [
    //insert dependencies here
    'ngRoute',
    'ngTable'
  ])

  .config(function config($routeProvider) {
    $routeProvider
      .when('/about', {
        controller: 'AboutCtrl',
        templateUrl: 'components/about/about.html'
      });
  })

  .controller('AboutCtrl', function AboutCtrl($scope, $rootScope, $timeout, ngTableParams, $filter, $modal, $location, scaService, snowowlService, notificationService, metadataService) {
    function initialize() {
      // do nothing
    }

    initialize();
  })
;

