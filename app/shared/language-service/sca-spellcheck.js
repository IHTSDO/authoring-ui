angular.module('singleConceptAuthoringApp').directive('scaSpellcheck', function ($sce, languageService) {
  return {
    replace: true,
    restrict: 'A',
    require: '?ngModel',
    link: function (scope, element, attrs, ngModel) {
      if (!ngModel) {
        return;
      }

      // watch for updates from render or contenteditable
      scope.$watch('textHtml', function (newValue, oldValue) {
        if (!newValue) return;
        // strip html and re-render
        var rex = /(<([^>]+)>)/ig;
        ngModel.$setViewValue(newValue.replace(rex, ""));
        ngModel.$render();
      }, true);


      ngModel.$render = function () {
        var textHtml = ngModel.$viewValue;

        // TODO Use regular spellcheck function once BE in place
        languageService.testspellcheck(textHtml).then(function (words) {
          angular.forEach(words, function (word) {
            textHtml = textHtml.replace(word, '<span class="' + scope.errClass + '">' + word + '</span>')
          });
          scope.textHtml = textHtml;
        });

      };
    },
    templateUrl: 'shared/language-service/sca-spellcheck.html'
  }
});

//
// Directive to create an editable div
//
angular.module('singleConceptAuthoringApp').directive('contenteditable', ['$sce', function ($sce) {
  return {
    restrict: 'A', // attribute only
    require: '?ngModel', // ngModel of element
    link: function (scope, element, attrs, ngModel) {
      if (!ngModel) return;

      // render function -- required for ngModel
      ngModel.$render = function () {
        element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
      };

      // on change events, update
      // TODO add events here -- keyup? change? etc.
      element.on('blur', function () {
        scope.$evalAsync(update);
      });

      // Write data back to the model without tags
      function update() {
        ngModel.$setViewValue(element.html());
      }

      // initialize
      update();
    }
  };
}]);

