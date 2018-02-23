'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('inactivateComponentModalCtrl', function ($rootScope, $scope, $modalInstance, $filter, ngTableParams, snowowlService, componentType, reasons, associationTargets, conceptId, concept, branch, deletion, $routeParams, $q, metadataService) {

    // the selected tab
    $scope.actionTab = 1;

    $scope.descendants = null;

    $scope.filterByInactivationReason = function () {
      return function (item) {
        if ($scope.inactivationReason && $scope.inactivationReason.display.indexOf(item.display) !== -1) {
          return true;
        }
        else {
          return false;
        }
      };
    };

    $scope.updateAssociations = function (inactivationReason) {
      $scope.inactivationReason = inactivationReason;
      $scope.associationTargets = $scope.originalAssocs.filter($scope.filterByInactivationReason());

      if ($scope.associationTargets.length === 0) {
        $scope.associations = [];
      } else {
        if ($scope.associations.length == 0) {
           $scope.addAssociation(0);
        }

        //Association type will be automatically populated if there is only one option
        for (var i = 0; i < $scope.associations.length; i++) {
          // extract association for convenience
          var association = $scope.associations[i];
          association.type = null;
          if($scope.associationTargets.length === 1) {
            association.type = $scope.associationTargets[0];
          }
        }
      }
    };

    // required arguments
    $scope.componentType = componentType;
    $scope.componentType = componentType;
    $scope.deletion = deletion;
    $scope.reasons = reasons;

    // optional arguments (but if conceptId or branch specified, the other must
    // be as well)
    $scope.conceptId = conceptId;
    $scope.concept = concept;
    $scope.branch = branch;
    $scope.associationTargets = associationTargets;
    $scope.originalAssocs = associationTargets;

    // check requirements
    if ($scope.conceptId && !$scope.branch) {
      $scope.error = 'Branch was not specified';
    }
    if ($scope.branch && !$scope.conceptId) {
      $scope.error = 'Concept id was not specified';
    }
    if (!$scope.reasons) {
      $scope.error = 'List of inactivation reasons was not specified';
    }
    $scope.getConceptsForTypeahead = function (searchStr,inactivationIndication) {
      return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {
        var i = 0;
        while (i < response.length) {
          var j = i + 1;
          while (j < response.length){
            if (response[j].concept.conceptId === response[i].concept.conceptId) {
              response.splice(j, 1);
            } else {
              j++;
            }
          }
          i++;
        }

        response = response.filter(function (el) {
          if (inactivationIndication) {
            return el.concept.active === true && $scope.conceptId !== el.concept.conceptId;
          } else {
            return el.concept.active === true;
          }
        });
        return response;
      });
    };

    function addCommas(integer) {
      return (integer + '').replace(/(\d)(?=(\d{3})+$)/g, '$1,');
    }

    $scope.getTypeaheadConcepts = function(searchStr, inactivationIndication) {
      return snowowlService.searchAllConcepts(metadataService.getBranch(), searchStr, null, 0, 50, null, true, true).then(function (response) {
        let descendants = [];

        angular.forEach($scope.descendants.items, function(descendant) {
          descendants.push(descendant.id);
        });

        response.items = response.items.filter(function (el) {
          if (inactivationIndication) {
              !(descendants.includes(el.concept.conceptId));
          }
        });

        let dropdown = $('.dropdown-menu');

        dropdown.children('.dropdown-menu-total').remove();

        if((response.total - response.items.length) > 1) {
          let totalRow = $('<li>along with ' + addCommas(response.total - response.items.length) + ' other results</li>').addClass('dropdown-menu-total');
          dropdown.append(totalRow);
        }

        return response.items;
      });
    };

