'use strict';

/**
 * @ngdoc overview
 * @name singleConceptAuthoringApp
 * @description
 * # singleConceptAuthoringApp
 *
 * Main module of the application.
 */ 
angular
    .module('singleConceptAuthoringApp', [
    'ngAnimate',
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'mgcrea.ngStrap',
    'jcs-autoValidate', 
    //Insert any created modules here. Ideally one per major feature.
    'singleConceptAuthoringApp.home',
    'singleConceptAuthoringApp.about',
	'singleConceptAuthoringApp.edit',
    'singleConceptAuthoringApp.taxonomy'
    ])
    .config(function ($provide, $routeProvider) {
        $provide.factory('$routeProvider', function () {
            return $routeProvider;
        });
    })

    .run(function($routeProvider, $rootScope, endpointService) {
        $routeProvider.otherwise({
                    redirectTo: '/home'
                  });
        endpointService.getEndpoints().then(function (data){
            $rootScope.endpoints = data.endpoints;
            var imsUrl = data.endpoints.imsEndpoint;
            var imsUrlParams = '?serviceReferer=' + window.location.href;
            $routeProvider
                .when('/login', {
                    redirectTo: function(){ window.location = decodeURIComponent(imsUrl + 'login' + imsUrlParams);}
                  })
                .when('/logout', {
                    redirectTo: function(){ window.location = imsUrl + 'logout' + imsUrlParams;}
                  })
                .when('/settings', {
                    redirectTo: function(){ window.location = imsUrl + 'settings' + imsUrlParams;}
                  })
                .when('/register', {
                    redirectTo: function(){ window.location = imsUrl + 'register' + imsUrlParams;}
                  })
                  .otherwise({
                    redirectTo: '/home'
                  });
        });
})
.controller( 'AppCtrl', ['$scope', '$location', function AppCtrl ( $scope, $location) {
        $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
            if ( angular.isDefined( toState.data.pageTitle ) ) {
              $scope.pageTitle = toState.data.pageTitle + ' | thisIsSetInAppCtrl.js' ;
            }
        });
    }]);
'use strict';

angular.module('singleConceptAuthoringApp')
    .factory('endpointService', ['$http', function ($http) {
        return {
            getEndpoints: function () {
                return $http.get('/config/endpointConfig.json').then(function(response) {
                        return response.data;
                    });
            }
        };
    }]);
'use strict';

angular.module('singleConceptAuthoringApp')
    .factory('snowowlService', ['$http', function ($http) {
        var apiEndpoint = '/snowowl/snomed-ct/MAIN/';

        return {
            getConceptName: function (conceptId) {
                return $http.get(apiEndpoint +'concepts/' + conceptId).then(function(response) {
                        return response;
                    });
            }
        };
    }]);
'use strict';
// jshint ignore: start
angular.module('singleConceptAuthoringApp.taxonomy', [])

