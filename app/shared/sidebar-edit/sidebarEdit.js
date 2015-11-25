'use strict';
angular.module('singleConceptAuthoringApp.sidebarEdit', [])

  .controller('sidebarEditCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService', 'snowowlService',
    function searchPanelCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, notificationService, scaService, snowowlService) {

      // on load, switch to Task Detail tab
      $scope.actionTab = 4;

      $scope.$on('viewTaxonomy', function(event, data) {
        $scope.actionTab = 1;
      });
    }
  ]);