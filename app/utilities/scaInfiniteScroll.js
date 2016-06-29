'use strict';
//Directive used within the edit panel to load in concepts based upon the scroll position against the window.
angular.module('singleConceptAuthoringApp')
.directive('scaInfiniteScroll', [
    '$rootScope', '$window', '$timeout', function ($rootScope, $window, $timeout) {
      return {
        link: function (scope, elem, attrs) {
          var checkWhenEnabled, handler, scrollDistance, scrollEnabled;
          $window = angular.element($window);
          elem.css('overflow-y', 'scroll');
          elem.css('overflow-x', 'hidden');
          elem.css('height', 'inherit');
          scrollDistance = 0;
          console.log('Configuring infinite scroll');
          //attr checking is used to detect the infinite scroll params
          if (attrs.scaInfiniteScrollDistance !== null) {
            scope.$watch(attrs.scaInfiniteScrollDistance, function (value) {
                var result;
                result = scrollDistance = parseInt(value, 10);
              return result;
            });
          }
          scrollEnabled = true;
          checkWhenEnabled = false;
          //used to check for conditions that would disabled scrolling (intended for use while the DOM is loading or an XHR is in progress for example)
          if (attrs.scaInfiniteScrollDisabled !== null) {
            scope.$watch(attrs.scaInfiniteScrollDisabled, function (value) {
              scrollEnabled = !value;
              if (scrollEnabled && checkWhenEnabled) {
                checkWhenEnabled = false;
                return handler();
              }
            });
          }
          //Resets the scroll position on page refresh
          $rootScope.$on('refreshStart', function (event, parameters) {
            elem.animate({scrollTop: '0'});
          });
          handler = function () {

            var shouldScroll;
            shouldScroll = ($(document).height() - $(window).height()) - $(window).scrollTop() < 400;
            if (shouldScroll && scrollEnabled) {
              if ($rootScope.$$phase) {
                return scope.$eval(attrs.scaInfiniteScroll);
              } else {
                return scope.$apply(attrs.scaInfiniteScroll);
              }
            } else if (shouldScroll) {
                checkWhenEnabled = true;
              return checkWhenEnabled;
            }
          };
          $(window).on('scroll', handler);
          scope.$on('$destroy', function () {
            return $window.off('scroll', handler);
          });
          return $timeout(function () {
            if (attrs.scaInfiniteScrollImmediateCheck) {
              if (scope.$eval(attrs.scaInfiniteScrollImmediateCheck)) {
                return handler();
              }
            } else {
              return handler();
            }
          }, 0);
        }
      };
    }
  ]);
