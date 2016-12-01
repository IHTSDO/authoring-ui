'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('spellcheckService', function ($http, $rootScope, $q) {

    // TODO Move this into endpoint-config
    var endpoint = '../check';

    var testWords = {
      'mispelled': ['misspelled', 'misspelling', 'misspellings'],
      'whiskee': ['whiskey', 'whisky'],
      'wordz': ['word', 'words', 'wordy'],
      'carot' : ['carrot', 'caret']
    }

    function checkSpelling(term) {
      console.debug('spellchecking term', term);
      var deferred = $q.defer();
      var suggestions = null;
      angular.forEach(term.split(' '), function (word) {
        console.debug('checking word', word);
        if (testWords.hasOwnProperty(word.toLowerCase())) {
          console.debug('mispelled word found');
          if (!suggestions) {
            suggestions = {};
          }
          suggestions[word] = testWords[word];
        }
      });
      console.debug('suggestions', suggestions);
      deferred.resolve(suggestions);
      return deferred.promise;

    }

    return {
      checkSpelling: checkSpelling
    }

  })
;
