'use strict';

angular.module('singleConceptAuthoringApp')
  .service('languageService', ['$http', '$q', function ($http, $q) {

    // TODO Replace this once BE service up
    var apiEndpoint = 'SOME PATH HERE';

    // test array and function for returning misspelled words
    var testSpellings = ['mispelled', 'fourty', 'beleive', 'firey', 'whiskie', 'fulfil', 'steeve', 'ashlee', 'kris', 'sonjia', 'phoung', 'patrik'];

    function getTestSpellings() {
      return testSpellings;
    }
    function testspellcheck(text, language) {
      var deferred = $q.defer();
      var words = text.split(/\s+/);
      var misspelledWords = [];
      console.debug('tokenized words', words);
      angular.forEach(words, function(word) {
        console.debug('checking word', word, word.toLowerCase());
        if (testSpellings.indexOf(word.toLowerCase()) !== -1) {
          misspelledWords.push(word);
        }
      });
      deferred.resolve(misspelledWords);
      return deferred.promise;
    }

    // Spellcheck text against a language
    // TODO intended to make BE call with tokenized words
    function spellcheck(text, language) {
      return [];
    }

    return {
      testspellcheck: testspellcheck,
      getTestSpellings : getTestSpellings
    }
  }])
;
