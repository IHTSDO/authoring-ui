'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('popover', function () {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        component: '=component',
        branch: '=branch',
        updateComponentFn: '=updateComponentFn'
      },
      templateUrl: 'shared/popover/popover.html',

      link: function (scope, element, attrs, linkCtrl) {

        // TODO Insert component specific logic here
        console.debug('popover entered', scope.component, scope.branch, scope.updateComponentFn);
      }
    };
  });
