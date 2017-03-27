'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('saveModalCtrl', function ($scope, $rootScope, $modalInstance, concepts) {

    /**
     * The flags reported from promotionService, in array of objects of format
     * { checkTitle, checkWarning, blocksPromotion }
     * If not supplied, indicates checks not performed or fatal error in performing checks
     */
    $scope.saving = 1;
    $scope.saved = 0;
    $scope.warning = 0;
    $scope.errors = 0;
    $scope.complete = false;
    $scope.total = concepts.length;
    console.log(concepts);

    $rootScope.$on('batchEditing.conceptSaved', function () {
            $scope.saving++;
            $scope.saved++;
          });
    $rootScope.$on('batchEditing.conceptSavedWithWarnings', function () {
            $scope.saving++;
            $scope.warning++;
          });
    $rootScope.$on('batchEditing.conceptSavedWithErrors', function () {
            $scope.saving++;
            $scope.errors++;
          });
    $rootScope.$on('batchEditing.batchSaveComplete', function () {
            $scope.complete = true;
          });
    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
