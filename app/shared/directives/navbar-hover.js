'use strict';
// jshint ignore: start
angular.module('angularAppTemplateApp')
.directive('navbarScroll', function($window) {
  return {
    restrict: 'A',
    link: function(scope, element, attr) {
      var navbar = angular.element('.main-container .navbar');
      angular.element($window).bind('scroll', function() {
        if (this.pageYOffset > 0) {
          navbar.addClass('scroll');
        } else {
          navbar.removeClass('scroll');
        }
      });
    }
  };
});