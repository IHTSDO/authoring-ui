'use strict'

// Override ang-drag-drop (bower_components/angular-native-dragdrop/draganddrop.js v1.1.2)
// 1. Override service dragImage to prevent text rendering when draging
// 2. Override Directive uiDraggable (line 164) to fix the issue that DragAndDrop is not always working (https://jira.ihtsdotools.org/browse/MAINT-932)

angular.module('ang-drag-drop')
  .constant('$dragImageConfig', {
        height: 20,
        width: 200,
        padding: 10,
        font: 'bold 11px Arial',
        fontColor: '#eee8d5',
        backgroundColor: '#93a1a1',
        xOffset: 0,
        yOffset: 0
    })
  .service('$dragImage', ['$dragImageConfig', function(defaultConfig) {
        var ELLIPSIS = '…';

        function fitString(canvas, text, config) {
            var width = canvas.measureText(text).width;
            if (width < config.width) {
                return text;
            }
            while (width + config.padding > config.width) {
                text = text.substring(0, text.length - 1);
                width = canvas.measureText(text + ELLIPSIS).width;
            }
            return text + ELLIPSIS;
        }

        this.generate = function(text, options) {
            var config = angular.extend({}, defaultConfig, options || {});
            var el = document.createElement('canvas');

            el.height = 0;
            el.width = 0;

            var canvas = el.getContext('2d');

            canvas.fillStyle = config.backgroundColor;
            canvas.fillRect(0, 0, config.width, config.height);
            canvas.font = config.font;
            canvas.fillStyle = config.fontColor;

            var title = fitString(canvas, text, config);
            canvas.fillText(title, 4, config.padding + 4);

            var image = new Image();
            image.src = el.toDataURL();

            return {
                image: image,
                xOffset: config.xOffset,
                yOffset: config.yOffset
            };
        };
    }
    ]
  ) 
  .directive('uiDraggableCustom', ['$parse', '$rootScope', '$dragImage', function($parse, $rootScope, $dragImage) {
      return {        
        priority : 1,
        link : function(scope, element, attrs) {
          var isDragHandleUsed = false,
              dragHandleClass,
              draggingClass = attrs.draggingClass || 'on-dragging',
              dragTarget;

          element.attr('draggable', false);

          scope.$watch(attrs.uiDraggableCustom, function(newValue) {
              if (newValue) {
                  element.attr('draggable', newValue);
                  element.bind('dragend', dragendHandler);
                  element.bind('dragstart', dragstartHandler);
              }
              else {
                  element.removeAttr('draggable');
                  element.unbind('dragend', dragendHandler);
                  element.unbind('dragstart', dragstartHandler);
              }

          });

          if (angular.isString(attrs.dragHandleClass)) {
              isDragHandleUsed = true;
              dragHandleClass = attrs.dragHandleClass.trim() || 'drag-handle';

              element.bind('mousedown', function(e) {
                  dragTarget = e.target;
              });
          }

          function dragendHandler(e) {
              setTimeout(function() {
                  element.unbind('$destroy', dragendHandler);
              }, 0);
              var sendChannel = attrs.dragChannel || 'defaultchannel';
              $rootScope.$broadcast('ANGULAR_DRAG_END', e, sendChannel);

              determineEffectAllowed(e);

              if (e.dataTransfer && e.dataTransfer.dropEffect !== 'none') {
                  if (attrs.onDropSuccess) {
                      var onDropSuccessFn = $parse(attrs.onDropSuccess);
                      scope.$evalAsync(function() {
                          onDropSuccessFn(scope, {$event: e});
                      });
                  } else {
                      if (attrs.onDropFailure) {
                          var onDropFailureFn = $parse(attrs.onDropFailure);
                          scope.$evalAsync(function() {
                              onDropFailureFn(scope, {$event: e});
                          });
                      }
                  }
              }
              element.removeClass(draggingClass);
          }

          function dragstartHandler(e) {
              var isDragAllowed = !isDragHandleUsed || dragTarget.classList.contains(dragHandleClass);

              if (isDragAllowed) {
                  var sendChannel = attrs.dragChannel || 'defaultchannel';
                  var dragData = '';
                  if (attrs.drag) {
                      dragData = scope.$eval(attrs.drag);
                  }

                  var dragImage = attrs.dragImage || null;

                  element.addClass(draggingClass);
                  element.bind('$destroy', dragendHandler);

                  //Code to make sure that the setDragImage is available. IE 10, 11, and Opera do not support setDragImage.
                  var hasNativeDraggable = !(document.uniqueID || window.opera);

                  //If there is a draggable image passed in, then set the image to be dragged.
                  if (dragImage && hasNativeDraggable) {
                      var dragImageFn = $parse(attrs.dragImage);
                      scope.$apply(function() {
                          var dragImageParameters = dragImageFn(scope, {$event: e});
                          if (dragImageParameters) {
                              if (angular.isString(dragImageParameters)) {
                                  dragImageParameters = $dragImage.generate(dragImageParameters);
                              }
                              if (dragImageParameters.image) {
                                  var xOffset = dragImageParameters.xOffset || 0,
                                      yOffset = dragImageParameters.yOffset || 0;
                                  e.dataTransfer.setDragImage(dragImageParameters.image, xOffset, yOffset);
                              }
                          }
                      });
                  }

                  var transferDataObject = {data: dragData, channel: sendChannel};
                  var transferDataText = angular.toJson(transferDataObject);

                  e.dataTransfer.setData('text', transferDataText);
                  e.dataTransfer.effectAllowed = 'copyMove';
                  setTimeout(function() {
                    $rootScope.$broadcast('ANGULAR_DRAG_START', e, sendChannel, transferDataObject);
                  }, 0);                  
              }
              else {
                  e.preventDefault();
              }
          }

          function determineEffectAllowed(e) {
            if (e.dataTransfer && e.dataTransfer.dropEffect === 'none') {
                if (e.dataTransfer.effectAllowed === 'copy' ||
                    e.dataTransfer.effectAllowed === 'move') {
                    e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed;
                } else if (e.dataTransfer.effectAllowed === 'copyMove' || e.dataTransfer.effectAllowed === 'copymove') {
                    e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
                }
            }
        }
        
      }
    };
  }
]);
