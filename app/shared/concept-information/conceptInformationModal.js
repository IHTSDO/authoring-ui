'use strict';

angular.module('singleConceptAuthoringApp.conceptInformationModal', [])

  .controller('conceptInformationModalCtrl', function ($scope, $rootScope, $modalInstance, scaService, snowowlService, conceptId, branch) {

    $scope.conceptId = conceptId;
    $scope.branch = branch;
    console.debug('concept information entered', $scope.conceptId, $scope.branch);

    $scope.loadComplete = false;

    function initialize() {
      // get full concept if not retrieved
      snowowlService.getFullConcept($scope.conceptId, $scope.branch).then(function (concept) {
        $scope.fullConcept = concept;
        if ($scope.fullConcept && $scope.children && $scope.parents) {
          $scope.loadComplete = true;
        }
      });

      // get children if not retrieved
      snowowlService.getConceptChildren($scope.conceptId, $scope.branch).then(function (children) {
        $scope.children = children;
        if ($scope.fullConcept && $scope.children && $scope.parents) {
          $scope.loadComplete = true;
        }
      });

      snowowlService.getConceptParents($scope.conceptId, $scope.branch).then(function (parents) {
        $scope.parents = parents;
        if ($scope.fullConcept && $scope.children && $scope.parents) {
          $scope.loadComplete = true;
        }
      });
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    $scope.loadConcept = function(conceptId) {
      $scope.loadComplete = false;
      initialize();
    };

    initialize();

  });
