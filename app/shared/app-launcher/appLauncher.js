angular.module('singleConceptAuthoringApp')
  .directive('closePopoverOnClickOutside', function ($document) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        var handler = function (event) {
          if (!element[0].contains(event.target) && !angular.element(event.target).closest('.popover').length) {
            scope.$apply(function () {
              scope.$eval(attrs.closePopoverOnClickOutside);
            });
          }
        };

        $document.on('click', handler);

        scope.$on('$destroy', function () {
          $document.off('click', handler);
        });
      }
    };
  })
  .directive('appLauncher', ['$rootScope', function ($rootScope) {
    return {
      restrict: 'EA',
      scope: {
        apps: '='
      },
      templateUrl: 'shared/app-launcher/appLauncher.html',
      link: function (scope, element, attrs) {

        scope.appsByGroup = function (group) {
          return scope.apps ? scope.apps.filter(function (app) {
            return app.group === group;
          }) : [];
        };

        scope.redirectTo = function (url) {
          window.open(url, '_blank');
        };

        scope.closePopover = function () {
          setTimeout(function () {
            $('.app-launcher-popover').each(function () {
              if ($(this).hasClass("in")) {
                document.getElementById('app-launcher-btn').click();
              }
            });
          }, 0);
        };
      }
    };
  }]);