.controller( 'taxonomyCtrl', ['$scope', '$location', 'endpointService', function AppCtrl ( $scope, $location, endpointService) {
    
        var options = {
					serverUrl: "/snowowl",
					edition: "snomed-ct/v2",
                    release: "MAIN",
					selectedView: "inferred",
					displayChildren: false,
					langRefset: "900000000000509007",
					closeButton: false,
					collapseButton: false,
					linkerButton: false,
					subscribersMarker: true,
					searchMode: "partialMatching",
					searchLang: "english",
					diagrammingMarkupEnabled: false,
					statusSearchFilter: "activeOnly",
					highlightByEffectiveTime: "false",
                    taskSet: false,
                    taskId: null
				};
        var globalMarkerColor = 'black';
        var componentsRegistry = [];
        var tpt = new taxonomyPanel(document.getElementById("bp-taxonomy_canvas"), 138875005, options);

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function taxonomyPanel(divElement, conceptId, options) {
    var nodeCount = 0;
    var panel = this;
    this.subscribers = [];
    var xhr = null;
    if (typeof componentsRegistry == "undefined") {
        componentsRegistry = [];
    }

    this.markerColor = 'black';
    this.type = "taxonomy";
    this.divElement = divElement;
    this.options = jQuery.extend(true, {}, options);
    var componentLoaded = false;
    $.each(componentsRegistry, function(i, field) {
        if (field.divElement.id == panel.divElement.id) {
            componentLoaded = true;
        }
    });
    if (componentLoaded == false) {
        componentsRegistry.push(panel);
    }

    this.history = [];

    this.setupCanvas = function() {
        var taxonomyHtml = "<div style='height:100%;margin: 5px; overflow:auto;' class='panel panel-default' id='" + panel.divElement.id + "-mainPanel'>";
        taxonomyHtml = taxonomyHtml + "<div class='panel-heading' id='" + panel.divElement.id + "-panelHeading'>";
        taxonomyHtml = taxonomyHtml + "<button id='" + panel.divElement.id + "-subscribersMarker' class='btn btn-link btn-lg' style='padding: 2px; position: absolute;top: 1px;left: 0px;'><i class='glyphicon glyphicon-bookmark'></i></button>"
        taxonomyHtml = taxonomyHtml + "<div class='row'>";
        taxonomyHtml = taxonomyHtml + "<div class='col-md-6' id='" + panel.divElement.id + "-panelTitle'>&nbsp&nbsp&nbsp<strong><span class='i18n' data-i18n-id='i18n_taxonomy'>Taxonomy</span></strong></div>";
        taxonomyHtml = taxonomyHtml + "<div class='col-md-6 text-right'>";
        taxonomyHtml = taxonomyHtml + "<button id='" + panel.divElement.id + "-resetButton' class='btn btn-link' data-panel='" + panel.divElement.id + "' style='padding:2px'><i class='glyphicon glyphicon-repeat'></i></button>"
        taxonomyHtml = taxonomyHtml + "<button id='" + panel.divElement.id + "-linkerButton' class='btn btn-link jqui-draggable linker-button' data-panel='" + panel.divElement.id + "' style='padding:2px'><i class='glyphicon glyphicon-link'></i></button>"
        taxonomyHtml = taxonomyHtml + "<button id='" + panel.divElement.id + "-configButton' class='btn btn-link' style='padding:2px' data-target='#" + panel.divElement.id + "-configModal'><i class='glyphicon glyphicon-cog'></i></button>"
        taxonomyHtml = taxonomyHtml + "<button id='" + panel.divElement.id + "-collapseButton' class='btn btn-link' style='padding:2px'><i class='glyphicon glyphicon-resize-small'></i></button>"
        taxonomyHtml = taxonomyHtml + "<button id='" + panel.divElement.id + "-expandButton' class='btn btn-link' style='padding:2px'><i class='glyphicon glyphicon-resize-full'></i></button>"
        taxonomyHtml = taxonomyHtml + "<button id='" + panel.divElement.id + "-closeButton' class='btn btn-link' style='padding:2px'><i class='glyphicon glyphicon-remove'></i></button>"
        taxonomyHtml = taxonomyHtml + "</div>";
        taxonomyHtml = taxonomyHtml + "</div>";
        taxonomyHtml = taxonomyHtml + "</div>";
        taxonomyHtml = taxonomyHtml + "<div id='" + panel.divElement.id + "-taxonomyConfigBar' style='margin-bottom: 10px;'><nav class='navbar navbar-default' role='navigation' style='min-height: 28px;border-radius: 0px;border-bottom: 1px lightgray solid;'>";
        taxonomyHtml = taxonomyHtml + " <ul class='nav navbar-nav navbar-left'>";
        taxonomyHtml = taxonomyHtml + "     <li class='dropdown' style='margin-bottom: 2px; margin-top: 2px;'>";
        taxonomyHtml = taxonomyHtml + "         <a href='javascript:void(0);' class='dropdown-toggle' data-toggle='dropdown' style='padding-top: 2px; padding-bottom: 2px;'><span id='" + panel.divElement.id + "-txViewLabel'></span> <b class='caret'></b></a>";
        taxonomyHtml = taxonomyHtml + "         <ul class='dropdown-menu' role='menu' style='float: none;'>";
        taxonomyHtml = taxonomyHtml + "             <li><button class='btn btn-link' id='" + panel.divElement.id + "-inferredViewButton'><span class='i18n' data-i18n-id='i18n_inferred_view'>Inferred view</span></button></li>";
        taxonomyHtml = taxonomyHtml + "             <li><button class='btn btn-link' id='" + panel.divElement.id + "-statedViewButton'><span class='i18n' data-i18n-id='i18n_stated_view'>Stated view</span></button></li>";
        taxonomyHtml = taxonomyHtml + "         </ul>";
        taxonomyHtml = taxonomyHtml + "     </li>";
        taxonomyHtml = taxonomyHtml + " </ul>";
        taxonomyHtml = taxonomyHtml + "</nav></div>";
        taxonomyHtml = taxonomyHtml + "<div class='panel-body' style='height:100%' id='" + panel.divElement.id + "-panelBody'>";
        taxonomyHtml = taxonomyHtml + "</div>";
        taxonomyHtml = taxonomyHtml + "</div>";
        $(divElement).html(taxonomyHtml);
        $("#" + panel.divElement.id + "-expandButton").hide();
        $("#" + panel.divElement.id + "-subscribersMarker").hide();

        $("#" + panel.divElement.id + "-closeButton").click(function(event) {
            $(divElement).remove();
        });

        $("#" + panel.divElement.id + "-configButton").click(function (event) {
            $("#" + panel.divElement.id + "-taxonomyConfigBar").slideToggle('slow');
        });

        if (typeof panel.options.closeButton != "undefined" && panel.options.closeButton == false) {
            $("#" + panel.divElement.id + "-closeButton").hide();
        }

        if (typeof panel.options.linkerButton != "undefined" && panel.options.linkerButton == false) {
            $("#" + panel.divElement.id + "-linkerButton").hide();
        }

        if (typeof panel.options.subscribersMarker != "undefined" && panel.options.subscribersMarker == false) {
            $("#" + panel.divElement.id + "-subscribersMarker").remove();
        }

        if (typeof panel.options.collapseButton != "undefined" && panel.options.collapseButton == false) {
            $("#" + panel.divElement.id + "-expandButton").hide();
            $("#" + panel.divElement.id + "-collapseButton").hide();
        }

        $("#" + panel.divElement.id + "-expandButton").click(function(event) {
            $("#" + panel.divElement.id + "-panelBody").slideDown("fast");
            $("#" + panel.divElement.id + "-expandButton").hide();
            $("#" + panel.divElement.id + "-collapseButton").show();
        });
        $("#" + panel.divElement.id + "-collapseButton").click(function(event) {
            $("#" + panel.divElement.id + "-panelBody").slideUp("fast");
            $("#" + panel.divElement.id + "-expandButton").show();
            $("#" + panel.divElement.id + "-collapseButton").hide();
        });
        $("#" + panel.divElement.id + "-configButton").tooltip({
            placement : 'left',
            trigger: 'hover',
            animation: true,
            delay: 1000
        });
        $("#" + panel.divElement.id + "-resetButton").tooltip({
            placement : 'left',
            trigger: 'hover',
            animation: true,
            delay: 1000
        });
        $("#" + panel.divElement.id + "-linkerButton").tooltip({
            placement : 'left',
            trigger: 'hover',
            animation: true,
            delay: 1000
        });
        $("#" + panel.divElement.id + "-linkerButton").draggable({
            cancel: false,
            appendTo: 'body',
            helper: 'clone',
            delay: 500,
            revert: false
        });

        $("#" + panel.divElement.id + "-panelBody").droppable({
            drop: panel.handleDropEvent,
            hoverClass: "bg-info"
        });

        $("#" + panel.divElement.id + "-panelHeading").droppable({
            drop: panel.handleDropEvent,
            hoverClass: "bg-info"
        });

        $("#" + panel.divElement.id + "-resetButton").click(function() {
            panel.setupParents([], {conceptId: 138875005, defaultTerm: "SNOMED CT Concept", definitionStatus: "Primitive"});
        });

        $("#" + panel.divElement.id + "-apply-button").click(function() {
            //console.log("apply!");
            panel.readOptionsPanel();
            panel.setupParents([], {conceptId: 138875005, defaultTerm: "SNOMED CT Concept", definitionStatus: "Primitive"});
        });


        $("#" + panel.divElement.id + "-linkerButton").click(function(event) {
            $("#" + panel.divElement.id + "-linkerButton").popover({
                trigger: 'manual',
                placement: 'bottomRight',
                html: true,
                content: function() {
                    linkerHtml = '<div class="text-center text-muted"><em>Drag to link with other panels<br>';
                    if (panel.subscribers.length == 1) {
                        linkerHtml = linkerHtml + panel.subscribers.length + ' link established</em></div>';
                    } else {
                        linkerHtml = linkerHtml + panel.subscribers.length + ' links established</em></div>';
                    }
                    linkerHtml = linkerHtml + '<div class="text-center"><a href="javascript:void(0);" onclick="clearTaxonomyPanelSubscriptions(\'' + panel.divElement.id + '\');">Clear links</a></div>';
                    return linkerHtml;
                }
            });
            $("#" + panel.divElement.id + "-linkerButton").popover('toggle');
        });

        $("#" + panel.divElement.id + "-inferredViewButton").click(function (event) {
            panel.options.selectedView = 'inferred';
            $("#" + panel.divElement.id + '-txViewLabel').html("<span class='i18n' data-i18n-id='i18n_inferred_view'>Inferred view</span>");
            panel.setupParents([], {conceptId: 138875005, defaultTerm: "SNOMED CT Concept", definitionStatus: "Primitive"});
        });

        $("#" + panel.divElement.id + "-statedViewButton").click(function (event) {
            panel.options.selectedView = 'stated';
            $("#" + panel.divElement.id + '-txViewLabel').html("<span class='i18n' data-i18n-id='i18n_stated_view'>Stated view</span>");
            panel.setupParents([], {conceptId: 138875005, defaultTerm: "SNOMED CT Concept", definitionStatus: "Primitive"});
        });
    }

    this.setupParents = function(parents, focusConcept) {
        var treeHtml = "<div style='height:100%;margin-bottom: 15px;'>";
        treeHtml = treeHtml + "<ul style='list-style-type: none; padding-left: 5px;'>";
        var lastParent;
        $.each(parents, function(i, parent) {
            lastParent = parent;
            treeHtml = treeHtml + "<li data-concept-id='" + parent.conceptId + "' data-term='" + parent.defaultTerm + "' class='treeLabel'>";
            treeHtml = treeHtml + "<button class='btn btn-link btn-xs treeButton' style='padding:2px'><i class='glyphicon glyphicon-chevron-up treeButton'  id='" + panel.divElement.id + "-treeicon-" + parent.conceptId + "'></i></button>";
            if (parent.definitionStatus == "Primitive") {
                treeHtml = treeHtml + '<span class="badge alert-warning">&nbsp;</span>&nbsp;&nbsp;';
            } else {
                treeHtml = treeHtml + '<span class="badge alert-warning">&equiv;</span>&nbsp;&nbsp;';
            }
            treeHtml = treeHtml + '<a href="javascript:void(0);" style="color: inherit;text-decoration: inherit;"><span data-concept-id="' + parent.conceptId + '" data-term="' + parent.defaultTerm + '" class="jqui-draggable treeLabel selectable-row" id="' + panel.divElement.id + '-treenode-' + parent.conceptId + '">' + parent.defaultTerm + '</span></a>';
            treeHtml = treeHtml + "</li>";
        });
        if (parents.length > 0) {
            treeHtml = treeHtml.slice(0, -5);
        }
        treeHtml = treeHtml + "<ul style='list-style-type: none; padding-left: 15px;'>";
        treeHtml = treeHtml + "<li data-concept-id='" + focusConcept.conceptId + "' data-term='" + focusConcept.defaultTerm + "' class='treeLabel'>";
        treeHtml = treeHtml + "<button class='btn btn-link btn-xs treeButton' style='padding:2px'><i class='glyphicon glyphicon-chevron-right treeButton'  id='" + panel.divElement.id + "-treeicon-" + focusConcept.conceptId + "'></i></button>";
        if (focusConcept.definitionStatus == "Primitive") {
            treeHtml = treeHtml + '<span class="badge alert-warning">&nbsp;</span>&nbsp;&nbsp;';
        } else {
            treeHtml = treeHtml + '<span class="badge alert-warning">&equiv;</span>&nbsp;&nbsp;';
        }
        treeHtml = treeHtml + '<a href="javascript:void(0);" style="color: inherit;text-decoration: inherit;"><span data-concept-id="' + focusConcept.conceptId + '" data-term="' + focusConcept.defaultTerm + '" class="jqui-draggable treeLabel selectable-row" id="' + panel.divElement.id + '-treenode-' + focusConcept.conceptId + '">' + focusConcept.defaultTerm + "</span></a>";
        treeHtml = treeHtml + "</li>";
        treeHtml = treeHtml + "</ul>";
        if (parents.length > 0) {
            treeHtml = treeHtml + "</li>";
        }
        treeHtml = treeHtml + "</ul>";
        treeHtml = treeHtml + "</div>";
        $("#" + panel.divElement.id + "-panelBody").html(treeHtml);

        $('.jqui-draggable').draggable({
            appendTo: 'body',
            helper: 'clone',
            delay: 500
        });
        $("#" + panel.divElement.id + "-panelBody").unbind("dblclick");
        $("#" + panel.divElement.id + "-panelBody").dblclick(function(event) {
            if ($(event.target).hasClass("treeLabel")) {
                var selectedId = $(event.target).attr('data-concept-id');
                var selectedLabel = $(event.target).attr('data-term');
                if (typeof selectedId != "undefined") {
                    $.getJSON(options.serverUrl + "/" + options.edition + "/" + options.release + "/concepts/" + selectedId + "/parents?form=" + panel.options.selectedView, function(result) {
                        // done
                    }).done(function(result) {
                        panel.setupParents(result, {conceptId: selectedId, defaultTerm: selectedLabel, definitionStatus: "Primitive"});
                    }).fail(function() {
                    });
                }
            }
        });
        $("#" + panel.divElement.id + "-panelBody").unbind("click");
        $("#" + panel.divElement.id + "-panelBody").click(function(event) {
            if ($(event.target).hasClass("treeButton")) {
                var conceptId = $(event.target).closest("li").attr('data-concept-id');
                var iconId = panel.divElement.id + "-treeicon-" + conceptId;
                event.preventDefault();
                if ($("#" + iconId).hasClass("glyphicon-chevron-down")) {
                    //console.log("close");
                    $(event.target).closest("li").find("ul").remove();
                    $("#" + iconId).removeClass("glyphicon-chevron-down");
                    $("#" + iconId).addClass("glyphicon-chevron-right");
                } else if ($("#" + iconId).hasClass("glyphicon-chevron-right")){
                    //console.log("open");
                    $("#" + iconId).removeClass("glyphicon-chevron-right");
                    $("#" + iconId).addClass("glyphicon-refresh");
                    $("#" + iconId).addClass("icon-spin");
                    panel.getChildren($(event.target).closest("li").attr('data-concept-id'));
                } else if ($("#" + iconId).hasClass("glyphicon-chevron-up")){
                    $("#" + iconId).removeClass("glyphicon-chevron-up");
                    $("#" + iconId).addClass("glyphicon-refresh");
                    $("#" + iconId).addClass("icon-spin");
                    panel.wrapInParents($(event.target).closest("li").attr('data-concept-id'), $(event.target).closest("li"));
                } else if ($("#" + iconId).hasClass("glyphicon-minus")){
                    $("#" + iconId).removeClass("glyphicon-minus");
                    $("#" + iconId).addClass("glyphicon-chevron-right");
                }

            } else if ($(event.target).hasClass("treeLabel")) {
                var selectedId = $(event.target).attr('data-concept-id');
                if (typeof selectedId != "undefined") {
                    $.each(panel.subscribers, function(i, suscriberPanel) {
                        if (suscriberPanel.conceptId != selectedId) {
                            suscriberPanel.conceptId = selectedId;
                            suscriberPanel.updateCanvas();
                        }
                    });
                }
            }

        });

        var iconId = panel.divElement.id + "-treeicon-" + focusConcept.conceptId;
        $("#" + iconId).removeClass("glyphicon-chevron-right");
        $("#" + iconId).addClass("glyphicon-refresh");
        $("#" + iconId).addClass("icon-spin");
        //console.log("getChildren..." + focusConcept.conceptId);
        panel.getChildren(focusConcept.conceptId);
    }

    this.getChildren = function(conceptId) {
        if (typeof panel.options.selectedView == "undefined") {
            panel.options.selectedView = "inferred";
        }

        if (panel.options.selectedView == "inferred") {
            $("#" + panel.divElement.id + "-txViewLabel").html("<span class='i18n' data-i18n-id='i18n_inferred_view'>Inferred view</span>");
        } else {
            $("#" + panel.divElement.id + "-txViewLabel").html("<span class='i18n' data-i18n-id='i18n_stated_view'>Stated view</span>");
        }

        $.getJSON(options.serverUrl + "/" + options.edition + "/" + options.release + "/concepts/" + conceptId + "/children?form=" + panel.options.selectedView, function(result) {
        }).done(function(result) {
            var nodeHtml = "<ul style='list-style-type: none; padding-left: 15px;'>";
            result.sort(function(a, b) {
                if (a.fsn.toLowerCase() < b.fsn.toLowerCase())
                    return -1;
                if (a.fsn.toLowerCase() > b.fsn.toLowerCase())
                    return 1;
                return 0;
            })
            //console.log(JSON.stringify(result));
            var listIconIds = [];
            $.each(result, function(i, field) {
                if (field.active == true) {
                    nodeHtml = nodeHtml + "<li data-concept-id='" + field.conceptId + "' data-term='" + field.fsn + "' class='treeLabel'>";
                    nodeHtml = nodeHtml + "<button class='btn btn-link btn-xs treeButton' style='padding:2px'><i class='glyphicon glyphicon-chevron-right treeButton' id='" + panel.divElement.id + "-treeicon-" + field.conceptId + "'></i></button>";
                    if (field.definitionStatus == "Primitive") {
                        nodeHtml = nodeHtml + '<span class="badge alert-warning">&nbsp;</span>&nbsp;&nbsp;';
                    } else {
                        nodeHtml = nodeHtml + '<span class="badge alert-warning">&equiv;</span>&nbsp;&nbsp;';
                    }
                    nodeHtml = nodeHtml + '<a href="javascript:void(0);" style="color: inherit;text-decoration: inherit;"><span class="jqui-draggable treeLabel selectable-row" data-concept-id="' + field.conceptId + '" data-term="' + field.fsn + '" id="' + panel.divElement.id + '-treenode-' + field.conceptId + '">' + field.fsn + '</span></a>';
                    listIconIds.push(field.conceptId);
                }
            });
            nodeHtml = nodeHtml + "</li>";
            nodeHtml = nodeHtml + "</ul>";
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("glyphicon-refresh");
            $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("icon-spin");
            if (result.length > 0) {
                $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-chevron-down");
            } else {
                $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-minus");
            }
            $("#" + panel.divElement.id + "-treenode-" + conceptId).after(nodeHtml);
            //console.log(JSON.stringify(listIconIds));
            $.each(listIconIds, function(i, nodeId) {
                $('#' + panel.divElement.id + "-treenode-" + nodeId).draggable({
                    appendTo: 'body',
                    helper: 'clone',
                    delay: 500,
                    revert: false
                });
            });
        }).fail(function() {
        });
    }

    this.wrapInParents = function(conceptId, liItem) {
        var topUl = $("#" + panel.divElement.id + "-panelBody").find('ul:first');
        $.getJSON(options.serverUrl + "/" + options.edition + "/" + options.release + "/concepts/" + conceptId + "/parents?form=" + panel.options.selectedView, function(parents) {
            // done
        }).done(function(parents) {
                if (parents.length > 0) {
                    var firstParent = "empty";
                    var parentsStrs = [];
                    $.each(parents, function(i, parent) {
                        var parentLiHtml = "<li data-concept-id='" + parent.conceptId + "' data-term='" + parent.fsn + "' class='treeLabel'>";
                        parentLiHtml = parentLiHtml + "<button class='btn btn-link btn-xs treeButton' style='padding:2px'><i class='glyphicon glyphicon-chevron-up treeButton'  id='" + panel.divElement.id + "-treeicon-" + parent.conceptId + "'></i></button>";
                        if (parent.definitionStatus == "Primitive") {
                            parentLiHtml = parentLiHtml + '<span class="badge alert-warning">&nbsp;</span>&nbsp;&nbsp;';
                        } else {
                            parentLiHtml = parentLiHtml + '<span class="badge alert-warning">&equiv;</span>&nbsp;&nbsp;';
                        }
                        parentLiHtml = parentLiHtml + '<a href="javascript:void(0);" style="color: inherit;text-decoration: inherit;"><span data-concept-id="' + parent.conceptId + '" data-term="' + parent.fsn + '" class="jqui-draggable treeLabel selectable-row" id="' + panel.divElement.id + '-treenode-' + parent.conceptId + '">' + parent.fsn + '</span></a>';
                        parentLiHtml = parentLiHtml + "</li>";
                        parentsStrs.push(parentLiHtml);
                        if (firstParent == "empty") {
                            firstParent = parent.conceptId;
                        }
                    });

                    var staticChildren = topUl.children().slice(0);
                    topUl.append(parentsStrs[0]);
                    $('#' + panel.divElement.id + '-treenode-' + firstParent).closest('li').append("<ul id='parent-ul-id-" + firstParent + "' style='list-style-type: none; padding-left: 15px;'></ul>");
                    var newMainChild;
                    $.each(staticChildren, function(i, child) {
                        if ($(child).attr('data-concept-id') == conceptId) {
                            newMainChild = $(child);
                            var newUl = $('#' + panel.divElement.id + '-treenode-' + firstParent).closest('li').find('ul:first');
                            newUl.append($(child));
                            $(child).find('i:first').removeClass("glyphicon-chevron-up");
                            $(child).find('i:first').addClass("glyphicon-chevron-down");
                        }
                    });
                    $.each(staticChildren, function(i, child) {
                        if ($(child).attr('data-concept-id') != conceptId) {
                            $.each($(child).children(), function(i, subchild) {
                                if ($(subchild).is('ul')) {
                                    newMainChild.append(subchild);
                                }
                            });
                            $('#' + panel.divElement.id + '-treenode-' +$(child).attr('data-concept-id')).closest('li').remove();
                        }
                    });
                    $.each(parentsStrs, function(i, parentsStr) {
                        if (parentsStr != parentsStrs[0]) {
                            topUl.prepend(parentsStr);
                        }
                    });
                    $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("glyphicon-refresh");
                    $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("icon-spin");
                    $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-chevron-down");
                } else {
                    $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("glyphicon-refresh");
                    $("#" + panel.divElement.id + "-treeicon-" + conceptId).removeClass("icon-spin");
                    $("#" + panel.divElement.id + "-treeicon-" + conceptId).addClass("glyphicon-chevron-up");
                }
            }).fail(function() {
            });
    }

    this.setToConcept = function(conceptId, term, definitionStatus) {
        $("#" + panel.divElement.id + "-panelBody").html("<i class='glyphicon glyphicon-refresh icon-spin'></i>");
        $.getJSON(options.serverUrl + "/" + options.edition + "/" + options.release + "/concepts/" + conceptId + "/parents?form=inferred", function(result) {
            // done
        }).done(function(result) {
            if (definitionStatus != "Primitive" && definitionStatus != "Fully defined") {
                definitionStatus = "Primitive";
            }
            panel.setupParents(result, {conceptId: conceptId, defaultTerm: term, definitionStatus: definitionStatus});
        }).fail(function() {
        });
    }

    this.handleDropEvent = function(event, ui) {
        var draggable = ui.draggable;

        //console.log(draggable.html() + " |  " + draggable.attr('data-concept-id') + ' was dropped onto me!');
        if (!draggable.attr('data-concept-id')) {
            //console.log("ignore");
        } else {
            var conceptId = draggable.attr('data-concept-id');
            var term = draggable.attr('data-term');
            var definitionStatus = draggable.attr('data-def-status');
            if (panel.options.selectedView == "undefined") {
                panel.options.selectedView = "inferred";
            }
            if (typeof conceptId != "undefined") {
                panel.setToConcept(conceptId, term, definitionStatus);
            }
            $(ui.helper).remove(); //destroy clone
        }


        if (!draggable.attr('data-panel')) {
            //console.log("ignore");
        } else {
            //console.log("OK : " + draggable.attr('data-panel'));
            $.each(componentsRegistry, function(i, field) {
                if (field.divElement.id == draggable.attr('data-panel')) {
                    if (field.type == "concept-details") {
                        panel.subscribe(field);
                    }
                }
            });
        }
    }

    this.subscribe = function(subscriber) {
        var alreadySubscribed = false;
        $.each(panel.subscribers, function(i, field) {
            if (subscriber.divElement.id == field.divElement.id) {
                alreadySubscribed = true;
            }
        });
        if (!alreadySubscribed) {
            if (panel.subscribers.length == 0) {
                if (typeof globalMarkerColor == "undefined") {
                    globalMarkerColor = 'black';
                }
                panel.markerColor = panel.getNextMarkerColor(globalMarkerColor);
                //console.log(panel.markerColor);
                $("#" + panel.divElement.id + "-subscribersMarker").css('color', panel.markerColor);
                $("#" + panel.divElement.id + "-subscribersMarker").show();
            }
            panel.subscribers.push(subscriber);
            subscriber.setSubscription(panel);
        }
    }

    this.unsubscribe = function(subscriber) {
        var indexToRemove = -1;
        var i = 0;
        $.each(panel.subscribers, function(i, field) {
            if (subscriber.divElement.id == field.divElement.id) {
                indexToRemove = i;
            }
            i = i + 1;
        });
        if (indexToRemove > -1) {
            panel.subscribers.splice(indexToRemove, 1);
        }
        if (panel.subscribers.length == 0) {
            $("#" + panel.divElement.id + "-subscribersMarker").hide();
        }
        subscriber.clearSubscription();
    }

    this.unsubscribeAll = function() {
        var subscribersClone = panel.subscribers.slice(0);
        $.each(subscribersClone, function (i, field) {
            panel.unsubscribe(field);
        });
    }

    this.getNextMarkerColor = function(color) {
//console.log(color);
        var returnColor = 'black';
        if (color == 'black') {
            returnColor = 'green';
        } else if (color == 'green') {
            returnColor = 'purple';
        } else if (color == 'purple') {
            returnColor = 'red';
        } else if (color == 'red') {
            returnColor = 'blue';
        } else if (color == 'blue') {
            returnColor = 'green';
        }
//console.log(returnColor);
        globalMarkerColor = returnColor;
        return returnColor;
    }

    this.setupCanvas();
    if (!conceptId || conceptId == 138875005) {
        this.setupParents([], {conceptId: 138875005, defaultTerm: "SNOMED CT Concept", definitionStatus: "Primitive"});
    } else {
        if (xhr != null) {
            xhr.abort();
            console.log("aborting call...");
        }
        xhr = $.getJSON(options.serverUrl + "/" + options.edition + "/" + options.release + "/concepts/" + conceptId, function(result) {

        }).done(function(result) {
           panel.setToConcept(conceptId, result.defaultTerm);
        }).fail(function() {
            console.log("Error");
        });
    }
}

function clearTaxonomyPanelSubscriptions(divElementId1) {
    var d1;
    $.each(componentsRegistry, function(i, field) {
        if (field.divElement.id == divElementId1) {
            d1 = field;
        }
    });
    d1.unsubscribeAll();
}

(function($) {
    $.fn.addTaxonomy = function(options) {
        this.filter("div").each(function() {
            var tx = new conceptDetails(this, options);
        });
    };
}(jQuery));



    $(document).on('dragend', function(){
        removeHighlight();
    });

    function removeHighlight(){
        $(document).find('.drop-highlighted').removeClass('drop-highlighted');
    }

    function allowDrop(ev) {
        ev.preventDefault();

        var aux;
        if ($(ev.target).attr("data-droppable") == "true"){
            aux = $(ev.target);
        }else{
            aux = $(ev.target).closest("div");
        }
    //    while (typeof $(aux).closest('div').attr('ondrop') != "undefined"){
    //        aux = $(aux).closest('div');
    //    }
        $(aux).addClass("drop-highlighted");
    }

    function iconToDrag(text){
        var CVS = document.createElement('canvas'),
            ctx = CVS.getContext('2d');
        CVS.width  = 300;
        CVS.height = 300;
        ctx.font = "15px sans-serif";
        ctx.strokeText(text, 10, 20);
        var icon = document.createElement("img");
        icon.src = CVS.toDataURL();
        return icon;
    }

    function drag(ev, id) {
        var dataText = "";
        var term = "", conceptId = "";
        $.each(ev.target.attributes, function (){
            if (this.name.substr(0, 4) == "data"){
                ev.dataTransfer.setData(this.name.substr(5), this.value);
                if (this.name.substr(5) == "concept-id"){
                    conceptId = this.value;
                }
                if (this.name.substr(5) == "term"){
                    term = this.value;
                }
            }
        });
        icon = iconToDrag(term);
        if (navigator.userAgent.indexOf("Chrome") > -1){
            icon = iconToDrag(term);
            ev.dataTransfer.setDragImage(icon, 0, 0);
        }else{
    //            icon = iconToDrag(term);
        }
        ev.dataTransfer.setDragImage(icon, 0, 0);
        dataText = conceptId + "|" + term;
        ev.dataTransfer.setData("Text", dataText);
        ev.dataTransfer.setData("divElementId", id);
    }

    function dropS(ev){
        $(document).find('.drop-highlighted').removeClass('drop-highlighted');
        ev.preventDefault();
        var text = ev.dataTransfer.getData("Text");
        if (text != "javascript:void(0);"){
            var i = 0;
            while (text.charAt(i) != "|"){
                i++;
            }
            var conceptId = ev.dataTransfer.getData("concept-id");
            if (typeof conceptId == "undefined"){
                conceptId = text.substr(0, i);
            }
            var term = ev.dataTransfer.getData("term");
            if (typeof term == "undefined"){
                term = text.substr(i);
            }
            $(ev.target).val(term);
            var id = $(ev.target).attr("id").replace("-searchBox", "");
            $.each(componentsRegistry, function(i, field) {
                if (field.divElement.id == id) {
                    field.search(term, 0, 100, false);
                }
            });
        }
    }
    
    var disableTextSelect = function() {
        return this.each(function() {
            $(this).css({
                'MozUserSelect':'none',
                'webkitUserSelect':'none'
            }).attr('unselectable','on').bind('selectstart', function() {
                return false;
            });
        });
    };


    function dropC(ev, id) {
        $(document).find('.drop-highlighted').removeClass('drop-highlighted');
        ev.preventDefault();
        var text = ev.dataTransfer.getData("Text");
        if (text != "javascript:void(0);"){
            var i = 0;
            while (text.charAt(i) != "|"){
                i++;
            }
            var conceptId = ev.dataTransfer.getData("concept-id");
            if (typeof conceptId == "undefined"){
                conceptId = text.substr(0, i);
            }
            var term = ev.dataTransfer.getData("term");
            if (typeof term == "undefined"){
                term = text.substr(i);
            }
            var panelD = ev.dataTransfer.getData("panel");
            var divElementID = id;
            var panelAct;
            $.each(componentsRegistry, function (i, field){
                if (field.divElement.id == divElementID){
                    panelAct = field;
                }
            });
            if (!conceptId) {
                if (!panelD) {
                } else {
                    $.each(componentsRegistry, function(i, field) {
                        if (field.divElement.id == panelD) {
                            if (field.type == "search" || field.type == "taxonomy") {
                                panelAct.subscribe(field);
                                panelAct.setupOptionsPanel();
                            }
                        }
                    });
                }
            } else {
                if (panelAct.conceptId != conceptId) {
                    panelAct.conceptId = conceptId;
                    panelAct.updateCanvas();
                    channel.publish(panelAct.divElement.id, {
                        term: term,
                        conceptId: panelAct.conceptId,
                        source: panelAct.divElement.id
                    });
                }
            }
        }

    }

    function dropF(ev, id) {
        var text = ev.dataTransfer.getData("Text");
        if (text != "javascript:void(0);"){
            var i = 0;
            while (text.charAt(i) != "|"){
                i++;
            }
            var conceptId = ev.dataTransfer.getData("concept-id");
            if (typeof conceptId == "undefined"){
                conceptId = text.substr(0, i);
            }
            var term = ev.dataTransfer.getData("term");
            var module = ev.dataTransfer.getData("module");
            if (typeof term == "undefined"){
                term = text.substr(i);
            }
            var favs = stringToArray(localStorage.getItem("favs")), found = false;
            $.each(favs, function(i,field){
                if (field == conceptId){
                    found = true;
                }
            });
            var concept = {
                fsn: term,
                conceptId: conceptId,
                module: module
            };
            if (!found){
    //            console.log(concept);
                favs.push(conceptId);
                localStorage.setItem("favs", favs);
                localStorage.setItem("conceptId:" + conceptId, JSON.stringify(concept));
            }
            channel.publish("favsAction");
        }
    }

    function dropT(ev, id) {
        $(document).find('.drop-highlighted').removeClass('drop-highlighted');
        ev.preventDefault();
        var text = ev.dataTransfer.getData("Text");
        if (text != "javascript:void(0);") {
            var i = 0;
            while (text.charAt(i) != "|"){
                i++;
            }
            var divElementId = id;
            var panel;
            var panelD = ev.dataTransfer.getData("panel");
            var conceptId = ev.dataTransfer.getData("concept-id");
            if (typeof conceptId == "undefined"){
                conceptId = text.substr(0, i);
            }
            var term = ev.dataTransfer.getData("term");
            if (typeof term == "undefined"){
                term = text.substr(i);
            }
            var definitionStatus = ev.dataTransfer.getData("def-status");
            var module = ev.dataTransfer.getData("module");

            $.each(componentsRegistry, function (i, field){
                if (field.divElement.id == divElementId){
                    panel = field;
                }
            });

            if (!conceptId) {
            } else {
                if (panel.options.selectedView == "undefined") {
                    panel.options.selectedView = "inferred";
                }
                if (typeof conceptId != "undefined") {
                    var d = new Date();
                    var time = d.getTime();
                    panel.history.push({term: term, conceptId: conceptId, time: time});
                    panel.setToConcept(conceptId, term, definitionStatus, module);
                    channel.publish(panel.divElement.id, {
                        term: term,
                        conceptId: conceptId,
                        source: panel.divElement.id
                    });
                }
            }
            if (!panelD) {
            } else {
                //console.log("OK : " + draggable.attr('data-panel'));
                $.each(componentsRegistry, function(i, field) {
                    if (field.divElement.id == panelD) {
                        if (field.type == "concept-details") {
                            panel.subscribe(field);
                            field.setupOptionsPanel();
                        }
                    }
                });
            }
        }
    }

    function stringToArray (string){
        if (typeof string == "string"){
            var ind = 0, auxString, array = [];
            while (ind < string.length){
                auxString = "";
                while (string.substr(ind, 1) != "," && ind < string.length){
                    auxString = auxString + string.substr(ind,1);
                    ind++;
                }
                array.push(auxString);
                ind++;
            }
            return(array);
        }else{
            return false;
        }
    }

    function alertEvent(message, type) {
        $.notify(message,type);
    }

}]);



