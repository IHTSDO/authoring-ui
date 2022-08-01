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

  .controller('searchPanelCtrl', ['$scope', '$rootScope', '$modal', '$location', '$routeParams', '$q', '$http', 'metadataService', 'notificationService', 'scaService', 'terminologyServerService', 'templateService', 'batchEditingService', 'modalService','savedListService','$timeout','$filter',
    function searchPanelCtrl($scope, $rootScope, $modal, $location, $routeParams, $q, $http, metadataService, notificationService, scaService, terminologyServerService, templateService, batchEditingService, modalService, savedListService,$timeout,$filter) {

      let usModel = {
        moduleId: '731000124108',
        dialectId: '900000000000509007'
      };

      let usModuleFilterModel = {
        '900000000000509007-fsn': 'FSN in US',
        '900000000000509007-pt': 'PT in US'
      };

      let gbDialectId = '900000000000508004';
      let fsnSuffix = '-fsn';

      // controller $scope.options
      $scope.branch = metadataService.getBranch();
      $scope.resultsPage = 1;
      $scope.resultsSize = 100;
      $scope.searchAfter = null;
      $scope.loadPerformed = false;
      $scope.loadMoreEnabled = false;
      $scope.searchStr = '';
      $scope.selectedLanguageRefsets = [];
      $scope.languageRefsetOptions = [];
      $scope.languageRefsetMultiselectSettings = {showCheckAll: false, showUncheckAll: false, smartButtonMaxItems: 5, smartButtonTextConverter : smartButtonTextConverter, buttonClasses: 'btn btn-default btn-primary btn-blue col-md-12'};
      $scope.languageRefsetMultiselectTranslationTexts = {buttonDefaultText: 'Language Refsets', dynamicButtonTextSuffix: 'selected'};
      $scope.languageRefsetMultiselectEvents = {onItemSelect: function() {$scope.newSearch();},onItemDeselect: function() {$scope.newSearch();}};

      function smartButtonTextConverter(text, option) {
        let dialects = metadataService.getAllDialects();
        let languages = dialects[option.id].split('-');
        return (languages.length > 1 ? languages[1].toUpperCase() : languages[0].toUpperCase());
      }

      function initialize() {
        terminologyServerService.getReferenceSetMembersForBranch($scope.branch).then(function(result) {
          if (result) {
            Object.keys(result).forEach(function(key) {
              if (result[key].referenceSetType && result[key].referenceSetType.id === '900000000000506000') {
                var languageRefsetOption = {};
                languageRefsetOption.id = result[key].id;
                languageRefsetOption.label = result[key].pt.term;
                $scope.languageRefsetOptions.push(languageRefsetOption);                                  
              }
            });
          }
          else {
            console.log('Could not find any language reference set for branch :' + $scope.branch);
          }         
        });
      }
      initialize();

      // the displayed results
      $scope.results = [];

      // the stored results
      $scope.storedResults = [];

      $scope.downloadAllResults = true;
      $scope.selectedResultsList = [];
      $scope.downloadButtonActive = true;


      // user controls
      $scope.userOptions = {
        groupByConcept: true,
        searchType: 1,
        selectedDialect: '',
        defintionSelection: '',
        statedSelection: 'inferred',
        template: '',
        model: 'logical'
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
      if(metadataService.isTemplatesEnabled()){
        templateService.getTemplates().then(function (response) {
          for(let i = response.length -1; i <= 0; i--){
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

      $scope.getTemplateSuggestions = function (text) {
            return $scope.templates.filter(template => template.name.toLowerCase().indexOf(text.toLowerCase()) > -1);
          };

      $scope.updateTemplateOptions = function () {

        console.debug('before update template options', $scope.templateOptions);

        if ($scope.templateOptions.selectedTemplate) {
          $scope.templateOptions.availableSlots = $scope.templateOptions.selectedTemplate.conceptOutline.classAxioms[0].relationships.filter(function (r) {
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
      $scope.descriptionSeachStatus = 'active';
      $scope.isEscgMode = false;
      $scope.templateMode = false;
      $scope.escgExpr = null;
      $scope.searchMode = 'Switch to ECL';

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
        $scope.newSearch();
        // $scope.processResults();
      };

      $scope.toggleDescriptionStatus = function () {
        $scope.descriptionSeachStatus = $scope.descriptionSeachStatus === 'active' ? 'inactive' : 'active';
        $scope.newSearch();
      };

      $scope.toggleSearchMode = function () {
        $scope.escgExpr = '';
        $scope.searchStr = '';
        $scope.results = [];
        $scope.userOptions.template = '';
        $scope.loadPerformed = false;
        if(metadataService.isTemplatesEnabled())
            {
                if ($scope.searchMode === 'Switch to ECL') {
                  $scope.searchMode = 'Switch to Template';
                  $scope.descriptionSeachStatus = 'active';
                  $scope.isEscgMode = true;
                  $scope.templateMode = false;
                  $scope.userOptions.searchType = null;
                  $scope.userOptions.statedSelection = 'inferred';
                }
                else if ($scope.searchMode === 'Switch to Template') {
                  $scope.searchMode = 'Switch to Text';
                  $scope.isEscgMode = false;
                  $scope.templateMode = true;
                  $scope.userOptions.statedSelection = 'stated';
                  $scope.userOptions.searchType = 1;
                }
                else {
                  $scope.searchMode = 'Switch to ECL';
                  $scope.isEscgMode = false;
                  $scope.templateMode = false;
                  $scope.userOptions.searchType = 1;
                  $scope.searchType = 'Active Only';
                }
            }
        else{
            if ($scope.searchMode === 'Switch to ECL') {
              $scope.searchMode = 'Switch to Text';
              $scope.descriptionSeachStatus = 'active';
              $scope.isEscgMode = true;
              $scope.userOptions.statedSelection = 'inferred';
              $scope.templateMode = false;
              $scope.userOptions.searchType = null;
              $scope.searchType = 'Active Only';
              $scope.selectedLanguageRefsets = [];
            }
            else {
              $scope.searchMode = 'Switch to ECL';
              $scope.isEscgMode = false;
              $scope.templateMode = false;
              $scope.userOptions.searchType = 1;
              $scope.searchType = 'Active Only';
            }
        }

        $scope.newSearch();
      };

      /**
       * Helper function to manipulate displayed concepts
       */
      $scope.processResults = function () {

        // group concepts by SCTID
        let displayedResults = [];

        // temp array for tracking duplicate ids
        let tempIds = [];
        
        // cycle over all results
        for (let i = 0; i < $scope.storedResults.length; i++) {

          // if item already added skip
          if (tempIds.indexOf($scope.storedResults[i].concept.conceptId) === -1) {

            if ($scope.isExtension && $scope.userOptions.selectedDialect && !$scope.isEscgMode) {
              if ($scope.userOptions.selectedDialect === usModel.dialectId ||
                $scope.userOptions.selectedDialect === (usModel.dialectId + fsnSuffix)) {
                if ($scope.storedResults[i].concept.fsn ||
                  $scope.storedResults[i].term !== $scope.storedResults[i].concept.preferredSynonym &&
                  $scope.storedResults[i].term.indexOf('(') > 0 &&
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
        let batchDrag = $('.draggable');

        batchDrag.draggable({revert: 'invalid', helper: 'clone'});

        batchDrag.click(function () {
          //$("#excel_table").insertAtCaret($(this).text());
          return false;
        });

        if($scope.downloadAllResults) {
          $scope.selectAll(true);
        }
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
          for (let j = i + 1; j < $scope.storedResults.length; j++) {

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
          if (typeof item.concept.fsn !== 'undefined') {
            return item.concept.fsn;
          }
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

      // creates element for dialog download of classification data
      $scope.dlcDialog = (function (data, fileName) {

        // create the hidden element
        var a = document.createElement('a');
        document.body.appendChild(a);

        return function (data, fileName) {
          var
            blob = new Blob([data], {type: 'text/tab-separated-values'}),
            url = window.URL.createObjectURL(blob);
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
        };
      }());

      $scope.selectAll = function (isChecked) {
        angular.forEach($scope.results, function (item) {
          item.selected = isChecked;
        });

        $scope.downloadAllResults = true;

        $scope.selectionCheck();
      };

      $scope.removeAllSelected = function() {
        $scope.downloadAllResults = false;

        $scope.selectionCheck();
      };

      $scope.selectionCheck = function() {
        let result = false;

        angular.forEach($scope.results, function(item) {
          if(item.selected) {
            result = true;
          }
        });

        $scope.downloadButtonActive = result;
      };

      $scope.downloadResultFilter = function() {

        $scope.selectedResultsList = [];

        if(!$scope.downloadAllResults) {

          $scope.results.filter(function(item) {
            if(item.selected) {
              $scope.selectedResultsList.push(item.concept.conceptId);
            }
          });

          $scope.downloadSearchResults($scope.selectedResultsList);
        }

        else {
          $scope.downloadSearchResults($scope.templateMode ? $scope.batchIdList : undefined);
        }
      };

      $scope.addSelectedResultsToSavedList = function() {
        let selectedResultsList = [];
        let count = 0;
        $scope.results.filter(function(item) {
          if(item.selected) {
            selectedResultsList.push(item);
          }
        });
        if (selectedResultsList.length !== 0) {
          angular.forEach(selectedResultsList, function (item) {
            if(!$scope.isInSavedList(item.concept.conceptId)) {
              savedListService.addItemToSavedList(item,$routeParams.projectKey, $routeParams.taskKey);
              count++;
            }            
          });          
        }
        if (count === 0) {
          notificationService.sendMessage('No concepts added to Saved List', 3000);
        } else {
          notificationService.sendMessage('Successfully added ' + count + ' concepts to Saved List', 3000);
        }
      };

      $scope.downloadSearchResults = function(conceptIdList) {
        let acceptLanguageValue = '';
        if($scope.isExtension) {
           var allDialects = metadataService.getAllDialects();
           const optionalLanguageRefsets = metadataService.getOptionalLanguageRefsets();
           for (let dialectId in (allDialects)) {
              let dialect = allDialects[dialectId];
              let foundOptionalRefset = null;
              if (optionalLanguageRefsets) {
                foundOptionalRefset = optionalLanguageRefsets.filter(function(item) {
                  return item.refsetId === dialectId;
                })[0];
              }
              if (foundOptionalRefset) {
                acceptLanguageValue += foundOptionalRefset.language + '-' + foundOptionalRefset.key.toUpperCase() + '-x-' + dialectId + ',';
              } else if(dialect.indexOf('-') !== -1) {
                acceptLanguageValue += dialect + '-x-' + dialectId + ',';
              } else {
                acceptLanguageValue += dialect + '-' + dialect.toUpperCase() + '-x-' + dialectId + ',';
              }             
           }
           acceptLanguageValue += 'en';
        }
        else {
          acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getInternationalModuleId());
        }

        let activeFilter = null;

        if (!$scope.escgExpr) {
          switch($scope.userOptions.searchType) {
            case 1:
              activeFilter = true;
              break;
  
            case 2:
              activeFilter = false;
              break;
          }
        }        

        let fsnSearchFlag = !metadataService.isExtensionSet() ||
          $scope.userOptions.selectedDialect === usModel.dialectId ||
          $scope.userOptions.selectedDialect === (usModel.dialectId + fsnSuffix);

        terminologyServerService.searchAllConcepts($scope.branch, $scope.searchStr, $scope.escgExpr, null, null, !fsnSearchFlag, acceptLanguageValue, activeFilter, true, $scope.userOptions.defintionSelection, $scope.userOptions.statedSelection, conceptIdList, null, null, null, getPreferredOrAcceptableIn()).then(function (data) {
          const fileName = 'searchResults_' + $routeParams.taskKey;
          $scope.dlcDialog(data.data, fileName);

          // Get total items and notify user if exceeded 10K
          notificationService.clear();
          terminologyServerService.searchAllConcepts($scope.branch, $scope.searchStr, $scope.escgExpr, null, 1, !fsnSearchFlag, acceptLanguageValue, activeFilter, false, $scope.userOptions.defintionSelection, $scope.userOptions.statedSelection, conceptIdList, null, null, null, getPreferredOrAcceptableIn()).then(function (data) {
            if (data.total > 10000) {
              notificationService.sendWarning('The total number of results is ' + $filter('number')(data.total) + ', but only the first 10,000 will be downloaded. Please contact technical support if you require the full set of results.');
            }
          });
        });        
      };

      $scope.autoExpand = function() {
        $scope.escgExpr = $scope.escgExpr.replace(/[\r]/g, '');

        let element = document.activeElement;

        setTimeout(function(){
          element.style.height = '37px';
          element.style.height = element.scrollHeight + 'px';
        },0);
      };

      function addCommas(integer) {
        return (integer + '').replace(/(\d)(?=(\d{3})+$)/g, '$1,');
      }

      $scope.newSearch = function (appendResults) {
        if(!appendResults){
            $scope.searchAfter = null;
        }

        if ($scope.userOptions.selectedDialect) {
          scaService.saveSelectedLanguegeForUser({'defaultLanguage' : $scope.userOptions.selectedDialect});
        }

        if(!$scope.escgExpr && !$scope.userOptions.template) {
          if (!$scope.searchStr) {
            return;
          }
          // Check min length for Traditional Medicine/Korean project  
          const selectedDialectName = $scope.dialects && $scope.userOptions.selectedDialect ? $scope.dialects[$scope.userOptions.selectedDialect] : '';        
          const allowtOneCharSearch = metadataService.isExtensionSet() && (selectedDialectName === 'zh' || selectedDialectName === 'ko'); 
          if (allowtOneCharSearch ? $scope.searchStr.length < 1 : $scope.searchStr.length < 3) {
            return;
          }        
        }

        // update and display search in progress message
        $scope.searchStatus = 'Searching...';

        // trim and lower-case the search string
        $scope.searchStr = $scope.searchStr.trim();
        let searchStr = $scope.searchStr;

        // omitted the text between the pipe-bars if any
        var patt = new RegExp('^\\d+\\s\\|.*\\|$');
        if (patt.test($scope.searchStr)) {
            searchStr = searchStr.substring(0, searchStr.indexOf(' '));
        }

        // initialize or clear the results list
        if (!$scope.results || !appendResults) {
          $scope.results = [];
          $scope.searchTotal = null;
        }

        // get metadata-specific options
        // TODO Later this will be sensitive to international/extension toggling
        // For now, just use the current module id (i.e. the extension module id if it exists, otherwise the international module id)
        // scope variable for expected future toggle
        let acceptLanguageValue = getAcceptLanguage();

        let activeFilter = null;

        if (!$scope.escgExpr) {
          switch($scope.userOptions.searchType) {
            case 1:
              activeFilter = true;
              break;
  
            case 2:
              activeFilter = false;
              break;
          }
        }        

        // set the return synonym flag to true for extensions
        // TODO Later this will be toggle-able between extension synonym and fsn
        // For now, just assume always want the extension-language synonym if available
        // set as scope variable for expected future toggle
        $scope.synonymFlag = metadataService.isExtensionSet();

        // Allows for a template based escgExpr value to be assigned, currently template based searching is not in use
        // var escgExpr = $scope.templateOptions.selectedTemplate ? $scope.templateOptions.selectedSlot.allowableRangeECL : $scope.escgExpr;

        let fsnSearchFlag = !metadataService.isExtensionSet() ||
          $scope.userOptions.selectedDialect === usModel.dialectId ||
          $scope.userOptions.selectedDialect === (usModel.dialectId + fsnSuffix);

        $scope.searchTimestamp = new Date().getTime();
        if($scope.userOptions.template){
            templateService.searchByTemplate($scope.userOptions.template.name, $scope.branch, $scope.userOptions.statedSelection, $scope.userOptions.model).then(function(results){
                $scope.batchIdList = results.data;
                if(results.data.length > 0){
                    terminologyServerService.searchAllConcepts($scope.branch, searchStr, $scope.escgExpr, $scope.results.length, $scope.resultsSize, !fsnSearchFlag, acceptLanguageValue, activeFilter, false, $scope.userOptions.defintionSelection, $scope.userOptions.statedSelection, results.data, $scope.searchAfter, $scope.searchTimestamp).then(function (results) {
                      if (results.searchTimestamp !== $scope.searchTimestamp) {
                        return;
                      }  
                      if (!results) {
                            notificationService.sendError('Unexpected error searching for concepts', 10000);
                          }
                          if(results.searchAfter){
                              $scope.searchAfter = results.searchAfter;
                          }

                          $scope.loadPerformed = true;

                          if(results.total || $scope.escgExpr) {
                            $scope.searchTotal = addCommas(results.total);
                            $scope.loadMoreEnabled = results.items.length === $scope.resultsSize;
                            $scope.storedResults = appendResults ? $scope.storedResults.concat(results.items) : results.items;
                          }

                          else {
                            $scope.searchTotal = addCommas(results.length);
                            $scope.loadMoreEnabled = results.length === $scope.resultsSize;
                            $scope.storedResults = appendResults ? $scope.storedResults.concat(results) : results;
                          }

                          $scope.processResults();
                    });
                }
                else{
                    $scope.loadPerformed = false;
                    $scope.searchStatus = 'No results';
                }

            })

        }
        else{
          terminologyServerService.searchAllConcepts($scope.branch, searchStr, $scope.escgExpr, $scope.results.length, $scope.resultsSize, !fsnSearchFlag, acceptLanguageValue, activeFilter, false, $scope.userOptions.defintionSelection, $scope.userOptions.statedSelection, null, $scope.searchAfter, $scope.searchTimestamp, $scope.descriptionSeachStatus, getPreferredOrAcceptableIn()).then(function (results) {
            if (results.searchTimestamp !== $scope.searchTimestamp) {
              return;
            }
            if (!results) {
              notificationService.sendError('Unexpected error searching for concepts', 10000);
            } else {
              if (results.items && results.items.length !== 0 && results.items[0].fields) {
                $scope.searchStatus = 'This operation is not supported in the Authoring Platform, please use the TS Browser.';
                return
              }
            }

            if(results.searchAfter){
                $scope.searchAfter = results.searchAfter;
            }

            $scope.loadPerformed = true;

            if(results.total || $scope.escgExpr) {
              $scope.searchTotal = addCommas(results.total);
              $scope.loadMoreEnabled = results.items.length === $scope.resultsSize;
              $scope.storedResults = appendResults ? $scope.storedResults.concat(results.items) : results.items;
            }

            else {
              $scope.searchTotal = addCommas(results.length);
              $scope.loadMoreEnabled = results.length === $scope.resultsSize;
              $scope.storedResults = appendResults ? $scope.storedResults.concat(results) : results;
            }

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
        };
      };

      function getPreferredOrAcceptableIn() {
        var result = [];
        for (let i = 0; i < $scope.selectedLanguageRefsets.length; i++) {
          result.push($scope.selectedLanguageRefsets[i].id);
        }

        return result;
      }

      function getAcceptLanguage() {
        let acceptLanguageValue = '';

        if($scope.isExtension) {
          if ($scope.userOptions.selectedDialect && ($scope.userOptions.selectedDialect !== usModel.dialectId) &&
            (metadataService.getCurrentModuleId() !== usModel.moduleId) && $scope.dialects[$scope.userOptions.selectedDialect]) {
              if($scope.dialects[$scope.userOptions.selectedDialect].indexOf('-') !== -1)
                  {
                      acceptLanguageValue = $scope.dialects[$scope.userOptions.selectedDialect] + '-x-' + $scope.userOptions.selectedDialect + ';q=0.8,en-US;q=0.5';
                  }
              else{
                  acceptLanguageValue = $scope.dialects[$scope.userOptions.selectedDialect] + '-' + $scope.dialects[$scope.userOptions.selectedDialect].toUpperCase() + '-x-' + $scope.userOptions.selectedDialect + ';q=0.8,en-US;q=0.5';
              }
          }

          else {
            if($scope.userOptions.selectedDialect === usModel.dialectId){
              acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getInternationalModuleId());
            }
            else{
              acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getCurrentModuleId());
            }
          }
        }

        else {
          acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getInternationalModuleId());
        }

        return acceptLanguageValue;
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

        if (!$scope.searchStr || $scope.searchStr.length < 3) {
          return;
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
        let acceptLanguageValue = getAcceptLanguage();

        if (!$scope.isEscgMode && !$scope.templateOptions.selectedTemplate) {

          console.debug('normal text mode');

          // set the return synonym flag to true for extensions
          // TODO Later this will be toggle-able between extension synonym and fsn
          // For now, just assume always want the extension-language synonym if available
          // set as scope variable for expected future toggle
          $scope.synonymFlag = metadataService.isExtensionSet();

          $scope.searchTotal = null;

          let fsnSearchFlag = !metadataService.isExtensionSet() ||
            $scope.userOptions.selectedDialect === usModel.dialectId ||
            $scope.userOptions.selectedDialect === (usModel.dialectId + fsnSuffix);

          terminologyServerService.searchConcepts($scope.branch, $scope.searchStr, $scope.escgExpr, $scope.results.length, $scope.resultsSize, !fsnSearchFlag, acceptLanguageValue).then(function (results) {
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
            terminologyServerService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, $scope.searchStr, $scope.results.length, $scope.resultsSize, acceptLanguageValue, !fsnSearchFlag).then(function (concepts) {

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

          let escgExpr = $scope.templateOptions.selectedTemplate ? $scope.templateOptions.selectedSlot.allowableRangeECL : $scope.escgExpr;

          terminologyServerService.searchConcepts($scope.branch, $scope.searchStr, escgExpr, $scope.results.length, $scope.resultsSize, $scope.synonymFlag, acceptLanguageValue).then(function (results) {
            // set load more parameters
            let concepts = results.items;
            $scope.searchTotal = addCommas(results.total);
            $scope.loadPerformed = true;
            $scope.loadMoreEnabled = concepts.length === $scope.resultsSize;


            // convert to terminology server description search conceptObj
            let conceptObjs = [];
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
        $scope.newSearch(true); // search in append mode
      };

      /**
       * Clears results, resets query and page
       */
      $scope.clearSearch = function () {
        $scope.searchStr = '';
        $scope.resultsPage = 1;
        $scope.results = [];
        $scope.searchStatus = null;
        $scope.userOptions.template = '';

        $scope.escgExpr = '';
        document.getElementById('expandable-search').style.height = '37px';
      };

      let queue = [];
      let processingConceptId = null;
      let editingConcepts = [];
      let conceptLoaded = false;

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
                $rootScope.$broadcast('editConcept', {conceptId: processingConceptId, loadFromTermServer: true});
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
                  $rootScope.$broadcast('editConcept', {conceptId: processingConceptId, loadFromTermServer: true});
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
        if (!item.concept.active) return;
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
        if($scope.isInSavedList(item.concept.conceptId)) return;
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

        for (let i = 0, len = $scope.savedList.items.length; i < len; i++) {
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
        for (let i = 0, len = $scope.favorites.items.length; i < len; i++) {
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
        let modalInstance = $modal.open({
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
        
      $scope.triggerEclBuilder = function () {
          openEclBuilder($scope.escgExpr, $scope.branch);
          $scope.$watch(
            function() { return $('#expandable-search').val()},
            function(newVal, oldVal) 
              { 
                  $scope.escgExpr = newVal;
              }
          );
      }

      $scope.openTransformModal = function () {
        let transformConcepts = [];
        let openModel = function(concepts) {
          let modalInstance = $modal.open({
            templateUrl: 'shared/template-transform/transformModal.html',
            controller: 'transformModalCtrl',
            resolve: {
              results: function () {
                return concepts;
              },
              branch: function () {
                return $scope.branch;
              },
              templateFrom: function () {
                return $scope.userOptions.template;
              },
            }
          });

          modalInstance.result.then(function (response) {
            console.log(response);
            batchEditingService.addBatchConcepts(response).then(function(){
                notificationService.sendMessage('Successfully added batch concepts', 3000);
                $rootScope.$broadcast('batchConcept.change');
                $rootScope.$broadcast('swapToBatch');
              });
          }, function () {
            // do nothing
          });
        };

        if(!$scope.downloadAllResults) {
          $scope.results.filter(function(item) {
            if(item.selected) {
              transformConcepts.push(item.concept.conceptId);
            }
          });
          openModel(transformConcepts);
        }
        else{
          let acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getInternationalModuleId());
          let activeFilter = null;

          switch($scope.userOptions.searchType) {
            case 1:
            activeFilter = true;
            break;

            case 2:
            activeFilter = false;
            break;
          }

          terminologyServerService.searchAllConcepts($scope.branch, $scope.searchStr, $scope.escgExpr, 0, 10000, false, acceptLanguageValue, activeFilter, false, $scope.userOptions.defintionSelection, $scope.userOptions.statedSelection, $scope.batchIdList).then(function (response) {

            angular.forEach(response.items, function (item) {
              transformConcepts.push(item.concept.conceptId);
            });
            openModel(transformConcepts);
          });
        }
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

        let targetSlotMap = {};
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

        let targetSlotMap = getTargetSlotMap(conceptObj);
        templateService.createTemplateConcept(template, targetSlotMap, null, $scope.branch).then(function (concept) {
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

        let conceptPromises = [];

        batchEditingService.setCurrentTemplate(template);

        angular.forEach($scope.results, function (conceptObj) {
          console.debug('adding from object', conceptObj);
          let targetSlotMap = getTargetSlotMap(conceptObj.concept);
          conceptPromises.push(templateService.createTemplateConcept(template, targetSlotMap, null, $scope.branch));
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
            $scope.newSearch();
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
          return 'PT in ' + ($scope.dialects[dialectId].substring($scope.dialects[dialectId].indexOf("-") + 1).toUpperCase())
        }
      };

      $scope.setTooltipPosition = function ($event) {
        var top = $event.target.getBoundingClientRect().top;
        var left = $event.target.getBoundingClientRect().left;
        var spanTags = angular.element($event.target).find('span');
        if(spanTags.length === 0) {
          var parents = angular.element($event.target).parent();
          top = parents[0].getBoundingClientRect().top;
          left = parents[0].getBoundingClientRect().left;
          spanTags = angular.element($event.target).parent().find('span');
        }

        angular.forEach(spanTags, function(tag) {
          angular.element(tag).css('top', top - 73);
          angular.element(tag).css('left', left - 40);
        });
      };
      // on extension metadata set
        if($rootScope.extensionMetadataSet){
            console.log('already set');
            setupExtensionSearch();
        }
        else{
            $rootScope.$watch('extensionMetadataSet', function () {
                console.log('set from watcher');
                setupExtensionSearch();
            }, true);
        }
        
        function setupExtensionSearch() {
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

                // Remove Context Based Language Refsets if any
                var optionalLanguageRefsets = metadataService.getOptionalLanguageRefsets();
                console.log(optionalLanguageRefsets);
                if (optionalLanguageRefsets) {
                  for (let i = 0; i < optionalLanguageRefsets.length; i++) {
                    delete $scope.dialects[optionalLanguageRefsets[i].refsetId];
                  }
                }
              }

              scaService.getSelectedLanguegeForUser().then(function (data){
                //set defaut dialect 'FSN in US'
                if (metadataService.getCurrentModuleId() === usModel.moduleId) { // US module
                  $scope.userOptions.selectedDialect = usModel.dialectId + fsnSuffix;
                }
                else {
                  $scope.userOptions.selectedDialect = usModel.dialectId;
                }            

                if (data && Object.keys(data).length > 0 && data.hasOwnProperty('defaultLanguage')) {
                  let strArray = data.defaultLanguage.split('-');
                  if (metadataService.getCurrentModuleId() === usModel.moduleId) { // US module
                    if(strArray.length === 2 && strArray[0] === usModel.dialectId) {
                      $scope.userOptions.selectedDialect = data.defaultLanguage;
                    }                
                  } else {
                    if ($scope.dialects.hasOwnProperty(strArray[0])) {
                      $scope.userOptions.selectedDialect = strArray[0];
                    }
                  }
                }
              });
            }
        }
        

    }
  ])
;
