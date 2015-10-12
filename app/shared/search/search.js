'use strict';
angular.module('singleConceptAuthoringApp.searchPanel', [])

  .controller('searchPanelCtrl', ['$scope', '$rootScope', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService', 'snowowlService',
    function searchPanelCtrl($scope, $rootScope, $location, $routeParams, $q, $http, notificationService, scaService, snowowlService) {

      // controller $scope.options
      $scope.branch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
      $scope.resultsPage = 1;
      $scope.resultsSize = 20;
      $scope.results = null;
      $scope.loadPerformed = false;
      $scope.loadMoreEnabled = false;
      $scope.searchStr = '';

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

      // TODO Move this $http call into snowowl service later
      function searchHelper(url, appendResults) {

        // initialize or clear the results list
        if (!$scope.results || !appendResults) {
          $scope.results = [];
        }

        // check url specified
        if (!url) {
          return;
        }

        // make the call
        // TODO Convert to snowowl service call at some point
        $http.get(url).then(function (response) {

          if (!response) {
            notificationService.sendError('Unexpected error searching for concepts', 10000);
          }

          $scope.loadPerformed = true;

          // temporary array for sorting/grouping/filtering
          var resultsArray;

          // either a list or single object, switch based on 'data'
          if (response.data.length) {

            resultsArray = $scope.results.concat(response.data);

            // check if more results may be available
            $scope.loadMoreEnabled = (response.data.length === $scope.resultsSize);

            console.debug(response.data.length, $scope.resultSize);

          } else {

            // convert full concept into browser list item form
            var item = {
              active: response.data.active,
              term: response.data.preferredSynonym,
              concept: {
                active: response.data.active,
                conceptId: response.data.conceptId,
                definitionStatus: response.data.definitionStatus,
                fsn: response.data.fsn,
                moduleId: response.data.moduleId
              }
            };

            resultsArray = $scope.results.concat(item);

            // single result does not have load more question (not true or
            // false)
            $scope.loadMoreEnabled = null;
          }
          // group concepts by SCTID
          var newResults = [];

          // cycle over all results
          for (var i = 0; i < resultsArray.length; i++) {

            // push the item
            newResults.push(resultsArray[i]);

            // cycle over items remaining in list
            for (var j = i+1; j < resultsArray.length; j++) {

              // if second item matches, push it to new results and remove from list
              if (resultsArray[i].concept.conceptId === resultsArray[j].concept.conceptId) {

                newResults.push(resultsArray[j]);
                resultsArray.splice(j, 1);
                j--;  // decrement to check same position
              }
            }
          }

          $scope.results = newResults;


          // user cue for status
          if ($scope.results.length === 0) {
            $scope.searchStatus = 'No results';
          } else {
            $scope.searchStatus = null;
          }

        }, function (error) {
          console.debug('error', error);
          $scope.searchStatus = 'Unexpected error performing search';
          if (error.statusText) {
            $scope.searchStatus += ': ' + error.statusText;
          }
          if (error.data && error.data.message) {
            $scope.searchStatus += ': ' + error.data.message;
          }
        });

      }

      /**
       * Executes a search based on current scope variable searchStr
       * @param appendResults if true, append to existing results; if false,
       *   replace results
       */
      $scope.search = function (appendResults) {

        if (!$scope.searchStr || $scope.searchStr.length < 3) {
          return;
        }

        $scope.searchStatus = 'Searching...';

        // trim the swearch string
        $scope.searchStr = $scope.searchStr.trim();

        // the url to be passed to the helper
        var url = null;

        /* Construct the url based on search query */

        // if a numeric value
        if (!isNaN(parseFloat($scope.searchStr)) && isFinite($scope.searchStr)) {

          // if concept id
          if ($scope.searchStr.substr(-2, 1) === '0') {
            url = $scope.options.serverUrl + '/' + $scope.options.edition + '/' + $scope.options.release + '/concepts/' + $scope.searchStr;
          }

          // if description id
          else if ($scope.searchStr.substr(-2, 1) === '1') {
            url = $scope.options.serverUrl + '/' + $scope.options.edition + '/' + $scope.options.release + '/descriptions/' + $scope.searchStr;
          }

          // cannot be determined
          else {
            $scope.searchStatus = 'Numeric value must correspond to a concept or description id';
            return;
          }
        }

        // otherwise, a text value
        else {

          // partial matching search
          if ($scope.options.searchMode === 'partialMatching') {
            $scope.searchStr = $scope.searchStr.toLowerCase();
          }

          // sample call: /MAIN/descriptions?query=heart&offset=0&limit=50
          url = $scope.options.serverUrl + '/' + $scope.options.edition + '/' + $scope.options.release + '/descriptions?query=' + $scope.searchStr + '&limit=' + $scope.resultsSize + '&offset=' + ($scope.resultsPage - 1) * $scope.resultsSize;
        }

        // Execute the search and set results via helper
        searchHelper(url, appendResults);

      };

      /**
       * Function to load another page of results
       */
      $scope.loadMore = function () {
        $scope.resultsPage++;
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

      $scope.toggleCollapse = function (result) {
        result.showData = !result.showData;
        result.retrieve = true;
      };

      /**
       * Constructs drag/drop concept object for a concept
       * @param concept the concept in browser format: {term, active, concept:
       *   {}}
       * @returns {{id: conceptId, name: fsn}}
       */
      $scope.getConceptPropertiesObj = function (concept) {
        console.debug('Getting concept properties obj', concept);
        return {id: concept.conceptId, name: concept.fsn};
      };

    }]);