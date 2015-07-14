'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptEdit', function ($rootScope, $timeout, $modal, $q, snowowlService, objectService, $routeParams) {
    return {
      restrict: 'A',
      transclude: true,
      replace: true,
      scope: {
        // the concept being displayed
        concept: '=concept',

        // the branch of the concept
        branch: '=branch',
        ctrlFn: '&'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl) {

        if (!scope.concept) {
          console.error('conceptEdit directive requires concept to be specified');
          return;
        }

        if (!scope.branch) {
          console.error('conceptEdit directive requires branch to be specified');
        }

        scope.conceptSessionHistory = [];

        ////////////////////////////////
        // Concept Elements
        ////////////////////////////////

        var inactivateConceptReasons = [
          {id: '', text: 'Ambiguous concept (inactive concept)'},
          {id: '', text: 'Duplicate concept (inactive concept)'},
          {id: '', text: 'Erroneous concept (inactive concept)'},
          {id: '', text: 'Limited status concept (inactive concept)'},
          {id: '', text: 'Moved elsewhere (inactive concept'},
          {id: '', text: 'Outdated concept (inactive concept)'},
          {id: '', text: 'Reason not stated concept (inactive concept)'},
          {id: '', text: 'No reason'}
        ];

        scope.removeConcept = function (concept) {
          console.debug('Removing concept from list', concept);
          $rootScope.$broadcast('conceptEdit.removeConcept', {concept: concept});
        };

        //Parse the concept to the expected browser endpoint input format
        scope.parseConcept = function (conceptIn) {

          var concept = {};
          concept.conceptId = conceptIn.id;
          concept.isLeafInferred = false;
          concept.descriptions = [];
          concept.relationships = [];
          angular.forEach(conceptIn.descriptions, function (value) {
            var description = {};

            description.moduleId = value.moduleId;
            description.term = value.term;
            description.active = value.active;
            description.caseSignificance = value.caseSignificance;
            description.acceptabilityMap = value.acceptabilityMap;
            description.lang = value.languageCode;

            angular.forEach(scope.descTypeIds, function (descTypeId) {
              if (descTypeId.id === value.typeId) {
                description.type = descTypeId.name;
              }
            });

            if (!description.type) {
              console.error('Could not determine description type');
              return;
            }

            concept.descriptions.push(description);
          });
          angular.forEach(conceptIn.outboundRelationships, function (item) {
            var relationship = {};
            relationship.modifier = item.modifier;
            relationship.groupId = item.group;
            relationship.moduleId = item.moduleId;
            relationship.target = {'conceptId': item.destinationId};
            relationship.active = item.active;
            relationship.characteristicType = item.characteristicType;
            relationship.type = {'conceptId': item.typeId};
            concept.relationships.push(relationship);
          });
          concept.definitionStatus = conceptIn.properties.definitionStatus;
          concept.active = conceptIn.properties.active;
          concept.moduleId = conceptIn.properties.moduleId;
          console.log(concept);
          console.log(conceptIn);
          return concept;
        };

        scope.saveConcept = function (concept) {

          console.debug('saving concept', concept);

          var parsedConcept = scope.parseConcept(concept);

          if (!scope.isConceptValid(parsedConcept)) {
            return;
          }

          // if new, use create
          if (!concept.id) {
            snowowlService.createConcept($routeParams.projectId, $routeParams.taskId, parsedConcept).then(function (response) {
              if (response && response.conceptId) {
                $rootScope.$broadcast('conceptEdit.updateConcept', {
                  oldConcept: concept,
                  newConcept: response
                });

              }
            });
          }

          // if not new, use update
          else {
            // TODO Still need to figure out updating
            // snowowlService.updateConcept($routeParams.projectId,
            // $routeParams.taskId, parsedConcept);

          }
        };

        scope.toggleConceptActive = function (concept) {
          // if inactive, simply set active
          if (!concept.active) {
            concept.active = true;
          }

          // otherwise, open a selct reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason(concept, 'Concept', inactivateConceptReasons).then(function (reason) {

              scope.concept.active = false;

              // if reason is selected, deactivate all descriptions and
              // relationships
              if (reason) {
                angular.forEach(scope.concept.descriptions, function (description) {
                  description.active = false;
                });
                angular.forEach(scope.concept.outboundRelationships, function (relationship) {
                  relationship.active = false;
                });
              }
            });
          }
        };

        ////////////////////////////////
        // Description Elements
        ////////////////////////////////

        // ensure at least one empty description is present
        if (!scope.concept.descriptions || scope.concept.descriptions.length === 0) {
          scope.concept.descriptions = [];
          scope.concept.descriptions.push(objectService.getNewDescription(scope.concept.id));
        }

        // Define available languages
        scope.languages = [
          {id: 'en', abbr: 'en'}
        ];

        // Define definition types
        scope.descTypeIds = [
          {id: '900000000000003001', abbr: 'FSN', name: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN', name: 'SYNONYM'},
          {id: '900000000000550004', abbr: 'DEF', name: 'TEXT_DEFINITION'}
        ];

        // define acceptability types
        scope.acceptabilities = [
          {id: 'PREFERRED', abbr: 'Preferred'},
          {id: 'ACCEPTABLE', abbr: 'Acceptable'},
          {id: 'NOT ACCEPTABLE', abbr: 'Not acceptable'}
        ];

        // List of acceptable reasons for inactivating a description
        // TODO:  More metadata to be retrieved on init and stored
        var inactivateDescriptionReasons = [
          {
            id: '',
            text: 'ALTERNATIVE association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'MOVED FROM association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'MOVED TO association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'POSSIBLY EQUIVALENT TO association reference set (foundation metadata concept'
          },
          {
            id: '',
            text: 'REFERS TO concept association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'REPLACED BY association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'SAME AS association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'SIMILAR TO association reference set (foundation metadata concept)'
          },
          {
            id: '',
            text: 'WAS A association reference set (foundation metadata concept)'
          },
          {id: '', text: 'No reason'}
        ];

        scope.addDescription = function () {

          var description = objectService.getNewDescription(scope.concept.id);
          scope.concept.descriptions.push(description);
        };

        scope.toggleDescriptionActive = function (description) {
          // if inactive, simply set active
          if (!description.active) {
            description.active = true;
          }

          // otherwise, open a selct reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason(description, 'Description', inactivateDescriptionReasons).then(function (reason) {
              description.active = false;
            });
          }
        };

        ////////////////////////////////
        // Relationship Elements
        ////////////////////////////////

        // ensure at least one empty IsA relationship and one empty attribute
        if (!scope.concept.outboundRelationships) {

          // IsA relationship
          var relPresent = false;
          angular.forEach(scope.concept.outboundRelationships, function (rel) {
            if (rel.typeId === '116680003') {
              relPresent = true;
            }
          });
          var rel = {};
          if (!relPresent) {
            console.debug('adding new relationship');
            rel = objectService.getNewIsaRelationship(scope.concept.id);
            scope.concept.outboundRelationships.push(rel);
          }

          // attribute relationship
          relPresent = false;
          angular.forEach(scope.concept.outboundRelationships, function (rel) {
            if (rel.typeId !== '116680003') {
              relPresent = true;
            }
          });
          if (!relPresent) {
            console.debug('adding new attribute');
            rel = objectService.getNewRelationship(scope.concept.id);
            rel.id = null; // clear the default typeId
            scope.concept.outboundRelationships.push(rel);
          }

        }

        // define characteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];

        scope.addIsaRelationship = function (isAttribute) {

          var relationship = objectService.getNewIsaRelationship(scope.concept.id);

          // if an attribute, clear the default type id
          // TODO May want to separate these out, we'll see
          if (isAttribute) {
            relationship.typeId = ''; // causes filter to read as attribute
          }
          scope.concept.outboundRelationships.push(relationship);
        };

        scope.addAttributeRelationship = function (isAttribute) {

          var relationship = objectService.getNewAttributeRelationship(scope.concept.id);

          // if an attribute, clear the default type id
          // TODO May want to separate these out, we'll see
          if (isAttribute) {
            relationship.typeId = ''; // causes filter to read as attribute
          }
          scope.concept.outboundRelationships.push(relationship);
        };

        // retrieve names of all relationship targets
        angular.forEach(scope.concept.outboundRelationships, function (rel) {

          // if destination not specified, do not retrieve
          if (!rel.destinationId) {
            return;
          }

          snowowlService.getConceptPreferredTerm(rel.destinationId, scope.branch).then(function (response) {
            rel.destinationName = response.term;
            scope.ctrlFn({arg: scope.concept.outboundRelationships.length});
          });

          // if not an isa relationship, retrieve attribute type
          // TODO Factor this into the mountain of metadata
          if (rel.typeId !== '116680003') {
            snowowlService.getConceptPreferredTerm(rel.typeId, scope.branch).then(function (response) {
              rel.typeName = response.term;
            });
          }

        });

        scope.toggleRelationshipActive = function (relationship) {
          // no special handling required, simply toggle
          relationship.active = !relationship.active;
        };

        ////////////////////////////////
        // Shared Elements
        ////////////////////////////////

        // deactivation modal for reason s elect
        var selectInactivationReason = function (component, componentType, reasons) {

          var deferred = $q.defer();

          var modalInstance = $modal.open({
            templateUrl: 'shared/inactivate-component-modal/inactivateComponentModal.html',
            controller: 'inactivateComponentModalCtrl',
            resolve: {
              componentType: function () {
                return componentType;
              },
              reasons: function () {
                return reasons;
              }
            }
          });

          modalInstance.result.then(function (reason) {
            deferred.resolve(reason);
          }, function () {
            deferred.reject();
          });

          return deferred.promise;
        };

        ////////////////////////////////////
        // Drag and drop functions
        ////////////////////////////////////

        // construct an id-name pair json object
        scope.getConceptIdNamePair = function (concept) {
          return {
            id: concept.id,
            name: concept.pt.term
          };
        };

        // construct an id-name pair json object from relationship target
        scope.getConceptIdNamePairFromRelationshipTarget = function (relationship) {
          return {
            id: relationship.destinationId,
            name: relationship.destinationName
          };
        };

        // construct an id-name pair json object from attribute type
        scope.getConceptIdNamePairFromAttributeType = function (relationship) {
          return {
            id: relationship.typeId,
            name: relationship.typeName
          };
        };

        scope.dropRelationshipTarget = function (relationship, data) {

          // check if modifications can be made (via effectiveTime)
          if (relationship.effectiveTime) {
            return;
          }

          if (!relationship) {
            console.error('Attempted to set target on null relationship');
          }
          if (!data || !data.id) {
            console.error('Attempted to set target on relationship from null data');
          }
          relationship.destinationId = data.id;

          // if name supplied, use it, otherwise retrieve it
          if (data.name) {
            relationship.destinationName = data.name;
          } else {
            snowowlService.getConceptPreferredTerm(data.id, scope.branch).then(function (response) {
              relationship.destinationName = response.term;
            });
          }
        };

        scope.dropAttributeType = function (relationship, data) {

          // check if modifications can be made (via effectiveTime)
          if (relationship.effectiveTime) {
            return;
          }

          if (!relationship) {
            console.error('Attempted to set type on null attribute');
          }
          if (!data || !data.id) {
            console.error('Attempted to set type on attribute from null data');
          }

          relationship.typeId = data.id;

          // if name supplied, use it, otherwise retrieve it
          if (data.name) {
            relationship.typeName = data.name;
          } else {
            snowowlService.getConceptPreferredTerm(data.id, scope.branch).then(function (response) {
              relationship.typeName = response.term;
            });
          }
        };

        // dummy function added for now to prevent default behavior
        // of dropping into untagged input boxes.  Issue has been raised
        // with the repository developers, but not up to forking and fixing
        // on my own right now -- too much to do! (PWG, 7/10/2015)
        scope.dropNullOp = function () {
          return null;
        };

        ///////////////////////////////////////////////
        // Concept Auto-Saving Validation Checks
        ///////////////////////////////////////////////

        // method to check single description for validity
        scope.isDescriptionValid = function (description) {
          if (!description.moduleId) {
            console.error('description must have moduleId specified');
            return false;
          }
          if (!description.term) {
            console.error('Description must have term specified');
            return false;
          }
          if (description.active === null) {
            console.error('Description active flag must be set');
            return false;
          }
          if (!description.lang) {
            console.error('Description lang must be set');
            return false;
          }
          if (!description.caseSignificance) {
            console.error('Description case significance must be set');
            return false;
          }
          if (!description.acceptabilityMap) {
            console.error('Description acceptability map must be set');
            return false;
          }

          // pass all checks -> return true
          return true;
        };

        // method to check single relationship for validity
        scope.isRelationshipValid = function (relationship) {

          // check relationship fields
          if (!relationship.modifier) {
            console.error('Relationship modifier must be set');
            return false;
          }
          if (relationship.groupId === null) {
            console.error('Relationship groupId must be set');
            return false;
          }
          if (!relationship.moduleId) {
            console.error('Relationship moduleId must be set');
            return false;
          }
          if (!relationship.target || !relationship.target.conceptId) {
            console.error('Relationship target conceptId must be set');
            return false;
          }
          if (relationship.active === null) {
            console.error('Relationship active flag must be set');
            return false;
          }
          if (!relationship.characteristicType) {
            console.error('Relationship characteristic type must be set');
            return false;
          }
          if (!relationship.type) {
            console.error('Relationship type must be set');
            return false;
          }

          // pass all checks -> return true
          return true;
        };

        // function to check the full concept for validity before saving
        scope.isConceptValid = function (concept) {

          console.debug('validating concept', concept);

          // check the basic concept fields
          if (concept.isLeafInferred === null) {
            console.error('Concept isleafInferred flag must be set');
            return false;
          }
          if (!concept.descriptions || concept.descriptions.length === 0) {
            console.error('Concept must have at least one description');
            return false;
          }
          if (!concept.relationships || concept.relationships.length === 0) {
            console.error('Concept must have at lalst one relationship');
            return false;
          }
          if (!concept.definitionStatus) {
            console.error('Concept definitionStatus must be set');
            return false;
          }
          if (concept.active === null) {
            console.error('Concept active flag must be set');
            return false;
          }
          if (!concept.moduleId) {
            console.error('Concept moduleId must be set');
            return false;
          }

          // check descriptions
          for (var i = 0; i < concept.descriptions.length; i++) {
            if (!scope.isDescriptionValid(concept.descriptions[i])) {
              console.error('Description not valid', concept.descriptions[i]);
              return false;
            }
          }

          // check relationships
          for (var j = 0; j < concept.relationships.length; j++) {
            if (!scope.isRelationshipValid(concept.relationships[j])) {
              console.error('Relationships not valid', concept.relationships[j]);
              return false;
            }
          }

          console.debug('valid concept');

          // pass all checks -> return true
          return true;

        };
