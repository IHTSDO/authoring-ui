'use strict';

angular.module('singleConceptAuthoringApp')
  .service('languageService', ['$http', '$q', function ($http, $q) {

    // TODO Replace this once BE service up
    var apiEndpoint = 'SOME PATH HERE';

    // test array and function for returning misspelled words
    var testSpellings = {
      'mispelled': ['misspelled'],
      'whiskee': ['whisky', 'whiskey', 'Is it 5 o\'clock yet' ]
    };

    function getTestSpellings() {
      return testSpellings;
    }

    function testspellcheck(text, language) {
      var deferred = $q.defer();
      var words = text ? text.split(/\W+/) : [];
      var suggestions = {};

      angular.forEach(words, function (word) {
        if (testSpellings.hasOwnProperty(word.toLowerCase()) !== -1) {
          suggestions[word] = testSpellings[word];
        }
      });
      deferred.resolve(suggestions);
      return deferred.promise;
    }

    // Spellcheck text against a language
    // TODO intended to make BE call with tokenized words
    function spellcheck(text, language) {
      return [];
    }

    return {
      testspellcheck: testspellcheck,
      getTestSpellings: getTestSpellings
    }
  }])
;
