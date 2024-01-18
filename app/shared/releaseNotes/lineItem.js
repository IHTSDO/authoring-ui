'use strict';

angular.module('singleConceptAuthoringApp')
  .directive('positiveNumber', function () {
    /* Allows the user to enter only positive numbers
    *  Don't allow even decimal values
    */
    return {
      require: 'ngModel',
      restrict: 'A',
      link: function (scope, element, attr, ctrl) {
        function inputValue(val) {
          if (val) {
            var digits = val.replace(/[^0-9]/g, '');

            if (digits !== val) {
              ctrl.$setViewValue(digits);
              ctrl.$render();
            }
            return parseInt(digits,10);
          }
          return undefined;
        }            
        ctrl.$parsers.push(inputValue);
      }
    };
  })
  .controller('lineItemCtrl', function ($scope, $rootScope, $modalInstance, $timeout, rnmService, branch, lineItem, lineItems, globalLineItems, mode, isProject, modalService, metadataService) {
    // NEW, EDIT, READ_ONLY
    var mode = mode;

    // scope variables
    $scope.branch = branch;
    $scope.lineItem = lineItem;
    $scope.lineItems = lineItems;
    $scope.globalLineItems = globalLineItems;

    $scope.lineItemContentUnChanged = true;

    $scope.readOnly = mode === 'READ_ONLY';
    $scope.new = mode === 'NEW';
    $scope.edit = mode === 'EDIT';
    $scope.isProject = isProject;

    var changeTypeOptions = ['New Concept','Model Change', 'Description Change', 'Inactivation'];
    if ($scope.readOnly) {
      changeTypeOptions.push('Re-model');
    }
    $scope.changeTypeOptions = changeTypeOptions.sort(function (a, b) { return a.localeCompare(b);});
    $scope.hierarchyOptions = metadataService.getSemanticTags();

    var originalLineItem = {};
    let quill;

    $scope.checkLineItemContentUnChanged = function() {
      $timeout(function () {
        var converter = new showdown.Converter();
        $scope.lineItemContentUnChanged = ((!$scope.original && quill.root.innerHTML === '<p><br></p>') || compareLineItemProperties($scope.original, converter.makeMarkdown(quill.root.innerHTML)))
                  && compareLineItemProperties(originalLineItem.changeType, $scope.lineItem.changeType)
                  && compareLineItemProperties(originalLineItem.additionalChangeTypes, $scope.lineItem.additionalChangeTypes)
                  && compareLineItemProperties(originalLineItem.hierarchy, $scope.lineItem.hierarchy)
                  && compareLineItemProperties(originalLineItem.changedInAdditionalHierarchy, $scope.lineItem.changedInAdditionalHierarchy)
                  && compareLineItemProperties(originalLineItem.numberEditedConcepts, $scope.lineItem.numberEditedConcepts)
                  && compareLineItemProperties(originalLineItem.futureChangesPlanned, $scope.lineItem.futureChangesPlanned)
                  && compareLineItemProperties(originalLineItem.linkContentTracker, $scope.lineItem.linkContentTracker)
                  && compareLineItemProperties(originalLineItem.conceptInactivations, $scope.lineItem.conceptInactivations)
                  && compareLineItemProperties(originalLineItem.linkBriefingNote, $scope.lineItem.linkBriefingNote)
                  && compareLineItemProperties(originalLineItem.linkToTemplate, $scope.lineItem.linkToTemplate)
                  && compareLineItemProperties(originalLineItem.descriptionChanges, $scope.lineItem.descriptionChanges);
      }, 0);
    }

    function compareLineItemProperties(first, second) {
      if (!first && !second) {
        return true;
      } else {
        return first === second;
      }
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
            if(($scope.readOnly || $scope.edit)  && $scope.lineItem.id){
                let html = converter.makeHtml($scope.isProject ? $scope.lineItem.content : $scope.lineItem.notes);
                let content = html.endsWith('\n<p><br></p>') ? html + '\n<p><br></p>' : html;
                quill.clipboard.dangerouslyPasteHTML(content);
                $scope.original = converter.makeMarkdown(quill.root.innerHTML);
                originalLineItem = angular.copy($scope.lineItem);
            } else if(!$scope.new && $scope.lineItems.length !== 0) {
                let content = '';
                angular.forEach($scope.lineItems, function (item) {
                  content = content + '**' + item.title + ':**\n\n';
                  content = content + item.content + '<br><br>';
                });
                quill.clipboard.dangerouslyPasteHTML(converter.makeHtml(content.replace(/\n\n\n\n/g, '<br><br>')));
            }
            if($scope.readOnly) {
              quill.enable(false);
            }
            quill.root.addEventListener('keyup', evt => {
              $scope.checkLineItemContentUnChanged();
            });
            quill.root.addEventListener('paste', evt => {
              $scope.checkLineItemContentUnChanged();
            });
            quill.root.addEventListener('cut', evt => {
              $scope.checkLineItemContentUnChanged();
            });
            quill.on('text-change', function(delta, oldDelta, source) {
              $scope.checkLineItemContentUnChanged();
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
        
        // Strip new html new line if any
        if (content.endsWith('<p><br></p>')) {
          content = content.replace(new RegExp('<p><br></p>$'), '');;
        }
        content = converter.makeMarkdown(content);

        // Strip new text new line if any
        if (content.endsWith('\n\n')) {
          content = content.replace(new RegExp('\n\n$'), '');;
        }
        if ($scope.isProject && $scope.edit) {
          $scope.lineItem.content = content;
        } else {
          $scope.lineItem.notes = content;
          $scope.lineItem.content = null;
        }

        if(!$scope.lineItem.id){
            rnmService.createBranchLineItem($scope.branch, $scope.lineItem).then(function (response) {
              if ($scope.isProject) {
                response.content = $scope.branch + ' - ' + $rootScope.accountDetails.firstName + ' ' + $rootScope.accountDetails.lastName + '\n\n' + response.content;
                rnmService.updateBranchLineItem($scope.branch, response).then(function (lineItem){
                  $scope.lineItem = lineItem;
                  $modalInstance.close();
                });
              } else {
                $scope.lineItem = response;
                $modalInstance.close();
              }
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
        delete lineItem.changeType;
        delete lineItem.additionalChangeTypes;
        delete lineItem.hierarchy;
        delete lineItem.changedInAdditionalHierarchy;
        delete lineItem.numberEditedConcepts;
        delete lineItem.futureChangesPlanned;
        delete lineItem.linkContentTracker;
        delete lineItem.conceptInactivations;
        delete lineItem.linkBriefingNote;
        delete lineItem.linkToTemplate;
        delete lineItem.descriptionChanges;
        delete lineItem.notes;

        $scope.lineItem = lineItem;
    }

    // closes the modal instance (if applicable)
    $scope.close = function () {
      if($scope.original && !$scope.lineItemContentUnChanged){
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
