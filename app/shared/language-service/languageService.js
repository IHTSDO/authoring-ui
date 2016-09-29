'use strict';

angular.module('singleConceptAuthoringApp')
  .service('languageService', ['$http', function ($http) {

    // TODO Replace this once BE service up
    var apiEndpoint = 'SOME PATH HERE';

    // test array and function for returning misspelled words
    var testSpellings = ['mispelled', 'fourty', 'beleive']
    function testspellcheck(text, language) {
      var words = text.split(/\s+/);
      return testSpellings.filter(function(word) {
        words.indexOf(word) !== -1;
      });
    }

    // Spellcheck text against a language
    // TODO intended to make BE call with tokenized words
    function spellcheck(text, language) {
      return [];
    }

    return {
      testspellcheck : testspellcheck
    }
  }])
;
