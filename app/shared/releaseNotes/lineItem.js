'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('lineItemCtrl', function ($scope, $compile, $modalInstance, $timeout, rnmService, branch, lineItem, lineItems, globalLineItems, readOnly, all, modalService) {

    // scope variables
    $scope.branch = branch;
    $scope.lineItem = lineItem;
    $scope.lineItems = lineItems;
    $scope.globalLineItems = globalLineItems;
    $scope.readOnly = readOnly;
    $scope.lineItemContentUnChanged = true;
    $scope.lineItemContentFound = false;
    $scope.new = true;
    $scope.all = all;
    console.log(all);
    console.log($scope.lineItems);
    if(lineItem.content){
        $scope.new = false;
    }
    let quill;

    function checkLineItemContentUnChanged() {
      $timeout(function () {
        var converter = new showdown.Converter();
        $scope.lineItemContentUnChanged = quill.root.innerHTML === '<p><br></p>' || ($scope.original && $scope.original === converter.makeMarkdown(quill.root.innerHTML));
      }, 0);
    }

    function initialize() {

      // Register new string method which will be used in saving release note
        String.prototype.replaceRecursive = function (pattern, what) {
          var newstr = this.replace(pattern, what);
          if (newstr == this)
              return newstr;
          return newstr.replace(pattern, what);
        };

        let toolbarOptions = $scope.readOnly ? false : [
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'link'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['clean']];
        $timeout(function () {
            quill = new Quill('#editor', {
              modules: {
                toolbar: toolbarOptions
              },
              theme: 'snow'
            });
            var converter = new showdown.Converter();
            if($scope.lineItem.content){
                let html = converter.makeHtml($scope.lineItem.content);
                let content = html.endsWith('\n<p><br></p>') ? html + '\n<p><br></p>' : html;
                quill.clipboard.dangerouslyPasteHTML(content);
                $scope.original = converter.makeMarkdown(quill.root.innerHTML);
                
            };
            if($scope.all) {
                let content = '';
                angular.forEach($scope.lineItems, function (item) {
                    content = content + '**' + item.title + ':**\n\n';
                    content = content + item.content + '\n\n<br>';
                });
                quill.clipboard.dangerouslyPasteHTML(converter.makeHtml(content));                
            }
            if(readOnly) {
              quill.enable(false);
            }
            quill.root.addEventListener('keyup', evt => {
              checkLineItemContentUnChanged();
            });
            quill.root.addEventListener('paste', evt => {
              checkLineItemContentUnChanged();
            });
            quill.root.addEventListener('cut', evt => {
              checkLineItemContentUnChanged();
            });
            quill.on('text-change', function(delta, oldDelta, source) {
              checkLineItemContentUnChanged();
            });
          }, 100);
    }

    $scope.save = function () {
        let converter = new showdown.Converter();
        let content = quill.root.innerHTML.replace('<span class="ql-cursor">﻿</span>',''); // Remove cursor        

        // rerverse the whitespace. For example: '<strong> test</strong>' -> ' <strong>test</strong>'
        content = content.replaceRecursive(/\<\w+\>\s+/g, function (wm, m) { return  wm.substring(wm.lastIndexOf('>') + 1) + wm.substring(0, wm.indexOf('>') + 1);});

        // rerverse the whitespace. For example: '<strong>test </strong>' -> '<strong>test</strong> '
        content = content.replaceRecursive(/\s+\<(\/.*?)\>/g, function (wm) {return wm.substring(wm.indexOf('<')) + wm.substring(0, wm.indexOf('<'));});

        $scope.lineItem.content = converter.makeMarkdown(content);
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
