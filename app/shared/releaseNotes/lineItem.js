'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('lineItemCtrl', function ($scope, $modalInstance, $timeout, rnmService, branch, lineItem, lineItems, globalLineItems, readOnly, modalService) {

    // scope variables
    $scope.branch = branch;
    $scope.lineItem = lineItem;
    $scope.lineItems = lineItems;
    $scope.globalLineItems = globalLineItems;
    $scope.readOnly = readOnly;
    if(lineItem.content){
        $scope.original = lineItem.content;
    }
    let quill;

    function initialize() {
        $timeout(function () {
            quill = new Quill('#editor', {
                theme: 'snow'
              });
            var converter = new showdown.Converter();
            if($scope.lineItem.content){
                quill.clipboard.dangerouslyPasteHTML(converter.makeHtml($scope.lineItem.content));
                if(readOnly){
                    quill.enable(false);
                }
            };
          }, 100);
        
    }
    
    $scope.save = function () {
        let converter = new showdown.Converter();
        $scope.lineItem.content = converter.makeMarkdown(quill.root.innerHTML);
        if(!$scope.lineItem.id){
            rnmService.createBranchLineItem($scope.branch, $scope.lineItem).then(function (response) {
              $scope.lineItem = response;
              $modalInstance.close();
            });
        }
        else{
            rnmService.updateBranchLineItem($scope.branch, $scope.lineItem).then(function (response) {
              $modalInstance.close();
            });
        }
    }
    
    $scope.delete = function () {
      let msg = 'Are you sure you want to delete this release note?';
            modalService.confirm(msg).then(function () {
                rnmService.deleteBranchLineItem($scope.branch, $scope.lineItem.id).then(function (response) {
                  $modalInstance.close();
                });
            });
        };
    
    $scope.selectLineItem = function (lineItem) {
        delete lineItem.id;
        delete lineItem.content;
        delete lineItem.sourceBranch;
        delete lineItem.promotedBranch;
        delete lineItem.start;
        delete lineItem.end;
        delete lineItem.released;
        $scope.lineItem = lineItem;
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      let converter = new showdown.Converter();
      if($scope.original && $scope.original !== converter.makeMarkdown(quill.root.innerHTML)){
          let msg = 'There are unsaved changes, are you sure you want to quit?';
            modalService.confirm(msg).then(function () {
                $modalInstance.close();
            });
      }
      else{
          $modalInstance.close();
      }
      
      
    };
    initialize();
    
  });