'use strict';

angular.module( 'singleConceptAuthoringApp.about', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/about', {
        controller: 'AboutCtrl',
        templateUrl: 'components/about/about.html'
      });
})

.controller( 'AboutCtrl', function AboutCtrl( $scope, $rootScope) {
});
'use strict';

angular.module( 'singleConceptAuthoringApp.home', [
  //insert dependencies here
    'ngRoute',
	'ngTable'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/home', {
        controller: 'HomeCtrl',
        templateUrl: 'components/home/home.html'
      });
})

.controller( 'HomeCtrl', function HomeCtrl( $scope, ngTableParams, $filter ) {
    
 var data = [{name: 'Open and Close Fractures of t1-t6', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'}, 
                        {name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
						{name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
						 {name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
						{name: 'Open and Close Fractures of t1-t6', project: 'A Nother Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Really Really Long Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'},
                        {name: 'A Task Title', project: 'A Sample Project Title', modified: '2015-06-12', classification: 'true', feedback: 'true', status: 'Not Started'}
						
						];
            $scope.data = data;
			$scope.tableParams = new ngTableParams({
    page: 1,            // show first page
    count: 10,
    sorting: {
      name: 'asc'     // initial sorting
    }
  }, {
    filterDelay: 50,
    total: data.length, // length of data
    getData: function($defer, params) {
      var searchStr = params.filter().search;
      var mydata = [];

      if(searchStr){
        mydata = data.filter(function(item){
          return item.name.toLowerCase().indexOf(searchStr) > -1 || item.project.toLowerCase().indexOf(searchStr) > -1;
        });
      } else {
        mydata = data;
      }

      mydata = params.sorting() ? $filter('orderBy')(mydata, params.orderBy()) : mydata;
      $defer.resolve(mydata.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });
			
        });
'use strict';

angular.module( 'singleConceptAuthoringApp.edit', [
  //insert dependencies here
    'ngRoute'
])

.config(function config( $routeProvider ) {
  $routeProvider
    .when('/edit', {
        controller: 'EditCtrl',
        templateUrl: 'components/edit/edit.html'
      });
})

.controller( 'EditCtrl', function AboutCtrl( $scope, $rootScope) {
});
'use strict'

angular.module('singleConceptAuthoringApp')
.directive('formControl', function() {
  return {
    restrict: 'C',
    link: function(scope, element, attrs) {

      // set initial filled
      if(element.val()){
        element.parent().addClass('filled');
      }

      element.bind('blur', function (e) {
        input = angular.element(e.currentTarget);
        if(input.val()){
          input.parent().addClass('filled');
        } else {
          input.parent().removeClass('filled');
        }
        input.parent().removeClass('active');
      }).bind('focus', function (e) {
        input = angular.element(e.currentTarget);
        input.parent().addClass('active');
      });

    }
  };
});

'use strict'

angular.module('singleConceptAuthoringApp')
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
  $scope.states = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Dakota','North Carolina','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

}]);

'use strict';

angular.module('singleConceptAuthoringApp')
.directive('navbarScroll', function($window) {
  return {
    restrict: 'A',
    link: function(scope, element, attr) {
      var navbar = angular.element('.main-container .navbar');
      angular.element($window).bind('scroll', function() {
        if (this.pageYOffset > 0) {
          navbar.addClass('scroll');
        } else {
          navbar.removeClass('scroll');
        }
      });
    }
  };
});
'use strict';

angular.module('singleConceptAuthoringApp')
.directive('navbarSearch', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    templateUrl: 'shared/navbar/navbar-search.html',
    link: function(scope, element, attrs) {
      scope.showNavbarSearch = false;

      scope.toggleSearch = function(){
        scope.showNavbarSearch = !scope.showNavbarSearch;
      };

      scope.submitNavbarSearch = function(){
        scope.showNavbarSearch = false;
      };
    }
  };
}]);

