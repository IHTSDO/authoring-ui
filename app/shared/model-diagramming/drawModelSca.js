/**
 * Wrapper directive to hold two models with a single header
 * Only intended for use with two versions of the same concept (same SCTIDs)
 */

'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .directive('drawModelSca', ['$rootScope','$routeParams','savedListService','terminologyServerService',
    function(rootScope, routeParams, savedListService, terminologyServerService) {
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

      link: function (scope, element, attrs, linkCtrl) {

        scope.savedList = {items: []};
        scope.isSctid = terminologyServerService.isSctid;

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

        scope.clone = function (concept) {
          if (concept && scope.isSctid(concept.conceptId)) {
            rootScope.$broadcast('cloneConcept', {conceptId: concept.conceptId});
          }
        };

        scope.addItemToSavedList = function (concept) {
          if(scope.isInSavedList(concept.conceptId) || !scope.isSctid(concept.conceptId)) return;
          var item = {};
          item.active = concept.active;

          var miniConcept = {};
          miniConcept.active = concept.active;
          miniConcept.conceptId = concept.conceptId;          
          miniConcept.definitionStatus = concept.definitionStatus;
          miniConcept.fsn = concept.fsn;
          miniConcept.moduleId = concept.moduleId;
          miniConcept.preferredSynonym = concept.preferredSynonym;
          miniConcept.term = concept.term;

          item.concept = miniConcept;
          savedListService.addItemToSavedList(item, routeParams.projectKey, routeParams.taskKey);
        };

        scope.isInSavedList = function (id) {
          if (!scope.savedList || !scope.savedList.items) {
            return false;
          }
  
          for (let i = 0, len = scope.savedList.items.length; i < len; i++) {
            if (scope.savedList.items[i].concept.conceptId === id) {
              return true;
            }
          }
          return false;
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

            scope.resetImageSize();
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
        
        scope.resetImageSize = function () {
          var scaModel = $('#image-' + scope.concept.conceptId);
          var parentTag = $(scaModel).parent().get(0);
          
          if( $(parentTag).css('max-height') !== 'none' ) {
            $(parentTag).css('max-height', '');
          }
          if( $(parentTag).css('max-width') !== 'none' ) {
            $(parentTag).css('max-width', '');
          }

          scope.zoomPercentage = 100;
        }
        
        scope.$watch(function () {
            return savedListService.savedList;
          },
          function(newVal, oldVal) {
            scope.savedList = newVal;
        }, true);
      }
    }
  }]);