/*
        // autosave on changes, if concept is valid
        var timeoutPromise;
        var delayInMs = 2000;
        scope.$watch('concept', function () {

          // cancel current timeout if not complete
          $timeout.cancel(timeoutPromise);

          // evaluate concept changes after timeout
          timeoutPromise = $timeout(function () {

            // if retrieval not complete, do not execute

            console.debug('change detected', scope.concept);

            // if concept not yet fully retrieved, do nothing
            if (!scope.concept || !scope.concept.descriptions || !scope.concept.outboundRelationships) {
              return;
            }

            // TODO Refactor UI model to match server format
            var parsedConcept = scope.parseConcept(scope.concept);

            // add to session history
            scope.conceptSessionHistory.push(parsedConcept);
            console.debug('new history', scope.conceptSessionHistory);

            // if no previous session history, do nothing
            // prevents autosave on load
            if (scope.conceptSessionHistory.length === 1) {
              return;
            }

            // TODO Check elements instead of entire concept if necessary
            // var lastState =
            // scope.conceptSessionHistory[conceptSessionHistory.length - 2];

            // check concept's base fields
            if (!scope.isConceptValid(parsedConcept)) {
              console.debug('concept not valid, not saving');
              return;
            }

            // save the concept
            // TDOO:  Enable this once all refactoring is complete
            // and concept is not modified by pt/fsn retrieval
            // (i.e. once we have the new API endpoint for content)
            scope.saveConcept(parsedConcept);
          });
        }, delayInMs);*/
      }
    };
  });