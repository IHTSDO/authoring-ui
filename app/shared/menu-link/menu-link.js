'use strict';

angular.module('singleConceptAuthoringApp')
.directive('menuLink', function() {
  return {
    restrict: 'A',
    transclude: true,
    replace: true,
    scope: {
      href: '@',
      icon: '@',
      name: '@'
    },
    templateUrl: 'shared/menu-link/menu-link.html',
    controller: ['$element', '$location', '$rootScope', function($element, $location, $rootScope) {
      this.getName = function(name) {
        if ( name !== undefined ) {
          return name;
        } else {
          return $element.find('a').text().trim();
        }
      };

      this.setBreadcrumb = function(name) {
        $rootScope.pageTitle = this.getName(name);
      };

      this.isSelected = function(href) {
        return $location.path() === href.slice(1, href.length);
      };
    }],
    link: function(scope, element, attrs, linkCtrl) {
      var icon = attrs.icon;
      if ( icon ) {
        element.children().first().prepend('<i class="' + icon + '"></i>&nbsp;');
      }

      if ( linkCtrl.isSelected(attrs.href) ) {
        linkCtrl.setBreadcrumb(attrs.name);
      }

      element.click(function(){
        linkCtrl.setBreadcrumb(attrs.name);
      });

      scope.isSelected = function() {
        return linkCtrl.isSelected(attrs.href);
      };
    }
  };
});
