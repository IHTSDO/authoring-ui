'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('spellcheckService', function ($http, $rootScope, $q) {

    // TODO Move this into endpoint-config
    var endpoint = '../check';

    var testWords = [];
        // on errors, simply resolve empty object
        deferred.resolve({});

    function checkSpelling(term) {
      var deferred = $q.defer();
      var suggestions = null;
      angular.forEach(term.split(' '), function (word) {
        if (testWords.hasOwnProperty(word.toLowerCase())) {
          if (!suggestions) {
            suggestions = {};
          }
          suggestions[word] = testWords[word];
        }
      });
      deferred.resolve(suggestions);
      return deferred.promise;

    }

    return {
      checkSpelling: checkSpelling
    };

  })
;
