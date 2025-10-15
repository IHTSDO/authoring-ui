'use strict';
angular.module('singleConceptAuthoringApp')
  .controller('taskSearchCtrl', function ($scope, ngTableParams, $modalInstance, $location, $filter, scaService, notificationService, terminologyServerService, modalService, metadataService) {
    $scope.criteria = '';
    $scope.selectedProjects = [];
    $scope.selectedStatuses = [];
    $scope.selecteAuthor = null;
    $scope.message = '';
    $scope.searching = false;
    $scope.processingTasksDeletion = false;
    $scope.isAdmin = false;
    $scope.tasks = [];
    $scope.statusOptions = [];
    $scope.projectOptions = [];
    $scope.dateRangeOptions = {
      locale: {
        format: 'YYYY-MM-DD',
        separator: ' - '
      },
      showDropdowns: false,
      autoUpdateInput: false,
      linkedCalendars: false,  // Allow selecting dates from different months independently
      alwaysShowCalendars: true  // Always show both calendars
    };

    // Initialize with proper moment objects to avoid NaN issues
    $scope.startDate = moment().subtract(29, 'days');
    $scope.endDate = moment();

    var selectedStartDate = null;
    var selectedEndDate = null;

    $scope.shouldClearDateRange = function() {
      return selectedStartDate !== null || selectedEndDate !== null;
    };
    
    $scope.clearDateRange = function() {
      selectedStartDate = null;
      selectedEndDate = null;
      $scope.updateInputField(null, null);
    };
    
    // Prevent typing in the input field while allowing clicks and library interactions
    $scope.preventTyping = function(event) {
      // Allow backspace, delete, tab, escape, enter, and arrow keys for navigation
      var allowedKeys = [8, 9, 27, 13, 46, 37, 38, 39, 40];
      
      // Prevent all other key inputs
      if (allowedKeys.indexOf(event.keyCode) === -1) {
        event.preventDefault();
        return false;
      }
    };
    
    // Function to update the input field value
    $scope.updateInputField = function(startDate, endDate) {
      var inputValue = '';
      if (startDate && endDate) {
        inputValue = startDate.format('YYYY-MM-DD') + ' - ' + endDate.format('YYYY-MM-DD');        
      }
      
      // Update the input field value
      setTimeout(function() {
        var pickerElement = document.querySelector('input[date-range-picker]');
        if (pickerElement) {
          pickerElement.value = inputValue;
        }
      }, 10);
    };    
    
    // Handle when user applies date selection (on-change event)
    $scope.onDateRangeApply = function() {
      console.log('Date range applied:', 
        $scope.startDate ? $scope.startDate.format('YYYY-MM-DD') : 'null', 
        'to', 
        $scope.endDate ? $scope.endDate.format('YYYY-MM-DD') : 'null'
      );
      
      // The startDate and endDate are already updated by the directive via two-way binding
      // Just update the input field display
      if ($scope.startDate && $scope.endDate) {
        selectedStartDate = $scope.startDate;
        selectedEndDate = $scope.endDate;
        $scope.updateInputField($scope.startDate, $scope.endDate);
      }
    };
    
    
    $scope.multiselectSettings = {
      showCheckAll: false, showUncheckAll: false, scrollable: true, smartButtonMaxItems: 5, smartButtonTextConverter: smartButtonTextConverter,
      displayProp: 'label', idProperty: 'id', buttonClasses: 'form-control no-padding col-md-12'
    };
    $scope.multiselectTranslationTexts = { buttonDefaultText: '', dynamicButtonTextSuffix: '' };
    var statuses = ['New', 'In Progress', 'Ready For Review', 'In Review', 'Review Completed', 'Promoted', 'Completed'];

    function smartButtonTextConverter(text, option) {
      return option.id;
    }

    $scope.toggletAllTasks = function () {
      var selectAll = $("#select_all_tasks_checkbox").prop("checked");
      var displayTasks = $scope.searchTasksTableParams.data || [];
      angular.forEach(displayTasks, function (item) {
        if (!item.status || (item.status !== 'Promoted' && item.status !== 'Completed')) {
          item.selected = selectAll;
        }
      });
    };

    $scope.searchTasksTableParams = new ngTableParams({
      page: 1,
      count: 10
    },
      {
        total: $scope.tasks ? $scope.tasks.length : 0,
        getData: function ($defer, params) {

          // Set the checkbox state
          setTimeout(function () {
            $("#select_all_tasks_checkbox").prop("checked", false);
          }, 0);

          // Get the filtered data
          if (!$scope.tasks || $scope.tasks.length === 0) {
            $defer.resolve([]);
          } else {
            var mydata = $scope.tasks;
            params.total(mydata.length);

            mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
            $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        }
      }
    );

    $scope.searchUsers = function (username) {
      if (!username || username.trim().length === 0) {
        return [];
      }
      return scaService.searchUsers(username, null, null, 50, 0).then(function (response) {
        var results = [];
        angular.forEach(response, function (item) {
          if (item.active) {
            var user = {};
            user.displayName = item.displayName;
            user.username = item.name;
            results.push(user);
          }
        });

        return results;
      });
    };

    $scope.search = function () {
      if (($scope.criteria.trim().length === 0 && (!$scope.selectedProjects || $scope.selectedProjects.length === 0) && (!$scope.selectedStatuses || $scope.selectedStatuses.length === 0) && !$scope.selecteAuthor && !selectedStartDate && !selectedEndDate) || $scope.searching) {
        return;
      }
      $scope.tasks = [];
      $scope.message = '';
      $scope.searching = true;

      // Format dates for the API call
      var startDateFormatted = selectedStartDate ? selectedStartDate.startOf('day').valueOf() : null;      
      var endDateFormatted = selectedEndDate ? selectedEndDate.endOf('day').valueOf() : null;

      scaService.searchTasks($scope.criteria.trim(), $scope.selectedProjects, $scope.selectedStatuses, $scope.selecteAuthor ? $scope.selecteAuthor.username : null, startDateFormatted, endDateFormatted).then(function (result) {
        if (result.length === 0) {
          $scope.message = 'No results';
        }
        else {
          $scope.tasks = result;
          $scope.searchTasksTableParams.page(1);
          $scope.searchTasksTableParams.reload();
        }
        $scope.searching = false;
        $scope.searchDone = true;
      }, function (error) {
        $scope.searching = false;
        notificationService.sendError('Unexpected error searching for tasks', 10000);
        console.error(error);
      });
    };

    $scope.goToTask = function (task, newTab) {
      if (!task || !task.branchPath) {
        notificationService.sendError('Unexpected error, cannot access task', 10000);
        return;
      }
      if (newTab) {
        window.open('#/tasks/task/' + task.projectKey + '/' + task.key + '/edit', '_blank');
      }
      else {
        $location.url('tasks/task/' + task.projectKey + '/' + task.key + '/edit');
        $scope.close();
      }
    };

    $scope.getReviewersDisplayName = function (reviewers) {
      if (!reviewers) {
        return '';
      }
      return reviewers.map(function (reviewer) {
        return reviewer.displayName;
      }).join(', ');
    };

    $scope.clearMessages = function () {
      $scope.message = '';
    };

    // closes the modal instance (if applicable)
    $scope.close = function () {
      $modalInstance.close();
    };

    $scope.getSelectedRequestsCount = function () {
      return $scope.tasks.filter(function (task) {
        return task.selected && (!task.status || (task.status !== 'Promoted' && task.status !== 'Completed'));
      }).length;
    };

    $scope.deleteSelectedTasks = function () {
      if (!$scope.isAdmin) {
        notificationService.sendError('You do not have permission to delete tasks', 5000);
        return;
      }
      var selectedTasks = $scope.tasks.filter(function (task) {
        return task.selected;
      });
      if (selectedTasks.length === 0) {
        notificationService.sendError('No tasks selected for deletion');
        return;
      }
      let msg = 'Are you sure you want to delete the selected task(s)?';
      modalService.confirm(msg).then(function () {
        var selectedTaskKeys = selectedTasks.map(function (task) {
          return task.key;
        });
        $scope.processingTasksDeletion = true;
        scaService.deleteTasks(selectedTaskKeys).then(function () {
          notificationService.sendMessage('Selected tasks deleted successfully', 5000);
          $scope.tasks = $scope.tasks.filter(function (task) {
            return !task.selected;
          });
          $scope.searchTasksTableParams.reload();
          $scope.processingTasksDeletion = false;
        }, function (error) {
          notificationService.sendError('Error deleting selected tasks', 10000);
          console.error(error);
          $scope.processingTasksDeletion = false;
        });
      });
    }

    $scope.downloadSearchResults = function () {
      if (!$scope.tasks || $scope.tasks.length === 0) {
        return;
      }

      // Helper function to clean values for TSV
      function cleanValue(value) {
        if (value === null || value === undefined) {
          return '';
        }
        var strValue = String(value);
        // Replace tabs and newlines with spaces
        return strValue.replace(/[\t\n\r]/g, ' ');
      }

      // Get sorted data using the same logic as the table
      var sortedTasks = $scope.tasks;
      if ($scope.searchTasksTableParams.sorting()) {
        sortedTasks = $filter('orderBy')($scope.tasks, $scope.searchTasksTableParams.orderBy());
      }

      // Create TSV header
      var tsv = 'Task ID\tName\tCreated\tModified\tStatus\tAuthor\tReviewers\n';

      // Add each task as a row
      sortedTasks.forEach(function (task) {
        var row = [
          cleanValue(task.key),
          cleanValue(task.summary),
          cleanValue(task.created ? task.created : ''),
          cleanValue(task.updated ? task.updated : ''),
          cleanValue(task.status),          
          cleanValue(task.assignee ? task.assignee.displayName : ''),
          cleanValue($scope.getReviewersDisplayName(task.reviewers)),
          
        ];
        tsv += row.join('\t') + '\n';
      });

      // Create blob and download
      var blob = new Blob([tsv], { type: 'text/tab-separated-values;charset=utf-8;' });
      var link = document.createElement('a');
      var url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'task-search-results-' + moment().format('YYYY-MM-DD-HHmmss') + '.tsv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function initialize() {
      for (var i = 0; i < statuses.length; i++) {
        var statusOption = {};
        statusOption.id = statuses[i];
        statusOption.label = statuses[i];
        $scope.statusOptions.push(statusOption);
      }

      var projects = metadataService.getProjects();
      var itemsSorted  = $filter('orderBy')(projects, 'title');
      for (var i = 0; i < itemsSorted.length; i++) {
        var projectOption = {};
        projectOption.id = itemsSorted[i].key;
        projectOption.label = itemsSorted[i].title;
        $scope.projectOptions.push(projectOption);
      }

      terminologyServerService.getBranch('MAIN').then(function (branch) {
        if (branch && branch.globalUserRoles && branch.globalUserRoles.length > 0 && branch.globalUserRoles.includes('ADMIN')) {
          $scope.isAdmin = true;
        }
      }, function (error) {
        console.error(error);
      });
    }

    // Initialize the controller
    initialize();
  }
  );
