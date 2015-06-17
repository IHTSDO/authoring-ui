'use strict';

angular.module('angularAppTemplateApp')
    .directive('autoSubmit', ['', function() {
    return {
        restrict: 'A',
        scope: false,
        require: ['^form'],
        link: function (scope, element, attrs) {

        	var changed = false;
            	
                scope.$watch(attrs.ngModel, function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                    	changed = true;
                    }
                });
                element.bind('blur', function() {
                	if (changed) {
                		//FIXME assumed name from scope
                		scope.submit();
                	}
                	changed = false;
                  });
        }
    };
}]);
