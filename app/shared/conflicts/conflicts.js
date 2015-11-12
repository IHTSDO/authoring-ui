'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('conflicts', ['$rootScope', 'ngTableParams', '$routeParams', '$filter', '$timeout', '$modal', '$compile', '$sce', 'scaService', 'objectService', 'snowowlService', 'notificationService',
    function ($rootScope, NgTableParams, $routeParams, $filter, $timeout, $modal, $compile, $sce, scaService, objectService, snowowlService, notificationService) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {

          conflictsContainer: '=',

          // branch this conflict report was generated against
          sourceBranch: '=',

          // branch this conflict report was generated for
          targetBranch: '='

        },
        templateUrl: 'shared/conflicts/conflicts.html',

        link: function (scope) {

          /**
           * Conflict ngTable parameters
           */
          scope.conflictsTableParams = new NgTableParams({
              page: 1,
              count: 10,
              sorting: {fsn: 'asc'},
              orderBy: 'fsn'
            },
            {
              filterDelay: 50,
              total: scope.conflicts ? scope.conflicts.length : 0,

              getData: function ($defer, params) {

                var concepts = scope.conflicts;

                console.debug('conflictsTableParams getData', concepts);

                if (!concepts) {
                  $defer.resolve([]);
                } else {

                  params.total(concepts.length);
                  concepts = params.sorting() ? $filter('orderBy')(concepts, params.orderBy()) : concepts;
                  concepts = concepts.slice((params.page() - 1) * params.count(), params.page() * params.count());
                  console.debug('concepts page', concepts);
                  $defer.resolve(concepts);
                }
              }
            }
          );

          /////////////////////////////////////////////////////
          // Helper functions
          /////////////////////////////////////////////////////

          /**
           * Constructs a map of componentId -> {source, target, merged}
           * @param merge
           */
          function mapComponents(merge) {

            // initialize the mapped components array
            var mappedComponents = {};

            // map descriptions
            angular.forEach(merge.source.descriptions, function (description) {
              if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                mappedComponents[description.descriptionId] = {};
              }
              mappedComponents[description.descriptionId].source = description;
            });

            angular.forEach(merge.target.descriptions, function (description) {
              if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                mappedComponents[description.descriptionId] = {};
              }
              mappedComponents[description.descriptionId].target = description;
            });

            angular.forEach(merge.merged.descriptions, function (description) {
              if (!mappedComponents.hasOwnProperty(description.descriptionId)) {
                mappedComponents[description.descriptionId] = {};
              }
              mappedComponents[description.descriptionId].merged = description;
            });

            // map relationships
            angular.forEach(merge.source.relationships, function (relationship) {
              if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                mappedComponents[relationship.relationshipId] = {};
              }
              mappedComponents[relationship.relationshipId].source = relationship;
            });

            angular.forEach(merge.target.relationships, function (relationship) {
              if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                mappedComponents[relationship.relationshipId] = {};
              }
              mappedComponents[relationship.relationshipId].target = relationship;
            });

            angular.forEach(merge.merged.relationships, function (relationship) {
              if (!mappedComponents.hasOwnProperty(relationship.relationshipId)) {
                mappedComponents[relationship.relationshipId] = {};
              }
              mappedComponents[relationship.relationshipId].merged = relationship;
            });

            return mappedComponents;
          }

          function highlightChanges(merge) {

            // create blank styling object
            var styles = {
              source: {},
              target: {},
              merged: {}
            };

            // map the components for convenience
            var mappedComponents = mapComponents(merge);

            console.debug('mapped components', mappedComponents);

            // cycle over each discovered componentId and check
            // equality/presence
            for (var key in mappedComponents) {

              var c = mappedComponents[key];

              console.debug('----------------------');
              console.debug('Checking components:', c);
              console.debug('----------------------');

              // Case 1: Source component not present in merged component --> Removed in merge
              if (c.source && !c.merged) {
                console.debug('key -> case 1');
                styles.source[key] = {message: null, style: 'redhl'};
              }

              // Case 2: Source component present in merged
              if (c.source && c.merged) {

                // Case 2a: Component not present in target --> Added by source
                if (!c.target) {
                  console.debug('key -> case 2a');
                  styles.source[key] = {message: null, style: 'yellowhl'};
                  styles.merged[key] = {message: null, style: 'yellowhl'};
                }

                // Case 2b: Component present in target, but not equal --> Modified by merge
                // Modified by target
                else if (!objectService.isComponentsEqual(c.source, c.merged)) {
                  console.debug('key -> case 2b');
                  styles.source[key] = {message: null, style: 'yellowhl'};
                  styles.merged[key] = {message: null, style: 'yellowhl'};
                }
              }
              // Case 3: Target component not present in merged component --> Removed in merge
              if (c.target && !c.merged) {
                console.debug('key -> case 3');
                styles.target[key] = {message: null, styles: 'redhl'};
              }

              // Case 4: Target component present in merged
              if (c.target && c.merged) {

                // Case 4a: Component not present in source --> Added by target
                if (!c.source) {
                  console.debug('key -> case 4a');
                  styles.target[key] = {message: null, style: 'orangehl'};
                  styles.merged[key] = {message: null, style: 'orangehl'};
                }

                // Case 4b: Component present in target, but not equal --> Modified by merge
                // Modified by target
                else if (!objectService.isComponentsEqual(c.target, c.merged)) {
                console.debug('key -> case 4b');
                  styles.target[key] = {message: null, style: 'orangehl'};
                  styles.merged[key] = {message: null, style: 'orangehl'};
                }
              }
            }

            console.debug('styles after concept calculation', styles);
            return styles;

          }

          /////////////////////////////////////////////////////
          // Initialization of merge-review functionality
          /////////////////////////////////////////////////////

          scope.conflicts = null;
          scope.viewedMerges = [];

          // on load, generate the review
          snowowlService.getMergeReview(scope.sourceBranch, scope.targetBranch).then(function (response) {
            console.debug('review', response);

            // intiialize the list of conflicts for tabular display
            scope.conflicts = [];

            // initialize the conditional highlighting map (conceptId -> {target -> styles, source -> styles, merged -> styles))
            scope.styles = {};

            ///////////////////////////////////////////
            // Cycle over each type and add to map
            ////////////////////////////////////////////

            // constrcut a map of conceptId -> {source, target, merged concepts}
            var conceptMap = {};

            // add all source concepts
            angular.forEach(response.sourceChanges, function(concept) {
              if (!conceptMap.hasOwnProperty(concept.conceptId)) {
                conceptMap[concept.conceptId] = {conceptId : concept.conceptId, fsn : concept.fsn};
              }
              conceptMap[concept.conceptId].source = concept;
            });

            // add all target concepts
            angular.forEach(response.targetChanges, function(concept) {
              if (!conceptMap.hasOwnProperty(concept.conceptId)) {
                conceptMap[concept.conceptId] = {conceptId : concept.conceptId, fsn : concept.fsn};
              }
              conceptMap[concept.conceptId].target = concept;
            });

            // add all merged concepts
            angular.forEach(response.mergedChanges, function(concept) {
              if (!conceptMap.hasOwnProperty(concept.conceptId)) {
                conceptMap[concept.conceptId] = {conceptId : concept.conceptId, fsn : concept.fsn};
              }
              conceptMap[concept.conceptId].merged = concept;
            });

            for (var key in conceptMap) {

              var concept = conceptMap[key];

              // construct list of conflicts for ng-table display
              var conflict = {
                id: concept.conceptId,
                fsn: concept.fsn
              };

              // push to conflicts list
              scope.conflicts.push(conflict);

              // calculate merge changes
              concept.styles = highlightChanges(concept);

              // add to viewed list
              // TODO Remove this once controls are satisfactory (i.e. don't display by default)
              scope.viewedMerges.push(concept);

            }

            console.debug('viewedMerges', scope.viewedMerges);
            console.debug('conflicts', scope.conflicts);
            console.debug('styles', scope.styles);
            scope.conflictsTableParams.reload();
          });

        }
      };
    }])
;