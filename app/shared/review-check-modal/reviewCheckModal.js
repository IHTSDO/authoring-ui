'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('reviewCheckModalCtrl', function ($rootScope, $scope, $modalInstance, $filter, ngTableParams, reviewChecks) {

    $scope.reviewChecks = reviewChecks;

    // template ng-table
    // declare table parameters
    $scope.unsavedConceptsTableParams = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {fsn: 'asc'}
      },
      {
        filterDelay: 50,
        total: $scope.reviewChecks && $scope.reviewChecks.unsavedConcepts ? $scope.reviewChecks.unsavedConcepts.length : 0, // length of data
        getData: function ($defer, params) {

          if ($scope.reviewChecks && $scope.reviewChecks.unsavedConcepts) {
            var data = params.sorting() ? $filter('orderBy')($scope.reviewChecks.unsavedConcepts, params.orderBy()) : $scope.reviewChecks.unsavedConcepts;
            $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          } else {
            $defer.resolve([]);
          }
        }
      }
    );

    $scope.addToEditPanel = function (concept) {

      $rootScope.$broadcast('editConcept', {conceptId: concept.conceptId});

    };

    $scope.cancelSubmitForReview = function () {
      $modalInstance.dismiss();
    };

    $scope.submitAnyway = function () {
      $modalInstance.close();
    };

  });
