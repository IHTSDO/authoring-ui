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
        snfFunction : '&?',
        displaySnf : '=?',
        defaultView : '=?'
      },
      templateUrl: 'shared/model-diagramming/drawModelSca.html',

      link: function (scope, element, attrs, linkCtrl, snowowlService) {


        // convert string to boolean value
        if (scope.classificationSaved === 'true') {
          scope.isClassificationSaved = true;
        } else {
          scope.isClassificationSaved = false;
        }

        if (scope.defaultView) {
          scope.view = scope.defaultView;
        }

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
            scope.loading = true;
            if(scope.conceptSNF === null || scope.conceptSNF === undefined || angular.equals({}, scope.conceptSNF))
            {
                scope.snfFunction({conceptId : scope.concept.conceptId}).then(function(response) {
                    console.log(response);
                    scope.conceptSNF = response;
                    scope.view = 'snf';
                    scope.loading = false;
                });
            }
            else{
                scope.view = 'snf';
                scope.loading = false;
            }
        }

        // on open image requests, broadcast concept id to drawModel.js
        scope.openImage = function() {
          rootScope.$broadcast('openDrawModelConceptImage', {conceptId : scope.concept.conceptId});
        }

        // Zoom in/out function
        scope.zoomPercentage = 100;
        var originalSCAModelWidth = null;
        var zoomArray = [25,33,50,67,75,80,90,100,110,125,150,175,200,250,300,400,500];
        scope.zoom = function(indicator) {
          var scaModel = $('#image-' + scope.concept.conceptId);
          var parentTag = $(scaModel).parent().get(0);
          var height = $(parentTag).height();
          var width = $(parentTag).width();
          if( $(parentTag).css('max-height') === 'none' ) {
            $(parentTag).css('max-height', height + 'px');
          }
          if( $(parentTag).css('max-width') === 'none' ) {
            $(parentTag).css('max-width', width + 'px');
          }
          if (!originalSCAModelWidth) {
            originalSCAModelWidth = $(scaModel).width();
          }

          var index = zoomArray.indexOf(scope.zoomPercentage);
          if (indicator === 'in') {
            if (zoomArray[index + 1]) {
              scope.zoomPercentage = zoomArray[index + 1];
            }
          } else if (indicator === 'out'){
            if (zoomArray[index - 1]) {
              scope.zoomPercentage = zoomArray[index - 1];
            }
          } else {
            // do nothing
          }
          $(scaModel).css('max-height','unset');
          $(scaModel).css('max-width', 'unset');
          if (index !== -1) {
            $(scaModel).css('width', (originalSCAModelWidth * scope.zoomPercentage / 100) +  'px');
          }
        };
        
      }
    }
  }]);
