'use strict';

angular.module('singleConceptAuthoringApp')
.directive('menuToggle', ['$location', function($location) {
  return {
    restrict: 'A',
    transclude: true,
    replace: true,
    scope: {
      name: '@',
      icon: '@'
    },
    templateUrl: 'shared/menu-toggle/menu-toggle.html',
    link: function(scope, element, attrs) {
      icon = attrs.icon;
      if ( icon ) {
        element.children().first().prepend('<i class="' + icon + '"></i>&nbsp;');
      }

      element.children().first().on('click', function(e) {
        e.preventDefault();
        link = angular.element(e.currentTarget);

        if( link.hasClass('active') ) {
          link.removeClass('active');
        } else {
          link.addClass('active');
        }
      });

      scope.isOpen = function() {
        folder = '/' + $location.path().split('/')[1];
        return folder === attrs.path;
      };
    }
  };
}]);
