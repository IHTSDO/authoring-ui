'use strict';

angular.module('singleConceptAuthoringApp')
  .service('componentAuthoringUtil', function (metadataService, snowowlService, $q) {

      /////////////////////////////////////
      // calls to return JSON objects
      /////////////////////////////////////

      function isValidSctid(id) {
        return id && id.match(/^[0-9]+$/);
      }


      function getNewAcceptabilityMap(moduleId, defaultValue, initial) {
        var acceptabilityMap = {};
        var dialects = metadataService.getDialectsForModuleId(moduleId);
        for (var key in dialects) {

          // different behavior between extension and international content
          if (metadataService.isExtensionSet() && !initial) {
            // if this key is the default language, set acceptability to preferred
            if (dialects[key] === metadataService.getDefaultLanguageForModuleId(moduleId)) {
              acceptabilityMap[key] = 'PREFERRED';
            }
          }
          else if (initial && dialects[key] === metadataService.getDefaultLanguageForModuleId(moduleId)) {

          } else {
            acceptabilityMap[key] = defaultValue ? defaultValue : 'ACCEPTABLE';
          }


        }
        return acceptabilityMap;
      }

      function getNewDescription(moduleId) {
        if (!moduleId) {
          moduleId = metadataService.getCurrentModuleId();
        }
        return {
          'active': true,
          'moduleId': moduleId,
          'type': 'SYNONYM',
          'term': null,
          'lang': metadataService.getDefaultLanguageForModuleId(moduleId),
          'caseSignificance': 'CASE_INSENSITIVE',
          'conceptId': null,
          'acceptabilityMap': getNewAcceptabilityMap(moduleId, 'ACCEPTABLE')
        };
      }

      function getNewFsn(moduleId, initial) {
        // add FSN acceptability and type
        var desc = getNewDescription(moduleId);
        desc.type = 'FSN';

        // if extension, override language to international (pass null module id)
        if (metadataService.isExtensionSet()) {
          desc.lang = metadataService.getDefaultLanguageForModuleId(null);
        }

        desc.acceptabilityMap = getNewAcceptabilityMap(moduleId, 'PREFERRED', initial);


        return desc;
      }

      function getNewPt(moduleId, initial) {
        // add PT acceptability and type
        var desc = getNewDescription(moduleId);
        desc.type = 'SYNONYM';

        // if extension, override language to international (pass null module id)
        if (metadataService.isExtensionSet()) {
          desc.lang = metadataService.getDefaultLanguageForModuleId(null);
        }

        desc.acceptabilityMap = getNewAcceptabilityMap(moduleId, 'PREFERRED', initial);
        return desc;
      }

      function getNewTextDefinition(moduleId) {
        // add PT acceptability and type
        var desc = getNewDescription(moduleId);
        desc.type = 'TEXT_DEFINITION';
        desc.caseSignificance = 'ENTIRE_TERM_CASE_SENSITIVE';
        desc.acceptabilityMap = getNewAcceptabilityMap(moduleId, 'PREFERRED');

        return desc;
      }

      // creates a blank relationship linked to specified source concept
      function getNewIsaRelationship(moduleId) {
        if (!moduleId) {
          moduleId = metadataService.getCurrentModuleId();
        }
        return {
          'active': true,
          'characteristicType': 'STATED_RELATIONSHIP',
          'effectiveTime': null,
          'groupId': 0,
          'modifier': 'EXISTENTIAL',
          'moduleId': moduleId,
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
      function getNewAttributeRelationship(moduleId) {
        if (!moduleId) {
          moduleId = metadataService.getCurrentModuleId();
        }
        return {
          'active': true,
          'characteristicType': 'STATED_RELATIONSHIP',

          'effectiveTime': null,
          'groupId': 0,
          'modifier': 'EXISTENTIAL',
          'moduleId': moduleId,
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
      function getNewConcept() {
        var moduleId = metadataService.getCurrentModuleId();
        var concept = {
          'conceptId': snowowlService.createGuid(),
          'descriptions': [],
          'relationships': [],
          'fsn': null,
          'definitionStatus': 'PRIMITIVE',
          'active': true,
          'released': false,
          'moduleId': moduleId
        };

        // add FSN description
        concept.descriptions.push(getNewFsn(moduleId, true));

        // add a Preferred Term
        concept.descriptions.push(getNewPt(moduleId, true));

        // if extension is set, add a Synonym
        if (metadataService.isExtensionSet()) {
          concept.descriptions.push(getNewDescription(moduleId, true));
        }

        // add IsA relationship
        concept.relationships.push(getNewIsaRelationship(moduleId));
        return concept;
      }

      /**
       * Checks if concept has basic fields required and adds them if not
       * Specifically checks one FSN, one SYNONYM, one IsA relationship
       * @param concept
       * @returns {*}
       */
      function applyMinimumFields(concept) {

        var elementFound;

        // check one FSN exists
        elementFound = false;
        angular.forEach(concept.descriptions, function (description) {
          if (description.type === 'FSN' && description.active) {
            elementFound = true;
          }
        });
        if (!elementFound) {
          concept.descriptions.push(getNewFsn());
        }

        // check one SYNONYM exists
        // TODO Consider whether to check acceptability map
        // currently left out because user can modify, and seems undesirable
        // to force a check for dialect
        elementFound = false;
        angular.forEach(concept.descriptions, function (description) {
          if (description.type === 'SYNONYM' && description.active) {
            elementFound = true;
          }
        });
        if (!elementFound) {
          concept.descriptions.push(getNewPt());
        }

        // check one relationship exists
        elementFound = false;
        angular.forEach(concept.relationships, function (relationship) {
          if (relationship.active) {
            elementFound = true;
          }
        });
        if (!elementFound) {
          concept.relationships.push(getNewIsaRelationship());
        }

        return concept;

      }

      /**
       * Function to check if a concept has minimum fields
       * @param concept
       * @returns string specifying missing field, or null if none
       */
      function hasMinimumFields(concept) {

        var elementFound;

        // check one FSN exists
        elementFound = false;
        angular.forEach(concept.descriptions, function (description) {
          if (description.type === 'FSN' && description.active) {
            elementFound = true;
          }
        });
        if (!elementFound) {
          return 'Concept does not have an active FSN';
        }

        // check one SYNONYM exists
        // TODO Consider whether to check acceptability map
        // currently left out because user can modify, and seems undesirable
        // to force a check for dialect
        elementFound = false;
        angular.forEach(concept.descriptions, function (description) {
          if (description.type === 'SYNONYM' && description.active) {
            elementFound = true;
          }
        });
        if (!elementFound) {
          return 'Concept does not have an active Synonym';
        }

        // check one IsA relationship exists
        elementFound = false;
        angular.forEach(concept.relationships, function (relationship) {
          if (relationship.type.conceptId === '116680003' && relationship.active) {
            elementFound = true;
          }
        });
        if (!elementFound) {
          return 'Concept does not have an active IsA relationship';
        }

        return concept;

      }

      function isConceptsEqual(c1, c2) {

        var i, j;

        // TODO Implement concept fields

        for (i = 0; i < c1.descriptions.length; i++) {
          for (j = 0; j < c2.descriptions.length; j++) {
            if (!isDescriptionsEqual(c1.descriptions[i], c2.descriptions[i])) {
              return false;
            }
          }
        }
        for (i = 0; i < c1.relationships.length; i++) {
          for (j = 0; j < c2.relationships.length; j++) {
            if (!isRelationshipsEqual(c1.relationships[i], c2.relationships[i])) {
              return false;
            }
          }
        }
      }

      function isDescriptionsEqual(d1, d2) {
        if (d1.descriptionId !== d2.descriptionId) {
          return false;
        }
        if (d1.active !== d2.active) {
          return false;
        }
        if (d1.term !== d2.term) {
          return false;
        }
        if (d1.type !== d2.type) {
          return false;
        }
        return true;

        // TODO Check other fields, e.g. moduleId
      }

      function isRelationshipsEqual(r1, r2) {
        if (r1.relationshipId !== r2.relationshipId) {
          return false;
        }
        if (r1.active !== r2.active) {
          return false;
        }
        if (r1.groupId !== r2.groupId) {
          return false;
        }
        if (r1.type && !r2.type) {
          return false;
        }
        if (r2.type && !r1.type) {
          return false;
        }
        if (r1.type.conceptId !== r2.type.conceptId) {
          return false;
        }
        if (r1.target && !r2.target) {
          return false;
        }
        if (r2.target && !r1.target) {
          return false;
        }
        if (r1.target.conceptId !== r2.target.conceptId) {
          return false;
        }
        return true;

        // TODO Check other fields, e.g. moduleId

      }

      function isComponentsEqual(c1, c2) {
        // determine type by id
        // NOTE descriptions have 'conceptId' field, must be checked first
        if (c1.hasOwnProperty('descriptionId') && c2.hasOwnProperty('descriptionId')) {
          return isDescriptionsEqual(c1, c2);
        } else if (c1.hasOwnProperty('relationshipId') && c2.hasOwnProperty('relationshipId')) {
          return isRelationshipsEqual(c1, c2);
        } else if (c1.hasOwnProperty('conceptId') && c2.hasOwnProperty('conceptId')) {
          return isConceptsEqual(c1, c2);
        } else {
          return false;
        }
      }

      function ptFromFsnAutomation(concept, description) {

        console.debug('ptFromFsnAutomation');
        if (!description || !description.term) {
          return concept;
        }
        if (description.term.match(/.*\(.*\)/g)) {
          var ptText = description.term.substr(0, description.term.lastIndexOf('(')).trim();
          var pt = null;
          angular.forEach(concept.descriptions, function (d) {
            if (d.type === 'SYNONYM' && d.acceptabilityMap && d.acceptabilityMap['900000000000509007'] === 'PREFERRED') {
              if (d.term && d.term !== '' && d.term !== null) {
                pt = d;
              }
              else {
                d.term = ptText;
                pt = d;
                pt.automationFlag = true;
                delete pt.descriptionId;
                return concept;
              }

            }
          });

          // if no preferred term found for this concept, add it
          if (!pt) {
            pt = getNewPt();
            pt.term = ptText;
            pt.automationFlag = true;
            concept.descriptions.push(pt);
            return concept;
          }
        } else {
          return concept;
        }
      }

      /**
       * Checks for and revises according to special exceptions
       * @param concept (currently unused, but may be needed later)
       * @param description - the dialect description added
       * @param tokenizedWords - the original tokenized words of the generating description
       * @param matchingWords - the matching dialect variants for the tokenized words
       *
       */
      function applyDialectAutomationExceptions(concept, tokenizedWords, matchingWords) {

        //
        // Exception: Fetal/fetus are valid words in PT for en-GB, but generate Acceptable synonym
        // Does not apply if any other words match
        //
        var exceptionWords = ['fetus', 'fetal'];

        // extract the case-insensitive words triggering this exception
        var exceptionWordsFound = Object.keys(matchingWords).filter(function (word) {
          return exceptionWords.indexOf(word.toLowerCase()) !== -1;
        });

        // run only if the exception matching words are the only words present
        if (exceptionWordsFound.length === Object.keys(matchingWords).length) {

          // check if the fsn contains fetal or fetus
          var fsnException = null;
          angular.forEach(concept.descriptions, function (description) {
            if (description.type === 'FSN' &&
              (description.term.toLowerCase().indexOf('fetus') !== -1 || description.term.toLowerCase().indexOf('fetal') !== -1)) {
              fsnException = description;
            }
          });

          // if an fsn triggering exception is found
          if (fsnException) {

            // fsn only preferred in en-us
            fsnException.acceptabilityMap = {'900000000000509007': 'PREFERRED'};

            angular.forEach(concept.descriptions, function (description) {
              // find en-us PT containing fetal/fetus and set en-gb to PREFERRED
              if (description.type === 'SYNONYM' && description.acceptabilityMap['900000000000509007'] === 'PREFERRED' &&
                (description.term.toLowerCase().indexOf('fetus') !== -1 || description.term.toLowerCase().indexOf('fetal') !== -1)) {
                description.acceptabilityMap['900000000000508004'] = 'PREFERRED';
              }

              // find en-gb SYN containing foetal/foetus and set to ACCEPTABLE
              else if (description.type === 'SYNONYM' && description.term.toLowerCase().indexOf('foetus') !== -1 || description.term.toLowerCase().indexOf('foetal') !== -1) {
                description.acceptabilityMap['900000000000508004'] = 'ACCEPTABLE';
              }
            });
          }
        }
      }

      function addDialectDescription(concept, description, type, term, dialectId, acceptability) {

        // check if description already exists
        var dialectDescription = null;
        angular.forEach(concept.descriptions, function (d) {
          if (d.type === type && d.term === term && d.acceptabilityMap[dialectId] === acceptability) {
            dialectDescription = d;
          }
        });

        if (!dialectDescription) {
          dialectDescription = getNewDescription(description.moduleId);
          dialectDescription.type = type;
          dialectDescription.term = term;
          dialectDescription.caseSignifiance = description.caseSignificance;
          dialectDescription.acceptabilityMap = {};
          dialectDescription.acceptabilityMap[dialectId] = acceptability;

          concept.descriptions.push(dialectDescription);
        }

        dialectDescription.automationFlag = true;
        return dialectDescription;
      }

      /**
       * Automates adding descriptions where dialect differences may exist.
       * NOTE: Relies on new descriptions
       * @param concept
       * @param description
       * @param matchingWords
       * @returns {*}
       */
      function runInternationalDialectAutomation(concept, description, isTemplateConcept) {

        var deferred = $q.defer();

        // reject if arguments null
        if (!concept || !description) {
          deferred.reject('Error running dialect automation: concept or description not supplied');
        }

        // resolve with no action if no description term
        else if (!description.term) {
          deferred.resolve(concept);
        }

        // resolve with no action if extension set
        else if (metadataService.isExtensionSet()) {
          deferred.resolve(concept);
        }

        // otherwise, continue
        else {

          var matchInfo = description.term.match(/([a-zA-Z]+)/g);
          var tokenizedWords = [];
          if (matchInfo) {
            for (var i = 0; i < matchInfo.length; i++) {
              tokenizedWords.push(matchInfo[i]);
            }
          }

          // retrieve the matches
          snowowlService.getDialectMatches(tokenizedWords).then(function (matchingWords) {

            // do not run any automation for MS content
            if (metadataService.isExtensionSet()) {
              deferred.resolve(concept);
            }

            // check for null arguments
            if (!concept || !description) {
              deferred.reject('Dialect automation failed: bad arguments');
            }

            // if no matching words, skip automation
            if (!matchingWords || matchingWords.length === 0) {
              deferred.resolve(concept);
            }

            // flag of convenience for whether dialect matches found
            var hasMatchingWords = Object.keys(matchingWords).length > 0;

            // temporary variables
            var termUs, termGb, newPt;

            // extract the base term (no semantic tag)
            if (description.type === 'FSN') {
              var matchInfo = description.term.match(/^(.*)\s\(.*\)$/i);
              if (matchInfo && matchInfo[1]) {
                termUs = matchInfo[1];
              }

              // if semantic tag not present, skip automation
              else {
                deferred.resolve(concept);
              }
            } else {
              termUs = description.term;
            }

            // replace original words with the suggested dialect spellings
            termGb = termUs;
            for (var match in matchingWords) {
              termGb = termGb.replace(match, matchingWords[match]);
            }

            // when existing concept
            if (concept.released) {

              //  when new FSN
              if (description.type === 'FSN') {
                // when spelling variant present, result is
                if (hasMatchingWords) {
                  // ensure FSN en-US preferred, do not add matching PT
                  description.acceptabilityMap['900000000000509007'] = 'PREFERRED';
                  delete description.acceptabilityMap['900000000000508004'];

                  // SYN, en-GB acceptable
                  if (!isTemplateConcept) {
                    addDialectDescription(concept, description, 'SYNONYM', termGb, '900000000000508004', 'PREFERRED');
                  }
                }
                // else, ensure FSN en-US and en-GB preferred, do not add matching PT
                else {
                  description.acceptabilityMap['900000000000509007'] = 'PREFERRED';
                  description.acceptabilityMap['900000000000508004'] = 'PREFERRED';
                }
              }
              // when new SYN
              else if (description.type === 'SYNONYM') {
                // when spelling variant present, result is
                if (hasMatchingWords) {
                  // SYN, ensure en-US acceptability is set and delete en-GB acceptability
                  if (!description.acceptabilityMap['900000000000509007']) {
                    description.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';
                  }
                  delete description.acceptabilityMap['900000000000508004'];

                  // SYN en-GB matching acceptability of original description
                  addDialectDescription(concept, description, 'SYNONYM', termGb, '900000000000508004', description.acceptabilityMap['900000000000509007']);
                }

                // else, leave unchanged
                else {
                  // do nothing
                }
              }
            }

            // when new concept
            else {
              // when FSN
              if (description.type === 'FSN') {
                // when spelling variant is present, result is
                if (hasMatchingWords) {
                  if (!isTemplateConcept) {
                    // SYN en-US preferred
                    addDialectDescription(concept, description, 'SYNONYM', termUs, '900000000000509007', 'PREFERRED');

                    // SYN en-GB preferred
                    addDialectDescription(concept, description, 'SYNONYM', termGb, '900000000000508004', 'PREFERRED');
                  }
                }
                // else, add matching PT
                else {

                  description.acceptabilityMap['900000000000509007'] = 'PREFERRED';
                  description.acceptabilityMap['900000000000508004'] = 'PREFERRED';
                  if (!isTemplateConcept) {
                    newPt = addDialectDescription(concept, description, 'SYNONYM', termUs, '900000000000509007', 'PREFERRED');
                    newPt.acceptabilityMap['900000000000508004'] = 'PREFERRED';
                    newPt.automationFlag = true;
                  }
                }
              }
              // when SYN
              else if (description.type === 'SYNONYM') {
                if (hasMatchingWords) {
                  // SYN, ensure en-us acceptability is set and delete en-gb acceptability
                  if (!description.acceptabilityMap['900000000000509007']) {
                    description.acceptabilityMap['900000000000509007'] = 'ACCEPTABLE';
                  }
                  delete description.acceptabilityMap['900000000000508004'];

                  // SYN en-GB matching acceptability of original description
                  addDialectDescription(concept, description, 'SYNONYM', termGb, '900000000000508004', description.acceptabilityMap['900000000000509007']);
                }

                // else, do nothing.
                else {
                  // do nothing
                }
              }
            }

            // remove empty descriptions after automation
            for (var i = concept.descriptions.length - 1; i--; i >= 0) {
              if (!concept.descriptions[i].term) {
                concept.descriptions.splice(i, 1);
              }
            }
            // apply exceptions to the dialect description
            //applyDialectAutomationExceptions(concept, tokenizedWords, matchingWords);
            deferred.resolve(concept);
          }, function (error) {
            deferred.reject('Error matching dialect words: ' + error);
          });
        }

        return deferred.promise;

      }

      function runDescriptionAutomations(concept, description, isTemplateConcept) {

        var deferred = $q.defer();

        // if metadata set, run pt from fsn automation
        if (metadataService.isExtensionSet()) {
          ptFromFsnAutomation(concept, description);
          deferred.resolve(concept);
        }
        // run international dialect automation (includes PT automation for international)
        else {
          runInternationalDialectAutomation(concept, description, isTemplateConcept).then(function (updatedConcept) {
            deferred.resolve(updatedConcept);
          }, function (error) {
            deferred.reject(error);
          });
        }
        return deferred.promise;
      }

      function runConceptAutomations(concept, isTemplateConcept) {
        var deferred = $q.defer();

        var promises = [];
        angular.forEach(concept.descriptions, function (d) {
          promises.push(runDescriptionAutomations(concept, d, isTemplateConcept));
        });
        $q.all(promises).then(function () {
          deferred.resolve(concept);
        }, function (error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }

      function runInternationalDialectAutomationForConcept(concept, isTemplateConcept) {
        var deferred = $q.defer();

        console.debug('run international dialect automation for concept');

        var promises = [];
        angular.forEach(concept.descriptions, function (d) {
          promises.push(runInternationalDialectAutomation(concept, d, isTemplateConcept));
        });
        $q.all(promises).then(function () {
          deferred.resolve(concept);
        }, function (error) {
          deferred.reject(error);
        });

        return deferred.promise;
      }

      function setDefaultFields(concept) {

        if (!concept.hasOwnProperty('active')) {
          concept.active = true;
        }
        if (!concept.hasOwnProperty('definitionStatus')) {
          concept.definitionStatus = 'PRIMITIVE';
        }
        if (!concept.hasOwnProperty('moduleId')) {
          concept.moduleId = metadataService.getCurrentModuleId();
        }
        if (!concept.hasOwnProperty('released')) {
          concept.released = false;
        }

        angular.forEach(concept.descriptions, function (description) {
          if (!description.hasOwnProperty('active')) {
            description.active = true;
          }
          if (!description.hasOwnProperty('moduleId')) {
            description.moduleId = metadataService.getCurrentModuleId();
          }
        });

        angular.forEach(concept.relationships, function (relationship) {
          if (!relationship.hasOwnProperty('active')) {
            relationship.active = true;
          }
          if (!relationship.hasOwnProperty('moduleId')) {
            relationship.moduleId = metadataService.getCurrentModuleId();
          }
          if (!relationship.hasOwnProperty('modifier')) {
            relationship.modifier = 'EXISTENTIAL';
          }
          if (!relationship.hasOwnProperty('type')) {
            relationship.type = {conceptId: null};
          }
          if (!relationship.hasOwnProperty('target')) {
            relationship.target = {conceptId: null};
          }
        });
      }

      // utility functions
      function getFsnForConcept(concept) {
        try {
          return concept.descriptions.filter(function (d) {
            return d.active && d.type === 'FSN';
          })[0].term;
        } catch (error) {
          return '???';
        }
      }

      function getPtForConcept(concept, dialect) {
        try {
          return concept.descriptions.filter(function (d) {
            return d.active && d.type === 'SYNONYM' && d.acceptabilityMap && d.acceptabilityMap[dialect] === 'PREFERRED';
          })[0].term;
        } catch (error) {
          return '???';
        }
      }

      function getFsnDescriptionForConcept(concept) {
        try {
          return concept.descriptions.filter(function (d) {
            return d.active && d.type === 'FSN';
          })[0];
        } catch (error) {
          return null;
        }
      }

      return {
        getNewConcept: getNewConcept,
        getNewDescription: getNewDescription,
        getNewFsn: getNewFsn,
        getNewPt: getNewPt,
        getNewTextDefinition: getNewTextDefinition,
        getNewIsaRelationship: getNewIsaRelationship,
        getNewAttributeRelationship: getNewAttributeRelationship,
        applyMinimumFields: applyMinimumFields,
        hasMinimumFields: hasMinimumFields,
        isComponentsEqual: isComponentsEqual,
        isConceptsEqual: isConceptsEqual,
        isDescriptionsEqual: isDescriptionsEqual,
        isRelationshipsEqual: isRelationshipsEqual,

        getNewAcceptabilityMap: getNewAcceptabilityMap,

        // individual automations
        ptFromFsnAutomation: ptFromFsnAutomation,
        runInternationalDialectAutomation: runInternationalDialectAutomation,

        // grouped automations
        runDescriptionAutomations: runDescriptionAutomations,
        runConceptAutomations: runConceptAutomations,
        runInternationalDialectAutomationForConcept: runInternationalDialectAutomationForConcept,

        // utility functions
        setDefaultFields: setDefaultFields,
        getFsnForConcept: getFsnForConcept,
        getPtForConcept: getPtForConcept,
        getFsnDescriptionForConcept : getFsnDescriptionForConcept

      };

    }
  )
;
