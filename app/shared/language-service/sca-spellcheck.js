angular.module('singleConceptAuthoringApp').directive('scaSpellcheck', function ($sce, languageService, $timeout) {
  return {
    replace: true,
    restrict: 'A',
    require: '?ngModel',
    scope: {},
    link: function (scope, element, attrs, ngModel) {
      if (!ngModel) {
        return;
      }

      /**
       * Notes:
       * - tinymce does not play well wrapped inside directives
       * - can attempt to jigger with $eval/init per issues 158 & 218
       * - also works fine with scope inheritance of options from parent
       */

      console.debug('sca-spellcheck');

      //
      // TinyMCE editor and options
      //

      var editor;

      scope.tinymceOptions = {
        setup: function (ed) {

          editor = ed;
          ed.on('focus', function () {
            console.debug('focus event', ed);
            spellcheck();
          });
          ed.on('blur', function () {
            console.debug('blur event', ed);
            disableSpellcheck();
          });
          ed.on('change', function (e) {
            try {
              var text = tinymce.get(editor.id).getContent();
              // update model
              read(text);

              // apply live spellchecking
              debouncedSpellcheck(text);
        //      console.debug('change', text);
            } catch (err) {
              // do nothing, throws errors on initialization
            }
          });
      //    console.debug('editor', editor);

        },

        // required to not add &nbsp; on paste events
        entity_encoding: 'raw',

        // strip all p and br elements added automatically
        invalid_elements: 'p,br',

        // do not wrap blocks
        forced_root_block: false,

        // add debounce internally instead of via ng-model-options
        debouncetime: 5000,

        selector: "textarea",  // change this value according to your HTML
        auto_focus: false,
        plugins: "spellchecker",
        menubar: false,
        toolbar: false,
        statusbar: false,
        paste_auto_cleanup_on_paste: true,
        spellchecker_callback: function (method, text, success, failure) {
          console.debug('spellchecker_callback', text);
          languageService.testspellcheck(text).then(function (suggestions) {
            success(suggestions);
          });
        }
      };

      //
      // Live spellchecking (double toggle on debounced change)
      //

      var prevText;
      var debounceTimer;
      var debounceTimerInterval = 500;

      function debouncedSpellcheck(text) {

        console.debug('debounce', prevText === text, text, prevText);

        // debounced spellchecking
        if (debounceTimer) {
      //    console.debug('cancelling timer');
          $timeout.cancel(debounceTimer);
        }

        if (prevText && prevText !== text) {

     //     console.debug('starting timer');

          debounceTimer = $timeout(function () {
            disableSpellcheck();
            $timeout(function() {
              spellcheck();

            }, 250);

          }, debounceTimerInterval)
        }

        prevText = text;
      }


      //
      // Enable/disable spellcheck on focus and blur events
      //
      var spellcheckActive = false;

      function spellcheck() {
        if (!spellcheckActive) {
          editor.execCommand('mceSpellcheck');
        }
        spellcheckActive = true;
      }

      function disableSpellcheck() {
        if (spellcheckActive) {
          editor.execCommand('mceSpellcheck');
        }
        spellcheckActive = false;
      }

      function read(newValue) {
       // console.debug('change', newValue);
        ngModel.$setViewValue(newValue);
      }

      ngModel.$render = function () {
       // console.debug('render event', ngModel.$viewValue);
        scope.spellcheckText = ngModel.$viewValue;
      };


    },
    templateUrl: 'shared/language-service/sca-spellcheck.html'
  }
});

