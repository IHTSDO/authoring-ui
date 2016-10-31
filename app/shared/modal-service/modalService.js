'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp').service('modalService', function ($modal, $q) {
  return {
    confirm: function (message) {
      var deferred = $q.defer();
      var modalInstance = $modal.open({
        templateUrl: 'shared/modal-service/modalConfirm.html',
        controller: function ($scope, $modalInstance, message) {
          $scope.message = message;
          $scope.cancel = function () {
            $modalInstance.dismiss();
          };
          $scope.confirm = function () {
            $modalInstance.close();
          };
        },
        resolve: {
          message: function () {
            return message;
          }
        }
      });
      modalInstance.result.then(function () {
        deferred.resolve();
      }, function () {
        deferred.reject();
      });
      return deferred.promise;
    }
  }
});
