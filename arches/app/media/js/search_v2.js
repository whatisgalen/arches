require(['jquery', 
    'underscore',
    'backbone',
    'bootstrap',
    'arches', 
    'select2',
    'views/search/term-filter', 
    'views/search/map-filter',
    'views/search/time-filter-v2',
    'views/search/search-results',
    'knockout',
    'views/forms/sections/branch-list',
    'resource-types',
    'openlayers',
    'bootstrap-datetimepicker',
    'plugins/knockout-select2'], 
    function($, _, Backbone, bootstrap, arches, select2, TermFilter, MapFilter, TimeFilter, SearchResults, ko, BranchList, resourceTypes, ol) {
    $(document).ready(function() {
        var wkt = new ol.format.WKT();

        var SearchView = Backbone.View.extend({
            el: $('body'),
            updateRequest: '',

            events: {
                'click #sliding-panel-control' : 'slideSearchPanel',
                'click .show-map' : 'handleShowMap',
                'click .show-list' : 'handleShowList',
                // 'click #view-saved-searches': 'showSavedSearches',
                'click .clear-search': 'handleClearSearch',
                // 'click #map-filter-button': 'toggleMapFilter',
                // 'click #time-filter-button': 'toggleTimeFilter',
                // 'click a.dataexport': 'exportSearch'
            },

            initialize: function(options) { 
                var mapFilterText, timeFilterText;
                var self = this;

                this.saved_search = $("#saved-search");
                this.results_counter = $("#search-results-count");
                this.time_filter_toggle = $("#date-filter-control");
                this.search_panel = $("#sliding-panel");
                this.search_panel_container = $("#sliding-panel-container");
                this.search_panel_control = $("#sliding-panel-control");
                this.panel_control_icon = $("#sliding-panel-control-icon");
                this.search_panel_tools = $("#sliding-panel-tools");
                this.saved_search_menu = $("#filters-container");
                this.time_filter = $("#time-scale");
                this.map_panel = $("#map-panel");
                this.map_detail_panel = $("#map-detail-panel");
                this.graph_panel = $("#graph-panel");
                this.graph_detail_panel = $("#graph-detail-panel");

                this.return_to;


                this.termFilter = new TermFilter({
                    el: $.find('input.resource_search_widget')[0]
                });
                this.termFilter.on('change', function(){
                    if($('#saved-searches').is(":visible")){
                        this.hideSavedSearches();
                    }

                    //check if saved search panel is open.  If so, close and replace with search results
                    if (this.saved_search.hasClass("saved-search-panel-full")) {

                        this.saved_search.removeClass("saved-search-panel-full");
                        this.search_panel.removeClass("sliding-panel-hidden");
                        this.search_panel.addClass("sliding-panel-full");

                        //center search items
                        this.search_panel_container.addClass("container");

                        //hide saved search menu, show time filter
                        this.saved_search_menu.addClass("hidden");
                        this.time_filter.removeClass("time-scale-hidden");
                        this.saved_search.removeClass("saved-search-panel-shim")

                    }

                    //if map panel is open, slide it over and show search results
                    if (this.map_panel.hasClass("map-panel-full")) {

                        this.map_panel.addClass("map-panel-partial");
                        this.map_panel.removeClass("map-panel-full");


                        //update marker panel position
                        this.map_detail_panel.removeClass("pull-right");

                        //show partial search results panel
                        this.search_panel.removeClass("sliding-panel-hidden");
                        this.search_panel.addClass("sliding-panel-partial");

                        //show sliding panel control
                        this.search_panel_control.removeClass("sliding-panel-control-hidden");

                        //Update position of sliding panel tools
                        this.results_counter.addClass("results-counter-shim");
                        this.time_filter_toggle.addClass("date-filter-header-shim");
                        this.search_panel_tools.addClass("sliding-panel-tools-shim");
                    }

                }, this);
                this.termFilter.on('filter-removed', function(item){
                    if(item.text === mapFilterText){
                        this.mapFilter.clear();
                    }
                    if(item.text === timeFilterText){
                        this.timeFilter.clear();
                    }
                }, this);
                this.termFilter.on('filter-inverted', function(item){
                    if(item.text === mapFilterText){
                        this.mapFilter.query.filter.inverted(item.inverted);
                    }
                    if(item.text === timeFilterText){
                        this.timeFilter.query.filter.inverted(item.inverted);
                    }
                }, this);


                this.mapFilter = new MapFilter({
                    el: $('#map-filter-container')[0]
                });
                this.mapFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter.addTag(mapFilterText, inverted);
                    }else{
                        this.termFilter.removeTag(mapFilterText);
                    }
                }, this);


                this.timeFilter = new TimeFilter({
                    el: $('#time-filter-container')[0]
                });
                this.timeFilter.on('enabled', function(enabled, inverted){
                    if(enabled){
                        this.termFilter.addTag(timeFilterText, inverted);
                    }else{
                        this.termFilter.removeTag(timeFilterText);
                    }
                }, this);


                this.searchResults = new SearchResults({
                    el: $('#search-results-container')[0]
                });
                this.searchResults.on('mouseover', function(resourceid){
                    this.mapFilter.selectFeatureById(resourceid);
                }, this);
                this.searchResults.on('mouseout', function(){
                    this.mapFilter.unselectAllFeatures();
                }, this);
                this.searchResults.on('find_on_map', function(resourceid, data){
                    var extent,
                        expand = !this.mapFilter.expanded();
                    if (expand) {
                        this.mapFilter.expanded(true);
                    }
                    
                    _.each(data.geometries, function (geometryData) {
                        var geomExtent = wkt.readGeometry(geometryData.label).getExtent();
                        geomExtent = ol.extent.applyTransform(geomExtent, ol.proj.getTransform('EPSG:4326', 'EPSG:3857'));
                        extent = extent ? ol.extent.extend(extent, geomExtent) : geomExtent;
                    });
                    if (extent) {
                        _.delay(function() {
                            self.mapFilter.zoomToExtent(extent);
                        }, expand ? 700 : 0);
                    }
                }, this);


                mapFilterText = this.mapFilter.$el.data().filtertext;
                timeFilterText = this.timeFilter.$el.data().filtertext;

                self.isNewQuery = true;
                this.searchQuery = {
                    queryString: function(){
                        var params = {
                            page: self.searchResults.page(),
                            termFilter: ko.toJSON(self.termFilter.query.filter.terms()),
                            temporalFilter: ko.toJSON({
                                year_min_max: self.timeFilter.query.filter.year_min_max(),
                                inverted: self.timeFilter.query.filter.inverted()
                            }),
                            spatialFilter: ko.toJSON(self.mapFilter.query.filter),
                            mapExpanded: self.mapFilter.expanded()//,
                            //timeExpanded: self.timeFilter.expanded()
                        };
                        if (self.termFilter.query.filter.terms().length === 0 &&
                            self.timeFilter.query.filter.year_min_max().length === 0 &&
                            self.mapFilter.query.filter.geometry.coordinates().length === 0) {
                            params.no_filters = true;
                        }

                        params.include_ids = self.isNewQuery;
                        return $.param(params).split('+').join('%20');
                    },
                    changed: ko.pureComputed(function(){
                        var ret = ko.toJSON(this.termFilter.query.changed()) +
                            ko.toJSON(this.timeFilter.query.changed()) +
                            ko.toJSON(this.mapFilter.query.changed());
                        return ret;
                    }, this).extend({ rateLimit: 200 })
                };

                this.getSearchQuery();

                this.searchResults.page.subscribe(function(){
                    self.doQuery();
                });

                this.searchQuery.changed.subscribe(function(){
                    self.isNewQuery = true;
                    self.searchResults.page(1);
                    self.doQuery();
                });
            },

            doQuery: function () {
                var self = this;
                var queryString = this.searchQuery.queryString();
                if (this.updateRequest) {
                    this.updateRequest.abort();
                }

                $('.loading-mask').show();
                window.history.pushState({}, '', '?'+queryString);

                this.updateRequest = $.ajax({
                    type: "GET",
                    url: arches.urls.search_results,
                    data: queryString,
                    success: function(results){
                        var data = self.searchResults.updateResults(results);
                        self.mapFilter.highlightFeatures(data, $('.search-result-all-ids').data('results'));
                        self.mapFilter.applyBuffer();
                        self.isNewQuery = false;
                        $('.loading-mask').hide();
                    },
                    error: function(){}
                });
            },

            slideSearchPanel: function() { 

                //Size Time Filter control
                var current_panel_size = $("#sliding-panel").width();

                if (current_panel_size < 270 ) {
                    $(".truncate").css("width", "30%");
                } else {
                    $(".truncate").css("width", "90%");
                }

                //Slide Search Results Container out of view
                if (this.search_panel.hasClass("sliding-panel-partial")) {

                    //Search panel needs to be slid out of view
                    this.search_panel.removeClass("sliding-panel-partial");
                    this.search_panel_container.removeClass("container");
                    
                    this.panel_control_icon.removeClass("fa-step-backward");
                    this.panel_control_icon.addClass("fa-step-forward");

                    //Update position of sliding panel tools
                    this.results_counter.removeClass("results-counter-shim");
                    this.time_filter_toggle.removeClass("date-filter-header-shim");
                    this.search_panel_tools.removeClass("sliding-panel-tools-shim");


                    //if map panel is already displayed, extend it to full screeen
                    if (this.map_panel.hasClass("map-panel-partial")) {

                        this.map_panel.removeClass("map-panel-partial");
                        this.map_panel.addClass("map-panel-full");

                        //position marker panel
                        this.map_detail_panel.addClass("pull-right");

                        //position sliding panel tools
                        this.results_counter.removeClass("results-counter-shim");
                        this.time_filter_toggle.removeClass("date-filter-header-shim");
                        this.search_panel_tools.removeClass("sliding-panel-tools-shim");

                        this.return_to = 'map';

                    }
                    
                    //if graph panel is already displayed, extend it to full screen
                    if (this.graph_panel.hasClass("graph-panel-partial")) {

                        this.graph_panel.removeClass("graph-panel-partial");
                        this.graph_panel.addClass("graph-panel-full");

                        //position sliding panel tools
                        this.results_counter.removeClass("results-counter-shim");
                        this.time_filter_toggle.removeClass("date-filter-header-shim");
                        this.search_panel_tools.removeClass("sliding-panel-tools-shim");

                        this.return_to = 'graph';

                    }


                } else {

                    //Search panel needs to be shown again
                    this.search_panel.addClass("sliding-panel-partial");
                    this.panel_control_icon.addClass("fa-step-backward");
                    this.panel_control_icon.removeClass("fa-step-forward");

                    //position marker panel
                    this.map_detail_panel.removeClass("pull-right");

                    //position sliding panel tools
                    this.results_counter.addClass("results-counter-shim");
                    this.time_filter_toggle.addClass("date-filter-header-shim");
                    this.search_panel_tools.addClass("sliding-panel-tools-shim");


                    if (this.return_to = 'map') {

                        this.map_panel.addClass("map-panel-partial");
                        this.map_panel.removeClass("map-panel-full");

                    } 

                    if (this.return_to = 'graph') {

                        this.graph_panel.addClass("graph-panel-partial");
                        this.graph_panel.removeClass("graph-panel-full");


                    } 
                }
            },

            handleShowMap: function() {  

                //Before showing map, determine whether saved search is still visible.  If so, then close and show full map.  Otherwise
                //determine if user has done a term search and has the search results panel open.  

                if (this.saved_search.hasClass("saved-search-panel-full")) {

                    this.saved_search.addClass("saved-search-panel-hidden");
                    this.saved_search.removeClass("saved-search-panel-full");

                    this.map_panel.removeClass("map-panel-hidden");
                    this.map_panel.addClass("map-panel-full");

                    //hide results panel
                    this.search_panel.removeClass("sliding-panel-full");

                    //Show sliding panel control so that user can access "default" (e.g.: first page of all results)
                    //Force icon to "show panel" position
                    this.search_panel_control.removeClass("sliding-panel-control-hidden");
                    this.panel_control_icon.addClass("fa-step-forward");
                    this.panel_control_icon.removeClass("fa-step-backward");


                    this.return_to = 'saved-search';
                
                } else if (this.search_panel.hasClass("sliding-panel-full")) {

                    //Show Partial Map Panel
                    this.map_panel.removeClass("map-panel-hidden");
                    this.map_panel.addClass("map-panel-partial");


                    //Show partial search results panel
                    this.search_panel.removeClass("sliding-panel-full");
                    this.search_panel.addClass("sliding-panel-partial");
                    this.search_panel_container.removeClass("container");

                    //make sliding panel control visible
                    this.search_panel_control.removeClass("sliding-panel-control-hidden");

                    //Update position of sliding panel tools
                    this.results_counter.addClass("results-counter-shim");
                    this.time_filter_toggle.addClass("date-filter-header-shim");
                    this.search_panel_tools.addClass("sliding-panel-tools-shim");

                    this.return_to = 'search-results';

                }


                //Update Button Group Display
                $("#show-map").removeClass("btn-default");
                $("#show-map").addClass("btn-u-light-green");

                $("#show-list").addClass("btn-default");
                $("#show-list").removeClass("btn-u-light-green");
            },

            handleShowList: function() {  

                //Before showing map, determine whether saved search is still visible.  If so, then close and show full map.  Otherwise
                //determine if user has done a term search and has the search results panel open.  

                if (this.return_to == 'saved-search') {

                    this.saved_search.removeClass("saved-search-panel-hidden");
                    this.saved_search.addClass("saved-search-panel-full");

                    this.map_panel.addClass("map-panel-hidden");
                    this.map_panel.removeClass("map-panel-full");

                    //hide results panel
                    this.search_panel.removeClass("sliding-panel-full");

                    //Show sliding panel control so that user can access "default" (e.g.: first page of all results)
                    //Force icon to "show panel" position
                    this.search_panel_control.addClass("sliding-panel-control-hidden");

                
                } else if (this.search_panel.hasClass("sliding-panel-partial")) {

                    //Show Partial Map Panel
                    this.map_panel.addClass("map-panel-hidden");
                    this.map_panel.removeClass("map-panel-partial");
                    this.map_panel.removeClass("map-panel-full");


                    //Show search results panel
                    this.search_panel.addClass("sliding-panel-full");
                    this.search_panel.removeClass("sliding-panel-partial");
                    this.search_panel_container.addClass("container");

                    //hide sliding panel control
                    this.search_panel_control.addClass("sliding-panel-control-hidden");

                    //Update position of sliding panel tools
                    this.results_counter.removeClass("results-counter-shim");
                    this.time_filter_toggle.removeClass("date-filter-header-shim");
                    this.search_panel_tools.removeClass("sliding-panel-tools-shim");

                }


                //Update Button Group Display
                $("#show-map").addClass("btn-default");
                $("#show-map").removeClass("btn-u-light-green");

                $("#show-list").removeClass("btn-default");
                $("#show-list").addClass("btn-u-light-green");
            },

            handleClearSearch: function() {  
                //If search panel takes up full screen, hide the panel, remove the container (to properly center the search items),
                //and hide the panel control
                if (this.search_panel.hasClass("sliding-panel-full")) {

                    this.search_panel.removeClass("sliding-panel-full");
                    this.search_panel_container.removeClass("container");
                    this.search_panel_control.addClass("sliding-panel-control-hidden");

                }

                if (this.search_panel.hasClass("sliding-panel-partial")) {

                    this.search_panel.removeClass("sliding-panel-partial");
                    this.search_panel_control.addClass("sliding-panel-control-hidden");

                    //Update position of sliding panel tools
                    this.results_counter.removeClass("results-counter-shim");
                    this.time_filter_toggle.removeClass("date-filter-header-shim");
                    this.search_panel_tools.removeClass("sliding-panel-tools-shim");

                    //make sure map panel is hidden and href is toggled back to "show"
                    this.map_panel.removeClass("map-panel-partial");
                    this.map_panel.addClass("map-panel-hidden");

                    $("#map-toggle-state").text("show");
                    $("#map-toggle-state").removeClass("arches-small-text-shim");


                    //make sure graph panel is hidden
                    this.graph_panel.removeClass("graph-panel-partial");
                    this.graph_panel.addClass("graph-panel-hidden");

                }

                this.saved_search.removeClass("saved-search-panel-hidden");
                this.saved_search.addClass("saved-search-panel-full");

                //clear terms in search box
                $(".search-widget").select2("val", "");

                //Update Button Group Display
                $("#show-map").addClass("btn-default");
                $("#show-map").removeClass("btn-u-light-green");

                $("#show-list").removeClass("btn-default");
                $("#show-list").addClass("btn-u-light-green");
            },

            // showSavedSearches: function(){
            //     this.clear();
            //     $('#saved-searches').slideDown('slow');
            //     $('#search-results').slideUp('slow');
            //     this.mapFilter.expanded(false);
            //     this.timeFilter.expanded(false);
            // },

            // hideSavedSearches: function(){
            //     $('#saved-searches').slideUp('slow');
            //     $('#search-results').slideDown('slow');
            // },

            // toggleMapFilter: function(){
            //     if($('#saved-searches').is(":visible")){
            //         this.doQuery();
            //         this.hideSavedSearches();
            //     }
            //     this.mapFilter.expanded(!this.mapFilter.expanded());
            //     window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            // },

            // toggleTimeFilter: function(){
            //     if($('#saved-searches').is(":visible")){
            //         this.doQuery();
            //         this.hideSavedSearches();
            //     }
            //     this.timeFilter.expanded(!this.timeFilter.expanded());
            //     window.history.pushState({}, '', '?'+this.searchQuery.queryString());
            // },

            getSearchQuery: function(){
                var doQuery = false;
                var query = _.chain(decodeURIComponent(location.search).slice(1).split('&') )
                    // Split each array item into [key, value]
                    // ignore empty string if search is empty
                    .map(function(item) { if (item) return item.split('='); })
                    // Remove undefined in the case the search is empty
                    .compact()
                    // Turn [key, value] arrays into object parameters
                    .object()
                    // Return the value of the chain operation
                    .value();

                if('page' in query){
                    query.page = JSON.parse(query.page);
                    doQuery = true;
                }
                this.searchResults.restoreState(query.page);


                if('termFilter' in query){
                    query.termFilter = JSON.parse(query.termFilter);
                    doQuery = true;
                }
                this.termFilter.restoreState(query.termFilter);


                if('temporalFilter' in query){
                    query.temporalFilter = JSON.parse(query.temporalFilter);
                    doQuery = true;
                }
                // if('timeExpanded' in query){
                //     query.timeExpanded = JSON.parse(query.timeExpanded);
                //     doQuery = true;
                // }
                this.timeFilter.restoreState(query.temporalFilter);


                if('spatialFilter' in query){
                    query.spatialFilter = JSON.parse(query.spatialFilter);
                    doQuery = true;
                }
                if('mapExpanded' in query){
                    query.mapExpanded = JSON.parse(query.mapExpanded);
                    doQuery = true;
                }
                this.mapFilter.restoreState(query.spatialFilter, query.mapExpanded);
                

                if(doQuery){
                    this.doQuery();
                    //this.hideSavedSearches();
                    this.slideSearchPanel();
                }
                
            },

            clear: function(){
                this.mapFilter.clear();
                this.timeFilter.clear();
                this.termFilter.clear();
            },

            exportSearch: function(e) {
                var export_format = e.currentTarget.id,
                    _href = $("a.dataexport").attr("href"),
                    format = 'export=' + export_format,
                    params_with_page = this.searchQuery.queryString(),
                    page_number_regex = /page=[0-9]+/;
                    params = params_with_page.replace(page_number_regex, format);
                $("a.dataexport").attr("href", arches.urls.search_results_export + '?' + params);
            }
        });
        new SearchView();
    });
});