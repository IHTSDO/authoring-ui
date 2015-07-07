'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptDescription', function () {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        description: '=description'
      },
      templateUrl: 'shared/concept-description/conceptDescription.html',

      link: function (scope, element, attrs, linkCtrl) {

        console.debug('concept-description link, description');

        if (!scope.description) {
          return;
        }

        // If no acceptability map, add one (probably unnecessary, but html requires array)
        // TODO:  Remove this later once acceptability handling is in
        if (!scope.description.acceptabilityMap || scope.description.acceptabilityMap.length === 0) {
          scope.description.acceptabilityMap = {
            900000000000508004: '',
            900000000000509007: ''
          };
        }
        // Define available languages
        scope.languages = [
          {id: 'en', abbr: 'en'}
        ];

        // Define definition types
        scope.typeIds = [
          {id: '900000000000003001', abbr: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN'},
          {id: '900000000000550004', abbr: 'DEF'}
        ];

        // define acceptability types
        scope.acceptabilities = [
          {id: 'PREFERRED', abbr: 'Preferred'},
          {id: 'ACCEPTABLE', abbr: 'Acceptable'},
          {id: 'NOT ACCEPTABLE', abbr: 'Not acceptable'}
        ];

      }
    };
  });
