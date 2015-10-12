'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptEdit', function ($rootScope, $timeout, $modal, $q, scaService, snowowlService, objectService, notificationService, $routeParams) {
    return {
      restrict: 'A',
      transclude: false,
      replace: true,
      scope: {
        // the concept being displayed (required)
        concept: '=',

        // the branch of the concept (required)
        branch: '=',

        // the parent branch of the concept (not required)
        parentBranch: '=?',

        // whether to display as static list for conflicts (not required)
        static: '@?',

        // parent function to invoke updating the ui state for this concept's
        // list (not required)
        uiStateUpdateFn: '&?'
      },
      templateUrl: 'shared/concept-edit/conceptEdit.html',

      link: function (scope, element, attrs, linkCtrl) {

        if (!scope.concept) {
          console.error('Concept not specified for concept-edit');
          return;
        }

        if (!scope.branch) {
          console.error('Branch not specified for concept-edit');
          return;
        }

        // convert static flag from string to boolean
        if (scope.static === 'true') {
          scope.isStatic = true;
        } else {
          scope.isStatic = false;
        }

        console.debug('entered conceptEdit.js');

        // initialize the last saved version of this concept
        scope.unmodifiedConcept = JSON.parse(JSON.stringify(scope.concept));

        // on load, check if a modified, unsaved version of this concept exists
        scaService.getModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId).then(function (modifiedConcept) {

          console.debug('getting modified concept for task');

          // if not an empty JSON object, process the modified version
          if (modifiedConcept) {

            // console.debug('passed concept', scope.concept);
            // console.debug('modified concept', modifiedConcept);

            // replace the displayed content with the modified concept
            scope.concept = modifiedConcept;

            // reset the concept history to reflect modified change
            resetConceptHistory();

            // set scope flag
            scope.isModified = true;
          }

          // special case for unsaved concepts to catch possible bugs
          else {
            // if unsaved, and no modified data found, simply replace with
            // blank concept
            if (scope.concept.conceptId === 'unsaved') {
              scope.concept = objectService.getNewConcept(scope.branch);
            }
            scope.isModified = false;
          }
        });

        scope.collapse = function (concept) {
          if (scope.isCollapsed === true) {
            scope.isCollapsed = false;

            // id required, used in drawModel.js
            $('#image-' + concept.conceptId).css('display', 'inline-block');
          }
          else {
            scope.isCollapsed = true;

            // id required, used in drawModel.js
            $('#image-' + concept.conceptId).css('display', 'none');
          }

        };

        // console.debug(scope.concept, scope.branch, scope.parentBranch,
        // scope.static);

        // retrieve metadata (only modules for now)
        scope.modules = snowowlService.getModules();
        scope.languages = snowowlService.getLanguages();
        scope.dialects = snowowlService.getDialects();

        // flag for viewing active components only. Defaults to true.
        scope.hideInactive = true;

        scope.toggleHideInactive = function () {
          scope.hideInactive = !scope.hideInactive;
        };

        ////////////////////////////////
        // Concept Elements
        ////////////////////////////////

        // define characteristic types
        scope.definitionStatuses = [
          {id: 'PRIMITIVE', name: 'P'},
          {id: 'FULLY_DEFINED', name: 'FD'}
        ];

        /**
         * Front end enums:
         * [RETIRED, AMBIGUOUS, DUPLICATE, ERRONEOUS, MOVED_ELSEWHERE]
         */
        var inactivateConceptReasons = [
          {id: 'AMBIGUOUS', text: 'Ambiguous concept (inactive concept)'},
          {id: 'DUPLICATE', text: 'Duplicate concept (inactive concept)'},
          {id: 'ERRONEOUS', text: 'Erroneous concept (inactive concept)'},
          {id: 'MOVED_ELSEWHERE', text: 'Moved elsewhere (inactive concept'},
          {id: 'RETIRED', text: 'Reason not stated concept (inactive concept)'}
          /*
           TODO These values in requirement, but not in enum
           {id: '', text: 'Outdated concept (inactive concept)'},
           {id: '', text: 'Limited status concept (inactive concept)'},*/
        ];

        var inactivateConceptAssociationTargets = [
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
          }
        ];

        scope.removeConcept = function (concept) {
          $rootScope.$broadcast('stopEditing', {concept: concept});
        };

        scope.saveConcept = function () {

          scope.error = null;
          scope.warning = null;

          // deep-copy object for modification before submission
          // i.e. strip local values without modifying the current object
          var concept = JSON.parse(JSON.stringify(scope.concept));

          // display error msg if concept not valid but no other
          // errors/warnings specified
          if (!scope.isConceptValid(concept) && !scope.error && !scope.warning) {
            scope.error = 'Concept is not complete, and cannot be saved.  Specify all empty fields and try again.';
            return;
          }

          // clean concept of any locally added information
          snowowlService.cleanConcept(concept);

          // cycle over descriptions and relationships and remove any inactive,
          // unpublished content i.e. this is user added content that is later
          // removed via inactivation
          for (var i = 0; i < concept.descriptions.length; i++) {
            if (!concept.descriptions[i].effectiveTime && !concept.descriptions[i].active) {
              concept.descriptions.splice(i, 1);
              i--; // decrement counter to check next available description
            }
          }
          for (i = 0; i < concept.relationships.length; i++) {
            if (!concept.relationships[i].effectiveTime && !concept.relationships[i].active) {
              concept.relationships.splice(i, 1);
              i--; // decrement counter to check next available relationship
            }
          }

          var saveMessage = concept.conceptId ? 'Saving concept: ' + concept.fsn : 'Saving new concept';
          notificationService.sendMessage(saveMessage, 10000, null);

          // if new, use create
          if (!concept.conceptId) {

            snowowlService.createConcept($routeParams.projectKey, $routeParams.taskKey, concept).then(function (response) {

              //// console.debug('create', response);
              // successful response will have conceptId
              if (response && response.conceptId) {

                scope.concept = response;

                // set concept and unmodified state
                scope.concept = response;
                scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
                scope.isModified = false;

                // clear the saved modified state
                scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, null);

                // ensure descriptions are sorted
                sortDescriptions();

                // send notification of success with timeout
                var saveMessage = 'Concept saved: ' + response.fsn;
                notificationService.sendMessage(saveMessage, 5000, null);

                // broadcast event to any listeners (currently task detail,
                // conflict/feedback resolved lists)
                $rootScope.$broadcast('conceptEdit.conceptChange', {
                  branch: scope.branch,
                  conceptId: scope.concept.conceptId
                });

                // if ui state update function specified, call it (after a
                // moment to let binding update)
                //// console.debug('updating ui state', scope.concept);
                $timeout(function () {

                  if (scope.uiStateUpdateFn) {
                    // console.debug('ui state update fn specified');
                    scope.uiStateUpdateFn();
                  }
                }, 3000);

              }

              // handle error
              else {
                // set the local error
                scope.error = response.message;
              }
            });
          }

          // if not new, use update
          else {
            //// console.debug('update concept', concept);
            snowowlService.updateConcept($routeParams.projectKey, $routeParams.taskKey, concept).then(function (response) {

              // send notification of success with timeout
              var saveMessage = 'Concept saved:' + concept.fsn;
              notificationService.sendMessage(saveMessage, 5000, null);

              // console.debug('update response', response);
              if (response && response.conceptId) {

                // set concept and unmodified state
                scope.concept = response;
                scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
                scope.isModified = false;

                // clear the saved modified state
                scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, null);

                // broadcast event to any listeners (currently task detail,
                // conflict/feedback resolved lists)
                $rootScope.$broadcast('conceptEdit.conceptChange', {
                  branch: scope.branch,
                  conceptId: scope.concept.conceptId
                });

                // ensure descriptions are sorted
                sortDescriptions();

                // clear any stored modified versions of this unsaved concept
                // but only AFTER successful save -- duplicated in
                // updateConcept below
                scope.unmodifiedConcept = JSON.parse(JSON.stringify(response));
                scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, null);
              }
              else {
                scope.error = response.message;
              }
            });

          }
        };

        // function to toggle active status of concept
        // cascades to children components
        // NOTE: This function hard-saves the concept, to prevent sync errors
        // between inactivation reason persistence and concept state
        scope.toggleConceptActive = function () {

          // console.debug(scope.concept, scope.unmodifiedConcept);

          // if active, ensure concept is fully saved prior to inactivation
          // don't want to persist the inactivation reason without a forced save
          if (scope.isModified) {
            window.alert('You must save your changes to the concept before ' + (scope.concept.active ? 'inactivation.' : 'reactivation.'));
            return;
          }

          // if inactive, simply set active and autoSave
          if (!scope.concept.active) {
            scope.concept.active = true;
            scope.saveConcept();
          }

          // otherwise, open a select reason modal
          else {
            selectInactivationReason('Concept', inactivateConceptReasons, inactivateConceptAssociationTargets).then(function (reason, associationTarget) {

              notificationService.sendMessage('Inactivating concept (' + reason.text + (associationTarget ? ', ' + associationTarget : '') + ')', 10000);
              // console.debug(scope.branch, scope.concept.conceptId, reason,
              // associationTarget);

              snowowlService.inactivateConcept(scope.branch, scope.concept.conceptId, reason.id, associationTarget).then(function () {

                scope.concept.active = false;

                // if reason is selected, deactivate all descriptions and
                // relationships
                if (reason) {

                  // straightforward inactivation of relationships
                  // NOTE: Descriptions stay active so a FSN can still be found
                  angular.forEach(scope.concept.relationships, function (relationship) {
                    relationship.active = false;
                  });

                  // force save the concept
                  scope.saveConcept();
                }
              }, function () {
                notificationService.sendError('Could not save inactivation reason for concept, concept will remain active');
              });

            });
          }
        };

        // function to apply cascade changes when concept module id changes
        scope.setConceptModule = function (concept) {
          angular.forEach(scope.concept.descriptions, function (description) {
            description.moduleId = concept.moduleId;
          });
          angular.forEach(scope.concept.relationships, function (relationship) {
            relationship.moduleId = concept.moduleId;
          });
        };

        ////////////////////////////////
        // Description Elements
        ////////////////////////////////

        // define available languages
        scope.languages = [
          'en'
        ];

        // Define definition types
        // NOTE:  PT is not a SNOMEDCT type, used to set acceptabilities
        scope.descTypeIds = [
          {id: '900000000000003001', abbr: 'FSN', name: 'FSN'},
          {id: '900000000000013009', abbr: 'SYN', name: 'SYNONYM'},
          {id: '900000000000550004', abbr: 'DEF', name: 'TEXT_DEFINITION'}
        ];

        // define the available dialects
        scope.dialects = {
          'en-us': '900000000000509007',
          'en-gb': '900000000000508004'
        };

        // define acceptability types
        scope.acceptabilityAbbrs = {
          'PREFERRED': 'P',
          'ACCEPTABLE': 'A'
        };

        // Reorder descriptions based on type and acceptability
        // Must preserve position of untyped/new descriptions
        function sortDescriptions() {

          if (!scope.concept.descriptions) {
            return;
          }

          var newArray = [];

          // get all typed descriptions
          angular.forEach(scope.concept.descriptions, function (description) {
            if (description.type) {
              newArray.push(description);
            }
          });

          // sort typed descriptions
          newArray.sort(function (a, b) {

            // console.debug('sort on active', a.active, b.active);

            // active before inactive
            if (a.active === false && b.active === true) {
              return 1;
            }
            if (b.active === false && a.active === true) {
              return -1;
            }

            // sort based on type

            // console.debug('sort on type', a.type, b.type);
            if (a.type !== b.type) {

              // check both provided
              if (!a.type && b.type) {
                return 1;
              }
              if (!b.type && a.type) {
                return -1;
              }

              // sort based on type (both provided)
              var descOrderMap = {'FSN': 0, 'SYNONYM': 1, 'TEXT_DEFINITION': 2};
              return descOrderMap[a.type] < descOrderMap[b.type] ? -1 : 1;
            }

            // sort on acceptability map existence
            // console.debug('sort on acceptability map', a.acceptabilityMap,
            // b.acceptabilityMap, !a.acceptabilityMap, !b.acceptabilityMap);
            if (a.acceptabilityMap && !b.acceptabilityMap) {
              return -1;
            }
            if (!b.acceptabilityMap && a.acceptabilityMap) {
              return 1;
            }

            if (a.acceptabilityMap && b.acceptabilityMap) {

              // sort on en-us value first
              var aUS = a.acceptabilityMap[scope.dialects['en-us']];
              var bUS = b.acceptabilityMap[scope.dialects['en-us']];
              // console.debug('sorting on en-us', aUS, bUS);
              if (aUS !== bUS) {

                // specified value first
                if (aUS && !bUS) {
                  return -1;
                }
                if (bUS && !aUS) {
                  return 1;
                }

                // if both defined, one must be PREFERRED
                if (aUS === 'PREFERRED') {
                  return -1;
                }
                if (bUS === 'PREFERRED') {
                  return 1;
                }
              }

              // sort on en-us value first
              var aGB = a.acceptabilityMap[scope.dialects['en-gb']];
              var bGB = b.acceptabilityMap[scope.dialects['en-gb']];
              // console.debug('sorting on en-gb', aGB, bGB);
              if (aGB !== bGB) {
                // console.debug('not equal');

                // specified value first
                if (aGB && !bGB) {
                  return -1;
                }
                if (bGB && !aGB) {
                  return 1;
                }

                // if both defined, one must be PREFERRED
                if (aGB === 'PREFERRED') {
                  // console.debug('a preferred');
                  return -1;
                }
                if (bGB === 'PREFERRED') {
                  // console.debug('b preferred');
                  return 1;
                }
              }
            }
            // all else being equal, sort on term
            // console.debug('sorting on term', a.term, b.term);
            return a.term < b.term ? -1 : 1;
          });

          // cycle over original descriptions (backward) to reinsert non-typed
          // descriptions
          for (var i = 0; i < scope.concept.descriptions.length; i++) {
            if (!scope.concept.descriptions[i].type) {
              newArray.splice(i, 0, scope.concept.descriptions[i]);
            }
          }

          //// console.debug('new array', newArray);

          // replace descriptions
          scope.concept.descriptions = newArray;

          //
        }

        // on load, sort descriptions
        sortDescriptions();

        scope.setCaseSignificance = function (description, caseSignificance) {

          // if arguments not supplied or static element, do nothing
          if (!caseSignificance || !description || scope.isStatic) {
            return;
          }

          // if current case significance clicked, do nothing
          if (description.caseSignificance === caseSignificance) {
            return;
          }
          description.caseSignificance = caseSignificance;
          autoSave();
        };

        scope.getInitialSelectedDialect = function (description) {
          return description.acceptabilityMap.hasOwnProperty('900000000000508004') ? '900000000000508004' :
            (description.acceptabilityMap.hasOwnProperty('900000000000508004') ? '900000000000508004' : '');
        };

        // List of acceptable reasons for inactivating a description
        // TODO:  More metadata to be retrieved on init and stored
        var inactivateDescriptionReasons = [
          {
            id: '', text: 'No reason'
          },
          {
            id: '',
            text: 'Component moved elsewhere (foundation metadata concept)'
          },
          {
            id: '',
            text: 'Concept non-current (foundation metadata concept)'
          },
          {
            id: '',
            text: 'Duplicate component (foundation metadata concept)'
          },
          {
            id: '',
            text: 'Erroneous component (foundation metadata concept)'
          },
          {
            id: '',
            text: 'Inappropriate component (foundation metadata concept)'
          },
          {
            id: '',
            text: 'Limited component (foundation metadata concept)'
          },
          {
            id: '',
            text: 'Outdated component (foundation metadata concept)'
          },
          {
            id: '',
            text: 'Pending move (foundation metadata concept)'
          }
        ];

        var inactivateDescriptionHistoricalReasons = [
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
          }
        ];

        // get viewed descriptions
        scope.getDescriptions = function (checkForActive) {
          var descs = [];

          if (!scope.concept.descriptions) {
            return descs;
          }

          for (var i = 0; i < scope.concept.descriptions.length; i++) {

            // check hideInactive
            if (!checkForActive || !scope.hideInactive || (scope.hideInactive && scope.concept.descriptions[i].active === true)) {
              descs.push(scope.concept.descriptions[i]);
            }

          }
          return descs;
        };

        // Adds a description to the concept
        // arg: afterIndex, integer, the index at which to add description after
        scope.addDescription = function (afterIndex) {

          var description = objectService.getNewDescription(scope.concept.id);

          // if not specified, simply push the new description
          if (afterIndex === null || afterIndex === undefined) {
            scope.concept.descriptions.push(description);
            autoSave();
          }
          // if in range, add after the specified afterIndex
          else {
            scope.concept.descriptions.splice(afterIndex + 1, 0, description);
            autoSave();
          }

        };

        /**
         * Inactivates or reactivates a description
         * NOTE: Uses hard-save to prevent sync errors between inactivation
         * reason persistence and concept state
         * @param description
         */
        scope.toggleDescriptionActive = function (description) {

          // if inactive, simply set active
          if (!description.active) {
            description.active = true;
            autoSave();
          }

          // if an unpublished description, no reason required
          else if (!description.effectiveTIme) {
            description.active = false;

            // ensure all minimum fields are present
            objectService.applyMinimumFields(scope.concept);

            autoSave();
          }

          // otherwise, open a select reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason('Description', inactivateDescriptionReasons, inactivateDescriptionHistoricalReasons).then(function (reason) {

              description.active = false;
              scope.saveConcept();

            });

          }
        };

        /// define case significances
        scope.getCaseSignificanceDisplayText = function (description) {
          switch (description.caseSignificance) {
            case 'INITIAL_CHARACTER_CASE_INSENSITIVE':
              return 'Cs';
            case 'CASE_INSENSITIVE':
              return 'ci';
            default:
              return '??';
          }
        };

        // Authors report only two vaqlues used, switch between them on toggle
        scope.toggleCaseSignificance = function (description) {
          if (description.caseSignificance === 'CASE_INSENSITIVE') {
            description.caseSignificance = 'INITIAL_CHARACTER_CASE_INSENSITIVE';
          } else {
            description.caseSignificance = 'CASE_INSENSITIVE';
          }

          autoSave();
        };

        // languages available

        // toggles the acceptability map entry based on dialect name
        // if no value, sets to PREFERRED
        scope.toggleAcceptability = function (description, dialectName) {

          if (!description.acceptabilityMap) {
            description.acceptabilityMap = {};
          }

          description.acceptabilityMap[scope.dialects[dialectName]] =
            description.acceptabilityMap[scope.dialects[dialectName]] === 'PREFERRED' ?
              'ACCEPTABLE' : 'PREFERRED';

          autoSave();
        };

        /*

         conceptEdit.js:536
         en-gb
         900000000000509004
         undefined
         Object {900000000000509007: "ACCEPTABLE", 900000000000508004: "PREFERRED"}
         undefined
         undefined
         undefined

         /*

         // returns the display abbreviation for a specified dialect
         */
        scope.getAcceptabilityDisplayText = function (description, dialectName) {
          if (!description || !dialectName) {
            return null;
          }
          var dialectId = scope.dialects[dialectName];

          // if no acceptability map specified, return null
          if (!description.acceptabilityMap) {
            return null;
          }

          // retrieve the value (or null if does not exist) and return
          var acceptability = description.acceptabilityMap[dialectId];
          //If the desciption is an FSN then set to PREFERRED and
          // continue.Simplest place in execution to catch the creation of new
          // FSN's and update acceptability
          if (description.type === 'FSN') {
            if (acceptability !== 'PREFERRED') {
              description.acceptabilityMap[dialectId] = 'PREFERRED';
            }
          }
          return scope.acceptabilityAbbrs[acceptability];
        };

        ////////////////////////////////
        // Relationship Elements
        ////////////////////////////////
        scope.getIsARelationships = function (checkForActive) {

          if (!scope.concept.relationships) {
            return [];
          }
          var rels = [];
          for (var i = 0; i < scope.concept.relationships.length; i++) {

            // check for type id and active-view flag
            if (scope.concept.relationships[i].type.conceptId === '116680003') {

              // check hideInactive
              if (!checkForActive || !scope.hideInactive || (scope.hideInactive && scope.concept.relationships[i].active === true)) {
                rels.push(scope.concept.relationships[i]);
              }
            }
          }

          rels.sort(function (a, b) {
            if (a.groupId !== b.groupId) {
              return a.groupId > b.groupId;
            }
            if (a.type.conceptId !== b.type.conceptId) {
              return a.type.conceptId > b.type.conceptId;
            }
            return a.target.conceptId > b.target.conceptName;
          });

          return rels;
        };

        scope.getAttributeRelationships = function (checkForActive) {

          if (!scope.concept.relationships) {
            return [];
          }
          var rels = [];
          for (var i = 0; i < scope.concept.relationships.length; i++) {
            if (scope.concept.relationships[i].type.conceptId !== '116680003') {

              // check hideInactive
              if (!checkForActive || !scope.hideInactive || (scope.hideInactive && scope.concept.relationships[i].active === true)) {
                rels.push(scope.concept.relationships[i]);
              }
            }
          }

          rels.sort(function (a, b) {
            if (a.groupId !== b.groupId) {
              return a.groupId > b.groupId;
            }
            if (a.type.conceptId !== b.type.conceptId) {
              return a.type.conceptId > b.type.conceptId;
            }
            return a.target.conceptId > b.target.conceptName;
          });

          return rels;
        };

        // define characteristic types
        scope.characteristicTypes = [
          {id: 'STATED_RELATIONSHIP', abbr: 'Stated'},
          {id: 'INFERRED_RELATIONSHIP', abbr: 'Inferred'}
        ];

        // Adds an Is A relationship at the specified position
        // arg: afterIndex, int, the position after which relationship to be
        // added NOTE: This is relative to is a relationships ONLY
        scope.addIsaRelationship = function (afterIndex) {

          //// console.debug('adding attribute relationship', afterIndex);

          var relationship = objectService.getNewIsaRelationship(scope.concept.id);

          // if afterIndex not supplied or invalid, simply add
          if (afterIndex === null || afterIndex === undefined) {
            scope.concept.relationships.push(relationship);

            autoSave();
          }

          // otherwise, add at the index specified
          else {
            // find the index of the requested insertion point
            var rels = scope.getIsARelationships();
            var relIndex = scope.concept.relationships.indexOf(rels[afterIndex]);

            // console.debug('found relationship index', relIndex);

            // add the relationship
            scope.concept.relationships.splice(relIndex + 1, 0, relationship);

            autoSave();
          }
        };

        scope.addAttributeRelationship = function (afterIndex, relGroup) {

          //  // console.debug('adding attribute relationship', afterIndex);

          var relationship = objectService.getNewAttributeRelationship(scope.concept.id);

          // set role group if specified
          if (relGroup) {
            relationship.groupId = relGroup;
          }

          // if afterIndex not supplied or invalid, simply add
          if (afterIndex === null || afterIndex === undefined) {
            scope.concept.relationships.push(relationship);

            autoSave();
          }

          // otherwise, add at the index specified
          else {
            // find the index of the requested insertion point
            var rels = scope.getAttributeRelationships();
            var relIndex = scope.concept.relationships.indexOf(rels[afterIndex]);

            //   // console.debug('found relationship index', relIndex);

            // add the relationship
            scope.concept.relationships.splice(relIndex + 1, 0, relationship);

            autoSave();
          }
        };

        scope.toggleRelationshipActive = function (relationship) {
          // no special handling required, simply toggle
          relationship.active = !relationship.active;
          objectService.applyMinimumFields(scope.concept);
          autoSave();
        };

        scope.getConceptsForTypeahead = function (searchStr) {
          console.debug('entered getConceptsForTypeAhead', searchStr);
          return snowowlService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {

            // remove duplicates
            for (var i = 0; i < response.length; i++) {
              console.debug('checking for duplicates', i, response[i]);
              for (var j = response.length - 1; j > i; j--) {
                if (response[j].concept.conceptId === response[i].concept.conceptId) {
                  console.debug(' duplicate ', j, response[j]);
                  response.splice(j, 1);
                  j--;
                }
              }
            }

            return response;
          });
        };

        /**
         * Sets relationship type concept based on typeahead selection
         * @param relationshipField the type or target JSON object
         * @param conceptId the concept id
         * @param fsn the fsn
         */
        scope.setRelationshipTypeConcept = function (relationship, item) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          console.debug('setting relationship type concept', relationship, item);

          relationship.type.conceptId = item.concept.conceptId;
          relationship.type.fsn = item.concept.fsn;

          scope.updateRelationship(relationship);
        };

        /**
         * Sets relationship target concept based on typeahead selection
         * @param relationshipField the type or target JSON object
         * @param conceptId the concept id
         * @param fsn the fsn
         */
        scope.setRelationshipTargetConcept = function (relationship, item) {
          if (!relationship || !item) {
            console.error('Cannot set relationship concept field, either field or item not specified');
          }

          console.debug('setting relationship target concept', relationship, item);

          relationship.target.conceptId = item.concept.conceptId;
          relationship.target.fsn = item.concept.fsn;

          scope.updateRelationship(relationship);
        };

        /**
         * Function to return display name of relationship concept type/target,
         * called on field blur
         * @param relationshipField the type or target JSON object
         * @returns {*}
         */
        scope.getConceptNameForRelationshipField = function (relationshipField) {
          return relationshipField.fsn
        };

        /**
         * Function to validate a relationship field
         * @param relationshipField
         */
        scope.validateRelationshipField = function (relationshipField) {
          // get the concept from its id
          snowowlService.getFullConcept(relationshipField.conceptId, scope.branch).then(function (response) {

            // if name does not match, change fsn and alert user
            if (relationshipField.fsn !== response.fsn) {
              relationshipField.fsn = response.fsn;
              scope.warning = 'The concept name "' + relationshipField.fsn + '" does not match the id specified by the relationship, and has been changed. Please select concepts for relationships using drag/drop or the typeahead list only.';
            }
          })
        };

        ////////////////////////////////
        // Shared Elements
        ////////////////////////////////

        // deactivation modal for reason s elect
        var selectInactivationReason = function (componentType, reasons, associationTargets) {

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
              },
              associationTargets: function () {
                return associationTargets ? associationTargets : [];
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
          // console.debug('getConceptIdNamePair');
          return {
            id: relationship.target.conceptId,
            name: relationship.target.fsn
          };
        };

        // construct an id-name pair json object from attribute type
        scope.getConceptIdNamePairFromAttributeType = function (relationship) {
          // console.debug('getConceptIdNamePair');
          return {
            id: relationship.type.conceptId,
            name: relationship.type.fsn
          };
        };

        scope.dropRelationshipTarget = function (relationship, data) {

          console.debug('dropped target', data);

          // cancel if static
          if (scope.isStatic) {
            return;
          }
          // console.debug('Drag-n-drop: Relationship Target');

          // check if modifications can be made (via effectiveTime)
          if (relationship.effectiveTime) {
            console.error('Cannot update released relationship');
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
            scope.updateRelationship(relationship);
          } else {

            relationship.target.fsn = 'Retrieving...';
            // get full concept and extract name
            snowowlService.getFullConcept(data.id, scope.branch).then(function (response) {
              relationship.target.fsn = response.fsn;
              scope.updateRelationship(relationship);
            });
          }

        };

        scope.dropRelationshipType = function (relationship, data) {

          console.debug('dropped type', data);

          // cancel if static
          if (scope.isStatic) {
            return;
          }

          // console.debug('Drag-n-drop:  Relationship Type');

          // check if modifications can be made (via effectiveTime)
          if (relationship.effectiveTime) {
            console.error('Cannot update released relationship');
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
            // console.debug(relationship);
            scope.updateRelationship(relationship);
          } else {
            snowowlService.getConceptPreferredTerm(data.id, scope.branch).then(function (response) {
              relationship.type.fsn = response.term;
              // console.debug(relationship);
              scope.updateRelationship(relationship);
            });
          }

        };

        /**
         * Function called when dropping a description on another description
         * @param target the description dropped on
         * @param source the dragged description
         */
        scope.dropDescription = function (concept, target, source) {

          // console.debug('dropDescription', concept, target, source);

          // check arguments
          if (!target || !source) {
            console.error('Cannot drop description, either source or target not specified');
            return;
          }

          // check if target is released (not valid target)
          if (target.effectiveTime) {
            console.error('Cannot drop description on previously released description');
            return;
          }

          // check if target is static
          if (scope.isStatic) {
            console.error('Scope is static, cannot drop');
            return;
          }

          // copy description object and replace target description
          var copy = angular.copy(source);

          // clear the effective time
          copy.effectiveTime = null;

          // find the matching description and replace
          // NOTE: Direct reference to description was not working,
          // hence the passing of concept and cycling here
          for (var i = 0; i < concept.descriptions.length; i++) {
            if (concept.descriptions[i] === target) {
              concept.descriptions[i] = copy;
              autoSave();
            }
          }
        };

        /**
         * Function called when dropping a relationship on another relationship
         * Appends (clones) dropped relationship after the target
         * @param target the relationship dropped on
         * @param source the dragged relationship
         */
        scope.dropRelationship = function (concept, target, dropped) {

          console.debug('dropRelationship', concept, target, dropped);

          // check arguments
          if (!concept || !concept.relationships) {
            console.debug('Cannot drop relationship, concept not properly specified');
            return;

          }
          if (!target || !dropped) {
            console.error('Cannot drop relationship, either dropped or target not specified');
            return;
          }

          // check if target is static
          if (scope.isStatic) {
            console.error('Scope is static, cannot drop');
            return;
          }

          // copy relationship object and replace target relationship
          var copy = angular.copy(dropped);

          // clear the effective time and source information
          copy.sourceId = null;
          copy.effectiveTime = null;
          delete copy.relationshipId;
          delete copy.target.effectiveTime;
          delete copy.target.moduleId;
          delete copy.target.active;
          delete copy.target.definitionStatus;
          delete copy.target.characteristicType;

          // get index of target relationship
          var index = concept.relationships.indexOf(target);

          // insert after dropped relationship
          concept.relationships.splice(index, 0, copy);

          autoSave();
        };

        // dummy function added for now to prevent default behavior
        // of dropping into untagged input boxes.  Issue has been raised
        // with the repository developers, but not up to forking and fixing
        // on my own right now -- too much to do! (PWG, 7/10/2015)
        scope.dropNullOp = function () {
          return null;
        };

        ///////////////////////////////////////////////
        // Component property retrieval (Inactivation)
        ///////////////////////////////////////////////

        /**
         * Sets needed concept properties as element attributes
         * @param concept
         */
        scope.setConceptProperties = function (concept) {
          if (!concept) {
            return;
          }

          // retrieve inactivation reason if inactive
          if (!concept.active) {
            snowowlService.getConceptProperties(concept.conceptId, scope.branch).then(function (response) {
              if (!response.inactivationIndicator) {
                concept.inactivationIndicator = 'No reason specified';
              } else {
                concept.inactivationIndicator = response.inactivationIndicator;
              }
            });
          }
        };

        /**
         * Sets needed description properties as element attributes
         * @param description
         */
        scope.setDescriptionProperties = function (description) {

          if (!description) {
            return;
          }

          // retrieve inactivation reason if inactive
          if (!description.active) {
            snowowlService.getDescriptionProperties(description.descriptionId, scope.branch).then(function (response) {
              if (!response.descriptionInactivationIndicator) {
                description.inactivationIndicator = 'No reason specified';
              } else {
                description.inactivationIndicator = response.descriptionInactivationIndicator;
              }
            });
          }
        };

        // NOTE: No inactivation reasons currently for relationships

        ///////////////////////////////////////////////
        // Concept Auto-Saving Validation Checks
        ///////////////////////////////////////////////

        // method to check single description for validity
        scope.isDescriptionValid = function (description) {

          // if not published and inactive, consider valid (removed by
          // saveConcept)
          if (!description.active && !description.effectiveTime) {
            return true;
          }

          if (!description.moduleId) {
            //description.error = 'description must have moduleId specified';
            return false;
          }
          if (!description.term) {
            //description.error = 'Description must have term specified';
            return false;
          }
          if (description.active === null) {
            //description.error = 'Description active flag must be set';
            return false;
          }
          if (!description.lang) {
            //description.error = 'Description lang must be set';
            return false;
          }
          if (!description.caseSignificance) {
            //description.error = 'Description case significance must be set';
            return false;
          }
          if (!description.type) {
            //description.error = 'Description type must be set';
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

          // if not active and no effective time, consider valid (removed by
          // saveConcept)
          if (!relationship.active && !relationship.effectiveTime) {
            return true;
          }

          // check relationship fields
          if (!relationship.modifier) {
            //relationship.error = 'Relationship modifier must be set';
            return false;
          }
          if (relationship.groupId === null) {
            //relationship.error = 'Relationship groupId must be set';
            return false;
          }
          if (!relationship.moduleId) {
            //relationship.error = 'Relationship moduleId must be set';
            return false;
          }
          if (relationship.active === null) {
            // relationship.error = 'Relationship active flag must be set';
            return false;
          }
          if (!relationship.characteristicType) {
            //relationship.error = 'Relationship characteristic type must be
            // set';
            return false;
          }
          if (!relationship.type || !relationship.type.conceptId) {
            console.error( 'Relationship type must be set');
            return false;
          }
          if (!relationship.target || !relationship.target.conceptId) {
            console.error('Relationship target must be set');
            return false;
          }

          // verify that source id exists
          if (scope.concept.conceptId && !relationship.sourceId) {
            relationship.sourceId = scope.concept.conceptId;
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
          var activeFsn = [];
          for (var i = 0; i < concept.descriptions.length; i++) {
            if (concept.descriptions[i].type === 'FSN' && concept.descriptions[i].active === true) {
              activeFsn.push(concept.descriptions[i]);
            }
          }
          if (activeFsn.length !== 1) {
            scope.warning = 'Concept with id: ' + concept.conceptId + ' Must have exactly one active FSN. Concept not saved.';
            return false;
          }

          // check descriptions
          for (var k = 0; k < concept.descriptions.length; k++) {
            if (!scope.isDescriptionValid(concept.descriptions[k])) {
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

        // function to update description and autoSave if indicated
        scope.updateDescription = function (description) {

          // console.debug('updateDescription');
          if (!description) {
            return;
          }

          autoSave();
        };

        // function to update relationship and autoSave if indicated
        scope.updateRelationship = function (relationship) {
          if (!relationship) {
            return;
          }

          autoSave(relationship);

        };

        scope.revertConcept = function () {
          if (!scope.parentBranch) {
            return;
          }

          notificationService.sendMessage('Reverting concept ' + scope.concept.fsn + ' to parent branch ' + scope.parentBranch, 0);

          snowowlService.getFullConcept(scope.concept.conceptId, scope.parentBranch).then(function (response) {
            scope.concept = response;
            notificationService.clear();
            autoSave();
          }, function (error) {
            notificationService.sendError('Error reverting: Could not retrieve concept ' + scope.concept.conceptId + ' from parent branch ' + scope.parentBranch);
          });

        };

        /////////////////////////////
        // Undo / Redo functions
        /////////////////////////////

        // concept history for undoing changes (init with passed concept)
        scope.conceptHistory = [JSON.parse(JSON.stringify(scope.concept))];

        // concept history pointer (currently active state)
        scope.conceptHistoryPtr = 0;

        /**
         * Saves the current concept state for later retrieval
         * Called by autoSave(), undo(), redo()
         */
        function saveModifiedConcept() {

          // console.debug('saveModifiedConcept', scope.concept,
          // scope.unmodifiedConcept);

          // if changed
          if (scope.concept !== scope.unmodifiedConcept) {

            scope.isModified = true;

            // store the modified concept in ui-state
            scaService.saveModifiedConceptForTask($routeParams.projectKey, $routeParams.taskKey, scope.concept.conceptId, scope.concept).then(function () {
              // do nothing
            });
          } else {
            scope.isModified = false;
          }
        }

        /**
         * Autosaves the concept modifications and updates history
         * NOTE: outside $watch to prevent spurious updates
         */
        function autoSave() {

          // console.debug('conceptEdit: autosave called', scope.concept ===
          // scope.lastModifiedConcept, scope.concept);

          scope.conceptHistory.push(JSON.parse(JSON.stringify(scope.concept)));
          scope.conceptHistoryPtr++;

          console.debug('autosave', scope.conceptHistory);

          // save the modified concept
          saveModifiedConcept();

        }

        /**
         * Resets concept history
         */
        function resetConceptHistory() {
          scope.conceptHistory = [JSON.parse(JSON.stringify(scope.concept))];
          scope.conceptHistoryPtr = 0;
        }

        /**
         * Undo:  Decrement history pointer and update display
         */
        scope.undo = function () {
          if (scope.conceptHistoryPtr > 0) {
            scope.conceptHistoryPtr--;
            scope.concept = scope.conceptHistory[scope.conceptHistoryPtr];
            // console.debug('undo results', scope.concept);

            saveModifiedConcept();
          }
        };

        /**
         * Redo:  Increment history pointer and update display
         */
        scope.redo = function () {
          if (scope.conceptHistoryPtr < scope.conceptHistory.length - 1) {
            scope.conceptHistoryPtr++;
            scope.concept = scope.conceptHistory[scope.conceptHistoryPtr];

            saveModifiedConcept();
          }
        };

        /**
         * Undo all:  Add original version to end of history and update display
         */
        scope.undoAll = function () {

          // if no previously published state, get a new (blank) concept
          if (scope.concept.conceptId === 'unsaved') {

            scope.concept = objectService.getNewConcept(scope.branch);
            // console.debug('no last saved version', scope.concept,
            // objectService.getNewConcept(scope.branch));
          } else {
            scope.concept = scope.unmodifiedConcept;
          }

          autoSave();

        };

        //////////////////////////////////////////////
        // Attribute Removal functions
        //////////////////////////////////////////////

        /**
         * Deletes a given description by index from the descriptions array and
         * then updates the ui-state for the concept
         * @param description
         */
        scope.deleteDescription = function (description) {
          var index = scope.concept.descriptions.indexOf(description);
          scope.concept.descriptions.splice(index, 1);
          autoSave();
        };

        /**
         * Deletes a given relationship by index from the relationships array
         * and then updates the ui-state for the concept
         * @param relationship
         */
        scope.deleteRelationship = function (relationship) {
          var index = scope.concept.relationships.indexOf(relationship);
          scope.concept.relationships.splice(index, 1);
          autoSave();
        };

        //////////////////////////////////////////////
        // Model functions
        //////////////////////////////////////////////

        /**
         * Hides or displays model for a given concept (edit view only)
         * @param concept
         */
        scope.modelVisible = true;
        scope.showModel = function (concept) {
          scope.modelVisible = !scope.modelVisible;
          if ($('#image-' + concept.conceptId).css('display') === 'none') {
            $('#image-' + concept.conceptId).css('display', 'inline-block');
          }
          else {
            $('#image-' + concept.conceptId).css('display', 'none');
          }
        };
      }
    }
      ;
  })
;