'use strict'

angular.module('singleConceptAuthoringApp')
.directive('nouiSlider', function() {

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      var bind = angular.element(attrs.bind);
      var bindRange = angular.element(attrs.bindRange);

      if ( bind.length ) start = bind.val();

      // setting range or start
      start = ( attrs.start ? attrs.start : 0 );
      range = ( attrs.range ? attrs.range : 0 );

      if(range){
        startPoint = [start, range];
        element.addClass('noUi-range');
      } else {
        startPoint = [start];
      }

      // settings
      step = ( attrs.step ? parseInt(attrs.step) : 0 );
      min = ( attrs.min ? parseInt(attrs.min) : 0 );
      max = ( attrs.max ? parseInt(attrs.max) : 10 );

      $(element).noUiSlider({
        start: startPoint,
        step: step,
        range: {
          'min': [ min ],
          'max': [ max ]
        }
      });

      $(element).on('slide', function(a,b){

        if ( bindRange.length ) {
          v = parseInt(b[0]);
          v2 = parseInt(b[1]);
        } else {
          v = parseInt(b);
        }

        if ( bind.length ) {
          if (bind[0].value !== undefined) {
            bind.val(v);
          } else {
            bind.html(v);
          }
        }

        if ( bindRange.length ) {
          if (bindRange[0].value !== undefined) {
            bindRange.val(v2);
          } else {
            bindRange.html(v2);
          }
        }
      });
    }
  };

});

