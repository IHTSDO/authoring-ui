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
        conceptAfter : '=?'
      },
      templateUrl: 'shared/model-diagramming/drawModelSca.html',

      link: function (scope, element, attrs, linkCtrl, snowowlService) {

        console.debug('entered drawModelSca', scope.concept, scope.conceptAfter)

        // broadcast taxonomy request
        scope.viewConceptInTaxonomy = function (concept) {
          console.debug('broadcasting viewTaxonomy event to taxonomy.js', concept);
          rootScope.$broadcast('viewTaxonomy', {
            concept: {
              conceptId: concept.conceptId,
              fsn: concept.fsn
            }
          });
        };

        // on open image requests, broadcast concept id to drawModel.js
        scope.openImage = function() {
          rootScope.$broadcast('openDrawModelConceptImage', {conceptId : scope.concept.conceptId});
        }
      }
    }
  }]);