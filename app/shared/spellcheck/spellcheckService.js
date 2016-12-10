'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('spellcheckService', function ($http, $rootScope, $q) {

    // TODO Move this into endpoint-config
    var endpoint = '../check';

    function getSuggestions(tokenizedWords) {
      var deferred = $q.defer();
      var uri = endpoint + '?' + tokenizedWords.toString();
      console.debug('uri', uri);
      $http.get(uri).then(function (response) {
        deferred.resolve(response);
      }, function (error) {
        // on errors, simply resolve empty object
        deferred.resolve({});

      });
      return deferred.promise;
    }

    var testWords = {
      'mispelled': ['misspelled', 'misspelling', 'misspellings'],
      'whiskee': ['whiskey', 'whisky'],
      'wordz': ['word', 'words', 'wordy'],
      'carot': ['carrot', 'caret']
    };

    function capitalizeFirstCharacter(word) {
      return word.substring(0, 1).toUpperCase() + word.substring(1);
    }

    function testCheckSpelling(words) {
      console.debug('spellchecking array', words);

      var suggestions = {};

      angular.forEach(words, function (word) {
        console.debug('checking word', word);
        if (testWords.hasOwnProperty(word.toLowerCase())) {
          console.debug('mispelled word found');

          suggestions[word] = testWords[word.toLowerCase()];
        }
      });
      console.debug('suggestions', suggestions);
      return suggestions;

    }

    function checkSpelling(term) {
      var deferred = $q.defer();
      var suggestions = null;
      var tokenizedWords = term ? term.toLowerCase().split(' ') : [];
      getSuggestions(tokenizedWords).then(function (suggestions) {
        angular.forEach(tokenizedWords, function (word) {
          if (suggestions.hasOwnProperty(word)) {
            if (word.charAt(0) === word.charAt(0).toUpperCase()) {
              suggestions[capitalizeFirstCharacter(word)] = suggestions[word].map(capitalizeFirstCharacter);
              delete suggestions[word];
            }
          }
        });
        deferred.resolve(suggestions);
      });
      return deferred.promise;
    }

    return {
      checkSpelling: checkSpelling
    }

  })
;
