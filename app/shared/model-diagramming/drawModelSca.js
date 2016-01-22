/**
 * Wrapper directive to hold two models with a single header
 * Only intended for use with two versions of the same concept (same SCTIDs)
 */

'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .directive('drawModelSca', ['$rootScope',
    function(rootScope) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        concept: '=',
        conceptAfter : '=?',
        classificationSaved: '@?',
        snfFunction : '&?'
      },
      templateUrl: 'shared/model-diagramming/drawModelSca.html',

      link: function (scope, element, attrs, linkCtrl, snowowlService) {


        // convert string to boolean value
        if (scope.classificationSaved === 'true') {
          scope.isClassificationSaved = true;
        } else {
          scope.isClassificationSaved = false;
        }


        console.debug('entered drawModelSca', scope.classificationSaved, scope.concept, scope.conceptAfter)

        // broadcast taxonomy request
        scope.viewConceptInTaxonomy = function (concept) {
    //      console.debug('broadcasting viewTaxonomy event to taxonomy.js', concept);
          rootScope.$broadcast('viewTaxonomy', {
            concept: {
              conceptId: concept.conceptId,
              fsn: concept.fsn
            }
          });
        };
        scope.getSNF = function(){
            scope.snfFunction({conceptId : scope.concept.conceptId}).then(function(response) {
                scope.conceptSNF = response;
                scope.view = 'snf'
            });
        }

        // on open image requests, broadcast concept id to drawModel.js
        scope.openImage = function() {
          rootScope.$broadcast('openDrawModelConceptImage', {conceptId : scope.concept.conceptId});
        }
      }
    }
  }]);