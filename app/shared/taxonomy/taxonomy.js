'use strict';
angular.module('singleConceptAuthoringApp.taxonomyPanel', [])

  .controller('taxonomyPanelCtrl', ['$scope', '$rootScope', '$location', '$routeParams', '$q', '$http', 'notificationService', 'scaService',
    function taxonomyPanelCtrl($scope, $rootScope, $location, $routeParams, $q, $http, notificationService, scaService) {

      $scope.branch = 'MAIN/' + $routeParams.projectKey + '/' + $routeParams.taskKey;
      $scope.options = {
        serverUrl: '/snowowl',
        edition: 'snomed-ct/v2/browser',
        release: 'MAIN',
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

      // The root concepts for display
      // NOTE: Must be array (even though SNOMEDCT only has 1 root)
      $scope.terminologyTree = [];

      /**
       * Drag and drop object
       * @param conceptId the concept to be dragged
       * @returns {{id: *, name: null}}
       */
      $scope.getConceptPropertiesObj = function (concept) {
        console.debug('Getting concept properties obj', concept);
        return {id: concept.id, name: concept.fsn};
      };

      /**
       * Gets and sets the children for a tree node
       * @param node The parent node
       */
      $scope.getAndSetChildren = function (node) {


        var conceptId = node.conceptId;

        $http.get($scope.options.serverUrl + '/' + $scope.options.edition + '/' + $scope.branch + '/concepts/' + conceptId + '/children').then(function (response) {

          if (!response || !response.data) {
            console.error('Could not retrieve children for node', node);
            return;
          }

          node.children = response.data;


        }, function () {
          console.error('Could not retrieve children for node', node);
        });
      };

      $scope.toggleNode = function (node, nodeScope) {


        // check that node has children
        if (node.isLeafInferred) {
          return;
        }

        // toggle state of the node
        nodeScope.toggle();

        // if node open, has children, but no children loaded
        if (!nodeScope.collapsed && !node.isLeafInferred && (!node.children || node.children.length === 0)) {
         $scope.getAndSetChildren(node);
        }

      };

      $scope.getTreeNodeIcon = function (node, collapsed) {
        if (node.isLeafInferred) {
          return 'glyphicon glyphicon-minus';
        } else if (collapsed) {
          return 'glyphicon glyphicon-chevron-right';
        } else {
          return 'glyphicon glyphicon-chevron-down';
        }
      };

      function initialize() {

        // declare parent concept
        var parent = {
          active: true,
          conceptId: 138875005,
          definitionStatus: 'PRIMITIVE',
          fsn: 'SNOMED CT Concept',
          isLeafInferred: false,
          isLeafStated: false,
          moduleId: '900000000000207008'
        };

        // get the children
        $scope.getAndSetChildren(parent);

        // add as root tree
        $scope.terminologyTree.push(parent);
      }

      // call initialization
      initialize();
    }]);