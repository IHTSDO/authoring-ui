/**
 * Created by QuyenLy on 08/28/2017.
 */
(function(){
  'use strict';
  angular.module('singleConceptAuthoringApp')
  .directive('fullHeight', ['$parse', function($parse) {
    return {
      scope: {
          additionalPaddingBottom: '@?' // Specify more additional padding bottom
      },
      link: function(scope, elem, attrs) {
        var fn = $parse(attrs.fullHeight);
        var eleHeight = 0;
        var posEnd = 0;
        var additionalPaddingBottom = 0;
        if(scope.additionalPaddingBottom) {
          additionalPaddingBottom = scope.additionalPaddingBottom;
        }
       
        scope.$watch(function() {
          return elem.height();
        }, function(newHeight) {
          if(newHeight > 0) {
            eleHeight = newHeight;
            var posStart = angular.element(elem).prop('offsetTop');
            var endElem = angular.element(document.querySelector(".sca-footer"));
            posEnd = angular.element(endElem).prop('offsetTop');
            var newEleHeight = posEnd - posStart - additionalPaddingBottom;            
            elem.attr( 'style', 'max-height: ' + newEleHeight + 'px;');
            
          }                   
        }, true);
      }
    }
  }])

})();
