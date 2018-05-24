'use strict';

angular.module('singleConceptAuthoringApp.conceptInformationModal', [])

  .controller('conceptInformationModalCtrl', function ($scope, $rootScope, $modalInstance, scaService, snowowlService, conceptId, branch, ngTableParams, $filter, $q) {

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

    // declare table parameters
    $scope.assocsConceptTableParams = new ngTableParams({
        page: 1,
        count: 10
      },
      {
        // initial display text, overwritten in getData
        total: '-',
        getData: function ($defer, params) {
          var data = $scope.affectedConceptAssocs ? $scope.affectedConceptAssocs : [];
          params.total(data.length);
          data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
          $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
        }
      }
    );

    // declare table parameters
    $scope.assocsDescToConceptTableParams = new ngTableParams({
        page: 1,
        count: 10
      },
      {
        // initial display text, overwritten in getData
        total: '-',
        getData: function ($defer, params) {
          var data = $scope.affectedDescToConceptAssocs ? $scope.affectedDescToConceptAssocs : [];
          params.total(data.length);
          data = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
          $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
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
      
      getRelationshipsInbound();

      getAffectedAssociations();     
    }
    
    function getRelationshipsInbound() {
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

    function getAffectedAssociations() {    
      snowowlService.getMembersByTargetComponent($scope.conceptId, $scope.branch).then(function (response) {
        $scope.affectedConceptAssocs = [];
        $scope.affectedDescToConceptAssocs = [];      
        $scope.affectedOtherAssocs = [];

        if (response.items && response.items.length > 0) {
          parseAssocs(response.items).then(function (parsedAssocs) {                  
            $scope.affectedConceptAssocs = parsedAssocs.concepts;
            $scope.affectedDescToConceptAssocs = parsedAssocs.descriptionsWithConceptTarget;                  
            $scope.affectedOtherAssocs = parsedAssocs.other;

            reloadTables();
          });       
        }
      });     
    }

    function parseAssocs(list) {     
      var deferred = $q.defer();

      var parsedComponents = {
        concepts: [],
        descriptionsWithConceptTarget: [],        
        other: []
      };    

      for (var i = list.length - 1; i >= 0; i--) {
        var association = list[i];
        if(association.active === false) {         
          parsedComponents.other.push(association.referencedComponent);
          if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length  + parsedComponents.other.length === list.length) {
            deferred.resolve(parsedComponents);
          }
        }
        // check if referenced concept
        else if (snowowlService.isConceptId(association.referencedComponent.id)) {
          snowowlService.getFullConcept(association.referencedComponent.id, $scope.branch).then(function (concept) {
            var item = concept;          
            if (parsedComponents.concepts.map(function (c) {
                return c.conceptId
              }).indexOf(item.conceptId) === -1) {
              parsedComponents.concepts.push(item);
            }
           
            if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length  + parsedComponents.other.length === list.length) {
              deferred.resolve(parsedComponents);
            }
          });
        }
        // check if referenced description
        else if (snowowlService.isDescriptionId(association.referencedComponent.id)) {         
          parsedComponents.descriptionsWithConceptTarget.push(association.referencedComponent);
          if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length  + parsedComponents.other.length === list.length) {
            deferred.resolve(parsedComponents);
          }      
        }
        // add to other (dump)  list
        else {         
          parsedComponents.other.push(association.referencedComponent);
          if (parsedComponents.concepts.length + parsedComponents.descriptionsWithConceptTarget.length  + parsedComponents.other.length === list.length) {
            deferred.resolve(parsedComponents);
          }
        }
      }      
      
      return deferred.promise;
    }

    function reloadTables () {     
      $scope.assocsConceptTableParams.reload();
      $scope.assocsDescToConceptTableParams.reload();      
    };

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    $scope.convertToTextFromCode = function (code) {
      if(!code) {
        return '';
      }

      var text = code.replace(/_/g, " ");
      text = text.toLowerCase();
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    $scope.loadConcept = function(conceptId) {
      $scope.fullConcept = null;
      $scope.inboundRelationships = null;
      $scope.conceptId = conceptId;
      $scope.loadComplete = false;
      initialize();
    };

    initialize();

  });
