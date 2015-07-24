'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classification', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', function ($rootScope, $filter, NgTableParams, $routeParams, snowowlService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the branch
        branch: '=branch'
      },
      templateUrl: 'shared/classification/classification.html',

      link: function (scope, element, attrs, linkCtrl) {

        if (!scope.branch) {
          console.error('Classification display requires branch');
          return;
        }

        // helper function to populate names for all relationship display names
        function getRelationshipNames(relationship) {
          // get source name
          snowowlService.getConceptPreferredTerm(relationship.sourceId, scope.branch).then(function (response) {
            relationship.sourceName = response.term;
          });
          // get destination name
          snowowlService.getConceptPreferredTerm(relationship.destinationId, scope.branch).then(function (response) {
            relationship.destinationName = response.term;
          });
          // get type name
          snowowlService.getConceptPreferredTerm(relationship.typeId, scope.branch).then(function (response) {
            relationship.typeName = response.term;
          });
        }
        $rootScope.$on('comparativeModelAdded', function (event, model) {
            snowowlService.getFullConcept(model.id, scope.branch).then(function(response){
                console.log(response);
                var temp = response;
                temp.conceptId = 'Before: ' + temp.conceptId;
                scope.modelConcept = response;
                snowowlService.getModelPreview(scope.classification.id, scope.branch, model.id).then(function(secondResponse){
                    scope.modelConceptAfter = secondResponse;
                    console.log(secondResponse);
                    scope.displayModels = true;
                    scope.resizeClassificationSvg(scope.modelConcept);
                    scope.resizeClassificationSvg(scope.modelConceptAfter);
                });
            });
        });
        scope.resizeClassificationSvg = function (concept) {
            var elem = document.getElementById('model' + concept.conceptId);
            var parentElem = document.getElementById('drawModel' + concept.conceptId);

            if (!elem || !parentElem) {
              return;
            }

            // set the height and width`
            var width = parentElem.offsetWidth - 30;
            var height = $('#editPanel-' + concept.conceptId).find('.editHeightSelector').height() + 41;
            if (width < 0) {
              return;
            }

            elem.setAttribute('width', width);
            elem.setAttribute('height', height);
        };
        

        // notification of classification retrieved and set
        $rootScope.$on('setClassification', function (event, classification) {

          if (!classification) {
            console.error('Received setClassification notification, but no classification was sent');
            return;
          }

          scope.classification = classification;

          // get the relationship names
          angular.forEach(scope.classification.relationshipChanges, function (item) {
            getRelationshipNames(item);
          });
          angular.forEach(scope.classification.equivalentConcepts, function (item) {
            getRelationshipNames(item);
          });

          // sort the changed relationships
          scope.classification.redundantStatedRelationships = [];
          scope.classification.classificationResults = [];

          angular.forEach(scope.classification.relationshipChanges, function (item) {
            // check for inferred
            if (item.changeNature === 'INFERRED') {
              scope.classification.classificationResults.push(item);
            }

            // check for redundant
            else if (item.changeNature === 'REDUNDANT') {
              scope.classification.redundantStatedRelationships.push(item);
            }

            // log any errors
            else {
              console.warning('Unhandled relationship change with change nature ' + item.changeNature, item);
            }
          });


        });
      }

    };
  }]);