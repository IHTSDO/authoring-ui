'use strict';
angular.module('singleConceptAuthoringApp.searchPanel', [])

.directive('focusOn',function($timeout) {
    return {
        restrict : 'A',
        link : function($scope,$element,$attr) {
            $scope.$watch($attr.focusOn,function(_focusVal) {
                $timeout(function() {
                    _focusVal ? $element[0].focus() :
                        $element[0].blur();
                });
            });
        }
    };
})

  .controller('searchPanelCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'metadataService', 'notificationService', 'scaService', 'snowowlService', 'templateService', 'batchEditingService', 'modalService','savedListService','$timeout',
    function searchPanelCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, metadataService, notificationService, scaService, snowowlService, templateService, batchEditingService, modalService, savedListService,$timeout) {

      var usModel = {
        moduleId: '731000124108',
        dialectId: '900000000000509007'
      };

      var usModuleFilterModel = {
        '900000000000509007-fsn': 'FSN in US',
        '900000000000509007-pt': 'PT in US'
      };

      var gbDialectId = '900000000000508004';
      var fsnSuffix = '-fsn';

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
        searchType: 1,
        selectedDialect: ''
      };

      $scope.favorites = {items: []};
      $scope.$watch(function () {
          return savedListService.favorites;
        },
        function(newVal, oldVal) {
          $scope.favorites = newVal;
      }, true);

      $scope.savedList = {items: []};
      $scope.$watch(function () {
          return savedListService.savedList;
        },
        function(newVal, oldVal) {
          $scope.savedList = newVal;
      }, true);

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
              }
            $scope.templates = response;
          });
      }

      else {
        $scope.templates = null;
      }

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

      $scope.toggleSearchMode = function () {
        $scope.isEscgMode = !$scope.isEscgMode;
        $scope.escgExpr = '';
        $scope.searchStr = '';
        $scope.results = [];
        $scope.loadPerformed = false;
        if($scope.isEscgMode) {
          $scope.searchType = 'Active Only';
          $scope.userOptions.searchType = 1;
        }
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

            if ($scope.isExtension && $scope.userOptions.selectedDialect && !$scope.isEscgMode) {
              if ($scope.userOptions.selectedDialect === usModel.dialectId ||
                $scope.userOptions.selectedDialect === (usModel.dialectId + fsnSuffix)) {
                if ($scope.storedResults[i].term.indexOf('(') > 0 &&
                  $scope.storedResults[i].term.trim().endsWith(')')) {
                  // push the item
                  displayedResults.push($scope.storedResults[i]);

                  // add id to the temp list
                  tempIds.push($scope.storedResults[i].concept.conceptId);
                }
              } else {
                populateResults(displayedResults,tempIds,i);
              }
            } else {
              populateResults(displayedResults,tempIds,i);
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
        $('.draggable').draggable({revert: 'invalid', helper: 'clone'});

        $('.draggable').click(function () {
          //$("#excel_table").insertAtCaret($(this).text());
          return false;
        });
      };

      function populateResults(displayedResults,tempIds,i) {
        // push the item
        displayedResults.push($scope.storedResults[i]);

        // add id to the temp list
        tempIds.push($scope.storedResults[i].concept.conceptId);

        // add duplicate to list if (1) groupByConcept is off, and (2)
        // displayed results do not already contain this item
        if (!$scope.userOptions.groupByConcept) {

          // cycle over items remaining in list
          for (var j = i + 1; j < $scope.storedResults.length; j++) {

            // if second item matches, push it to new results and remove from
            // list
            if ($scope.storedResults[i].concept.conceptId === $scope.storedResults[j].concept.conceptId) {
              displayedResults.push($scope.storedResults[j]);
            }
          }
        }
      }

      $scope.getExtensionDisplayTerm =  function (item) {
        if ($scope.userOptions.selectedDialect &&
          ($scope.userOptions.selectedDialect === usModel.dialectId ||
            $scope.userOptions.selectedDialect === (usModel.dialectId + fsnSuffix))) {
          return item.term;
        }

        return item.concept.preferredSynonym;
      };

      $scope.getExtensionDisplayTitle =  function () {
        if ($scope.userOptions.selectedDialect &&
          ($scope.userOptions.selectedDialect === usModel.dialectId ||
            $scope.userOptions.selectedDialect === (usModel.dialectId + fsnSuffix))) {
          return 'FSN';
        }

        return 'Preferred Term';
      };

      $scope.autoExpand = function() {
        let element = document.activeElement;
        let scrollHeight = element.scrollHeight;
        element.style.height =  scrollHeight + 'px';
      };

      function addCommas(integer) {
        return (integer + '').replace(/(\d)(?=(\d{3})+$)/g, '$1,');
      }

      /**
       * Executes a search based on current scope variable searchStr
       * @param appendResults if true, append to existing results; if false,
       *   replace results
       */
      $scope.search = function (appendResults) {

        console.debug('searching', $scope.isEscgMode, $scope.templateOptions.selectedTemplate);

        if ($scope.userOptions.selectedDialect) {
          scaService.saveSelectedLanguegeForUser({'defaultLanguage' : $scope.userOptions.selectedDialect});
        }

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
        var acceptLanguageValue = '';

        if($scope.isExtension) {
          if ($scope.userOptions.selectedDialect &&
            $scope.userOptions.selectedDialect !== usModel.dialectId &&
            metadataService.getCurrentModuleId() !== usModel.moduleId &&
			$scope.dialects[$scope.userOptions.selectedDialect]) {
            acceptLanguageValue = $scope.dialects[$scope.userOptions.selectedDialect] + '-' + $scope.dialects[$scope.userOptions.selectedDialect].toUpperCase() + '-x-' + $scope.userOptions.selectedDialect + ';q=0.8,en-US;q=0.5';
          } else {
            acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getCurrentModuleId());
          }
        } else {
          acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getInternationalModuleId());
        }

        // TODO Work in progress to replace current search
        //
        // $scope.synonymFlag = metadataService.isExtensionSet();
        //
        // var escgExpr = $scope.templateOptions.selectedTemplate ? $scope.templateOptions.selectedSlot.allowableRangeECL : $scope.escgExpr;
        //
        // $scope.searchTotal = null;
        //
        // snowowlService.searchAllConcepts($scope.branch, $scope.searchStr, $scope.escgExpr, $scope.results.length, $scope.resultsSize, $scope.synonymFlag, acceptLanguageValue).then(function (results) {
        //   console.log(results);
        //
        //   if (!results) {
        //     notificationService.sendError('Unexpected error searching for concepts', 10000);
        //   }
        //
        //   var concepts = results.items;
        //   $scope.searchTotal = addCommas(results.total);
        //   $scope.loadPerformed = true;
        //   $scope.loadMoreEnabled = concepts.length === $scope.resultsSize;
        //
        //   // convert to snowowl description search conceptObj
        //   var conceptObjs = [];
        //   if($scope.synonymFlag){
        //     angular.forEach(concepts, function (c) {
        //       conceptObjs.push({
        //         active: c.active,
        //         concept: {
        //           active: c.active,
        //           conceptId: c.id,
        //           definitionStatus: c.definitionStatus,
        //           fsn: c.pt.term,
        //           moduleId: c.moduleId,
        //           preferredSynonym : c.pt.term
        //         },
        //         term: c.pt.term
        //       });
        //     });
        //   }
        //   else{
        //     angular.forEach(concepts, function (c) {
        //       conceptObjs.push({
        //         active: c.active,
        //         concept: {
        //           active: c.active,
        //           conceptId: c.id,
        //           definitionStatus: c.definitionStatus,
        //           fsn: c.fsn.term,
        //           moduleId: c.moduleId
        //         },
        //         term: c.fsn.term
        //       });
        //     });
        //   }
        //
        //
        //   $scope.storedResults = appendResults ? $scope.storedResults.concat(conceptObjs) : conceptObjs;
        //
        //   $scope.processResults();
        // }, function (error) {
        //   $scope.searchStatus = 'Error performing search: ' + error;
        //   if (error.statusText) {
        //     $scope.searchStatus += ': ' + error.statusText;
        //   }
        //   if (error.data && error.data.message) {
        //     $scope.searchStatus += ': ' + error.data.message;
        //   }
        // });

        if (!$scope.isEscgMode && !$scope.templateOptions.selectedTemplate) {

          console.debug('normal text mode');

          // set the return synonym flag to true for extensions
          // TODO Later this will be toggle-able between extension synonym and fsn
          // For now, just assume always want the extension-language synonym if available
          // set as scope variable for expected future toggle
          $scope.synonymFlag = metadataService.isExtensionSet();

          $scope.searchTotal = null;

          snowowlService.searchConcepts($scope.branch, $scope.searchStr, $scope.escgExpr, $scope.results.length, $scope.resultsSize, $scope.synonymFlag).then(function (results) {
            return results;
          }, function (error) {
            $scope.searchStatus = 'Error performing search: ' + error;
            if (error.statusText) {
              $scope.searchStatus += ': ' + error.statusText;
            }
            if (error.data && error.data.message) {
              $scope.searchStatus += ': ' + error.data.message;
            }
          }).then(function(results) {
            snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, $scope.searchStr, $scope.results.length, $scope.resultsSize, acceptLanguageValue, $scope.synonymFlag).then(function (concepts) {

              if (!concepts) {
                notificationService.sendError('Unexpected error searching for concepts', 10000);
              }

              // set load more parameters
              $scope.loadPerformed = true;
              $scope.loadMoreEnabled = concepts.length === $scope.resultsSize;
              $scope.storedResults = appendResults ? $scope.storedResults.concat(concepts) : concepts;
              $scope.searchTotal = addCommas(results.total);

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
          });
        } else {

          $scope.synonymFlag = metadataService.isExtensionSet();
          console.debug('escg search', $scope.searchStr, $scope.escgExpr, $scope.templateOptions);

          var escgExpr = $scope.templateOptions.selectedTemplate ? $scope.templateOptions.selectedSlot.allowableRangeECL : $scope.escgExpr;

          snowowlService.searchConcepts($scope.branch, $scope.searchStr, escgExpr, $scope.results.length, $scope.resultsSize, $scope.synonymFlag).then(function (results) {
            // set load more parameters
            var concepts = results.items;
            $scope.searchTotal = addCommas(results.total);
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
                });
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
                });
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

      var queue = [];
      var processingConceptId = null;
      var editingConcepts = [];
      var conceptLoaded = false;

      $scope.selectItem = function (item) {
        if (!item) {
          return;
        }

        if(queue.indexOf(item.concept.conceptId) < 0) {
          queue.push(item.concept.conceptId);
        }
      };

      $scope.$on('editingConcepts', function(evt,data) {
        editingConcepts = data.concepts;
      });


      $scope.$watch(function () {
        return queue;
      }, function (newValue, oldValue) {
        if (queue.length > 0) {
          setTimeout(function waitForConceptLoadCompletely() {
            if (queue.length > 0 || !conceptLoaded) {
              if(!processingConceptId) {
                processingConceptId = queue.shift();
                $rootScope.$broadcast('editConcept', {conceptId: processingConceptId});
              }

              conceptLoaded = false;
              angular.forEach(editingConcepts, function(concept) {
                if (concept.conceptId === processingConceptId) {
                  conceptLoaded = true;
                }
              });

              if (conceptLoaded) {
                if (queue.length > 0) {
                  processingConceptId = queue.shift();
                  $rootScope.$broadcast('editConcept', {conceptId: processingConceptId});
                  conceptLoaded = false;
                }

                if (queue.length === 0) {
                  if (!conceptLoaded) {
                    setTimeout(waitForConceptLoadCompletely, 200);
                  } else {
                    processingConceptId = null;
                  }
                }
              } else {
                setTimeout(waitForConceptLoadCompletely, 200);
              }
            }
          });
        }
      }, true);

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
        savedListService.addItemToSavedList(item,$routeParams.projectKey, $routeParams.taskKey);
      };

      /**
       * Determine if an item is in the saved list
       * @param id the SCTID of the concept checked
       * @returns {boolean} true: exists, false: does not exist
       */
      $scope.isInSavedList = function (id) {
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
        savedListService.addToFavorites(item,$routeParams.projectKey);
      };

      /**
       * Determine if an item is in the saved list
       * @param id the SCTID of the concept checked
       * @returns {boolean} true: exists, false: does not exist
       */
      $scope.isInFavorites = function (id) {
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

      $scope.clone = function (item) {
        if (item) {
          $rootScope.$broadcast('cloneConcept', {conceptId: item.concept.conceptId});          
        }
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
        });
      };

      $scope.$on('viewSearch', function(event, data) {
        $scope.searchStr = '';
        if (Object.keys(data).length > 0 && data.constructor === Object) {
          if (data.eclMode) {
            $scope.isEscgMode = true;
            $scope.escgExpr = '*: ' + data.conceptId + ' =*';
            $scope.search();
          }
        }
      });

      $scope.getDisplayedLanguageFromKey = function (dialectId) {
        if (metadataService.getCurrentModuleId() === usModel.moduleId) { // US module
          return $scope.dialects[dialectId];
        }
        else if (dialectId === usModel.dialectId) {
          return 'FSN in US';
        } else {
          return 'PT in ' + $scope.dialects[dialectId].toUpperCase();
        }
      };

      // on extension metadata set
      $scope.$on('setExtensionMetadata', function (event, data) {
        $scope.isExtension = metadataService.isExtensionSet();

        if ($scope.isExtension) {
          if (metadataService.getCurrentModuleId() === usModel.moduleId) { // US module
            $scope.dialects = usModuleFilterModel;
          } else {
            $scope.dialects = metadataService.getAllDialects();

            // Remove 'en-gb' if any
            if ($scope.dialects.hasOwnProperty(gbDialectId)) {
              delete $scope.dialects[gbDialectId];
            }
          }

          scaService.getSelectedLanguegeForUser().then(function (data){
            if (data) {
              var strArray = data.defaultLanguage.split('-');
              if (metadataService.getCurrentModuleId() === usModel.moduleId) { // US module
                if(strArray.length === 2) {
                  $scope.userOptions.selectedDialect = data.defaultLanguage;
                }
                else if (strArray[0] === usModel.dialectId) {
                  $scope.userOptions.selectedDialect = strArray[0] + fsnSuffix;
                }
                else {
                  // do nothing
                }
              } else {
                $scope.userOptions.selectedDialect = strArray[0];
              }
            }
          });
        }
      });

    }
  ])
;
