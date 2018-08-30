'use strict';
angular.module('singleConceptAuthoringApp')

  .directive('taxonomyTree', function ($rootScope, $q, $modal, snowowlService, $filter, $timeout, metadataService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        concept: '=?',
        branch: '=',
        limit: '@?',
        view: '=',
        defaultView: '=',
        defaultLanguage: '=?'
      },
      templateUrl: 'shared/taxonomy-tree/taxonomyTree.html',

      link: function (scope) {


        // set default limit if not specified (unlimited)
        if (!scope.limit) {
          scope.limit = -1;
        }


        //
        // Function to set set search parameters before each request
        // Ideally would be done once (then toggled), but async/promise metadata retrieval not yet implemented
        //

        // Accept-Language header value
        scope.acceptLanguageValue = null;

        // booelan search flag indicating extension
        scope.searchExtensionFlag = null;

        // boolean search flag indicating whether to retrieve Preferred Term (true) or FSN (false)
        scope.synonymFlag = null;

        // boolean search flag indicating stated (true) vs inferred (false) mode
        scope.statedFlag = false;

        // whether in an extension -- uses preferred synonyms instead of fsns
        scope.isExtension = metadataService.isExtensionSet();


        // TODO Consider moving this into a directive with passed function
        // Handle single and double click events

        scope.clickNode = function (node) {

          // set the click count on this node
          node.clickCt = node.clickCt ? node.clickCt + 1 : 1;

          // if first click, increment and broadcast editConcept if second click not detected
          if (node.clickCt === 1) {

            // single-click functionality
            $timeout(function () {

              // execute only if no further clicks detected
              if (node.clickCt === 1) {
                $rootScope.$broadcast('editConcept', {conceptId: node.conceptId});
              } else {
              }
              node.clickCt = 0;
            }, 500);
          }

          // double-click functionality
          else {
            scope.setRootConcept(node);
            node.clickCt = 0;
          }
        };

        // The root concepts for display
        // NOTE: Must be array (even though SNOMEDCT only has 1 root)
        scope.terminologyTree = [];

        /**
         * Drag and drop object
         * @param conceptId the concept to be dragged
         * @returns {{id: *, name: null}}
         */
        scope.getConceptPropertiesObj = function (concept) {
          return {id: concept.id, name: concept.fsn};
        };

        scope.getCompleteConcept = function(concept) {
          return {concept: concept};
        };

        /**
         * Gets and sets the children for a tree node
         * @param node The parent node
         */
        scope.getAndSetChildren = function (node) {

          var conceptId = node.conceptId;

          snowowlService.getConceptChildren(node.conceptId, scope.branch, scope.acceptLanguageValue, scope.synonymFlag, scope.statedFlag).then(function (children) {

              if (!children || children.length === 0) {
                console.error('Could not retrieve children for node', node);
                node.isLeafInferred = true;
                return;
              }

              angular.forEach(children, function (child) {
                child.isCollapsed = true;
                if (!child.fsn) {
                  child.fsn = child.preferredSynonym;
                }
              });

              node.children = children;
              node.isCollapsed = true;

            },

            function () {
              console.error('Could not retrieve children for node', node);
            }
          );
        };

        scope.getAndSetParents = function (node, preserve) {
          var deferred = $q.defer();
          var conceptId = node.conceptId;

          snowowlService.getConceptParents(node.conceptId, scope.branch, scope.acceptLanguageValue, scope.synonymFlag, scope.statedFlag).then(function (parents) {
              scope.array = [];
              if (!parents) {
                console.error('Could not retrieve parents for node', node);
                deferred.resolve([]);
              }


              angular.forEach(parents, function (parent) {
                parent.isCollapsed = true;
                parent.focusParent = true;
                if (!parent.fsn) {
                  parent.fsn = parent.preferredSynonym;
                }
                scope.array.push(parent);
              });

              if (preserve === true) {
                angular.forEach(scope.terminologyTree, function (item) {
                  if (item.children && item.children.length > 0) {
                    node.children = item.children;
                  }
                });
              }

              node.collapsed = false;
              var newArray = $filter('orderBy')(scope.array, 'fsn', false);
              if (newArray && newArray.length > 0) {
                newArray[newArray.length - 1].children = [];
                newArray[newArray.length - 1].children.push(node);
                newArray[newArray.length - 1].collapsed = false;
              }
              console.log(newArray);

              deferred.resolve(newArray);
            },

            function () {
              console.error('Could not retrieve parents for node', node);
              deferred.resolve([]);
            }
          );
          return deferred.promise;
        };

        var paths = {};
        var parentsCache = [];
        var nodes = {};
        var treesStarted = 1; // the original node
        var treesDone = 0;
        var conceptLoaded = 0; // 1 if concept retrieved
        /**
         * Progress defined as 100 * (1/4 [if concept load complete] + 3/4 * treesDone / treesStarted)
         * @returns {Number}
         */
        scope.getProgress = function () {
          return parseInt(25 * conceptLoaded + 75 * treesDone / treesStarted);
        };

        function mergeTrees() {


          angular.forEach(nodes, function (node) {
            node.children = [];
            angular.forEach(paths[node.conceptId], function (path) {

              // NOTE added to fix strange error where previous searches are not properly clearing the nodes...?
              // each search was somehow preserving the node/path relationship of the root concept to each first-level child
              // put this in as a quick fix, but should investigate it
              // TODO FIX THIS
              if (nodes[path]) {
                node.children.push(nodes[path]);
              }
            });
            if (node.conceptId === scope.concept.conceptId) {
              node.isCollapsed = false;
              scope.getAndSetChildren(node);
            }
          });


          scope.terminologyTree = [];
          scope.terminologyTree.push(nodes['138875005']);

        }

        function addPathSegment(start, finish) {
          if (!paths[start]) {
            paths[start] = [];
          }

          if (paths[start].indexOf(finish) === -1) {
            paths[start].push(finish);
          }
        }

        function getParentsHelper(node) {
          var deferred = $q.defer();

          if (parentsCache[node.conceptId]) {
            deferred.resolve(parentsCache[node.conceptId]);
          } else {


            // get all parents
            snowowlService.getConceptParents(node.conceptId, scope.branch, scope.acceptLanguageValue, scope.synonymFlag, scope.statedFlag).then(function (parents) {
              parentsCache[node.conceptId] = parents;
              deferred.resolve(parents);
            });
          }
          return deferred.promise;
        }

        // NOTE: Path is only for debugging
        scope.constructRootTreesHelper = function (node, path, limit) {

          // check if this node is stored
          if (!nodes.hasOwnProperty(node.conceptId)) {
            nodes[node.conceptId] = node;
          }

          // get all parents
          getParentsHelper(node).then(function (parents) {

            // if root, check if all started tree computations are complete
            if (!parents || parents.length === 0) {
              treesDone++;
              if (treesDone === treesStarted) {
                mergeTrees();
              }
            }

            else {

              var nEligibleParents;
              if (scope.limit === -1) {
                nEligibleParents = parents.length;
                treesStarted += parents.length - 1;
              } else {
                nEligibleParents = scope.limit - treesStarted + 1;
                treesStarted += Math.min(nEligibleParents, parents.length) - 1;
              }


              // add path and recursively call on parents
              for (var i = 0; i < nEligibleParents && i < parents.length; i++) {
                addPathSegment(parents[i].conceptId, node.conceptId);
                nodes[parents[i].conceptId] = parents[i];
              }

            }
          });
        };

        scope.constructRootTrees = function (node) {
          conceptLoaded = 1;
          treesDone = 0; // reset the number of trees calculated
          treesStarted = 1; // the original node
          nodes = {};
          scope.constructRootTreesHelper(node, node.conceptId);
        };

        scope.toggleNode = function (node, nodeScope) {

          // check that node has children
          if (node.isLeafInferred) {
            return;
          }

          // toggle state of the node
          if (!node.focusParent && node.focusParent !== true) {
            nodeScope.toggle();
          }

          // if node open, has children, but no children loaded
          if (!nodeScope.collapsed && node.focusParent && node.focusParent === true && !node.isLeafInferred && (!node.parent)) {
            node.focusParent = false;
            node.collapsed = false;
            scope.getAndSetParents(node, true).then(function (array) {
              scope.terminologyTree = array;
            });
          }
          else if (!nodeScope.collapsed && !node.isLeafInferred && (!node.children || node.children.length === 0)) {
            scope.getAndSetChildren(node);
          }

        };

        scope.getTreeNodeIcon = function (node, collapsed, focusParent) {

          if (!node) {
            return;
          }
          if (node.isLeafInferred) {
            return 'glyphicon glyphicon-minus';
          } else if (collapsed) {
            return 'glyphicon glyphicon-chevron-right';
          }
          else if (focusParent === true) {
            node.isCollapsed = false;
            return 'glyphicon glyphicon-chevron-up';
          } else {
            return 'glyphicon glyphicon-chevron-down';
          }
        };

        scope.getTerm = function (node) {          
          if ((node.preferredSynonym && scope.defaultLanguage && scope.defaultLanguage !== '900000000000509007-fsn')
            ||(!scope.defaultLanguage && scope.synonymFlag)) {
            return node.preferredSynonym;         
          } else {
            return node.fsn; 
          }          
        };

        function initialize() {

          scope.loadComplete = false;
          scope.searchExtensionFlag = metadataService.isExtensionSet();
          scope.synonymFlag = metadataService.isExtensionSet();
        
          if (scope.searchExtensionFlag
              && scope.defaultLanguage !== '900000000000509007-fsn' 
              && scope.defaultLanguage !== '900000000000509007-pt') {
            if (scope.defaultLanguage) {
              scope.acceptLanguageValue = metadataService.getExtensionAcceptLanguageValueByDialectId(scope.defaultLanguage);
            } else {
              scope.acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getCurrentModuleId());
            }                            
          } else {
            scope.acceptLanguageValue = metadataService.getAcceptLanguageValueForModuleId(metadataService.getInternationalModuleId());
          }
         
          if (scope.defaultView && scope.defaultView === 'stated') {
            scope.statedFlag = true;
          } else {
            scope.statedFlag = false;
          }

          if (scope.defaultLanguage) {
            if (scope.defaultLanguage === '900000000000509007-fsn') {
              scope.searchExtensionFlag = false;
              scope.synonymFlag = false;
              scope.acceptLanguageValue = null;
            } else if (scope.defaultLanguage === '900000000000509007-pt') {
              scope.synonymFlag = true;
            } else {
              // do nothing
            }
          }

          // clear any existing trees
          scope.terminologyTree = [];

          var parent = null;

          // if a concept is supplied
          if (scope.concept) {

            parent = scope.concept;
            // add as root tree
            if (scope.view) {
              // if concept supplied has leaf inferred property, start constructing trees
              // NOTE: Specifically checked at this field is used for display
              if (scope.concept.hasOwnProperty('isLeafInferred')) {
                scope.constructRootTrees(scope.concept);
              }

              // otherwise retrieve the full concept to ensure all required information is available (search sometimes fails to return leaf status)
              else {
                snowowlService.getFullConcept(scope.concept.conceptId, scope.branch, scope.acceptLanguageValue).then(function (response) {
                  scope.concept = response;
                  scope.constructRootTrees(scope.concept);
                });
              }
            }
            else {
              if (scope.concept.hasOwnProperty('isLeafInferred')) {
                scope.getAndSetChildren(scope.concept);
                scope.getAndSetParents(scope.concept, false).then(function (array) {
                  scope.terminologyTree = array;
                  scope.loadComplete = true;
                });
              }

              // otherwise retrieve the full concept to ensure all required information is available (search sometimes fails to return laf status)
              else {
                snowowlService.getFullConcept(scope.concept.conceptId, scope.branch, scope.acceptLanguageValue).then(function (response) {
                  scope.getAndSetChildren(response);
                  scope.getAndSetParents(response, false).then(function (array) {
                    scope.terminologyTree = array;
                    scope.loadComplete = true;
                  });
                });
              }
            }

          }

          // if concept id not specified, use root
          else {

            snowowlService.getFullConcept(metadataService.getSnomedCtRootId(), scope.branch, scope.acceptLanguageValue).then(function (parent) {

              // get the children
              scope.getAndSetChildren(parent);

              // clear any existing trees
              // TODO This is because of asynchronous retrieval due to metadata not being set prior to instantiation
              scope.terminologyTree = [];

              // add as root tree
              scope.terminologyTree.push(parent);

            });
          }
        }

        var viewedConceptId = null;
        scope.$watch('concept', function () {
          initialize();
        }, false);

        scope.$watch('defaultView', function () {
          initialize();
        }, false);

        scope.$watch('defaultLanguage', function () {
          initialize();
        }, false);
        
        scope.$on('reloadTaxonomy', function (event, data) {
          initialize();
        });

        // on extension metadata set, update the search parameters
        scope.$on('setExtensionMetadata', function (event, data) {
          initialize();
        });

        scope.setRootConcept = function (node) {
          scope.concept = node;
          initialize();
        };

        scope.openConceptInformationModal = function (node) {
          var modalInstance = $modal.open({
            templateUrl: 'shared/concept-information/conceptInformationModal.html',
            controller: 'conceptInformationModalCtrl',
            resolve: {
              conceptId: function () {
                return node.conceptId;
              },
              branch: function () {
                return scope.branch;
              }
            }
          });

          modalInstance.result.then(function (response) {
            // do nothing
          }, function () {
            // do nothing
          });
        };
      }
    };
  })
;
