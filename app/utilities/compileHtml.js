'use strict'

/**
 * Directive for inserting html element into DOM as compiled Angular content
 *
 * Example:  <div compile="htmlFragment"></div>
 */
angular.module('singleConceptAuthoringApp').directive('compileHtml', ['$compile', function ($compile) {
  return function (scope, element, attrs) {

    scope.$watch(
      function (scope) {
        // watch the 'compile' expression for changes
        return scope.$eval(attrs.compileHtml);
      },
      function (value) {


        // when the 'compile' expression changes
        // assign it into the current DOM
        element.html(value);

        // compile the new DOM and link it to the current
        // scope.
        // NOTE: we only compile .childNodes so that
        // we don't get into infinite loop compiling ourselves
        $compile(element.contents())(scope);
      }
    );
  };
}])
