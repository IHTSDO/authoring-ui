/**
 * Created by QuyenLy on 08/28/2017.
 */
(function(){
  'use strict';
  angular.module('singleConceptAuthoringApp')
  .directive('fullHeight', ['$parse', function($parse) {
    return {
      scope: {
          additionalFields: '@?' // Specify more additional fields if it's take into account When calculating height for element, 
      },
      link: function(scope, elem, attrs) {
        var fn = $parse(attrs.fullHeight);
        var eleHeight = 0;
        var posEnd = 0;
        var additionalPadding = 123;        

        scope.$watch(function() {
          return elem.height();
        }, function(newHeight) {        
          adjustElementHeight(newHeight);
        }, true);

        scope.$on('adjustElementHeight', function (event, data) {
          adjustElementHeight();
        });

        function adjustElementHeight(newHeight) {
          var posStart = angular.element(elem).prop('offsetTop');
          
          var endElem = angular.element(document.querySelector(".sca-footer"));
          posEnd = angular.element(endElem).prop('offsetTop');          

          var additionalHeight = 0;
          if(scope.additionalFields){
            var additionalArr = scope.additionalFields.split(',');
            additionalArr.forEach(function(item){
              var additionalElm = angular.element(document.querySelector("." + item));  
              additionalHeight += additionalElm.height();
            });           
          }         

          if(typeof newHeight  === 'undefined'
            || (newHeight > 0 && newHeight > posEnd)) {
            eleHeight = posEnd - posStart - additionalHeight - additionalPadding;
            elem.attr( 'style', 'height: ' + eleHeight + 'px;');
          }
        }        
      }
    }
  }])

})();
