'use strict';

angular.module('singleConceptAuthoringApp.conceptInformationModal', [])

  .controller('conceptInformationModalCtrl', function ($scope, $rootScope, $modalInstance, scaService, snowowlService, conceptId, branch, ngTableParams, $filter) {

    $scope.conceptId = conceptId;
    $scope.branch = branch;

    $scope.loadComplete = false;

    // initialize the arrays
    $scope.inboundRelationships = [];

    $scope.tableLimit = 1000;

    // declare table parameters
    $scope.tableParamsInboundRelationships = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          characteristicType: 'desc',
          sourceFsn: 'asc'
        },
        orderBy: 'sourceFsn'
      },
      {
        total: $scope.inboundRelationships ? $scope.inboundRelationships.length : 0, // length of
        // data
        getData: function ($defer, params) {

          if (!$scope.inboundRelationships || $scope.inboundRelationships.length === 0) {
            $defer.resolve([]);
          } else {

            params.total($scope.inboundRelationships.length);
            let inboundRelationshipsDisplayed = params.sorting() ? $filter('orderBy')($scope.inboundRelationships, params.orderBy()) : $scope.inboundRelationships;
            $defer.resolve(inboundRelationshipsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    function initialize() {
      // get full concept if not retrieved
      snowowlService.getFullConcept($scope.conceptId, $scope.branch).then(function (concept) {
        $scope.fullConcept = concept;
        if ($scope.fullConcept && $scope.children && $scope.parents && $scope.inboundRelationships) {
          $scope.loadComplete = true;
        }
      });

      // get children if not retrieved
      snowowlService.getConceptChildren($scope.conceptId, $scope.branch).then(function (children) {
        $scope.children = children;
        if ($scope.fullConcept && $scope.children && $scope.parents && $scope.inboundRelationships) {
          $scope.loadComplete = true;
        }
      });

      snowowlService.getConceptParents($scope.conceptId, $scope.branch).then(function (parents) {
        $scope.parents = parents;
        if ($scope.fullConcept && $scope.children && $scope.parents && $scope.inboundRelationships) {
          $scope.loadComplete = true;
        }
      });

      snowowlService.getConceptRelationshipsInbound($scope.conceptId, $scope.branch, 0, $scope.tableLimit).then(function (response) {
        // initialize the arrays
        $scope.inboundRelationships = [];
    
        $scope.inboundRelationshipsTotal = response.total;

        // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
        // make top-level properties
        angular.forEach(response.items, function (item) {
          if (item.active) {
            item.sourceFsn = item.source.fsn;
            item.typeFsn = item.type.fsn;

            // push to inbound relationships
            $scope.inboundRelationships.push(item);            
          }
        });
        $scope.tableParamsInboundRelationships.reload();

        if ($scope.fullConcept && $scope.children && $scope.parents && $scope.inboundRelationships) {
          $scope.loadComplete = true;
        }
      });
    }
    
    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    $scope.loadConcept = function(conceptId) {
      $scope.fullConcept = null;
      $scope.inboundRelationships = null;
      $scope.conceptId = conceptId;
      $scope.loadComplete = false;
      initialize();
    };

    initialize();

  });
