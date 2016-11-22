'use strict';

angular.module('singleConceptAuthoringApp')
/**
 * Handles IMS authentication, user roles, and user settings
 */
  .factory('spellcheckService', function ($http, $rootScope, $q) {

    // TODO Move this into endpoint-config
    var endpoint = '../check';

    var testWords = {
      'mispelled' : ['misspelled', 'misspelling', 'misspellings'],
      'whiskee' : ['whiskey', 'whisky'],
      'wordz' : ['word', 'words', 'wordy']
    }

    function checkSpelling(term) {
      return [];
    }

    return {
      checkSpelling : checkSpelling
    }

  })
;
