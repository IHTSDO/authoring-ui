'use strict';

angular.module('singleConceptAuthoringApp')
  .service('objectService', ['$http', '$rootScope', function ($http, $rootScope) {



    /////////////////////////////////////
    // calls to return JSON objects
    /////////////////////////////////////


    // creates a blank description linked to specified concept
    function getNewDescription(conceptId) {
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
    }

    // creates a blank relationship linked to specified source concept
    function getNewIsaRelationship(conceptId) {
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

    // creates a blank relationship linked to specified source concept
    function getNewAttributeRelationship(conceptId) {
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
        'typeId': '',
        'unionGroup': 0
      };
    }

    // creats a blank concept with one each of a blank
    // description, relationship, attribute
    function getNewConcept(branch) {
      var concept = {
        'branch' : branch,
        'id' : null,
        'descriptions' : [],
        'outboundRelationships' : [],
        'properties' : {
          'active' : false,
          'definitionStatus' : 'PRIMITIVE',
          'effectiveTime' : null,
          'id' : null,
          'moduleId':'900000000000207008',
          'released': false,
          subclassDefinitionStatus: 'NON_DISJOINT_SUBCLASSES'
        },
        'pt': {
          'acceptabilityMap': {
            '900000000000509007': 'PREFERRED',
            '900000000000508004': 'PREFERRED'
          },
          'active' : false,
          'caseSignificance': 'INITIAL_CHARACTER_CASE_INSENSITIVE',
          'conceptId': null,
          'definitionStatus' : 'PRIMITIVE',
          'effectiveTime' : null,
          'id': null,
          'languageCode': 'en',
          'moduleId' : '900000000000207008',
          'released': false,
          'term':null,
          'typeId':null
        }
      }

      concept.descriptions.push(getNewDescription(null));
      concept.outboundRelationships.push(getNewIsaRelationship(null));
      concept.outboundRelationships.push(getNewAttributeRelationship(null));

      return concept;
    }

    return {
      getNewConcept: getNewConcept,
      getNewDescription: getNewDescription,
      getNewIsaRelationship: getNewIsaRelationship,
      getNewAttributeRelationship: getNewAttributeRelationship
    }

  }]);
