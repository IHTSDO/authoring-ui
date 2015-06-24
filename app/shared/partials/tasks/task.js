angular.module('angularAppTemplateApp')
.controller('taskCtrl', ['$scope', 'bootstrap3ElementModifier', function($scope, bootstrap3ElementModifier){

  bootstrap3ElementModifier.enableValidationStateIcons(false);

  $scope.person = {};
  $scope.people = [
    { name: 'Ashley',      email: 'adam@ihtsdo.org',      age: 12, country: 'United States' },
    { name: 'Rory',    email: 'rdu@ihtsdo.org',    age: 12, country: 'Argentina' },
    { name: 'Steve', email: 'sar@ihtsdo.org', age: 21, country: 'Argentina' },
    { name: 'Emily',    email: 'ewa@ihtsdo.org',    age: 21, country: 'Ecuador' }
   
  ];

  $scope.availableColors = ['Option 1','Option 2','Option 3','Option 4'];

  $scope.selectedState = '';
  $scope.states = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Dakota","North Carolina","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

}]);
