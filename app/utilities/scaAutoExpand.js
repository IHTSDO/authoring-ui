'use strict';
//Directive intended for use within textareas to match the size to the content
angular.module('singleConceptAuthoringApp')
  .directive('scaAutoExpand', function() {
        return {
            restrict: 'A',
            link: function( $scope, elem, attrs) {
                //triggers on keyboard events to detect the total height of the text
                elem.bind('keyup', function($event) {
                    var element = $event.target;

                    $(element).height(0);
                    var height = $(element)[0].scrollHeight;

                    // 8 is for the padding
                    if (height < 40) {
                        height = 48;
                    }
                    //important imperatives used due to the large numbers of !important imperatives within pre-existing css, 
                    //also necessetates the use of .attrs rather than .css as it allows free text, .css does not allow the use of !important
                    $(element).attr('style', 'height: ' + height +'px !important');
                });

                // Expand the textarea as soon as it is added to the DOM
                setTimeout( function() {
                    var element = elem;

                    $(element).height(0);
                    var height = $(element)[0].scrollHeight;

                    // 8 is for the padding
                    if (height < 40) {
                        height = 48;
                    }
                    $(element).attr('style', 'height: ' + height +'px !important');
                }, 0);
            }
        };
    });