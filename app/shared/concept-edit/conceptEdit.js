'use strict';
angular.module('singleConceptAuthoringApp')
  .directive('conceptEdit', function ($rootScope, $timeout, $modal, $q, snowowlService, objectService, notificationService, $routeParams) {
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


        // convert static flag from string to boolean
        if (scope.static === 'true') {
          scope.isStatic = true;
        } else {
          scope.isStatic = false;
        }

        scope.collapse = function (concept) {
          if (scope.isCollapsed === true) {
            scope.isCollapsed = false;

            // id required, used in drawModel.js
            $('#model' + concept.conceptId).css('display', 'inline-block');
          }
          else {
            scope.isCollapsed = true;

            // id required, used in drawModel.js
            $('#model' + concept.conceptId).css('display', 'none');
          }

        };

        // console.debug(scope.concept, scope.branch, scope.parentBranch,
        // scope.static);

        // concept history for undoing changes
        scope.conceptSessionHistory = [];

        // retrieve metadata (only modules for now)
        scope.modules = snowowlService.getModules();
        scope.languages = snowowlService.getLanguages();
        scope.dialects = snowowlService.getDialects();

        // flag for viewing active components only. Defaults:
        // FALSE if new concept (no fsn)
        // TRUE otherwise
        scope.hideInactive = scope.concept.fsn;

        scope.toggleHideInactive = function () {
          scope.hideInactive = !scope.hideInactive;
        };

        ////////////////////////////////
        // Concept Elements
        ////////////////////////////////

        // define characteristic types
        scope.definitionStatuses = [
          {id: 'PRIMITIVE', name: 'Primitive'},
          {id: 'FULLY_DEFINED', name: 'Fully Defined'}
        ];

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

        // TODO Put in the inactivateConcept Historical Associations

        scope.removeConcept = function (concept) {
          $rootScope.$broadcast('stopEditing', {concept: concept});
        };

        scope.saveConcept = function () {

          // delete any existing error before passing to services
          delete scope.concept.error;
          delete scope.concept.warning;

          // deep copy the concept for subsequent modification
          // (1) relationship display names
          // (1) disallowed keys
          var concept = JSON.parse(JSON.stringify(scope.concept));

          // check if concept valid
          if (!scope.isConceptValid(concept)) {
            return;
          }

          // removed in favor of notificaiton service
          // $rootScope.$broadcast('conceptEdit.saving', {concept: concept});

          var saveMessage = concept.conceptId ? 'Saving concept: ' + concept.fsn : 'Saving new concept';
          notificationService.sendMessage(saveMessage, 10000, null);

          // if new, use create
          if (!concept.conceptId) {

            snowowlService.createConcept($routeParams.projectKey, $routeParams.taskKey, concept).then(function (response) {

              //console.debug('create', response);
              // successful response will have conceptId
              if (response && response.conceptId) {

                scope.concept = response;

                // ensure descriptions are sorted
                sortDescriptions();

                // send notification of success with timeout
                var saveMessage = 'Concept saved: ' + response.fsn;
                notificationService.sendMessage(saveMessage, 5000, null);

                // broadcast event to any listeners (currently task detail, conflict/feedback resolved lists)
                $rootScope.$broadcast('conceptEdit.conceptChange', { branch : scope.branch, conceptId : scope.concept.conceptId });


                // if ui state update function specified, call it (after a
                // moment to let binding update)
                console.debug('updating ui state', scope.concept);
                $timeout(function () {

                  if (scope.uiStateUpdateFn) {
                    console.debug('ui state update fn specified');
                    scope.uiStateUpdateFn();
                  }
                }, 3000);
              }

              // handle error
              else {
                // set the local error
                scope.concept.error = response.message;
              }
            });
          }

          // if not new, use update
          else {
            //console.debug('update concept', concept);
            snowowlService.updateConcept($routeParams.projectKey, $routeParams.taskKey, concept).then(function (response) {

              // send notification of success with timeout
              var saveMessage = 'Concept saved:' + concept.fsn;
              notificationService.sendMessage(saveMessage, 5000, null);

              // console.debug('update response', response);
              if (response && response.conceptId) {
                scope.concept = response;

                // broadcast event to any listeners (currently task detail, conflict/feedback resolved lists)
                $rootScope.$broadcast('conceptEdit.conceptChange', { branch : scope.branch, conceptId : scope.concept.conceptId });

                // ensure descriptions are sorted
                sortDescriptions();
              }
              else {
                scope.concept.error = response.message;
              }
            });

          }
        };

        // function to toggle active status of concept
        // cascades to children components
        scope.toggleConceptActive = function (concept) {
          // if inactive, simply set active and autoSave
          if (!concept.active) {
            concept.active = true;
            autoSave();
          }

          // otherwise, open a select reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason(concept, 'Concept', inactivateConceptReasons, null).then(function (reason) {

              scope.concept.active = false;

              // if reason is selected, deactivate all descriptions and
              // relationships
              if (reason) {
                angular.forEach(scope.concept.relationships, function (relationship) {
                  relationship.active = false;
                });

                // autoSave
                autoSave();
              }
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
          }
          // if in range, add after the specified afterIndex
          else {
            scope.concept.descriptions.splice(afterIndex + 1, 0, description);
          }

        };

        scope.toggleDescriptionActive = function (description) {
          // if inactive, simply set active
          if (!description.active) {
            description.active = true;
            autoSave();
          }

          // otherwise, open a select reason modal
          else {
            // TODO Decide what the heck to do with result
            selectInactivationReason(description, 'Description', inactivateDescriptionReasons, inactivateDescriptionHistoricalReasons).then(function (reason) {
              description.active = false;
              autoSave();
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
          //If the desciption is an FSN then set to PREFERRED and continue.Simplest place in execution to catch the creation of new FSN's and update acceptability
          if(description.type === 'FSN')
          {
            if(acceptability !== 'PREFERRED')
            {
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

          //console.debug('adding attribute relationship', afterIndex);

          var relationship = objectService.getNewIsaRelationship(scope.concept.id);

          // if afterIndex not supplied or invalid, simply add
          if (afterIndex === null || afterIndex === undefined) {
            scope.concept.relationships.push(relationship);
          }

          // otherwise, add at the index specified
          else {
            // find the index of the requested insertion point
            var rels = scope.getIsARelationships();
            var relIndex = scope.concept.relationships.indexOf(rels[afterIndex]);

            // console.debug('found relationship index', relIndex);

            // add the relationship
            scope.concept.relationships.splice(relIndex + 1, 0, relationship);
          }
        };

        scope.addAttributeRelationship = function (afterIndex, relGroup) {

          //  console.debug('adding attribute relationship', afterIndex);

          var relationship = objectService.getNewAttributeRelationship(scope.concept.id);

          // set role group if specified
          if (relGroup) {
            relationship.groupId = relGroup;
          }

          // if afterIndex not supplied or invalid, simply add
          if (afterIndex === null || afterIndex === undefined) {
            scope.concept.relationships.push(relationship);
          }

          // otherwise, add at the index specified
          else {
            // find the index of the requested insertion point
            var rels = scope.getAttributeRelationships();
            var relIndex = scope.concept.relationships.indexOf(rels[afterIndex]);

            //   console.debug('found relationship index', relIndex);

            // add the relationship
            scope.concept.relationships.splice(relIndex + 1, 0, relationship);
          }
        };

        scope.toggleRelationshipActive = function (relationship) {
          // no special handling required, simply toggle
          relationship.active = !relationship.active;
          autoSave();
        };

        ////////////////////////////////
        // Shared Elements
        ////////////////////////////////

        // deactivation modal for reason s elect
        var selectInactivationReason = function (component, componentType, reasons, historicalReasons) {

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
              historicalReasons: function () {
                return historicalReasons ? historicalReasons : [];
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
         * @param target the relationship dropped on
         * @param source the dragged relationship
         */
        scope.dropRelationship = function (concept, target, source) {

          // console.debug('dropRelationship', concept, target, source);

          // check arguments
          if (!target || !source) {
            console.error('Cannot drop relationship, either source or target not specified');
            return;
          }

          // check if target is released (not valid target)
          if (target.effectiveTime) {
            console.error('Cannot drop relationship on previously released relationship');
            return;
          }

          // check if target is static
          if (scope.isStatic) {
            console.error('Scope is static, cannot drop');
            return;
          }

          // copy relationship object and replace target relationship
          var copy = angular.copy(source);

          // clear the effective time
          copy.effectiveTime = null;

          // find the matching relationship and replace
          // NOTE: Direct reference to relationship was not working,
          // hence the passing of concept and cycling here
          for (var i = 0; i < concept.relationships.length; i++) {
            if (concept.relationships[i] === target) {
              concept.relationships[i] = copy;
              autoSave();
            }
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

          // console.debug(relationship, scope.concept);

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
          if (relationship.active === null) {
            relationship.error = 'Relationship active flag must be set';
            return false;
          }
          if (!relationship.characteristicType) {
            relationship.error = 'Relationship characteristic type must be set';
            return false;
          }
          if (!relationship.type || !relationship.type.conceptId) {
            relationship.error = 'Relationship type must be set';
            return false;
          }
          if (!relationship.target || !relationship.target.conceptId) {
            relationship.error = 'Relationship target must be set';
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
          var activeFsn = [];
          for (var i = 0; i < concept.descriptions.length; i++) {
            console.log(concept.descriptions[i]);
            if (concept.descriptions[i].type === 'FSN' && concept.descriptions[i].active === true) {
              activeFsn.push(concept.descriptions[i]);
            }
          }
          if (activeFsn.length !== 1) {
            scope.concept.warning = 'Concept with id: ' + concept.conceptId + ' Must have exactly one active FSN. Autosaving Suspended until corrected.';
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

          if (scope.isDescriptionValid(description)) {
            autoSave();
            sortDescriptions();
          } else {
            console.error('  Error: ', description.error);
          }

        };

        // function to update relationship and autoSave if indicated
        scope.updateRelationship = function (relationship) {
          if (!relationship) {
            return;
          }
          relationship.sourceId = scope.concept.conceptId;
          if (scope.isRelationshipValid(relationship)) {
            autoSave();
          } else {
            console.error('  Error: ', relationship.error);
          }
        };

        function autoSave() {

          // add revision to session history
          scope.conceptSessionHistory.push(scope.concept);

          // save the concept
          scope.saveConcept();
        }

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

        scope.showModel = function () {
          $rootScope.$broadcast('conceptEdit.showModel');
        };
      }
    };
  })
;
