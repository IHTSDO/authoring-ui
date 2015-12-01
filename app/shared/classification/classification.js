'use strict';

angular.module('singleConceptAuthoringApp')

  .directive('classification', ['$rootScope', '$filter', 'ngTableParams', '$routeParams', 'snowowlService', 'scaService', 'notificationService', '$timeout',
    function ($rootScope, $filter, NgTableParams, $routeParams, snowowlService, scaService, notificationService, $timeout) {
      return {
        restrict: 'A',
        transclude: false,
        replace: true,
        scope: {

          // the classification container
          // {equivalentConcepts : {...}, relationshipChanges: {...}, ...}
          classificationContainer: '=',

          // the branch
          branch: '=branch'
        },
        templateUrl: 'shared/classification/classification.html',

        link: function (scope, element, attrs, linkCtrl) {

          // console.debug('classification display using branch', scope.branch);

          if (!scope.branch) {
            console.error('Classification display requires branch');
            return;
          }

          scope.editable = attrs.editable === 'true';

          // local concept-edit and model list
          scope.viewedConcepts = [];

          // function to get formatted summary tex
          scope.getStatusText = function () {

            // check required elements
            if (!scope.classificationContainer) {
              return;
            }
            if (!scope.classificationContainer.status || scope.classificationContainer.status === '') {
              return;
            }

            // get the human-readable execution status
            var status = scope.classificationContainer.status.toLowerCase().replace(/\w\S*/g, function (txt) {
              return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });

            // if loading, return loading text
            if (status === 'Loading...') {
              return status;
            }

            // get the end time if specified
            if (status === 'Completed') {
              var endTime = scope.classificationContainer.completionDate;
              return status + ' ' + endTime;
            }

            // otherwise, return the status + start time
            if (scope.classificationContainer.creationDate) {
              var startTime = scope.classificationContainer.creationDate;
              return status + ', started ' + startTime;
            }

            // default -- simply return the status
            return status;
          };

          $rootScope.$on('stopEditing', function (event, data) {
            console.debug('classification received stopEditing event', data.concept);
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              console.debug('comparing', scope.viewedConcepts[i].conceptBefore.conceptId, data.concept.conceptId);
              if (scope.viewedConcepts[i].conceptId === data.concept.conceptId) {

                scope.viewedConcepts.splice(i, 1);
                return;
              }
            }
          });

          $rootScope.$on('viewClassificationConcept', function (event, data) {

            // check if concept already exists in list
            for (var i = 0; i < scope.viewedConcepts.length; i++) {
              if (scope.viewedConcepts[i].conceptId === data.conceptId) {
                notificationService.sendWarning('Concept already shown');
                return;
              }
            }

            notificationService.sendMessage('Retrieving concept before & after information...');

            // construct an object with before and after concept models
            var conceptModelObj = {
              conceptId: data.conceptId,
              conceptBefore: null,
              conceptAfter: null
            };

            // get the full concept for this branch (before version)
            snowowlService.getFullConcept(data.conceptId, scope.branch).then(function (response) {

              conceptModelObj.fsn = response.fsn;

              // set the before concept
              conceptModelObj.conceptBefore = response;

              // get the model preview (after version)
              snowowlService.getModelPreview(scope.classificationContainer.id, scope.branch, data.conceptId).then(function (secondResponse) {
                conceptModelObj.conceptAfter = secondResponse;

                scope.viewedConcepts.push(conceptModelObj);
                console.debug('conceptPairObj', conceptModelObj);
                notificationService.clear();

                // after a slight delay, broadcast a draw event
                $timeout(function () {
                  $rootScope.$broadcast('comparativeModelDraw');
                  scope.viewConceptInTaxonomy(conceptModelObj.conceptBefore);
                }, 500);
              });
            });
          });
          var resizeClassificationSvg = function (concept, id) {
            var elem = document.getElementById('#' + concept.conceptId);
            var parentElem = document.getElementById('drawModel' + concept.conceptId);

            if (!elem || !parentElem) {
              return;
            }

            // set the height and width`
            var width = parentElem.offsetWidth - 30;
            var height = $('#editPanel-' + id).find('.editHeightSelector').height() + 41;
            if (width < 0) {
              return;
            }
            console.log(elem);

            elem.setAttribute('width', width);
            elem.setAttribute('height', height);
          };

          // creates element for dialog download of classification data
          scope.dlcDialog = (function (data, fileName) {

            //console.debug('classification data: ', data, fileName);

            // create the hidden element
            var a = document.createElement('a');
            document.body.appendChild(a);
            //a.style = "display: none";

            return function (data, fileName) {
              var
                blob = new Blob([data], {type: 'text/csv'}),
                url = window.URL.createObjectURL(blob);

              // console.debug('blob', blob);
              // console.debug('url', url);
              a.href = url;
              a.download = fileName;
              a.click();
              window.URL.revokeObjectURL(url);
            };
          }());

          scope.saveClassification = function () {
            notificationService.sendMessage('Saving classification....', 0);
            snowowlService.saveClassification(scope.branch, scope.classificationContainer.id).then(function (data) {
              if (!data) {
                notificationService.sendError('Saving classification unexpectedly failed', 0);
              } else {
                notificationService.sendMessage('Classification saved', 5000);
              }
            });
          };

          scope.downloadClassification = function () {

            snowowlService.downloadClassification(scope.classificationContainer.id, scope.branch).then(function (data) {
              // console.debug('classification csv retrieved, opening dialog
              // with', data);
              var fileName = 'classifier_' + $routeParams.taskKey;
              scope.dlcDialog(data.data, fileName);
            });
          };

          // process the classification object
          scope.$watch('classificationContainer', function () {

            //console.debug('classification container changed',
            // scope.classificationContainer);

            if (!scope.classificationContainer || !scope.classificationContainer.id) {
              //console.debug('Either container or its id is null');
              return;
            }

            // get relationship changes
            snowowlService.getRelationshipChanges(scope.classificationContainer.id, scope.branch).then(function (relationshipChanges) {

              scope.relationshipChanges = relationshipChanges ? relationshipChanges : [];

              // apply sourceName, typeName, and destinationName to allow for
              // ng-table sorting (ng-table cannot sort by item.property
              angular.forEach(scope.relationshipChanges, function (rel) {
                if (rel.source) {
                  rel.sourceName = rel.source.fsn;
                }
                if (rel.destination) {
                  rel.destinationName = rel.destination.fsn;
                }
                if (rel.type) {
                  rel.typeName = rel.type.fsn;
                }
              });

              // copy the redundant stated relationships into their own array
              if (scope.classificationContainer.redundantStatedRelationshipsFound) {
                scope.redundantStatedRelationships = [];
                angular.forEach(scope.relationshipChanges, function (item) {
                  if (item.changeNature === 'REDUNDANT') {
                    scope.redundantStatedRelationships.push(item);
                  }
                });
              }
            });

            // get equivalent concepts
            if (scope.classificationContainer.equivalentConceptsFound) {
              console.debug('equivalent concepts found');
              var equivalentConcepts = [];

              // convert equivalent concepts into format usable by ng-table
              angular.forEach(scope.classificationContainer.equivalentConcepts, function (concept) {
                console.debug('equivalent', concept);

                var equivalentConcept = {
                  leftConceptId: concept[0].id,
                  leftConceptLabel: concept[0].label,
                  rightConceptId: concept[1].id,
                  rightConceptLabel: concept[1].label
                };
                equivalentConcepts.push(equivalentConcept);
              });
              scope.equivalentConcepts = equivalentConcepts;
            } else {
              scope.equivalenConcepts = [];
            }

          }, true);

          scope.viewConceptInTaxonomy = function (concept) {
            console.debug('broadcasting viewTaxonomy event to taxonomy.js', concept);
            $rootScope.$broadcast('viewTaxonomy', {
              concept: {
                conceptId: concept.conceptId,
                fsn: concept.fsn
              }
            });
          };

          ////////////////////////////////////
          // Validation Functions
          ////////////////////////////////////

          // start latest validation
          scope.startValidation = function () {


            // check if this is a task or project
            if ($routeParams.taskKey) {
              notificationService.sendMessage('Submitting task for validation...');
              scaService.startValidationForTask($routeParams.projectKey, $routeParams.taskKey).then(function (validation) {
                notificationService.sendMessage('Task successfully submitted for validation');
              }, function () {
                notificationService.sendMessage('Error submitting task for validation');
              });
            } else {
              notificationService.sendMessage('Submitting project for validation...');

              scaService.startValidationForProject($routeParams.projectKey).then(function (response) {
                notificationService.sendMessage('Project successfully submitted for validation');
              }, function () {
                notificationService.sendMessage('Error submitting project for validation');
              });
            }
          };

          /////////////////////////////////////////
          // Review functions
          /////////////////////////////////////////
          scope.submitForReview = function () {

            // ensure this is not called for projects
            if (!$routeParams.taskKey) {
              return;
            }

            // get task to check if it's eligible for update
            scaService.getTaskForProject($routeParams.projectKey, $routeParams.taskKey).then(function (response) {
              if (!response) {
                notificationService.sendError('Error submitting task for review:  Could not retrieve task', 0);
              } else {
                if (response.status === 'New') {
                  notificationService.sendWarning('No work exists for this task, cannot submit for review', 10000);
                }
                else if (response.status === 'In Review' || response.status === 'Review Completed') {
                  notificationService.sendWarning('Task is already in review', 10000);
                } else if (response.status === 'Promoted') {
                  notificationService.sendWarning('Cannot submit promoted task for review', 10000);
                } else {

                  scaService.updateTask(
                    $routeParams.projectKey, $routeParams.taskKey,
                    {
                      'status': 'IN_REVIEW'
                    }).then(function (response) {
                      // whether success or fail, disable button
                    });
                }
              }
            });

          };

          /////////////////////////////////////////
          // Concept Edit/Display Functions
          /////////////////////////////////////////
          scope.$on('viewClassificationConcept', function (event, data) {
            var conceptId = data.conceptId;
          });

        }

      };
    }]);