// declare table parameters
    $scope.tableParamsChildren = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          characteristicType: 'desc',
          sourceFsn: 'asc'
        },
        orderBy: 'sourceFsn'
      },
      {
        total: $scope.children ? $scope.children.length : 0, // length of data
        getData: function ($defer, params) {

          if (!$scope.children || $scope.children.length === 0) {
            $defer.resolve([]);
          } else {

            params.total($scope.children.length);
            var childrenDisplayed = params.sorting() ? $filter('orderBy')($scope.children, params.orderBy()) : $scope.children;

            $defer.resolve(childrenDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

// declare table parameters
    $scope.tableParamsDescendants = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          sortableName: 'asc'
        },
        orderBy: 'sortableName'
      },
      {
        total: $scope.descendants && $scope.descendants && $scope.descendants.items ? $scope.descendants.items.length : 0, // length
        // of
        // data
        getData: function ($defer, params) {

          if (!$scope.descendants || !$scope.descendants || !$scope.descendants.items) {
            $defer.resolve([]);
          } else {
            params.total($scope.descendants.items.length);
            var descendantsDisplayed = params.sorting() ? $filter('orderBy')($scope.descendants.items, params.orderBy()) : $scope.descendants.items;

            $defer.resolve(descendantsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

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
            var inboundRelationshipsDisplayed = params.sorting() ? $filter('orderBy')($scope.inboundRelationships, params.orderBy()) : $scope.inboundRelationships;
            $defer.resolve(inboundRelationshipsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );


     $scope.hasNoConceptTarget = function () {
        for (var i = 0; i < $scope.associations.length; i++) {
          var association = $scope.associations[i];
          if(!association.concept || !association.concept.concept || !association.concept.concept.conceptId
            || !association.type || !association.type.id) {
            return true;
          }
       }
       return false;
     }

    $scope.selectReason = function (reason) {

      // NOTE: associationTarget is optional
      if (!$scope.inactivationReason && !$scope.deletion) {
        window.alert('You must specify a reason for inactivation');
      } else {

        var associationTarget = {};

        // FORMAT: associationTargets: {MOVED_FROM: ["139569002"]}
        // validate and convert association targets
        for (var i = 0; i < $scope.associations.length; i++) {
            console.log($scope.associations);
          // extract association for convenience
          var association = $scope.associations[i];


          // if neither type nor concept specified
          if (!association.concept || !$scope.deletion && !association.type) {
          }

          // if either field is blank, alert and return
//          else if (!association.type || !association.concept) {
//            window.alert('You must specify both the association type and target');
//            return;
//          }

          // add the association type/target
          else {

            if(!association.type || association.type === null){
                association.type = {id: ' '}
            }

            // if this type already specified, add to array
            if (associationTarget.hasOwnProperty(association.type.id)) {
              associationTarget[association.type.id].push(association.concept.concept.conceptId);
            }

            // otherwise, set this type to a single-element array containing
            // this concept
            else if(association.type.id){
              associationTarget[association.type.id] = [association.concept.concept.conceptId];
            }
          }
        }

        var results = {};
        results.reason = $scope.inactivationReason;
        results.associationTarget = associationTarget;
          if($scope.deletion)
          {
              results.deletion = true;
          }

        $modalInstance.close(results);
      }
    };

    $scope.selectDeletion = function (reason) {

      // NOTE: associationTarget is optional
      if (reason.concept) {
        window.alert('You must specify a replacement concept');
      } else {
        var results = {};
        results.deletion = true;
        results.concept = reason.concept;

        $modalInstance.close(results);
      }
    };

    $scope.delete = function () {

        var results = {};
        results.deletion = true;
        $modalInstance.close(results);
    };

    $scope.tableLimit = 200;

// on load, retrieve children and descendants if concept specified
    if ($scope.conceptId && $scope.branch) {

      // limit the number of descendants retrieved to prevent overload
      snowowlService.getConceptDescendants($scope.conceptId, $scope.branch, 0, $scope.tableLimit).then(function (response) {
        $scope.descendants = response;
        $rootScope.descendants = response;
        $scope.descendantsLoading = false;
        $scope.tableParamsDescendants.reload();

        // convert the term into a top-level attribute for ng-table sorting
        angular.forEach($scope.descendants.items, function (descendant) {
          descendant.sortableName = descendant.fsn.term;
        });
      });
    }

    $scope.statedChildFound = false;

    /**
     * Helper function to get and set a page of, or all, inbound relationships
     * @param conceptId
     * @param branch
     * @param startIndex
     * @param maxResults
     */
    function getInboundRelationships(conceptId, branch, startIndex, maxResults) {
      var deferred = $q.defer();

      // get the concept relationships again (all)
      snowowlService.getConceptRelationshipsInbound($scope.conceptId, $scope.branch, 0, $scope.tableLimit).then(function (response2) {

        $scope.inboundRelationshipsLoading = true;

        // temporary array for preventing duplicate children
        var childrenIds = [];

        // initialize the arrays
        $scope.inboundRelationships = [];
        $scope.children = [];
        $scope.inboundRelationshipsTotal = response2.total;

        // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
        // make top-level properties
        angular.forEach(response2.items, function (item) {

          if (item.active) {
            item.sourceFsn = item.source.fsn;
            item.typeFsn = item.type.fsn;

            // push to inbound relationships
            $scope.inboundRelationships.push(item);

            // if a child, and not already added (i.e. prevent STATED/INFERRED
            // duplication), push to children
            if (item.type.id === '116680003') {
              // if already added and this relationship is STATED, replace
              if (childrenIds.indexOf(item.source.id) !== -1 && item.characteristicType === 'STATED_RELATIONSHIP') {
                for (var i = 0; i < $scope.children.length; i++) {
                  if ($scope.children[i].source.id === item.source.id) {
                    $scope.children[i] = item;
                  }
                }
              }
              // otherwise if not already present, simply push
              else if (childrenIds.indexOf(item.source.id) === -1) {
                childrenIds.push(item.source.id);
                $scope.children.push(item);
              }

            }
          }
        });
        $rootScope.children = $scope.children;

        $scope.inboundRelationshipsLoading = false;

        $scope.tableParamsChildren.reload();
        $scope.tableParamsInboundRelationships.reload();

        deferred.resolve();

      });

      return deferred.promise;
    }

    // check for existence of stated IsA relationships
    $scope.statedChildrenFound = null;
    function checkStatedChildren() {
      $scope.statedChildrenFound = false;
      angular.forEach($scope.children, function (item) {
        if (item.characteristicType === 'STATED_RELATIONSHIP') {
          $scope.statedChildrenFound = true;
        }
      });
    }

    // get the limited number of inbound relationships for display
    if ($scope.componentType === 'Concept') {
      getInboundRelationships($scope.conceptId, $scope.branch, 0, $scope.tableLimit).then(function (hasStatedChildren) {

        checkStatedChildren();

        // detect case where no stated parent-child relationship was found, but
        // more results may exist
        if ($scope.statedChildrenFound === false && $scope.inboundRelationships.length === $scope.tableLimit) {

          getInboundRelationships($scope.conceptId, $scope.branch, -1, -1).then(function () {
            checkStatedChildren();
          });
        }
      });
    }


    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.addAssociation = function (index) {
      if(typeof index !== 'undefined'
        && $scope.inactivationReason) {
        $scope.associations.push({type: $scope.associationTargets[0], concept: null});
      } else {
        $scope.associations.push({type: null, concept: null});
      }
    };

    $scope.removeAssociation = function (index) {
      $scope.associations.splice(index, 1);
      if ($scope.associations.length === 0) {
        $scope.addAssociation(0);
      }
    };

    ////////////////////////////////////
    // Initialization
    ////////////////////////////////////

    // selected reason
    $scope.inactivationReason = null;

    // construct the associations array and add a blank row
    $scope.associations = [];
    $scope.addAssociation();

    // display flags
    $scope.descendantsLoading = true;
    $scope.inboundRelationshipsLoading = true;

    // flag for whether a stated parent-child relationship exists for this
    // concept (disable inactivation)
    $scope.statedChildFound = false;
  })
;