'use strict';

angular.module('singleConceptAuthoringApp')
.directive('menuLink', function() {
  return {
    restrict: 'A',
    transclude: true,
    replace: true,
    scope: {
      href: '@',
      icon: '@',
      name: '@'
    },
    templateUrl: 'shared/menu-link/menu-link.html',
    controller: ['$element', '$location', '$rootScope', function($element, $location, $rootScope) {
      this.getName = function(name) {
        if ( name !== undefined ) {
          return name;
        } else {
          return $element.find('a').text().trim();
        }
      };

      this.setBreadcrumb = function(name) {
        $rootScope.pageTitle = this.getName(name);
      };

      this.isSelected = function(href) {
        return $location.path() === href.slice(1, href.length);
      };
    }],
    link: function(scope, element, attrs, linkCtrl) {
      icon = attrs.icon;
      if ( icon ) {
        element.children().first().prepend('<i class="' + icon + '"></i>&nbsp;');
      }

      if ( linkCtrl.isSelected(attrs.href) ) {
        linkCtrl.setBreadcrumb(attrs.name);
      }

      element.click(function(){
        linkCtrl.setBreadcrumb(attrs.name);
      });

      scope.isSelected = function() {
        return linkCtrl.isSelected(attrs.href);
      };
    }
  };
});

