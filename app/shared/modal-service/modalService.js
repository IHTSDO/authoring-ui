'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp').service('modalService', function ($modal, $q, hotkeys) {
  return {
    confirm: function (message, style) {
      var deferred = $q.defer();
      var modalInstance = $modal.open({
        templateUrl: 'shared/modal-service/modalConfirm.html',
        controller: function ($scope, $modalInstance, message, style) {
          $scope.message = message;
          $scope.style = style;
          hotkeys.bindTo($scope)
            .add({
              combo: 'return',
              description: 'Accept',
              callback: function() {console.log('confirm'); $modalInstance.close();}
            })
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
          },
          style: function () {
            return style;
          }
        }
      });
      modalInstance.result.then(function () {
        deferred.resolve();
      }, function () {
        deferred.reject();
      });
      return deferred.promise;
    },
    message: function (title, message, messageList) {
      var deferred = $q.defer();
      var modalInstance = $modal.open({
        templateUrl: 'shared/modal-service/modalMessage.html',
        controller: function ($scope, $modalInstance, title, message, messageList) {
          $scope.title = title;
          $scope.message = message;
          $scope.messageList = messageList;
          $scope.cancel = function () {
            $modalInstance.dismiss();
          };
          $scope.confirm = function () {
            $modalInstance.close();
          };
        },
        resolve: {
          title: function() {
            return title;
          },
          message: function () {
            return message;
          },
          messageList : function() {
            return messageList;
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
