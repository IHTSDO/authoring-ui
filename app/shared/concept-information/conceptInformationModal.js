'use strict';

angular.module('singleConceptAuthoringApp.conceptInformationModal', [])

  .controller('conceptInformationModalCtrl', function ($scope, $rootScope, $modalInstance, scaService, snowowlService, conceptId, branch, ngTableParams, $filter) {

    $scope.conceptId = conceptId;
    $scope.branch = branch;

    $scope.loadComplete = false;

    // initialize the arrays
    $scope.inboundRelationships = [];

    $scope.tableLimit = 10000;

    $scope.filterCharacteristicTypes = [              
        {
            id: "",
            title: ""
        },
        {
            id: "STATED_RELATIONSHIP",
            title: "Stated"
        },
        {
            id: "INFERRED_RELATIONSHIP",
            title: "Inferred"
        }
    ];

    $scope.filterTypeTerms = [              
        {
            id: "",
            term: ""
        }
    ];

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
            var results = $scope.inboundRelationships;
            if(params.$params.filter.characteristicType) {
              results = results.filter(function (item) {
                return item.characteristicType === params.$params.filter.characteristicType;
              });
            }
            if(params.$params.filter.typeFsn) {
              results = results.filter(function (item) {
                return item.typeFsn.id === params.$params.filter.typeFsn;
              });
            }
            if(params.$params.filter.sourceFsn) {
              results = results.filter(function (item) {
                return item.sourceFsn.term.toLowerCase().indexOf(params.$params.filter.sourceFsn) > -1;
              });
            }
            
            params.total(results.length);
            let inboundRelationshipsDisplayed = params.sorting() ? $filter('orderBy')(results, params.orderBy()) : results;
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

      snowowlService.getConceptRelationshipsInbound($scope.conceptId, $scope.branch, 0, $scope.tableLimit, true).then(function (response) {
        // initialize the arrays
        $scope.inboundRelationships = [];
    
        $scope.inboundRelationshipsTotal = response.total;

        var tempList = [];
        // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
        // make top-level properties
        angular.forEach(response.items, function (item) {
          if (item.active) {
            item.sourceFsn = item.source.fsn;
            item.typeFsn = item.type.fsn;

            if (tempList.indexOf(item.typeFsn.id) === -1) {
              tempList.push(item.typeFsn.id);
              $scope.filterTypeTerms.push({id: item.typeFsn.id, term: item.typeFsn.term});
            }

            // push to inbound relationships
            $scope.inboundRelationships.push(item);            
          }
        });
        tempList = []; // empty temporary list

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