'use strict';

angular.module('singleConceptAuthoringApp')
.directive('menuToggle', ['$location', function($location) {
  return {
    restrict: 'A',
    transclude: true,
    replace: true,
    scope: {
      name: '@',
      icon: '@'
    },
    templateUrl: 'shared/menu-toggle/menu-toggle.html',
    link: function(scope, element, attrs) {
      icon = attrs.icon;
      if ( icon ) {
        element.children().first().prepend('<i class="' + icon + '"></i>&nbsp;');
      }

      element.children().first().on('click', function(e) {
        e.preventDefault();
        link = angular.element(e.currentTarget);

        if( link.hasClass('active') ) {
          link.removeClass('active');
        } else {
          link.addClass('active');
        }
      });

      scope.isOpen = function() {
        folder = '/' + $location.path().split('/')[1];
        return folder === attrs.path;
      };
    }
  };
}]);

(function ($) {
    // left: 37, up: 38, right: 39, down: 40,
    // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
    // var keys = [32, 33, 34, 35, 36, 37, 38, 39, 40];

    // function preventDefault(e) {
    //   e = e || window.event;
    //   if (e.preventDefault)
    //     e.preventDefault();
    //   e.returnValue = false;
    // }

    // function keydown(e) {
    //   for (var i = keys.length; i--;) {
    //     if (e.keyCode === keys[i]) {
    //       preventDefault(e);
    //       return;
    //     }
    //   }
    // }

    // function wheel(e) {
    //   preventDefault(e);
    // }

    // function disable_scroll() {
    //   if (window.addEventListener) {
    //     window.addEventListener('DOMMouseScroll', wheel, false);
    //   }
    //   window.onmousewheel = document.onmousewheel = wheel;
    //   document.onkeydown = keydown;
    //   $('body').css({'overflow-y' : 'hidden'});
    // }

    // function enable_scroll() {
    //   if (window.removeEventListener) {
    //     window.removeEventListener('DOMMouseScroll', wheel, false);
    //   }
    //   window.onmousewheel = document.onmousewheel = document.onkeydown = null;
    //   $('body').css({'overflow-y' : ''});

    // }

  var methods = {
    init : function(options) {
      var defaults = {
        menuWidth: 250,
        edge: 'left',
        closeOnClick: false
      };
      options = $.extend(defaults, options);

      $(this).each(function(){
        var $this = $(this);
        var menu_id = $($this.attr('data-activates'));


        // Set to width
        if (options.menuWidth != 250) {
          menu_id.css('width', options.menuWidth);
        }

        // Add Touch Area
        $('body').append($('<div class="drag-target"></div>'));

        if (options.edge == 'left') {
          menu_id.css('left', -1 * (options.menuWidth + 10));
          $('.drag-target').css({'left': 0}); // Add Touch Area
        }
        else {
          menu_id.addClass('right-aligned') // Change text-alignment to right
            .css('right', -1 * (options.menuWidth + 10))
            .css('left', '');
          $('.drag-target').css({'right': 0}); // Add Touch Area
        }

        // If fixed sidenav, bring menu out
        if (menu_id.hasClass('fixed')) {
            if ($(window).width() > 992) {
              menu_id.css('left', 0);
            }
        }

        if (window.innerWidth > 992) {
          menuOut = true;
        }

        // Window resize to reset on large screens fixed
        if (menu_id.hasClass('fixed')) {
          $(window).resize( function() {
            if (window.innerWidth > 992) {
              // Close menu if window is resized bigger than 992 and user has fixed sidenav
              if ($('#sidenav-overlay').css('opacity') !== 0 && menuOut) {
                removeMenu(true);
              }
              else {
                menu_id.removeAttr('style');
                menu_id.css('width', options.menuWidth);
              }
            }
            else if (menuOut === false){
              if (options.edge === 'left')
                menu_id.css('left', -1 * (options.menuWidth + 10));
              else
                menu_id.css('right', -1 * (options.menuWidth + 10));
            }

          });
        }

        // if closeOnClick, then add close event for all a tags in side sideNav
        if (options.closeOnClick === true) {
          menu_id.on("click.itemclick", "a:not(.collapsible-header)", function(){
            if (menuOut === true) {
              removeMenu();
            }
          });
        }

        function removeMenu(restoreNav) {
          panning = false;
          menuOut = false;
          $('body').removeClass('overflow-no');
          $('#sidenav-overlay').velocity({opacity: 0}, {duration: 200, queue: false, easing: 'easeOutQuad',
            complete: function() {
              $(this).remove();
            } });
          if (options.edge === 'left') {
            // Reset phantom div
            $('.drag-target').css({width: '', right: '', left: '0'});
            menu_id.velocity(
              {left: -1 * (options.menuWidth + 10)},
              { duration: 200,
                queue: false,
                easing: 'easeOutCubic',
                complete: function() {
                  if (restoreNav === true) {
                    // Restore Fixed sidenav
                    menu_id.removeAttr('style');
                    menu_id.css('width', options.menuWidth);
                  }
                }

            });
          }
          else {
            // Reset phantom div
            $('.drag-target').css({width: '', right: '0', left: ''});
            menu_id.velocity(
              {right: -1 * (options.menuWidth + 10)},
              { duration: 200,
                queue: false,
                easing: 'easeOutCubic',
                complete: function() {
                  if (restoreNav === true) {
                    // Restore Fixed sidenav
                    menu_id.removeAttr('style');
                    menu_id.css('width', options.menuWidth);
                  }
                }
              });
          }
        }



        // Touch Event
        var panning = false;
        var menuOut = false;

        $('.drag-target').on('click', function(){
          removeMenu();
        });

        $('.drag-target').hammer({
          prevent_default: false
        }).bind('pan', function(e) {

          if (e.gesture.pointerType == "touch") {

            var direction = e.gesture.direction;
            var x = e.gesture.center.x;
            var y = e.gesture.center.y;
            var velocityX = e.gesture.velocityX;

            // If overlay does not exist, create one and if it is clicked, close menu
            if ($('#sidenav-overlay').length === 0) {
              var overlay = $('<div id="sidenav-overlay"></div>');
              overlay.css('opacity', 0).click( function(){
                removeMenu();
              });
              $('body').append(overlay);
            }

            // Keep within boundaries
            if (options.edge === 'left') {
              if (x > options.menuWidth) { x = options.menuWidth; }
              else if (x < 0) { x = 0; }
            }

            if (options.edge === 'left') {
              // Left Direction
              if (x < (options.menuWidth / 2)) { menuOut = false; }
              // Right Direction
              else if (x >= (options.menuWidth / 2)) { menuOut = true; }

              menu_id.css('left', (x - options.menuWidth));
            }
            else {
              // Left Direction
              if (x < ($(window).width() - options.menuWidth / 2)) {
                menuOut = true;
              }
              // Right Direction
              else if (x >= ($(window).width() - options.menuWidth / 2)) {
               menuOut = false;
             }
              var rightPos = -1 *(x - options.menuWidth / 2);
              if (rightPos > 0) {
                rightPos = 0;
              }

              menu_id.css('right', rightPos);
            }




            // Percentage overlay
            if (options.edge === 'left') {
              overlayPerc = x / options.menuWidth;
              $('#sidenav-overlay').velocity({opacity: overlayPerc }, {duration: 50, queue: false, easing: 'easeOutQuad'});
            }
            else {
              overlayPerc = Math.abs((x - $(window).width()) / options.menuWidth);
              $('#sidenav-overlay').velocity({opacity: overlayPerc }, {duration: 50, queue: false, easing: 'easeOutQuad'});
            }
          }

        }).bind('panend', function(e) {
          if (e.gesture.pointerType == "touch") {
            var velocityX = e.gesture.velocityX;
            panning = false;
            if (options.edge === 'left') {
              // If velocityX <= 0.3 then the user is flinging the menu closed so ignore menuOut
              if ((menuOut && velocityX <= 0.3) || velocityX < -0.5) {
                menu_id.velocity({left: 0}, {duration: 300, queue: false, easing: 'easeOutQuad'});
                $('#sidenav-overlay').velocity({opacity: 1 }, {duration: 50, queue: false, easing: 'easeOutQuad'});
                $('.drag-target').css({width: '50%', right: 0, left: ''});
              }
              else if (!menuOut || velocityX > 0.3) {
                menu_id.velocity({left: -1 * (options.menuWidth + 10)}, {duration: 200, queue: false, easing: 'easeOutQuad'});
                $('#sidenav-overlay').velocity({opacity: 0 }, {duration: 200, queue: false, easing: 'easeOutQuad',
                  complete: function () {
                    $(this).remove();
                  }});
                $('.drag-target').css({width: '10px', right: '', left: 0});
              }
            }
            else {
              if ((menuOut && velocityX >= -0.3) || velocityX > 0.5) {
                menu_id.velocity({right: 0}, {duration: 300, queue: false, easing: 'easeOutQuad'});
                $('#sidenav-overlay').velocity({opacity: 1 }, {duration: 50, queue: false, easing: 'easeOutQuad'});
                $('.drag-target').css({width: '50%', right: '', left: 0});
              }
              else if (!menuOut || velocityX < -0.3) {
                menu_id.velocity({right: -1 * (options.menuWidth + 10)}, {duration: 200, queue: false, easing: 'easeOutQuad'});
                $('#sidenav-overlay').velocity({opacity: 0 }, {duration: 200, queue: false, easing: 'easeOutQuad',
                  complete: function () {
                    $(this).remove();
                  }});
                $('.drag-target').css({width: '10px', right: 0, left: ''});
              }
            }

            $('body').addClass('overflow-no');

          }
        });

          $this.click(function() {
            if (menuOut === true) {
              menuOut = false;
              panning = false;
              removeMenu();
            }
            else {

              $('body').addClass('overflow-no');

              if (options.edge === 'left') {
                $('.drag-target').css({width: '50%', right: 0, left: ''});
                menu_id.velocity({left: 0}, {duration: 300, queue: false, easing: 'easeOutQuad'});
              }
              else {
                $('.drag-target').css({width: '50%', right: '', left: 0});
                menu_id.velocity({right: 0}, {duration: 300, queue: false, easing: 'easeOutQuad'});
                menu_id.css('left','');
              }

              var overlay = $('<div id="sidenav-overlay"></div>');
              overlay.css('opacity', 0)
              .click(function(){
                menuOut = false;
                panning = false;
                removeMenu();
                overlay.velocity({opacity: 0}, {duration: 300, queue: false, easing: 'easeOutQuad',
                  complete: function() {
                    $(this).remove();
                  } });

              });
              $('body').append(overlay);
              overlay.velocity({opacity: 1}, {duration: 300, queue: false, easing: 'easeOutQuad',
                complete: function () {
                  menuOut = true;
                  panning = false;
                }
              });
            }

            return false;
          });
      });


    },
    show : function() {
      this.trigger('click');
    },
    hide : function() {
      $('#sidenav-overlay').trigger('click');
    }
  };


    $.fn.sideNav = function(methodOrOptions) {
      if ( methods[methodOrOptions] ) {
        return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ));
      } else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
        // Default to "init"
        return methods.init.apply( this, arguments );
      } else {
        $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.tooltip' );
      }
    }; // PLugin end
}( jQuery ));
/* jshint ignore:start */

