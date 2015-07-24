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

        scope.collapse = function (concept) {
          if (scope.isCollapsed === true) {
            scope.isCollapsed = false;
            $('#model' + concept.conceptId).css('display', 'inline-block');
          }
          else {
            scope.isCollapsed = true;
            $('#model' + concept.conceptId).css('display', 'none');
          }

        };

        // concept history for undoing changes
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
          $rootScope.$broadcast('conceptEdit.removeConcept', {concept: concept});
        };

        scope.saveConcept = function (suppressMessage) {
          // deep copy the concept for subsequent modification
          // (1) relationship display names
          // (1) disallowed keys
          var concept = JSON.parse(JSON.stringify(scope.concept));

          // check if concept valid
          if (!scope.isConceptValid(concept)) {
            return;
          }

          // remove the display names from relationship type/target
          // TODO Check if this is still necessary
          angular.forEach(concept.relationships, function (rel) {
            delete rel.target.fsn;
            delete rel.type.fsn;
          });

          $rootScope.$broadcast('conceptEdit.saving', {concept: concept});

          // if new, use create
          if (!concept.conceptId) {

            snowowlService.createConcept($routeParams.projectId, $routeParams.taskId, concept).then(function (response) {

              if (response && response.conceptId) {

                scope.concept = response;

                // broadcast new concept to add to ui state edit-panel
                $rootScope.$broadcast('conceptEdit.saveSuccess', {response: response});
              } else {
                console.error('Response to createConcept does not have a concept id');

              }
            });
          }

          // if not new, use update
          else {
            snowowlService.updateConcept($routeParams.projectId, $routeParams.taskId, concept).then(function (response) {
              if (response && response.conceptId) {
                scope.concept = response;
                $rootScope.$broadcast('conceptEdit.saveSuccess', {response: response});
              }
              else {
                $rootScope.$broadcast('conceptEdit.saveSuccess', {response: response});
              }
            });

          }
        };

        scope.toggleConceptActive = function (concept) {
          // if inactive, simply set active and autosave
          if (!concept.active) {
            concept.active = true;
            autosave();
          }

          // otherwise, open a select reason modal
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
                angular.forEach(scope.concept.relationships, function (relationship) {
                  relationship.active = false;
                });

                // autosave
                autosave();
              }
            });
          }
        };

        ////////////////////////////////
        // Description Elements
        ////////////////////////////////

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
            autosave();
          }

          // otherwise, open a selct reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason(description, 'Description', inactivateDescriptionReasons).then(function (reason) {
              description.active = false;
              autosave();
            });
          }
        };

        ////////////////////////////////
        // Relationship Elements
        ////////////////////////////////

        scope.getIsARelationships = function () {
          var rels = [];
          for (var i = 0; i < scope.concept.relationships.length; i++) {
            if (scope.concept.relationships[i].type.conceptId === '116680003') {
              rels.push(scope.concept.relationships[i]);
            }
          }
          return rels;
        };

        scope.getAttributeRelationships = function () {
          var rels = [];
          for (var i = 0; i < scope.concept.relationships.length; i++) {
            if (scope.concept.relationships[i].type.conceptId !== '116680003') {
              rels.push(scope.concept.relationships[i]);
            }
          }
          return rels;
        };

        // define characteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];

        scope.addIsaRelationship = function () {

          var relationship = objectService.getNewIsaRelationship(scope.concept.id);
          scope.concept.relationships.push(relationship);
        };

        scope.addAttributeRelationship = function () {

          var relationship = objectService.getNewAttributeRelationship(scope.concept.id);
          scope.concept.relationships.push(relationship);
        };

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
            id: concept.conceptId,
            name: concept.fsn
          };
        };

        // construct an id-name pair json object from relationship target
        scope.getConceptIdNamePairFromRelationshipTarget = function (relationship) {
          return {
            id: relationship.target.conceptId,
            name: relationship.target.fsn
          };
        };

        // construct an id-name pair json object from attribute type
        scope.getConceptIdNamePairFromAttributeType = function (relationship) {
          return {
            id: relationship.type.conceptId,
            name: relationship.type.fsn
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
          relationship.target.conceptId = data.id;

          // if name supplied, set the display name, otherwise retrieve it
          if (data.name) {
            relationship.target.fsn = data.name;
          } else {
            snowowlService.getConceptPreferredTerm(data.id, scope.branch).then(function (response) {
              relationship.target.fsn = response.term;
            });
          }

          // update the relationship -- TODO Check if name required
          scope.updateRelationship(relationship);
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

          relationship.type.conceptId = data.id;

          // if name supplied, use it, otherwise retrieve it
          if (data.name) {
            relationship.type.fsn = data.name;
          } else {
            snowowlService.getConceptPreferredTerm(data.id, scope.branch).then(function (response) {
              relationship.type.fsn = response.term;
            });
          }

          // update the concept -- TODO Check if name required
          scope.updateRelationship(relationship);
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
            description.error = 'description must have moduleId specified';
            return false;
          }
          if (!description.term) {
            description.error = 'Description must have term specified';
            return false;
          }
          if (description.active === null) {
            description.error = 'Description active flag must be set';
            return false;
          }
          if (!description.lang) {
            description.error = 'Description lang must be set';
            return false;
          }
          if (!description.caseSignificance) {
            description.error = 'Description case significance must be set';
            return false;
          }
          if (!description.type) {
            description.error = 'Description type must be set';
            return false;
          }
          /*if (!description.acceptabilityMap) {
           console.error('Description acceptability map must be set');
           return false;
           }*/

          // remove error (if previously applied)
          if (description.error) {
            delete description.error;
          }

          // pass all checks -> return true
          return true;
        };

        // method to check single relationship for validity
        scope.isRelationshipValid = function (relationship) {

          // check relationship fields
          if (!relationship.modifier) {
            relationship.error = 'Relationship modifier must be set';
            return false;
          }
          if (relationship.groupId === null) {
            relationship.error = 'Relationship groupId must be set';
            return false;
          }
          if (!relationship.moduleId) {
            relationship.error = 'Relationship moduleId must be set';
            return false;
          }
          if (!relationship.target || !relationship.target.conceptId) {
            relationship.error = 'Relationship target conceptId must be set';
            return false;
          }
          if (relationship.active === null) {
            relationship.error = 'Relationship active flag must be set';
            return false;
          }
          if (!relationship.characteristicType) {
            relationship.error = 'Relationship characteristic type must be set';
            return false;
          }
          if (!relationship.type) {
            relationship.error = 'Relationship type must be set';
            return false;
          }

          delete relationship.error;
          // pass all checks -> return true
          return true;
        };

        // function to check the full concept for validity before saving
        scope.isConceptValid = function (concept) {

          /*// check the basic concept fields
           if (concept.isLeafInferred === null) {
           console.error('Concept isleafInferred flag must be set');
           return false;
           }*/
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
              return false;
            }
          }

          // check relationships
          for (var j = 0; j < concept.relationships.length; j++) {
            if (!scope.isRelationshipValid(concept.relationships[j])) {
              return false;
            }
          }

          // pass all checks -> return true
          return true;

        };

        // function to update description and autosave if indicated
        scope.updateDescription = function (description) {
          if (!description) {
            return;
          }
          delete description.descriptionId;
          if (scope.isDescriptionValid(description)) {
            autosave();
          } else {
            console.error('  Error: ', description.error);
          }
        };

        // function to update relationship and autosave if indicated
        scope.updateRelationship = function (relationship) {
          if (!relationship) {
            return;
          }
          relationship.sourceId = scope.concept.conceptId;
          if (scope.isRelationshipValid(relationship)) {
            autosave();
          } else {
            console.error('  Error: ', relationship.error);
          }
        };

        function autosave() {

          // add revision to session history
          scope.conceptSessionHistory.push(scope.concept);

          // save the concept
          scope.saveConcept();
        }

        scope.showModel = function () {
          $rootScope.$broadcast('conceptEdit.showModel');
        };

      }
    };
  })
;