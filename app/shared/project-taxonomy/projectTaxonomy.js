'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('projectTaxonomy', function ($rootScope, $q, terminologyServerService) {
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
        scope.loadComplete = false;
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

        function adjustTaxonomyWidth() {
          let documentResult = document.getElementsByClassName('sidebar-bg');        
          let taskTaxonomyPanel = documentResult[0].getElementsByClassName('taxonomy-panel');
          let width = taskTaxonomyPanel[0].clientWidth !== 0 ? taskTaxonomyPanel[0].clientWidth : documentResult[0].clientWidth;    
          let elementResult = element[0].querySelector('.project-taxonomy-panel');
          elementResult.style.width = width + 'px';
        }

        function intialize() {
          scope.projectBranch = getParentBranch(scope.branch);
          adjustTaxonomyWidth();
          if (scope.projectBranch === '') {
            console.error('Project branch is not definied.');
          }
          
          terminologyServerService.getFullConcept(scope.concept.conceptId, scope.projectBranch).then(function (response){
            scope.projectConcept = {};
            scope.projectConcept.conceptId = response.conceptId;
            scope.projectConcept.fsn = response.fsn;
                     
            scope.loadComplete = true;
            scope.projectConceptFound = true;
            setTimeout(function() {
              adjustTaxonomyWidth();
            }, 2000);            
          }, function (error) {
            if (error.status === 404) {
              scope.loadComplete = true;
              scope.projectConceptFound = false;
            } else {
              console.error('Error retrieving concept from project branch');
            }            
          });
        }

        intialize();

      }
    };
  })
;