var fsm = angular.module('fsm', []);

fsm.directive('fsmStickyHeader', function(){
    return {
        restrict: 'EA',
        replace: false,
        scope: {
            scrollBody: '=',
            scrollStop: '=',
            scrollableContainer: '='
        },
        link: function(scope, element, attributes, control){
            var header = $(element, this);
            var clonedHeader = null;
            var content = $(scope.scrollBody);
            var scrollableContainer = $(scope.scrollableContainer);

            if (scrollableContainer.length == 0){
                scrollableContainer = $(window);
            }

            function createClone(){
                /*
                 * switch place with cloned element, to keep binding intact
                 */
                clonedHeader = header;
                header = clonedHeader.clone();
                clonedHeader.after(header);
                clonedHeader.addClass('fsm-sticky-header');
                clonedHeader.css({
                    position: 'fixed',
                    'z-index': 1029,
                    visibility: 'hidden'
                });
                calculateSize();
            }

            function calculateSize() {
                clonedHeader.css({
                    top: scope.scrollStop,
                    width: header.outerWidth(),
                    left: header.offset().left
                });

                setColumnHeaderSizes();
            };

            function setColumnHeaderSizes() {
                if (clonedHeader.is('tr')) {
                    var clonedColumns = clonedHeader.find('th');
                    header.find('th').each(function (index, column) {
                        var clonedColumn = $(clonedColumns[index]);
                        clonedColumn.css( 'width', column.offsetWidth + 'px');
                    });
                }
            }

            function determineVisibility(){
                var scrollTop = scrollableContainer.scrollTop() + scope.scrollStop;
                var contentTop = content.offset().top;
                var contentBottom = contentTop + content.outerHeight(false);

                if ( (scrollTop > contentTop) && (scrollTop < contentBottom) ) {
                    if (!clonedHeader){
                        createClone();
                        clonedHeader.css({ "visibility": "visible"});
                    }

                    if ( scrollTop < contentBottom && scrollTop > contentBottom - clonedHeader.outerHeight(false) ){
                        var top = contentBottom - scrollTop + scope.scrollStop - clonedHeader.outerHeight(false);
                        clonedHeader.css('top', top + 'px');
                    } else {
                        calculateSize();
                    }
                } else {
                    if (clonedHeader){
                        /*
                         * remove cloned element (switched places with original on creation)
                         */
                        header.remove();
                        header = clonedHeader;
                        clonedHeader = null;

                        header.removeClass('fsm-sticky-header');
                        header.css({
                            position: 'relative',
                            left: 0,
                            top: 0,
                            width: 'auto',
                            'z-index': 0,
                            visibility: 'visible'
                        });
                    }
                };
            };

            scrollableContainer.scroll(determineVisibility).trigger( "scroll" );
            scrollableContainer.resize(determineVisibility);
        }
    }
});

fsm.directive('fsmMenuButton', function(){
    return {
        restrict: 'EA',
        replace: false,
        scope: { },
        link: function(scope, element, attributes, control){
            var menuButton = $(element, this);

            menuButton.addClass('fsm-menu-button');
            menuButton.click( menuOnClick );

            function menuOnClick() {
                $('body').toggleClass('fsm-menu-toggle');
                setMenuSpin();
                setTimeout(setMenuSpin, 50);
            };

            function setMenuSpin(){
                menuButton.find('.fsm-menu-button-open').toggleClass('fsm-spin-forward');
                menuButton.find('.fsm-menu-button-closed').toggleClass('fsm-spin-backward');
            };
        }
    }
});

fsm.directive('fsmBigData', function ($filter) {

    return {
        restrict: 'AE',
        scope: true,
        replace: false,
        transclude: true,
        link: function (scope, element, attrs, controller, transclude) {
            var orderBy = $filter('orderBy');
            var currentPage = 0;
            var pagedDataName = attrs.fsmBigData.split(' of ')[0];
            var rightHandExpression = attrs.fsmBigData.split(' of ')[1];
            var pageSize = parseInt(rightHandExpression.split(' take ')[1]);
            var sourceData = rightHandExpression.split(' take ')[0];

            // Interesting things can be done here with the source object...
            // var displayGetter = $parse(sourceData);
            // var displaySetter = displayGetter.assign;
            // var results = orderBy(displayGetter(scope.$parent), sortColumns);
            // displaySetter(scope.$parent, results)

            var rawData = [];
            var sortedData = [];
            var pagedData = [];
            var page = $(window);
            var sortTypes = [ 'None', 'Ascending', 'Descending' ];
            var sortColumns = [];

            scope.sortTypes = sortTypes;

            transclude(scope, function (clone, transcludedScope) {
                element.append(clone);
                transcludedScope[pagedDataName] = pagedData;

                function nextPage() {
                    var dataSlice = sortedData.slice(pageSize * currentPage, (pageSize * (currentPage + 1)));
                    if (dataSlice.length > 0) {
                        pagedData.push.apply(pagedData, dataSlice);
                        currentPage++;
                    }
                }

                function addSortColumn(columnName, sortType) {

                    // If this column is currently in the sort stack, remove it.
                    for (var i = 0; i < sortColumns.length; i ++){
                        if (sortColumns[i].indexOf(columnName) > -1) {
                            sortColumns.splice(i, 1);
                        }
                    }

                    // Push this sort on the top of the stack (aka. array)
                    if (sortType > 0) {
                        var direction = '';
                        if (sortTypes[sortType] === 'Descending'){
                            direction = '-'
                        }
                        sortColumns.unshift(direction + columnName);
                    }

                    renderData();
                }

                function renderData() {
                    if (sortColumns.length){
                        sortedData = orderBy(rawData, sortColumns);
                    }
                    else {
                        sortedData = rawData;
                    }

                    pagedData.length = 0;
                    currentPage = 0;
                    nextPage();
                }

                function onPageScroll() {
                    var s = $(window).scrollTop(),
                    d = $(document).height(),
                    c = $(window).height();
                    scrollPercent = (s / (d-c));

                    if (scrollPercent > 0.98) {
                        // We use scope.apply here to tell angular about these changes because
                        // they happen outside of angularjs context... we're using jquery here
                        // to figure out when we need to load another page of data.
                        transcludedScope.$apply(nextPage);
                    }
                }

                page.scroll(onPageScroll).trigger( 'scroll' );

                scope.$parent.$watchCollection(sourceData, function (newData) {
                    if (newData){
                        rawData = newData;
                        renderData();
                    }
                });

                scope.addSortColumn = addSortColumn;
            });
        }
    }
});

