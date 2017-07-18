/**
 * Created by QuyenLy on 7/13/2017.
 */
(function(){
  'use strict';
  angular.module('singleConceptAuthoringApp').directive('autogrow', ['$window','$timeout', function($window,$timeout){
    return {
      require: 'ngModel',
      link: function($scope, $element, $attrs, ngModel){
        /**
         * Default settings
         */
        $scope.attrs = {
          rows: 1,
          maxLines: 999
        };

        /**
         * Merge defaults with user preferences
         */
        for(var i in $scope.attrs){
          if($attrs[i]){
            $scope.attrs[i] = parseInt($attrs[i]);
          }
        }

        /**
         * Calculates the vertical padding of the element
         * @returns {number}
         */
        $scope.getOffset = function(){
          var style = $window.getComputedStyle($element[0], null),
            props = ['paddingTop', 'paddingBottom'],
            offset = 0;

          for(var i=0; i<props.length; i++){
            offset += parseInt(style[props[i]]);
          }
          return offset;
        };

        /**
         * Sets textarea height as exact height of content
         * @returns {boolean}
         */
        $scope.autogrowFn = function(){
          var newHeight = 0, hasGrown = false;
          if(($element[0].scrollHeight - $scope.offset) > $scope.maxAllowedHeight){
            $element[0].style.overflowY = 'scroll';
            newHeight = $scope.maxAllowedHeight;
          }
          else {
            $element[0].style.overflowY = 'hidden';
            $element[0].style.height = 'auto';
            newHeight = $element[0].scrollHeight;
            hasGrown = true;
          }
          $element[0].style.height = newHeight + 'px';
          return hasGrown;
        };

        $scope.offset = $scope.getOffset();
        $scope.lineHeight = 1.5;
        $scope.maxAllowedHeight = ($scope.lineHeight * $scope.attrs.maxLines) - $scope.offset;

        $element[0].addEventListener('input', $scope.autogrowFn);      

        /**
         * Auto grown height while initializing
         */
        $timeout(function(){
          $scope.autogrowFn();
        }, 500);

        /**
         * Auto-resize when there's content on page load
         */
        if($element[0].value != ''){
          $scope.autogrowFn();
        }
      }
    }
  }]);
})();
