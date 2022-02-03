'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('lineItemCtrl', function ($scope, $modalInstance, $timeout, aagService, branch, lineItem, lineItems) {

    // scope variables
    $scope.branch = branch;
    $scope.lineItem = lineItem;
    $scope.lineItems = lineItems;

    function initialize() {
        $timeout(function () {
            var quill = new Quill('#editor', {
                theme: 'snow'
              });
            if(lineItem.content){
                quill.setText(lineItem.content);
            };
          }, 100);
        
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };
    initialize();
    
  });
