'use strict';
angular.module('singleConceptAuthoringApp.sidebarEdit', [])

  .controller('sidebarEditCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService', 'snowowlService', 'metadataService',
    function searchPanelCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, notificationService, scaService, snowowlService, metadataService) {

      // on load, switch to Task Detail tab
        if($routeParams.mode === 'batch'){
            $scope.actionTab = 5;
        }
        else{
            $scope.actionTab = 4;
        }
        $scope.hideBatch = metadataService.isTemplatesEnabled();

      $scope.$on('viewTaxonomy', function(event, data) {
        $scope.actionTab = 1;
      });
    }
  ]);