'use strict';

angular.module('singleConceptAuthoringApp')
  .service('objectService', ['$http', '$rootScope', function ($http, $rootScope) {

    return {

      /////////////////////////////////////
      // calls to return JSON objects
      /////////////////////////////////////

      // creates a blank description linked to specified concept
      getNewDescription: function (conceptId) {
        return {
          'id': null,
          'released': false,
          'active': false,
          'moduleId': '900000000000207008',
          'conceptId': conceptId,
          'typeId': '900000000000013009',
          'term': null,
          'languageCode': 'en',
          'caseSignificance': 'ENTIRE_TERM_CASE_SENSITIVE',
          'acceptabilityMap': {
            '900000000000509007': 'PREFERRED',
            '900000000000508004': 'PREFERRED'
          }
        };
      },

      // creates a blank relationship linked to specified source concept
      getNewRelationship: function (conceptId) {
        return {
          'active': false,
          'characteristicType': 'STATED_RELATIONSHIP',
          'destinationId': null,
          'destinationNegated': false,
          'effectiveTime': null,
          'group': 0,
          'id': null,
          'modifier': 'EXISTENTIAL',
          'moduleId': '900000000000207008',
          'refinability': 'NOT_REFINABLE',
          'released': false,
          'sourceId': conceptId,
          'typeId': '116680003',
          'unionGroup': 0
        };
      }


    };

  }]);
