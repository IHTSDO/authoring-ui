'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('inactivateComponentModalCtrl', function ($scope, $modalInstance, $filter, ngTableParams, snowowlService, componentType, reasons, associationTargets, conceptId, branch, $routeParams) {

    // required arguments
    $scope.componentType = componentType;
    $scope.reasons = reasons;

    // optional arguments (but if conceptId or branch specified, the other must
    // be as well)
    $scope.conceptId = conceptId;
    $scope.branch = branch;
    $scope.associationTargets = associationTargets;
    $scope.associationTargetObject = {};

    // loading flags
    $scope.descendantsLoading = true;
    $scope.inboundRelationshipsLoading = true;

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

    $scope.setInactivationTargetConcept = function () {
      $scope.associationTargetObject[$scope.associationType.id] = [$scope.associationTargetSelected.concept.conceptId];
      console.log($scope.associationTargetObject);
    };

    $scope.selectReason = function (reason, associationTarget) {

      // NOTE: associationTarget is optional
      if (!reason) {
        window.alert('You must specify a reason for inactivation');
      } else {
        console.log($scope.associationTargetObject);
        var results = {};
        results.reason = reason;
        results.associationTarget = $scope.associationTargetObject;
        $modalInstance.close(results);
      }
    };

    // on load, retrieve children and descendants if concept specified
    if ($scope.conceptId && $scope.branch) {

      // limit the number of descendants retrieved to prevent overload
      snowowlService.getConceptDescendants($scope.conceptId, $scope.branch, 0, 200).then(function (response) {
        console.debug('descendants', response);

        $scope.descendants = response;
        $scope.descendantsLoading = false;
        $scope.tableParamsDescendants.reload();
      });
    }

    // get a single inbound relationship to get total number of relationships
    snowowlService.getConceptRelationshipsInbound($scope.conceptId, $scope.branch, 0, 1).then(function (response) {
      console.debug('inbound', response);

      // get the concept relationships again (all)
      snowowlService.getConceptRelationshipsInbound($scope.conceptId, $scope.branch, 0, response.total).then(function (response2) {

        var childrenIds = [];
        $scope.children = [];

        // set the inbound relationships
        $scope.inboundRelationships = response2.inboundRelationships;

        // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
        // make top-level properties
        angular.forEach($scope.inboundRelationships, function (item) {
          item.sourceFsn = item.source.fsn;
          item.typeFsn = item.type.fsn;

          // if a child, and not already added (i.e. prevent STATED/INFERRED
          // duplication), push to children
          if (item.type.id === '116680003' && childrenIds.indexOf(item.source.id) === -1) {
            childrenIds.push(item.source.id);
            $scope.children.push(item);
          }
        });

        $scope.inboundRelationshipsLoading = false;

        $scope.tableParamsChildren.reload();
        $scope.tableParamsInboundRelationships.reload();

      });

    });

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
        total: $scope.descendants ? $scope.descendants.items.length : 0, // length of
                                                                   // data
        getData: function ($defer, params) {

          if (!$scope.descendants || $scope.descendants.length === 0) {
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

  });
