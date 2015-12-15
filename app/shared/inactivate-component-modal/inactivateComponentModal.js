'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('inactivateComponentModalCtrl', function ($scope, $modalInstance, $filter, ngTableParams, snowowlService, componentType, reasons, associationTargets, conceptId, branch, $routeParams, $q) {

    // required arguments
    $scope.componentType = componentType;
    $scope.reasons = reasons;

    // optional arguments (but if conceptId or branch specified, the other must
    // be as well)
    $scope.conceptId = conceptId;
    $scope.branch = branch;
    $scope.associationTargets = associationTargets;

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
    $scope.getConceptsForTypeahead = function (searchStr) {
      return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {
        for (var i = 0; i < response.length; i++) {
          console.debug('checking for duplicates', i, response[i]);
          for (var j = response.length - 1; j > i; j--) {
            if (response[j].concept.conceptId === response[i].concept.conceptId) {
              console.debug(' duplicate ', j, response[j]);
              response.splice(j, 1);
              j--;
            }
          }
        }
        return response;
      });
    };

    $scope.selectReason = function () {

      // NOTE: associationTarget is optional
      if (!$scope.reason) {
        window.alert('You must specify a reason for inactivation');
      } else {

        var associationTarget = {};

        // FORMAT: associationTargets: {MOVED_FROM: ["139569002"]}
        // validate and convert association targets
        for (var i = 0; i < $scope.associations.length; i++) {
          // extract association for convenience
          var association = $scope.associations[i];

          console.debug('processing association', association);

          // if neither type nor concept specified
          if (!association.type && !association.concept) {
            console.debug('blank association, ignoring');
          }

          // if either field is blank, alert and return
          else if (!association.type || !association.concept) {
            window.alert('You must specify both the association type and target');
            return;
          }

          // add the association type/target
          else {

            console.debug('adding association', association, associationTarget.hasOwnProperty(association.type));

            // if this type already specified, add to array
            if (associationTarget.hasOwnProperty(association.type.id)) {
              console.debug('adding to existing array', associationTarget.type);
              associationTarget[association.type.id].push(association.concept.concept.conceptId);
            }

            // otherwise, set this type to a single-element array containing
            // this concept
            else {
              console.debug('inserting new type');
              associationTarget[association.type.id] = [association.concept.concept.conceptId];
            }
          }
        }

        var results = {};
        results.reason = $scope.reason;
        results.associationTarget = associationTarget;
        console.debug('select result', results);

        $modalInstance.close(results);
      }
    };

    $scope.tableLimit = 200;

// on load, retrieve children and descendants if concept specified
    if ($scope.conceptId && $scope.branch) {

      // limit the number of descendants retrieved to prevent overload
      snowowlService.getConceptDescendants($scope.conceptId, $scope.branch, 0, $scope.tableLimit).then(function (response) {
        console.debug('descendants', response);

        $scope.descendants = response;
        $scope.descendantsLoading = false;
        $scope.tableParamsDescendants.reload();

        // convert the term into a top-level attribute for ng-table sorting
        angular.forEach($scope.descendants.items, function (descendant) {
          descendant.sortableName = descendant.fsn.term;
        })
      });
    }

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
        $scope.children = []
        $scope.inboundRelationshipsTotal = response2.total;

        $scope.statedChildFound = false;

        // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
        // make top-level properties
        angular.forEach(response2.inboundRelationships, function (item) {



          console.debug('checking relationship', item.active, item);

          if (item.active) {
            item.sourceFsn = item.source.fsn;
            item.typeFsn = item.type.fsn;

            // push to inbound relationships
            $scope.inboundRelationships.push(item);

            // if a child, and not already added (i.e. prevent STATED/INFERRED
            // duplication), push to children
            if (item.type.id === '116680003' && childrenIds.indexOf(item.source.id) === -1) {
              childrenIds.push(item.source.id);
              $scope.children.push(item);

            } else {
              // check if this is a stated-relationship child
              if (item.characteristicType === 'STATED_RELATIONSHIP') {
                $scope.statedChildFound = true;

                // find the existing item and replace it with the STATED_RELATIONSHIP
                angular.forEach($scope.children, function(childRel) {
                  if (childRel.sourceId === item.sourceId) {
                    childRel = item;
                  }
                });
              }
            }
          }
        });

        $scope.inboundRelationshipsLoading = false;

        $scope.tableParamsChildren.reload();
        $scope.tableParamsInboundRelationships.reload();

        deferred.resolve(true);

      });

      return deferred.promise;
    }

    // get the limited number of inbound relationships for display
    getInboundRelationships($scope.conceptId, $scope.branch, 0, $scope.tableLimit).then(function() {

      // detect case where no stated parent-child relationship was found, but more results may exist
      if ($scope.statedChildFound = false && $scope.inboundRelationships.length === $scope.tableLimit) {
        getInboundRelationships($scope.conceptId, $scope.branch, -1, -1);
      }
    }) ;

// declare table parameters
    $scope.tableParamsChildren = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {sourceFsn: 'asc'},
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
        sorting: {fsn: 'asc'},
        orderBy: 'fsn'
      },
      {
        total: $scope.descendants ? $scope.descendants.items.length : 0, // length
                                                                         // of
        // data
        getData: function ($defer, params) {

          if (!$scope.descendants || $scope.descendants.length === 0) {
            $defer.resolve([]);
          } else {

            params.total($scope.descendants.items.length);
            var descendantsDisplayed = params.sorting() ? $filter('orderBy')($scope.descendants.items, params.orderBy()) : $scope.descendants.items;

            console.debug(descendantsDisplayed);

            $defer.resolve(descendantsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

// declare table parameters
    $scope.tableParamsInboundRelationships = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {sourceFsn: 'asc'},
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

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.addAssociation = function () {
      $scope.associations.push({type: null, concept: null});
    };

    $scope.removeAssociation = function (index) {
      console.debug('removing association at position ' + index);
      $scope.associations.splice(index, 1);
      if ($scope.associations.length === 0) {
        $scope.addAssociation();
      }
    };

    ////////////////////////////////////
    // Initialization
    ////////////////////////////////////

    // selected reason
    $scope.reason = null;

    // construct the associations array and add a blank row
    $scope.associations = [];
    $scope.addAssociation();

    // display flags
    $scope.descendantsLoading = true;
    $scope.inboundRelationshipsLoading = true;

    // flag for whether a stated parent-child relationship exists for this concept (disable inactivation)
    $scope.statedChildFound = false;
  })
;
