'use strict';

angular.module('singleConceptAuthoringApp')
  .controller('taskCtrl', ['$scope', 'bootstrap3ElementModifier', 'scaService', function ($scope, bootstrap3ElementModifier, scaService) {

    bootstrap3ElementModifier.enableValidationStateIcons(false);

    // scope variables
    $scope.projects = null;

    ///////////////////////////////////////////

    // TODO Temporary function to retrieve projects for picklist, should be
    // cached values
    function initialize() {
      $scope.projects = scaService.getProjects();
      console.debug($scope.projects);
    }

    // TODO Consider relaxing jshint to allow functions to be called pre
    // declaration
    initialize();

    // Creates a task from modal form
    function createTask(title, project, details) {
      if (!title) {
        window.alert('You must specify a title');
      }
      if (!project) {
        window.alert('You must specify a project');
      }
      if (!details) {
        window.alert('You must specify task details');
      }

    }
  }]);
