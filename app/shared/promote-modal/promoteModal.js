'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('promoteModalCtrl', function ($scope, $modalInstance, flags, isTask, hotkeys) {

    /**
     * The flags reported from promotionService, in array of objects of format
     * { checkTitle, checkWarning, blocksPromotion }
     * If not supplied, indicates checks not performed or fatal error in performing checks
     */
    $scope.flags = flags;
    $scope.isTask = isTask;

    // determine if any fatal errors were detected
    angular.forEach($scope.flags, function(flag) {
      if (flag.blocksPromotion) {
        $scope.blockPromotion = true;
      }
    });
    hotkeys.bindTo($scope)
        .add({
          combo: 'return',
          description: 'Accept',
          callback: function() {$modalInstance.close(true);}
        })

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
