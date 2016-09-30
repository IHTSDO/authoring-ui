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
            var regex = new RegExp(word, 'g');
            textHtml = textHtml.replace(regex, '<span class="' + scope.errClass + '">' + word + '</span>')
          });
          console.debug('new text html', scope.textHtml);
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

      console.debug('new contenteditable');

      var nodeIndex;

      // get the node position if present
      function storeNodeInfo() {
        try {
          if (window.getSelection) {
            var selection = window.getSelection();
            console.debug('full selection', selection);
            console.debug('selection', selection.focusNode.textContent);
            for (var i = 0; i < selection.focusNode.parentNode.childNodes.length; i++) {
              console.debug('  ', i, selection.focusNode.parentNode.childNodes[i].textContent);
              if (selection.focusNode.textContent === selection.focusNode.parentNode.childNodes[i].textContent) {
                nodeIndex = i;
                console.debug('    nodeIndex', nodeIndex);
                break;
              }
            }
          }
        }

        catch
          (error) {
        }
      }


      function setCursorPosition(n, o) {
        console.debug('set cursor', n, o);
        var range = document.createRange();
        var sel = window.getSelection();
        range.setStart(element.context.childNodes[n], o);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      // render function -- required for ngModel
      ngModel.$render = function () {
        console.debug('render event', nodeIndex);

        // set the html
        element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));

        // determine cursor position (if changed)
        if (nodeIndex) {
          var node = element.context.childNodes[nodeIndex];
          console.debug('new node', node);

          // if node type has changed, need to reset cursor
          // to account for add/remove of <span> tag
          if (node.type != node.type) {
            var rex = /(<([^>]+)>)/;
            var offset = node.textContent.matches(rex)
              // if node starts with html, increment offset by length of tag
              ? node.textContent.indexOf('>') + selection.focusOffset
              // otherwise, decrement offset by length of old taqg
              : selection.focusOffset - selection.focusNode.textContent.indexOf();
            setCursorPosition(nodeIndex, offset);
          }
        }
      }

      // on change events, update
      // TODO add events here -- keyup? change? etc.
      element.on('blur keyup change', function () {
        storeNodeInfo();
        scope.$evalAsync(read);
      });

      // Write raw html data back to the model
      function read() {
        ngModel.$setViewValue(element.html());
      }

      // initialize
      read();
    }
  };
}]);

