'use strict';
angular.module('singleConceptAuthoringApp')

  .directive('taxonomyTree', function ($rootScope, $q, $modal, snowowlService, $filter) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        concept: '=?',
        branch: '=',
        limit: '@?',
        view: '='
      },
      templateUrl: 'shared/taxonomy-tree/taxonomyTree.html',

      link: function (scope) {

        //console.debug('entered taxonomyTree', scope.branch, scope.concept,
        // scope.limit);

        // set default limit if not specified (unlimited)
        if (!scope.limit) {
          scope.limit = -1;
        }

        // The root concepts for display
        // NOTE: Must be array (even though SNOMEDCT only has 1 root)
        scope.terminologyTree = [];

        /**
         * Drag and drop object
         * @param conceptId the concept to be dragged
         * @returns {{id: *, name: null}}
         */
        scope.getConceptPropertiesObj = function (concept) {
          //console.debug('Getting concept properties obj', concept);
          return {id: concept.id, name: concept.fsn};
        };

        /**
         * Gets and sets the children for a tree node
         * @param node The parent node
         */
        scope.getAndSetChildren = function (node) {

          var conceptId = node.conceptId;

          snowowlService.getConceptChildren(node.conceptId, scope.branch).then(function (children) {
              if (!children) {
                console.error('Could not retrieve children for node', node);
                return;
              }

              angular.forEach(children, function (child) {
                child.isCollapsed = true;
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

          snowowlService.getConceptParents(node.conceptId, scope.branch).then(function (parents) {
              scope.array = [];
              if (!parents) {
                console.error('Could not retrieve children for node', node);
                deferred.resolve([]);
              }

              angular.forEach(parents, function (parent) {
                parent.isCollapsed = true;
                parent.focusParent = true;
                scope.array.push(parent);
              });
              
              if(preserve === true){
                  angular.forEach(scope.terminologyTree, function (item) {
                    if(item.children && item.children.length > 0)
                    {
                        node.children = item.children;
                    }
                  });
              }
              
              node.collapsed = false;
              var newArray = $filter('orderBy')(scope.array, 'fsn', false);
              newArray[newArray.length -1].children = [];
              newArray[newArray.length -1].children.push(node);
              newArray[newArray.length -1].collapsed = false;
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

          //console.debug('paths', paths);
          //console.debug('nodes', nodes)

          angular.forEach(nodes, function (node) {
            //console.debug('constructing node', node);
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

          console.debug('final result', nodes['138875005']);

          scope.terminologyTree = [];
          scope.terminologyTree.push(nodes['138875005']);

        }

        function addPathSegment(start, finish) {
          //  //console.debug('adding path', start, finish, paths);
          if (!paths[start]) {
            paths[start] = [];
          }

          if (paths[start].indexOf(finish) === -1) {
            paths[start].push(finish);
          }

          //  //console.debug('new paths', paths);
        }

        function getParentsHelper(node) {
          var deferred = $q.defer();

          if (parentsCache[node.conceptId]) {
            deferred.resolve(parentsCache[node.conceptId]);
          } else {
            // get all parents
            snowowlService.getConceptParents(node.conceptId, scope.branch).then(function (parents) {
              parentsCache[node.conceptId] = parents;
              deferred.resolve(parents);
            });
          }
          return deferred.promise;
        }

        // NOTE: Path is only for debugging
        scope.constructRootTreesHelper = function (node, path, limit) {

          //console.debug('constructing tree for path/node', path, node);

          // check if this node is stored
          if (!nodes.hasOwnProperty(node.conceptId)) {
            //console.debug('adding node', node);
            nodes[node.conceptId] = node;
          }

          // get all parents
          getParentsHelper(node).then(function (parents) {

          //  console.debug('parents for ', node.conceptId, parents);

            // if root, check if all started tree computations are complete
            if (!parents || parents.length === 0) {
              treesDone++;
             // console.debug('treesDone/treesStarted', treesDone, treesStarted);
              if (treesDone === treesStarted) {
                mergeTrees();
              }
            }

            else {

              var nEligibleParents;
              if (scope.limit === -1) {
                //console.debug('unlimited parents');
                nEligibleParents = parents.length;
                treesStarted += parents.length - 1;
              } else {
                //console.debug('limited parents');
                nEligibleParents = scope.limit - treesStarted + 1;
                treesStarted += Math.min(nEligibleParents, parents.length) - 1;
              }

             // console.debug('limit/started/done/eligible', scope.limit, treesStarted, treesDone, nEligibleParents);

              // add path and recursively call on parents
              for (var i = 0; i < nEligibleParents && i < parents.length; i++) {
                //console.debug(i, parents[i]);
                addPathSegment(parents[i].conceptId, node.conceptId);
                nodes[parents[i].conceptId] = parents[i];
                //scope.constructRootTreesHelper(parents[i], parents[i].conceptId + '~' + path);
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
          if(!node.focusParent && node.focusParent !== true)
          {
            nodeScope.toggle();
          }

          // if node open, has children, but no children loaded
          if (!nodeScope.collapsed && node.focusParent && node.focusParent === true && !node.isLeafInferred && (!node.parent)) {
            node.focusParent = false;
              node.collapsed = false;
            scope.getAndSetParents(node, true).then(function(array){
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
          }else {
            return 'glyphicon glyphicon-chevron-down';
          }
        };

        function initialize() {

          console.debug('initializing with concept (null = SNOMEDCT root)', scope.concept);


          // clear any existing trees
          scope.terminologyTree = [];

          // if a concept is supplied
          if (scope.concept) {

            var parent = scope.concept;
            // add as root tree
            if(scope.view){
                // if concept supplied has leaf inferred property, start constructing trees
                if (scope.concept.hasOwnProperty('isLeafInferred')) {
                  scope.constructRootTrees(scope.concept);
                }

                // otherwise retrieve the full concept to ensure all required information is available (search sometimes fails to return laf status)
                else {
                  snowowlService.getFullConcept(scope.concept.conceptId, scope.branch).then(function(response) {
                    scope.concept = response;
                    scope.constructRootTrees(scope.concept);
                  });
                }
            }
            else{
                // get the parents
                scope.getAndSetChildren(parent);
                scope.getAndSetParents(parent, false).then(function(array){
                scope.terminologyTree = array;
            });
            }

          }

          // if concept id not specified, use root
          else {

            // declare parent concept
            var parent = {
              active: true,
              conceptId: 138875005,
              definitionStatus: 'PRIMITIVE',
              fsn: 'SNOMED CT Concept',
              isLeafInferred: false,
              isLeafStated: false,
            };

            // get the children
            scope.getAndSetChildren(parent);

            console.debug(parent);
            // add as root tree
            scope.terminologyTree.push(parent);
          }
        }

        var viewedConceptId = null;
        scope.$watch('concept', function () {
          console.debug('taxonomyTree concept changed from/to', viewedConceptId, scope.concept ? scope.concept.conceptId : 'null');

          // only re-initialize if the requested concept is different than the currently viewed concept
//          if (scope.concept && scope.concept.conceptId !== viewedConceptId) {
//            viewedConceptId = scope.concept.conceptId;
//            initialize();
//          } else if (!scope.concept) {
            initialize();
//          }

        }, true);
        
        scope.$on('reloadTaxonomy', function(event, data) {
            initialize();
        });
          
        scope.setRootConcept = function(node){
            scope.concept = node;
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