'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('saveModalCtrl', function ($scope, $rootScope, $modalInstance, concepts) {

    /**
     * The flags reported from promotionService, in array of objects of format
     * { checkTitle, checkWarning, blocksPromotion }
     * If not supplied, indicates checks not performed or fatal error in performing checks
     */
    $scope.saved = 0;
    $scope.warning = 0;
    $scope.errors = 0;
    $scope.complete = false;
    $scope.total = concepts.length;   

    $rootScope.$on('batchEditing.conceptSaved', function () {
            $scope.saved++;
            $scope.complete = ($scope.errors + $scope.warning + $scope.saved) === $scope.total;
          });
    $rootScope.$on('batchEditing.conceptSavedWithWarnings', function () {
            $scope.warning++;
            $scope.complete = ($scope.errors + $scope.warning + $scope.saved) === $scope.total;
          });
    $rootScope.$on('batchEditing.conceptSavedWithErrors', function () {
            $scope.errors++;
            $scope.complete = ($scope.errors + $scope.warning + $scope.saved) === $scope.total;
          });
    $rootScope.$on('batchEditing.batchSaveComplete', function () {
            $scope.complete = ($scope.errors + $scope.warning + $scope.saved) === $scope.total;
          });
    $rootScope.$on('batchEditing.batchSaveConceptsComplete', function (event, data) {
            $scope.saved += data.numberSavedConcepts;
            $scope.complete = ($scope.errors + $scope.warning + $scope.saved) === $scope.total;
          }); 

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
