'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp')
  .controller('inactivateComponentModalCtrl', function ($rootScope, $scope, $modalInstance, $filter, ngTableParams, terminologyServerService, componentType, reasons, associationTargets, conceptId, concept, branch, deletion, $routeParams, $q, metadataService) {

    // the selected tab
    $scope.actionTab = 1;

    $scope.descendants = null;
    
    $scope.useFirstTargetSelection = true;

    $scope.updateCheckboxSelection = function() {
      $scope.useFirstTargetSelection = !$scope.useFirstTargetSelection;
    };

    $scope.filterByInactivationReason = function () {
      return function (item) {
        return $scope.inactivationReason && $scope.inactivationReason.display.indexOf(item.display) !== -1;
      };
    };

    $scope.updateAssociations = function (inactivationReason) {
      $scope.inactivationReason = inactivationReason;
      $scope.associationTargets = $scope.originalAssocs.filter($scope.filterByInactivationReason());

      if ($scope.associationTargets.length === 0) {
        $scope.associations = [];
      } else {
        if ($scope.associations.length === 0) {
           $scope.addAssociation(0);
        }

        if ($scope.componentType === 'Concept') {
          if ($scope.inactivationReason.id !== 'AMBIGUOUS'
            && $scope.associations.length > 1) {
            $scope.associations = [$scope.associations[0]];
            $scope.useFirstTargetSelection = false;
          } else {
            $scope.useFirstTargetSelection = true;
          }           
        }

        //Association type will be automatically populated if there is only one option
        for (let i = 0; i < $scope.associations.length; i++) {
          // extract association for convenience
          let association = $scope.associations[i];
          association.type = null;
          if($scope.associationTargets.length === 1) {
            association.type = $scope.associationTargets[0];
          }
        }
      }
    };

    // required arguments
    $scope.componentType = componentType;
    $scope.componentType = componentType;
    $scope.deletion = deletion;
    $scope.reasons = reasons;

    // optional arguments (but if conceptId or branch specified, the other must
    // be as well)
    $scope.conceptId = conceptId;
    $scope.concept = concept;
    $scope.branch = branch;
    $scope.associationTargets = associationTargets;
    $scope.originalAssocs = associationTargets;

    // check requirements
    if ($scope.conceptId && !$scope.branch) {
      $scope.error = 'Branch was not specified';
    }
    if ($scope.branch && !$scope.conceptId) {
      $scope.error = 'Concept id was not specified';
    }
    if (!$scope.reasons) {
      $scope.error = 'List of inactivation reasons was not specified';
    }
    $scope.getConceptsForTypeahead = function (searchStr,inactivationIndication) {
      return terminologyServerService.findConceptsForQuery($routeParams.projectKey, $routeParams.taskKey, searchStr, 0, 20, null).then(function (response) {
        let i = 0;
        while (i < response.length) {
          let j = i + 1;
          while (j < response.length){
            if (response[j].concept.conceptId === response[i].concept.conceptId) {
              response.splice(j, 1);
            } else {
              j++;
            }
          }
          i++;
        }

        response = response.filter(function (el) {
          if (inactivationIndication) {
            return el.concept.active === true && $scope.conceptId !== el.concept.conceptId;
          } else {
            return el.concept.active === true;
          }
        });
        return response;
      });
    };

    function addCommas(integer) {
      return (integer + '').replace(/(\d)(?=(\d{3})+$)/g, '$1,');
    }

    $scope.getTypeaheadConcepts = function(searchStr, inactivationIndication) {
      return terminologyServerService.searchAllConcepts(metadataService.getBranch(), searchStr, null, 0, 50, null, true, true).then(function (response) {
        let descendants = [];

        if($scope.descendants) {
          angular.forEach($scope.descendants.items, function(descendant) {
            descendants.push(descendant.id);
          });
        }

        if (response.length === 1) {
            response.total = 1;
            response.items = [];
          if (inactivationIndication
            && $scope.conceptId !== response[0].concept.conceptId
            && !(descendants.includes(response[0].concept.conceptId))) {
            response.items.push(response[0]);
          }
        } else {
          response.items = response.items.filter(function (el) {
            if (inactivationIndication) {
              if(($scope.conceptId !== el.concept.conceptId) && !(descendants.includes(el.concept.conceptId)) && !isConceptExistingInAssociations(el.concept.conceptId)) {
                return ($scope.conceptId !== el.concept.conceptId) && !(descendants.includes(el.concept.conceptId)) && !isConceptExistingInAssociations(el.concept.conceptId);
              } else {
                response.total--;
              }
            }
          });
        }

        let dropdown = $('.dropdown-menu');

        dropdown.children('.dropdown-menu-total').remove();

        if((response.total - response.items.length) > 1) {
          let totalRow = $('<li>along with ' + addCommas(response.total - response.items.length) + ' other results</li>').addClass('dropdown-menu-total');
          dropdown.append(totalRow);
        }

        return response.items;
      });
    };

    function isConceptExistingInAssociations (conceptId) {
      if ($scope.associations && $scope.associations.length !== 0) {
        for (var i = 0; i < $scope.associations.length; i++) {
          if ($scope.associations[i].concept 
              && $scope.associations[i].concept.concept.conceptId === conceptId) {
            return true;
          }
        }
      }
      return false;
    }

// declare table parameters
    $scope.tableParamsChildren = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          characteristicType: 'desc',
          sourceFsn: 'asc'
        },
        orderBy: 'sourceFsn'
      },
      {
        total: $scope.children ? $scope.children.length : 0, // length of data
        getData: function ($defer, params) {

          if (!$scope.children || $scope.children.length === 0) {
            $defer.resolve([]);
          } else {

            params.total($scope.children.length);
            let childrenDisplayed = params.sorting() ? $filter('orderBy')($scope.children, params.orderBy()) : $scope.children;

            $defer.resolve(childrenDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

// declare table parameters
    $scope.tableParamsDescendants = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          sortableName: 'asc'
        },
        orderBy: 'sortableName'
      },
      {
        total: $scope.descendants && $scope.descendants.items ? $scope.descendants.items.length : 0, // length
        // of
        // data
        getData: function ($defer, params) {

          if (!$scope.descendants || !$scope.descendants.items) {
            $defer.resolve([]);
          } else {
            params.total($scope.descendants.items.length);
            let descendantsDisplayed = params.sorting() ? $filter('orderBy')($scope.descendants.items, params.orderBy()) : $scope.descendants.items;

            $defer.resolve(descendantsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }

        }
      }
    );

// declare table parameters
    $scope.tableParamsInboundRelationships = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          characteristicType: 'desc',
          sourceFsn: 'asc'
        },
        orderBy: 'sourceFsn'
      },
      {
        total: $scope.inboundRelationships ? $scope.inboundRelationships.length : 0, // length of
        // data
        getData: function ($defer, params) {

          if (!$scope.inboundRelationships || $scope.inboundRelationships.length === 0) {
            $defer.resolve([]);
          } else {

            params.total($scope.inboundRelationships.length);
            let inboundRelationshipsDisplayed = params.sorting() ? $filter('orderBy')($scope.inboundRelationships, params.orderBy()) : $scope.inboundRelationships;
            $defer.resolve(inboundRelationshipsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.tableParamsReferenceSetAssociations = new ngTableParams({
        page: 1,
        count: 10,
        sorting: {
          characteristicType: 'desc',
          sourceFsn: 'asc'
        },
        orderBy: 'sourceFsn'
      },
      {
        total: $scope.referenceSetAssociations ? $scope.referenceSetAssociations.length : 0,
        getData: function ($defer, params) {

          if (!$scope.referenceSetAssociations || $scope.referenceSetAssociations.length === 0) {
            $defer.resolve([]);
          } else {

            params.total($scope.referenceSetAssociations.length);
            let referenceSetsDisplayed = params.sorting() ? $filter('orderBy')($scope.referenceSetAssociations, params.orderBy()) : $scope.referenceSetAssociations;
            $defer.resolve(referenceSetsDisplayed.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.hasNoConceptTarget = function () {
        for (let i = 0; i < $scope.associations.length; i++) {
          let association = $scope.associations[i];
          if(!association.concept || !association.concept.concept || !association.concept.concept.conceptId
            || !association.type || !association.type.id) {
            return true;
          }
       }
       return false;
    };

    $scope.selectReason = function () {

      // NOTE: associationTarget is optional
      if (!$scope.inactivationReason && !$scope.deletion) {
        window.alert('You must specify a reason for inactivation');
      } else {

        let associationTarget = {};

        // FORMAT: associationTargets: {MOVED_FROM: ["139569002"]}
        // validate and convert association targets
        for (let i = 0; i < $scope.associations.length; i++) {
            console.log($scope.associations);
          // extract association for convenience
          let association = $scope.associations[i];


          // if neither type nor concept specified
          if (!association.concept || !$scope.deletion && !association.type) {
            // Probably need to re-write this if-else statement as it is unused
          }

          // if either field is blank, alert and return
//          else if (!association.type || !association.concept) {
//            window.alert('You must specify both the association type and target');
//            return;
//          }

          // add the association type/target
          else {            

            if(!association.type || association.type === null){
                association.type = {id: ' '}
            }

            // if this type already specified, add to array
            if (associationTarget.hasOwnProperty(association.type.id)) {
              associationTarget[association.type.id].push(association.concept.concept.conceptId);
            }

            // otherwise, set this type to a single-element array containing
            // this concept
            else if(association.type.id){
              associationTarget[association.type.id] = [association.concept.concept.conceptId];
            }
          }
        }

        let results = {};
        results.reason = $scope.inactivationReason;
        results.associationTarget = associationTarget;
        results.useFirstTarget = $scope.componentType === 'Concept' ? $scope.useFirstTargetSelection : false;
        if($scope.deletion)
        {
            results.deletion = true;
        }

        $modalInstance.close(results);
      }
    };

    $scope.selectDeletion = function (reason) {

      // NOTE: associationTarget is optional
      if (reason.concept) {
        window.alert('You must specify a replacement concept');
      } else {
        let results = {};
        results.deletion = true;
        results.concept = reason.concept;

        $modalInstance.close(results);
      }
    };

    $scope.delete = function () {

        let results = {};
        results.deletion = true;
        $modalInstance.close(results);
    };

    $scope.tableLimit = 200;

// on load, retrieve children and descendants if concept specified
    if ($scope.conceptId && $scope.branch) {

      // limit the number of descendants retrieved to prevent overload
      terminologyServerService.searchAllConcepts($scope.branch, '', '<' + $scope.conceptId, 0, 50, null, true, true).then(function (response) {
        $scope.descendants = response;
        $rootScope.descendants = response;
        $scope.descendantsLoading = false;
        $scope.tableParamsDescendants.reload();

        // convert the term into a top-level attribute for ng-table sorting
        angular.forEach($scope.descendants.items, function (descendant) {
          descendant.sortableName = descendant.concept.fsn;
        });
      });
    }

    $scope.statedChildFound = false;

    /**
     * Helper function to get and set a page of, or all, inbound relationships
     * @param conceptId
     * @param branch
     * @param startIndex
     * @param maxResults
     */
    function getInboundRelationships(conceptId) {
      let deferred = $q.defer();
      $scope.inboundRelationshipsLoading = true;
      // get the concept relationships again (all)
      terminologyServerService.searchConcepts($scope.branch,'', '*: *' + ' = ' + conceptId, 0, 10000, false, false, true).then(function (response) {
       
        // initialize the arrays
        $scope.inboundRelationships = [];
        $scope.children = [];
        $scope.inboundRelationshipsTotal = 0;

        // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
        // make top-level properties
        angular.forEach(response.items, function (item) {
          if (item.active) {
            item.sourceFsn = item.fsn.term;
            item.typeFsn = 'isA (attribute)';
            item.source = [];
            item.source.fsn = item.fsn.term;
            item.concept = [];
            item.concept.conceptId = item.conceptId;
            item.characteristicType = 'STATED_RELATIONSHIP';

            // push to inbound relationships
            $scope.inboundRelationships.push(item);
            $scope.inboundRelationshipsTotal++;
          }
        });
        $rootScope.children = $scope.children;
        $scope.tableParamsChildren.reload();
        $scope.tableParamsInboundRelationships.reload();

        // Children
        terminologyServerService.searchConcepts($scope.branch,'', '<! ' + conceptId, 0, 10000, false, false, true).then(function (response) {
            // ng-table cannot handle e.g. source.fsn sorting, so extract fsns and
            // make top-level properties
            angular.forEach(response.items, function (item) {

              if (item.active) {
                item.sourceFsn = item.fsn.term;
                item.source = [];
                item.source.fsn = item.fsn.term;
                item.typeFsn = 'isA (attribute)';
                item.concept = [];
                item.concept.conceptId = item.conceptId;
                item.characteristicType = 'STATED_RELATIONSHIP';

                var found = $scope.inboundRelationships.filter(function(inboundRelationship) {
                  return item.sourceFsn === inboundRelationship.sourceFsn;
                }).length !== 0;
                
                // push to inbound relationships
                if (!found)
                {
                  $scope.inboundRelationships.push(item);
                  $scope.inboundRelationshipsTotal++;
                }
                
                $scope.children.push(item);
              }
            });
            $rootScope.children = $scope.children;
            $scope.tableParamsChildren.reload();

            if ($scope.deletion) {
              // Historical associations
              getHistoricalAssociations().then(function(affectedAssociations) {
                $scope.inboundRelationships = $scope.inboundRelationships.concat(affectedAssociations);
                $scope.inboundRelationshipsTotal += affectedAssociations.length;
                $scope.inboundRelationshipsLoading = false;              
                $scope.tableParamsInboundRelationships.reload();    
              })
            }
            else {
              $scope.inboundRelationshipsLoading = false;              
              $scope.tableParamsInboundRelationships.reload();
            }
          });
      });

      return deferred.promise;
    }

    function getReferenceSetAssociations() {
      const excludedRefset = ['733073007'];
      terminologyServerService.getReferenceSetsByReferencedComponent($scope.conceptId, $scope.branch).then(function (response) {
          if (response !== null) {
            $scope.referenceSetAssociations = [];
            var items = [];
            angular.forEach(response.items, function (item) {
              if (!excludedRefset.includes(item.refsetId)) {
                let newItem = angular.copy(item);
                newItem.refsetPt = response.referenceSets[item.refsetId].pt.term;
                $scope.referenceSetAssociations.push(newItem);
              }              
            });
            $scope.tableParamsReferenceSetAssociations.reload();
          }  
      });
    }

    function getHistoricalAssociations() {
      let deferred = $q.defer();
      var affectedAssociations = [];  
      terminologyServerService.getHistoricalAssociationMembers($scope.conceptId, $scope.branch).then(function (response) {
        let affectedAssociationsTotal = Array.isArray(response) ? response.length : response.total;
        var affectedDescriptionIds = [];
        if (affectedAssociationsTotal !== 0) {                
          angular.forEach(response.items, function (item) {
            if (item.active) {
              // Historical concepts found
              if (item.referencedComponent) {
                item.sourceFsn = item.referencedComponent.fsn.term;
                item.source = [];
                item.source.fsn = item.referencedComponent.fsn.term;                    
                item.characteristicType = 'STATED_RELATIONSHIP';
    
                var found = $scope.inboundRelationships.filter(function(inboundRelationship) {
                  return item.sourceFsn === inboundRelationship.sourceFsn;
                }).length !== 0;

                // push to inbound relationships
                if (!found)
                {
                  affectedAssociations.push(item);
                }
              }
              else {
                affectedDescriptionIds.push(item.referencedComponentId);
              }                    
            }
          });
        }              

        // Historical associations found
        if (affectedDescriptionIds.length > 0) {
          var count = 0;
          for (var i = 0; i < affectedDescriptionIds.length; i++) {
            terminologyServerService.getDescriptionProperties(affectedDescriptionIds[i], $scope.branch).then(function (description) {
              var conceptIds = [];
              conceptIds.push(description.conceptId);                      
              count++;
              if (count === affectedDescriptionIds.length) {
                // bulk call for concept ids
                terminologyServerService.bulkGetConcept(conceptIds, $scope.branch).then(function (response) {
                  angular.forEach(response.items, function (concept) {
                    var item = {};
                    item.sourceFsn = concept.fsn.term;
                    item.source = [];
                    item.source.fsn = concept.fsn.term;                    
                    item.characteristicType = 'STATED_RELATIONSHIP';
        
                    var found = $scope.inboundRelationships.filter(function(inboundRelationship) {
                        return item.sourceFsn === inboundRelationship.sourceFsn;
                      }).length !== 0 
                      && $scope.affectedAssociations.filter(function(inboundRelationship) {
                        return item.sourceFsn === inboundRelationship.sourceFsn;
                      }).length !== 0;                    
                    
                    // push to inbound relationships
                    if (!found)
                    {
                      affectedAssociations.push(item);                      
                    }
                  });
                     
                  deferred.resolve(affectedAssociations);
                });                      
              }
            });
          }                
        }
        else {          
          deferred.resolve(affectedAssociations);
        }                             
      });

      return deferred.promise;
    }
    // check for existence of stated IsA relationships
    $scope.statedChildrenFound = null;
    function checkStatedChildren() {
      $scope.statedChildrenFound = false;
      angular.forEach($scope.children, function (item) {
        if (item.characteristicType === 'STATED_RELATIONSHIP') {
          $scope.statedChildrenFound = true;
        }
      });
    }

    // get the limited number of inbound relationships for display
    if ($scope.componentType === 'Concept') {
      getInboundRelationships($scope.conceptId).then(function () {
        checkStatedChildren();
        // detect case where no stated parent-child relationship was found, but
        // more results may exist
//        if ($scope.statedChildrenFound === false && $scope.inboundRelationships.length === $scope.tableLimit) {
//
//          getInboundRelationships($scope.conceptId, $scope.branch, -1, -1).then(function () {
//            checkStatedChildren();
//          });
//        }
      });

      if (!$scope.deletion) {
        getReferenceSetAssociations();
      }
    }

    $scope.cancel = function () {
      $modalInstance.dismiss();
    };

    $scope.addAssociation = function (index) {
      if(typeof index !== 'undefined'
        && $scope.inactivationReason) {
        $scope.associations.push({type: $scope.associationTargets[0], concept: null});
      } else {
        $scope.associations.push({type: null, concept: null});
      }
    };

    $scope.removeAssociation = function (index) {
      $scope.associations.splice(index, 1);
      if ($scope.associations.length === 0) {
        $scope.addAssociation(0);
      }
    };

    ////////////////////////////////////
    // Initialization
    ////////////////////////////////////

    // selected reason
    if(componentType === 'Concept') {
      $scope.reasons.sort(function(a, b) {
        let textA = a.text;
        let textB = b.text;
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
      });
    }

    $scope.inactivationReason = $scope.reasons ? $scope.reasons[0] : null;

    // construct the associations array and add a blank row
    $scope.associations = [];
    $scope.addAssociation();

    // display flags
    $scope.descendantsLoading = true;
    $scope.inboundRelationshipsLoading = true;

    // flag for whether a stated parent-child relationship exists for this
    // concept (disable inactivation)
    $scope.statedChildFound = false;

    $scope.updateAssociations($scope.inactivationReason);
  })
;
