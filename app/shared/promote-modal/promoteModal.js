'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('promoteModalCtrl', function ($scope, $modalInstance, flags) {

    /**
     * The flags reported from promotionService, in array of objects of format
     * { checkTitle, checkWarning, blocksPromotion }
     * If not supplied, indicates checks not performed or fatal error in performing checks
     */
    $scope.flags = flags;


    /////////////////////////////////////////
    // Modal control buttons
    /////////////////////////////////////////

    $scope.promote = function() {
      $modalInstance.close(true);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };
  });
