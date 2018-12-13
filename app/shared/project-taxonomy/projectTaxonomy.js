'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('projectTaxonomy', function ($rootScope, $q, snowowlService) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        concept: '=',        
        branch: '=', // task branch
        view: '=?',
      },
      templateUrl: 'shared/project-taxonomy/projectTaxonomy.html',

      link: function (scope, element) {       

        scope.projectConcept = null;
        scope.loadingCompleted = false;
        scope.projectConceptFound = false;
        scope.projectBranch = null;

        scope.closeTaxonomy = function () {
          scope.projectConcept = null;
        };

        function getParentBranch (branch) {
          if (!branch) {
            return '';
          }

          return branch.substring(0,branch.lastIndexOf('/'));
        }

        function setLayoutWidth() {
          let documentResult = document.getElementsByClassName('sidebar-bg');
          let wrappedDocumentResult = angular.element(documentResult);
          let width = wrappedDocumentResult[0].clientWidth !== 0 ? wrappedDocumentResult[0].clientWidth : wrappedDocumentResult[1].clientWidth;    
          let elementResult = element[0].querySelector('.custom-width');
          elementResult.style.width = (width + 30) + 'px';
        }

        function intialize() {
          scope.projectBranch = getParentBranch(scope.branch);

          if (scope.projectBranch === '') {
            console.error('Project branch is not definied.');
          }
          
          snowowlService.getFullConcept(scope.concept.conceptId, scope.projectBranch).then(function (response){
            scope.projectConcept = {};
            scope.projectConcept.conceptId = response.conceptId;
            scope.projectConcept.fsn = response.fsn;
                     
            scope.loadingCompleted = true;
            scope.projectConceptFound = true;
          }, function (error) {
            if (error.status === 404) {
              scope.loadingCompleted = true;
              scope.projectConceptFound = false;
            } else {
              console.error('Error retrieving concept from project branch');
            }            
          });

          // set width for project taxonomy similar to side bar
          setLayoutWidth();
        }
        intialize();

      }
    };
  })
;
