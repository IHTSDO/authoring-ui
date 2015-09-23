'use strict';
angular.module('singleConceptAuthoringApp.searchPanel', [])

  .controller('searchPanelCtrl', ['$scope', '$rootScope', '$location', 'scaService', 'snowowlService', '$routeParams', function savedListCtrl($scope, $rootScope, $location, scaService, snowowlService, $routeParams) {

    // controller $scope.options
    $scope.branch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
    $scope.resultsPage = 1;
    $scope.resultsSize = 20;
    $scope.results = null;
    $scope.loadMoreEnabled = false;
    $scope.searchStr = '';

    // $scope.options from searchPlugin.js ( not all used)
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

    $scope.search = function () {

      if (!$scope.searchStr || $scope.searchStr.length < 3) {
        return;
      }

      $scope.searchStatus = 'Searching...';

      // partial matching search
      if ($scope.options.searchMode === 'partialMatching') {
        $scope.searchStr = $scope.searchStr.toLowerCase();
      }
      var startTime = Date.now();
      var searchUrl = $scope.options.serverUrl + '/' + $scope.options.edition + '/' + $scope.options.release + '/descriptions?query=' + $scope.searchStr + '&limit=' + $scope.resultsSize + '&searchMode=' + $scope.options.searchMode + '&lang=' + $scope.options.searchLang + '&statusFilter=' + $scope.options.statusSearchFilter + '&skipTo=' + ($scope.resultsPage - 1) * $scope.resultsSize + '&returnLimit=' + $scope.resultsSize;
      if ($scope.options.semTagFilter !== 'none') {
        searchUrl = searchUrl + '&semanticFilter=' + $scope.options.semTagFilter;
      }
      if ($scope.options.langFilter !== 'none') {
        searchUrl = searchUrl + '&langFilter=' + $scope.options.langFilter;
      }
      var xhr = $.getJSON(searchUrl, function (results) {

        // if results not an array, re-initialize
        if (!$scope.results) {
          $scope.results = [];
        }
        $scope.results = $scope.results.concat(results);

        // user cue for status
        if ($scope.results.length === 0) {
          $scope.searchStatus = 'No results'
        } else {
          $scope.searchStatus = null;
        }

        // check if more results may be available
        $scope.loadMoreEnabled = (results.length === $scope.resultsSize);
      });

    };

    $scope.loadMore = function() {
      $scope.resultsPage++;
      $scope.search();
    };

    $scope.clear = function() {
      $scope.searchStr = '';
      $scope.resultsPage = 1;
      $scope.results = [];
    };

    $scope.saveUiStateForTask = function (projectKey, taskKey, panelId, uiState) {
      scaService.saveUiStateForTask(
        projectKey, taskKey, panelId, uiState)
        .then(function (uiState) {
        });
    };

    $scope.addItemToSavedList = function (item) {

      if (!item) {
        return;
      }

      // if not already in saved list
      if ($scope.findItemInSavedList(item) === false) {
        // push component on list and update ui state
        $scope.savedList.items.push(item);
        $scope.saveUiStateForTask($routeParams.projectKey, $routeParams.taskKey, 'saved-list', $scope.savedList);
      }
    };

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

// drag and drop object
// NOTE: Search plugin returns weird names it seems
// so leave retrieval to the drop target function
    $scope.getConceptPropertiesObj = function (conceptId) {
      console.debug('Getting concept properties obj', conceptId);
      return {id: conceptId, name: null};
    };

  }]);