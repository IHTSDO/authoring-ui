'use strict';
angular.module('singleConceptAuthoringApp.searchPanel', [])

  .controller('searchPanelCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'metadataService', 'notificationService', 'scaService', 'snowowlService', 'templateService', 'batchEditingService', 'modalService',
    function searchPanelCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, metadataService, notificationService, scaService, snowowlService, templateService, batchEditingService, modalService) {

      // controller $scope.options
      $scope.branch = metadataService.getBranch();
      $scope.resultsPage = 1;
      $scope.resultsSize = 100;
      $scope.loadPerformed = false;
      $scope.loadMoreEnabled = false;
      $scope.searchStr = '';

      // the displayed results
      $scope.results = [];

      // the stored results
      $scope.storedResults = [];

      // user controls
      $scope.userOptions = {
        groupByConcept: true,
        searchType: 1
      };

      // on load, get templates
      if(!metadataService.isTemplatesEnabled()){
          templateService.getTemplates().then(function (response) {
              for(var i = response.length -1; i <= 0; i--){
                console.log(response[i]);
                  console.log(response[i].additionalSlots.length);
                  if(response[i].additionalSlots.length > 0)
                      {
                          response.splice(i, 1);
                      }
              };
            $scope.templates = response;
          });
      }
        
      else{$scope.templates = null}

      $scope.templateOptions = {

        selectedTemplate: null,
        selectedSlot: null,
        availableSlots: null
      };
      $scope.updateTemplateOptions = function (slot) {
        console.debug('updating template options', $scope.templateOptions);
        if ($scope.searchStr) {
          $scope.search();
        }
      };

      $scope.updateTemplateOptions = function () {

        console.debug('before update template options', $scope.templateOptions);

        if ($scope.templateOptions.selectedTemplate) {
          $scope.templateOptions.availableSlots = $scope.templateOptions.selectedTemplate.conceptOutline.relationships.filter(function (r) {
            return r.targetSlot && r.targetSlot.slotName;
          }).map(function (r) {
            return r.targetSlot;
          });

          if (!$scope.templateOptions.selectedSlot ||
            $scope.templateOptions.availableSlots.indexOf($scope.templateOptions.selectedSlot) === -1) {
            $scope.templateOptions.selectedSlot = $scope.templateOptions.availableSlots[0];
          }

        }

        console.debug('after update template options', $scope.templateOptions);
        if ($scope.searchStr) {
          $scope.search();
        }
      };

      // $scope.options from searchPlugin.js ( not all used)
      // TODO Make these enabled
      $scope.options = {
        serverUrl: '/snowowl',
        edition: 'snomed-ct/v2/browser',
        release: $scope.branch,
        selectedView: 'inferred',
        displayChildren: false,
        langRefset: '900000000000509007',
        closeButton: false,
        collapseButton: false,
        linkerButton: false,
        subscribersMarker: true,
        searchMode: 'partialMatching',
        searchLang: 'english',
        diagrammingMarkupEnabled: false,
        statusSearchFilter: 'activeOnly',
        highlightByEffectiveTime: 'false',
        taskSet: false,
        taskKey: null
      };

      $scope.searchType = 'Active Only';
      $scope.isEscgMode = false;
      $scope.escgExpr = null;

      $scope.toggleGroupByConcept = function () {
        $scope.userOptions.groupByConcept = !$scope.userOptions.groupByConcept;
        $scope.processResults();

      };

      $scope.toggleSearchType = function () {
        if ($scope.searchType === 'Active and Inactive') {
          $scope.searchType = 'Active Only';
          $scope.userOptions.searchType = 1;
        }
        else if ($scope.searchType === 'Active Only') {
          $scope.searchType = 'Inactive Only';
          $scope.userOptions.searchType = 2;
        }
        else {
          $scope.searchType = 'Active and Inactive';
          $scope.userOptions.searchType = 0;
        }
        $scope.processResults();
      };

      /**
       * Helper function to manipulate displayed concepts
       */
      $scope.processResults = function () {

        // group concepts by SCTID
        var displayedResults = [];

        // temp array for tracking duplicate ids
        var tempIds = [];

        // cycle over all results
        for (var i = 0; i < $scope.storedResults.length; i++) {

          // if item already added skip
          if (tempIds.indexOf($scope.storedResults[i].concept.conceptId) === -1) {

            // push the item
            displayedResults.push($scope.storedResults[i]);

            // add id to the temp list
            tempIds.push($scope.storedResults[i].concept.conceptId);

            // cycle over items remaining in list
            for (var j = i + 1; j < $scope.storedResults.length; j++) {

              // if second item matches, push it to new results and remove from
              // list
              if ($scope.storedResults[i].concept.conceptId === $scope.storedResults[j].concept.conceptId) {

                // add duplicate to list if (1) groupByConcept is off, and (2)
                // displayed results do not already contain this item
                if (!$scope.userOptions.groupByConcept) {
                  displayedResults.push($scope.storedResults[j]);
                }
              }
            }
          }
        }

        if ($scope.userOptions.searchType === 1) {
          $scope.results = displayedResults.filter(function (item) {
            return item.concept.active === true;
          });
        }
        else if ($scope.userOptions.searchType === 2) {
          $scope.results = displayedResults.filter(function (item) {
            return item.concept.active === false;
          });
        }
        else {
          $scope.results = displayedResults;
        }


        // user cue for status
        if ($scope.results.length === 0) {
          $scope.searchStatus = 'No results';
        } else {
          $scope.searchStatus = null;
        }

        // apply dragging for batch view
        $(".draggable").draggable({revert: "invalid", helper: 'clone'});

        $('.draggable').click(function () {
          //$("#excel_table").insertAtCaret($(this).text());
          return false
        });
      };

      /**
       * Executes a search based on current scope variable searchStr
       * @param appendResults if true, append to existing results; if false,
       *   replace results
       */
      $scope.search = function (appendResults) {

        console.debug('searching', $scope.isEscgMode, $scope.templateOptions.selectedTemplate);

        // if template selected, require search string
        if ($scope.templateOptions.selectedTemplate) {
          if (!$scope.searchStr || $scope.searchStr.length < 3) {
            return;
          }
        }

        // if escg do nothing, empty search allowed
        else if ($scope.isEscgMode) {

        }

        // for straight text mode, require search string
        else {
          if (!$scope.searchStr || $scope.searchStr.length < 3) {
            return;
          }
        }

        $scope.searchStatus = 'Searching...';

        // trim and lower-case the swearch string
        $scope.searchStr = $scope.searchStr.trim();

        // initialize or clear the results list
        if (!$scope.results || !appendResults) {
          $scope.results = [];
        }

        // get metadata-specific options
        // TODO Later this will be sensitive to international/extension toggling
        // For now, just use the current module id (i.e. the extension module id if it exists, otherwise the international module id)
        // scope variable for expected future toggle
        //
        $scope.searchExtensionFlag = metadataService.isExtensionSet();
        var acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(
          $scope.searchExtensionFlag ? metadataService.getCurrentModuleId() : metadataService.getInternationalModuleId());

        if (!$scope.isEscgMode && !$scope.templateOptions.selectedTemplate) {

          console.debug('normal text mode');

          // set the return synonym flag to true for extensions
          // TODO Later this will be toggle-able between extension synonym and fsn
          // For now, just assume always want the extension-language synonym if available
          // set as scope variable for expected future toggle
          $scope.synonymFlag = metadataService.isExtensionSet();

          snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, $scope.searchStr, $scope.results.length, $scope.resultsSize, acceptLanguageValue, $scope.synonymFlag).then(function (concepts) {

            if (!concepts) {
              notificationService.sendError('Unexpected error searching for concepts', 10000);
            }

            // set load more parameters
            $scope.loadPerformed = true;
            $scope.loadMoreEnabled = concepts.length === $scope.resultsSize;

            $scope.storedResults = appendResults ? $scope.storedResults.concat(concepts) : concepts;

            $scope.processResults();

          }, function (error) {
            $scope.searchStatus = 'Error performing search: ' + error.message;
            if (error.statusText) {
              $scope.searchStatus += ': ' + error.statusText;
            }
            if (error.data && error.data.message) {
              $scope.searchStatus += ': ' + error.data.message;
            }
          });
        } else {
          console.debug('escg search', $scope.searchStr, $scope.escgExpr, $scope.templateOptions);

          var escgExpr = $scope.templateOptions.selectedTemplate ? $scope.templateOptions.selectedSlot.allowableRangeECL : $scope.escgExpr;

          snowowlService.searchConcepts($scope.branch, $scope.searchStr, escgExpr, $scope.results.length, $scope.resultsSize, $scope.synonymFlag).then(function (results) {
            // set load more parameters
            var concepts = results.items;
            $scope.searchTotal = results.total;
            $scope.loadPerformed = true;
            $scope.loadMoreEnabled = concepts.length === $scope.resultsSize;


            // convert to snowowl description search conceptObj
            var conceptObjs = [];
            if($scope.synonymFlag){
                angular.forEach(concepts, function (c) {
                  conceptObjs.push({
                    active: c.active,
                    concept: {
                      active: c.active,
                      conceptId: c.id,
                      definitionStatus: c.definitionStatus,
                      fsn: c.pt.term,
                      moduleId: c.moduleId,
                      preferredSynonym : c.pt.term
                    },
                    term: c.pt.term
                  })
                });
            }
            else{
                angular.forEach(concepts, function (c) {
                  conceptObjs.push({
                    active: c.active,
                    concept: {
                      active: c.active,
                      conceptId: c.id,
                      definitionStatus: c.definitionStatus,
                      fsn: c.fsn.term,
                      moduleId: c.moduleId
                    },
                    term: c.fsn.term
                  })
                });
            }
            

            $scope.storedResults = appendResults ? $scope.storedResults.concat(conceptObjs) : conceptObjs;

            $scope.processResults();
          }, function (error) {
            $scope.searchStatus = 'Error performing search: ' + error;
            if (error.statusText) {
              $scope.searchStatus += ': ' + error.statusText;
            }
            if (error.data && error.data.message) {
              $scope.searchStatus += ': ' + error.data.message;
            }
          });
        }
      };

      /**
       * Function to load another page of results
       */
      $scope.loadMore = function () {
        $scope.search(true); // search in append mode
      };

      /**
       * Clears results, resets query and page
       */
      $scope.clearSearch = function () {
        $scope.searchStr = '';
        $scope.resultsPage = 1;
        $scope.results = [];
        $scope.searchStatus = null;
      };
      $scope.selectItem = function (item) {
        if (!item) {
          return;
        }
        console.log(item.concept.conceptId);
        $rootScope.$broadcast('editConcept', {conceptId: item.concept.conceptId});

      };
      $scope.isEdited = function (item) {
        return $scope.editList && $scope.editList.indexOf(item.concept.conceptId) !== -1;
      };
      $scope.viewConceptInTaxonomy = function (item) {
        $rootScope.$broadcast('viewTaxonomy', {
          concept: {
            conceptId: item.concept.conceptId,
            fsn: item.concept.fsn,
            preferredSynonym: item.concept.preferredSynonym
          }
        });
      };

      $scope.viewConceptInTaxonomy = function (item) {
        $rootScope.$broadcast('viewTaxonomy', {
          concept: {
            conceptId: item.concept.conceptId,
            fsn: item.concept.fsn,
            preferredSynonym: item.concept.preferredSynonym
          }
        });
      };

      /**
       * Add item to save list
       * @param item The full item in browser format: {term, active, concept:
       *   {}}
       */
      $scope.addItemToSavedList = function (item) {

        if (!item) {
          return;
        }

        // if not already in saved list
        if ($scope.findItemInSavedList(item) === false) {
          // push component on list and update ui state
          $scope.savedList.items.push(item);
          scaService.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'saved-list', $scope.savedList);
        }
      };

      /**
       * Determine if an item is in the saved list
       * @param id the SCTID of the concept checked
       * @returns {boolean} true: exists, false: does not exist
       */
      $scope.findItemInSavedList = function (id) {
        if (!$scope.savedList || !$scope.savedList.items) {
          return false;
        }

        for (var i = 0, len = $scope.savedList.items.length; i < len; i++) {
          if ($scope.savedList.items[i].concept.conceptId === id) {
            return true;
          }
        }
        return false;
      };

      $scope.addItemToFavorites = function (item) {

        if (!item) {
          return;
        }

        // if not already in favorites list for this project, add it
        if ($scope.findItemInFavorites(item) === false) {
          // push component on list and update ui state
          $scope.favorites.items.push(item);
          scaService.saveUiStateForUser('my-favorites-' + $routeParams.projectKey, $scope.favorites);
        }
      };

      /**
       * Determine if an item is in the saved list
       * @param id the SCTID of the concept checked
       * @returns {boolean} true: exists, false: does not exist
       */
      $scope.findItemInFavorites = function (id) {
        if (!$scope.favorites || !$scope.favorites.items) {
          return false;
        }
        for (var i = 0, len = $scope.favorites.items.length; i < len; i++) {
          if ($scope.favorites.items[i].concept.conceptId === id) {
            return true;
          }
        }
        return false;
      };

      $scope.openConceptInformationModal = function (result) {
        var modalInstance = $modal.open({
          templateUrl: 'shared/concept-information/conceptInformationModal.html',
          controller: 'conceptInformationModalCtrl',
          resolve: {
            conceptId: function () {
              return result.concept.conceptId;
            },
            branch: function () {
              return $scope.branch;
            }
          }
        });

        modalInstance.result.then(function (response) {
          // do nothing
        }, function () {
          // do nothing
        });
      };

      /**
       * Constructs drag/drop concept object for a concept
       * @param concept the concept in browser format: {term, active, concept:
       *   {}}
       * @returns {{id: conceptId, name: fsn}}
       */
      $scope.getConceptPropertiesObj = function (concept) {
        return {id: concept.conceptId, name: concept.preferredSynonym ? concept.preferredSynonym : concept.fsn};
      };

      function getTargetSlotMap(conceptObj) {

        var targetSlotMap = {};
        targetSlotMap[$scope.templateOptions.selectedSlot.slotName] = {
          conceptId: conceptObj.conceptId,
          fsn: conceptObj.fsn
        };
        return targetSlotMap;
      }

      $scope.addBatchConceptFromResult = function (conceptObj, template) {

        // check if template matches current batch
        if (!batchEditingService.getCurrentTemplate() || batchEditingService.getBatchConcepts().length === 0) {
          batchEditingService.setCurrentTemplate(template);
        }

        if (batchEditingService.getCurrentTemplate().name !== template.name) {
          modalService.message('Template Mismatch', 'Requested concept using template ' + template.name + ', but the current batch uses template ' + batchEditingService.getCurrentTemplate().name + '.  Please clear the current batch or switch templates.');
          return;
        }

        notificationService.sendMessage('Generating batch concept from template ' + template.name + '...');

        console.debug('creating batch concept', conceptObj);

        batchEditingService.setCurrentTemplate(template);

        var targetSlotMap = getTargetSlotMap(conceptObj);
        templateService.createTemplateConcept(template, targetSlotMap).then(function (concept) {
          batchEditingService.addBatchConcept(concept);
          console.debug('batch concepts', batchEditingService.getBatchConcepts());
          notificationService.sendMessage('Successfully added batch concept', 3000);
          $rootScope.$broadcast('batchConcept.change');
        }, function (error) {
          notificationService.sendError('Unexpected error: ' + error);
        });


      };

      $scope.addBatchConceptsFromResults = function (template) {

        // check if template matches current batch
        if (!batchEditingService.getCurrentTemplate() || batchEditingService.getBatchConcepts().length === 0) {
          batchEditingService.setCurrentTemplate(template);
        }

        if (batchEditingService.getCurrentTemplate().name !== template.name) {
          modalService.message('Template Mismatch', 'Requested concepts using template ' + template.name + ', but the current batch uses template ' + batchEditingService.getCurrentTemplate().name + '.  Please clear the current batch or switch templates.');
          return;
        }

        if ($scope.searchTotal > 25) {
          notificationService.sendWarning('Batch mode limited to 25 concepts during testing', 10000);
          return;
        }

        notificationService.sendMessage('Generating batch concepts from template ' + template.name + '...');

        var conceptPromises = [];

        batchEditingService.setCurrentTemplate(template);

        angular.forEach($scope.results, function (conceptObj) {
          console.debug('adding from object', conceptObj);
          var targetSlotMap = getTargetSlotMap(conceptObj.concept);
          conceptPromises.push(templateService.createTemplateConcept(template, targetSlotMap));
        });

        $q.all(conceptPromises).then(function (concepts) {
          batchEditingService.addBatchConcepts(concepts);
          notificationService.sendMessage('Successfully added batch concepts', 3000);
          console.debug('batch concepts', batchEditingService.getBatchConcepts());
          $rootScope.$broadcast('batchConcept.change');
        }, function (error) {
          notificationService.sendError('Unexpected error: ' + error);
        })
      }

    }
  ])
;
