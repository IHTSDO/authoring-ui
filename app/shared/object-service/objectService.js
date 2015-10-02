'use strict';

angular.module('singleConceptAuthoringApp')
  .service('objectService', ['$http', '$rootScope', function ($http, $rootScope) {

    /////////////////////////////////////
    // calls to return JSON objects
    /////////////////////////////////////

    // creates a blank description linked to specified concept
    function getNewDescription(conceptId) {
      return {
        'active': true,
        'moduleId': '900000000000207008',
        'type': 'SYNONYM',
        'term': null,
        'lang': 'en',
        'caseSignificance': 'INITIAL_CHARACTER_CASE_INSENSITIVE',
        'conceptId' : conceptId,
        'acceptabilityMap': {
          '900000000000509007': 'ACCEPTABLE',
          '900000000000508004': 'ACCEPTABLE'
        }
      };
    }

    // creates a blank relationship linked to specified source concept
    function getNewIsaRelationship(conceptId) {
      return {
        'active': true,
        'characteristicType': 'STATED_RELATIONSHIP',
        'effectiveTime': null,
        'groupId': 0,
        'modifier': 'EXISTENTIAL',
        'moduleId': '900000000000207008',
        'sourceId': conceptId,
        'target': {
          'conceptId': null
        },
        'type': {
          'conceptId': '116680003',
          'fsn': 'Is a (attribute)'
        }
      };
    }

    // creates a blank relationship linked to specified source concept
    function getNewAttributeRelationship(conceptId) {
      return {
        'active': true,
        'characteristicType': 'STATED_RELATIONSHIP',

        'effectiveTime': null,
        'groupId': 0,
        'modifier': 'EXISTENTIAL',
        'moduleId': '900000000000207008',
        'sourceId': conceptId,
        'target': {
          'conceptId': null
        },
        'type': {
          'conceptId': null
        }
      };
    }

    // creats a blank concept with one each of a blank
    // description, relationship, attribute
    function getNewConcept(branch) {
      var concept = {
        'conceptId': null,
        'descriptions': [],
        'relationships': [],
        'fsn': null,
        'definitionStatus': 'PRIMITIVE',
        'active': true,
        'moduleId': '900000000000207008'
      };

      // add FSN description
      var desc = getNewDescription(null);
      desc.type = 'FSN';
      desc.acceptabilityMap = {
        '900000000000509007': 'PREFERRED',
          '900000000000508004': 'PREFERRED'
      };
      concept.descriptions.push(desc);

      // add Preferred Term SYNONYM description
      desc = getNewDescription(null);
      desc.type = 'SYNONYM';
      desc.acceptabilityMap = {
        '900000000000509007': 'PREFERRED',
        '900000000000508004': 'PREFERRED'
      };
      concept.descriptions.push(desc);

      // add IsA relationship
      concept.relationships.push(getNewIsaRelationship(null));

      return concept;
    }

    return {
      getNewConcept: getNewConcept,
      getNewDescription: getNewDescription,
      getNewIsaRelationship: getNewIsaRelationship,
      getNewAttributeRelationship: getNewAttributeRelationship
    };

  }]);
