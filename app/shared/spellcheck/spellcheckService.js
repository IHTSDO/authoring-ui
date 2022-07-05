'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('spellcheckService', function ($http, $rootScope, $q) {

    var endpoint = null;

    function setEndpoint(url) {
      endpoint = url;
    }

    function getSuggestions(tokenizedWords) {
      var deferred = $q.defer();
      var uri = endpoint + '?words=' + encodeURIComponent(tokenizedWords.toString());
      $http.get(uri).then(function (response) {
        deferred.resolve(response.data);
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
      term = term.replace(/[()]/g, "");
      var tokenizedWords = term ? term.split(/[\s/]+/) : [];
      
      // Ignore all upper case words
      tokenizedWords = tokenizedWords.filter(function (item) {
          return item !== item.toUpperCase();
      });

      // convert to lowerver case and remove punctuation
      for (let i = 0; i < tokenizedWords.length; i++) {
        tokenizedWords[i] = tokenizedWords[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]$/g,"").toLowerCase();
      }

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
      setEndpoint: setEndpoint,
      checkSpelling: checkSpelling
    }

  })
;