fsm.directive('fsmSort', function () {
    var sortIconTemplate = '<i class="md md-sort"></i>';

    return {
        restrict: 'A',
        replace: false,
        scope: {},
        link: function (scope, element, attrs) {
            var columnHeader = element;
            var columnName = attrs.fsmSort;
            var sortIcon = angular.element(sortIconTemplate);
            columnHeader.append('&nbsp;')
            columnHeader.append(sortIcon);
            var currentSortType = 0;

            function swapIcons(){
                sortIcon.removeClass('md-arrow-drop-down md-arrow-drop-up md-sort ');

                var classToAdd = 'md-sort';

                if (scope.$parent.sortTypes[currentSortType] === 'Ascending'){
                    classToAdd = 'md-arrow-drop-down';
                } else if(scope.$parent.sortTypes[currentSortType] === 'Descending') {
                    classToAdd = 'md-arrow-drop-up';
                }

                sortIcon.addClass(classToAdd);
            }

            columnHeader.css({ cursor: 'pointer' });
            columnHeader.bind('click', function() {
                // Find the kind of sort this should now be
                currentSortType ++;
                if (currentSortType == scope.$parent.sortTypes.length ){
                    currentSortType = 0;
                }

                scope.$apply( scope.$parent.addSortColumn(columnName, currentSortType) );

                swapIcons();
            });
        }
    }
});

/* =============================================================
/*
/*	 Angular Smooth Scroll 1.7.1
/*	 Animates scrolling to elements, by David Oliveros.
/*
/*   Callback hooks contributed by Ben Armston
/*   https://github.com/benarmston
/*
/*	 Easing support contributed by Willem Liu.
/*	 https://github.com/willemliu
/*
/*	 Easing functions forked from Gaëtan Renaudeau.
/*	 https://gist.github.com/gre/1650294
/*
/*	 Infinite loop bugs in iOS and Chrome (when zoomed) by Alex Guzman.
/*	 https://github.com/alexguzman
/*
/*	 Influenced by Chris Ferdinandi
/*	 https://github.com/cferdinandi
/*
/*
/*	 Free to use under the MIT License.
/*
/* ============================================================= */

(function () {
	'use strict';

	var module = angular.module('smoothScroll', []);


	// Smooth scrolls the window to the provided element.
	//
	var smoothScroll = function (element, options) {
		options = options || {};

		// Options
		var duration = options.duration || 800,
			offset = options.offset || 0,
			easing = options.easing || 'easeInOutQuart',
			callbackBefore = options.callbackBefore || function() {},
			callbackAfter = options.callbackAfter || function() {};

		var getScrollLocation = function() {
			return window.pageYOffset ? window.pageYOffset : document.documentElement.scrollTop;
		};

		setTimeout( function() {
			var startLocation = getScrollLocation(),
				timeLapsed = 0,
				percentage, position;

			// Calculate the easing pattern
			var easingPattern = function (type, time) {
				if ( type == 'easeInQuad' ) return time * time; // accelerating from zero velocity
				if ( type == 'easeOutQuad' ) return time * (2 - time); // decelerating to zero velocity
				if ( type == 'easeInOutQuad' ) return time < 0.5 ? 2 * time * time : -1 + (4 - 2 * time) * time; // acceleration until halfway, then deceleration
				if ( type == 'easeInCubic' ) return time * time * time; // accelerating from zero velocity
				if ( type == 'easeOutCubic' ) return (--time) * time * time + 1; // decelerating to zero velocity
				if ( type == 'easeInOutCubic' ) return time < 0.5 ? 4 * time * time * time : (time - 1) * (2 * time - 2) * (2 * time - 2) + 1; // acceleration until halfway, then deceleration
				if ( type == 'easeInQuart' ) return time * time * time * time; // accelerating from zero velocity
				if ( type == 'easeOutQuart' ) return 1 - (--time) * time * time * time; // decelerating to zero velocity
				if ( type == 'easeInOutQuart' ) return time < 0.5 ? 8 * time * time * time * time : 1 - 8 * (--time) * time * time * time; // acceleration until halfway, then deceleration
				if ( type == 'easeInQuint' ) return time * time * time * time * time; // accelerating from zero velocity
				if ( type == 'easeOutQuint' ) return 1 + (--time) * time * time * time * time; // decelerating to zero velocity
				if ( type == 'easeInOutQuint' ) return time < 0.5 ? 16 * time * time * time * time * time : 1 + 16 * (--time) * time * time * time * time; // acceleration until halfway, then deceleration
				return time; // no easing, no acceleration
			};


			// Calculate how far to scroll
			var getEndLocation = function (element) {
				var location = 0;
				if (element.offsetParent) {
					do {
						location += element.offsetTop;
						element = element.offsetParent;
					} while (element);
				}
				location = Math.max(location - offset, 0);
				return location;
			};

			var endLocation = getEndLocation(element);
			var distance = endLocation - startLocation;


			// Stop the scrolling animation when the anchor is reached (or at the top/bottom of the page)
			var stopAnimation = function () {
				var currentLocation = getScrollLocation();
				if ( position == endLocation || currentLocation == endLocation || ( (window.innerHeight + currentLocation) >= document.body.scrollHeight ) ) {
					clearInterval(runAnimation);
					callbackAfter(element);
				}
			};


			// Scroll the page by an increment, and check if it's time to stop
			var animateScroll = function () {
				timeLapsed += 16;
				percentage = ( timeLapsed / duration );
				percentage = ( percentage > 1 ) ? 1 : percentage;
				position = startLocation + ( distance * easingPattern(easing, percentage) );
				window.scrollTo( 0, position );
				stopAnimation();
			};


			// Init
			callbackBefore(element);
			var runAnimation = setInterval(animateScroll, 16);
		}, 0);
	};


	// Expose the library in a factory
	//
	module.factory('smoothScroll', function() {
		return smoothScroll;
	});


	// Scrolls the window to this element, optionally validating an expression
	//
	module.directive('smoothScroll', ['smoothScroll', function(smoothScroll) {
		return {
			restrict: 'A',
			scope: {
				callbackBefore: '&',
				callbackAfter: '&',
			},
			link: function($scope, $elem, $attrs) {
				if ( typeof $attrs.scrollIf === 'undefined' || $attrs.scrollIf === 'true' ) {
					setTimeout( function() {

						var callbackBefore = function(element) {
							if ( $attrs.callbackBefore ) {
								var exprHandler = $scope.callbackBefore({ element: element });
								if (typeof exprHandler === 'function') {
									exprHandler(element);
								}
							}
						};

						var callbackAfter = function(element) {
							if ( $attrs.callbackAfter ) {
								var exprHandler = $scope.callbackAfter({ element: element });
								if (typeof exprHandler === 'function') {
									exprHandler(element);
								}
							}
						};

						smoothScroll($elem[0], {
							duration: $attrs.duration,
							offset: $attrs.offset,
							easing: $attrs.easing,
							callbackBefore: callbackBefore,
							callbackAfter: callbackAfter
						});
					}, 0);
				}
			}
		};
	}]);


	// Scrolls to a specified element ID when this element is clicked
	//
	module.directive('scrollTo', ['smoothScroll', function(smoothScroll) {
		return {
			restrict: 'A',
			link: function($scope, $elem, $attrs) {
				var targetElement;

				$elem.on('click', function(e) {
					e.preventDefault();

					targetElement = document.getElementById($attrs.scrollTo);
					if ( !targetElement ) return;

					var callbackBefore = function(element) {
						if ( $attrs.callbackBefore ) {
							var exprHandler = $scope.callbackBefore({element: element});
							if (typeof exprHandler === 'function') {
								exprHandler(element);
							}
						}
					};

					var callbackAfter = function(element) {
						if ( $attrs.callbackAfter ) {
							var exprHandler = $scope.callbackAfter({element: element});
							if (typeof exprHandler === 'function') {
								exprHandler(element);
							}
						}
					};

					smoothScroll(targetElement, {
						duration: $attrs.duration,
						offset: $attrs.offset,
						easing: $attrs.easing,
						callbackBefore: callbackBefore,
						callbackAfter: callbackAfter
					});

					return false;
				});
			}
		};
	}]);

}());