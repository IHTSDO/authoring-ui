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
    $scope.childrenLoading = true;
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

      snowowlService.getConceptDescendants($scope.conceptId, $scope.branch).then(function (response) {
        $scope.descendants = response;
        $scope.descendantsLoading = false;
        $scope.tableParamsDescendants.reload();
      }, function (error) {
        $scope.descendantsError = 'Error retrieving descendants';
      });

      snowowlService.getConceptChildren($scope.conceptId, $scope.branch).then(function (response) {
        $scope.children = response;
        $scope.childrenLoading = false;
        $scope.tableParamsChildren.reload();
      }, function (error) {
        $scope.childrenError = 'Error retrieving children';
      });

      snowowlService.getConceptRelationshipsInbound($scope.conceptId, $scope.branch).then(function (response) {
        console.debug('inbound', response);
        $scope.inboundRelationships = response;
        $scope.inboundRelationshipsLoading = false;
        $scope.tableParamsInboundRelationships.reload();
      }, function (error) {
        $scope.inboundRelationshipsError = 'Error retrieving children';
      });
    }
    $scope.conceptFsns = {};
    $scope.getConceptFsn = function(conceptId) {
      if ($scope.conceptFsns.hasOwnProperty(conceptId)) {
        return $scope.conceptFsns[conceptId];
      } else {
        $scope.conceptFsns[conceptId] = null;
        snowowlService.getFullConcept(conceptId, $scope.branch).then(function(response) {
          $scope.conceptFsns[conceptId] = response.fsn;
          console.debug($scope.conceptFsns);
        });
      }
    };

    // declare table parameters
    $scope.tableParamsChildren = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {fsn: 'asc'}
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
        sorting: {fsn: 'asc'}
      },
      {
        total: $scope.descendants ? $scope.descendants.length : 0, // length of
                                                                   // data
        getData: function ($defer, params) {

          if (!$scope.descendants || $scope.descendants.total === 0) {
            $defer.resolve([]);
          }

          // check if more need to be loaded
          else if (params.page() !== 1 && $scope.descendants.items.length < (params.page() * params.count())) {

            console.debug('getting next set of results');

            $scope.descendantsLoading = true;

            // NOTE: offset is set to current length, limit is set to end of requested page + 40 more (minimum 5 page load, always loads to current requested page
            snowowlService.getConceptDescendants($scope.conceptId, $scope.branch, $scope.descendants.items.length, (params.page() * params.count() + 40 - $scope.descendants.items.length)).then(function (response) {

              $scope.descendantsLoading = false;

              $scope.descendants.items = $scope.descendants.items.concat(response.items);

              params.total($scope.descendants.total);
              var descendantsDisplayed = params.sorting() ? $filter('orderBy')($scope.descendants.items, params.orderBy()) : $scope.descendants.items;

              $defer.resolve(descendantsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }, function (error) {
              $scope.descendantsError = 'Error retrieving descendants' + error;
            });

          }

          // otherwise simply get the page
          else {

            params.total($scope.descendants.total);
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
        sorting: {characteristicType: 'desc', typeId: 'asc'}
      },
      {
        total: $scope.inboundRelationships ? $scope.inboundRelationships.length : 0, // length of
                                                                   // data
        getData: function ($defer, params) {

          if (!$scope.inboundRelationships || $scope.inboundRelationships.total === 0) {
            $defer.resolve([]);
          }

          // check if more need to be loaded
          else if (params.page() !== 1 && $scope.inboundRelationships.inboundRelationships.length < (params.page() * params.count())) {

            console.debug('getting next set of results');

            $scope.inboundRelationshipsLoading = true;

            // NOTE: offset is set to current length, limit is set to end of requested page + 40 more (minimum 5 page load, always loads to current requested page
            snowowlService.getConceptRelationshipsInbound($scope.conceptId, $scope.branch, $scope.inboundRelationships.inboundRelationships.length, (params.page() * params.count() + 40 - $scope.inboundRelationships.inboundRelationships.length)).then(function (response) {

              $scope.inboundRelationshipsLoading = false;

              $scope.inboundRelationships.inboundRelationships = $scope.inboundRelationships.inboundRelationships.concat(response.inboundRelationships);

              params.total($scope.inboundRelationships.total);
              var inboundRelationshipsDisplayed = params.sorting() ? $filter('orderBy')($scope.inboundRelationships.inboundRelationships, params.orderBy()) : $scope.inboundRelationships.inboundRelationships;

              $defer.resolve(inboundRelationshipsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }, function (error) {
              $scope.inboundRelationshipsError = 'Error retrieving inboundRelationships' + error;
            });

          }

          // otherwise simply get the page
          else {

            params.total($scope.inboundRelationships.total);
            var inboundRelationshipsDisplayed = params.sorting() ? $filter('orderBy')($scope.inboundRelationships.inboundRelationships, params.orderBy()) : $scope.inboundRelationships.inboundRelationships;

            $defer.resolve(inboundRelationshipsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

  });
