
/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var QUEST_MAP = (function() {
  // Wrap the library in a package function
  "use strict"; // And enable strict mode for this library

  /************************************************************************
   *                      MODULE LEVEL / GLOBAL VARIABLES
   *************************************************************************/
    var public_interface,        // Object returned by the module
        map,
        SEARCH_LAYER_NAME,
        search_layer,
        collection_layers,
        search_select_interaction,
        collection_select_interaction,
        drag_box_interaction,                           // a DragBox interaction used to select features by drawing boxes
        active_interaction;

    // Private Functions
    var load_map_layer,
        add_collection_layer,
        add_search_layer,
        add_raster_layer,
        get_layer_by_name,
        remove_layer,
        update_collection_layer,
        update_collection_layer_color,
        activate_collection_interaction,
        deactivate_collection_interaction,
        activate_search_layer_interaction,
        deactivate_search_layer_interaction,
        toggle_feature_selection_by_id,
        select_feature_if_not_selected,
        get_selected_features,
        set_layer_visibility,

        //event functions
        select_table_element_for_feature,
        deselect_table_elements_for_feature,
        select_features_from_drag_box,

        // utilities
        get_map,
        get_map_extents,
        hexToRgb,
        get_fill_color,
        create_layer_styles,
        get_source_url,
        bind_event_listeners;



  /************************************************************************
   *                    PRIVATE FUNCTION DECLARATIONS
   *************************************************************************/
    // define private functions here.
    load_map_layer = function(name, source_url, color, legend, callback) {
        var layer_options = {'name': name};

        var geoJSONFormat = new ol.format.GeoJSON();
        var layer_source = new ol.source.Vector({
            format: geoJSONFormat,
            url: source_url,
            projection: 'EPSG:3857',
        });

        layer_options.source = layer_source;

        layer_options.style = create_layer_styles(color);

        // a vector layer to render the source
        var layer = new ol.layer.Vector(layer_options);

        // add vector layer to the map
        map.addLayer(layer);

        if(name == SEARCH_LAYER_NAME){
           activate_search_layer_interaction(layer);
        }
        else
        {
            collection_layers[name] = layer;
        }


        if(legend){
            layer.setProperties({'tethys_legend_title': source_url});
            TETHYS_MAP_VIEW.updateLegend();
        }

        var listenerKey = layer_source.on('change', function(e) {
            if (layer_source.getState() == 'ready') {
                if(callback){
                    callback();
                }
                // and unregister the "change" listener
                ol.Observable.unByKey(listenerKey);
                // or vectorSource.unByKey(listenerKey) if
                // you don't use the current master branch
                // of ol3
            }
        });
    }

    add_collection_layer = function(collection){
        var params = {'uris': collection.name};
        var source_url = get_source_url(params);
        load_map_layer(collection.name, source_url, collection.metadata.color);
    }

    add_search_layer = function(data, callback){
        data.push({'name': 'bbox',
                   'value': get_map_extents()});
        var url = get_source_url(data);
        load_map_layer(SEARCH_LAYER_NAME, url, null, null, callback);
    }

    add_raster_layer = function(metadata, extents){
        var dataset = metadata['dataset']
        var url = get_raster_image_url + '?' + $.param(metadata);
        var raster = new ol.layer.Image({
          opacity: .5,
          map: map,
          extent: extents,
          source: new ol.source.ImageStatic({
            url: url,
    //        imageSize: [width,height],
            imageExtent: extents,
          }),
         });

        change_status_to_complete(dataset);
    }

    get_layer_by_name = function(name){
        var layer;
        map.getLayers().forEach(function(lyr){
            if(name == lyr.get('name')){
                    layer = lyr;
            }
        });
        return layer;
    }

    remove_layer = function(layer_name){
        var layer = get_layer_by_name(layer_name);
        map.removeLayer(layer);
        //remove collection layer from list
        if (layer_name != SEARCH_LAYER_NAME)
        {
            delete collection_layers[layer_name]
        }
    }

    update_collection_layer = function(collection){
    //    var source = collection_layer.getSource();
    //    source.addFeatures(features);
        remove_layer(collection.name);
        add_collection_layer(collection);
    }

    update_collection_layer_color = function(collection_name, color){
        var layer = get_layer_by_name(collection_name);
        if(layer){
            layer.setStyle(create_layer_styles(color));
        }

    }

    activate_collection_interaction = function() {
        map.addInteraction(collection_select_interaction);
        active_interaction = collection_select_interaction;
    }

    deactivate_collection_interaction = function() {
        map.removeInteraction(collection_select_interaction);
        active_interaction = null;
    }

    activate_search_layer_interaction = function(layer) {
        search_select_interaction = new ol.interaction.Select({
            layers: [layer]
        });
        map.addInteraction(search_select_interaction);
        active_interaction = search_select_interaction;
        search_layer = layer;
    }

    deactivate_search_layer_interaction = function() {
        remove_layer(SEARCH_LAYER_NAME);
        map.removeInteraction(search_select_interaction);
        active_interaction = null;
    //    search_select_interaction.getFeatures().clear();
    }

    toggle_feature_selection_by_id = function(feature_id, collection_name, show)
    {
      var collection_vector_layer = get_layer_by_name(collection_name);
      var feature = collection_vector_layer.getSource().getFeatureById(feature_id);

      if(show) {
        collection_select_interaction.getFeatures().push(feature);
      }
      else {
        collection_select_interaction.getFeatures().remove(feature);
      }
    }

    select_feature_if_not_selected = function(feature){
        if(active_interaction){
            var selected_features = active_interaction.getFeatures();
            if ($.inArray(feature, selected_features.getArray()) == -1){
                selected_features.push(feature);
            }
        }
    }

    get_selected_features = function(){
        var features;

        if(active_interaction){
           features = active_interaction.getFeatures();
        }
        return features;
    }

    set_layer_visibility = function(layer_name,is_visible){
        var layer = get_layer_by_name(layer_name);
        layer.setVisible(is_visible);

        if(active_interaction){
           //todo: unselect feature for the layer that's turned off
        }
    }

    select_table_element_for_feature = function(event) {
      var feature = event.element;
      $("tbody[data-collection_id='" + feature.get('collection')  + "'] tr[data-feature_id='" + feature.get('name') + "']")
      .addClass('selected');
    }

    deselect_table_elements_for_feature = function(event) {
      var feature = event.element;
      $("tbody[data-collection_id='" + feature.get('collection') + "'] tr[data-feature_id='" + feature.get('name') + "']")
      .removeClass('selected');
    }

    select_features_from_drag_box = function(event) {
        // features that intersect the box are added to the collection of
        // selected features, and their names are displayed in the "info"
        // div
        var extent = drag_box_interaction.getGeometry().getExtent();

        if ($('#manage-tab').parent().hasClass('active')) {
            $.each(collection_layers, function(layer_name, collection_layer) {
                // Add the selected features to collection layer
                collection_layer.getSource().forEachFeatureIntersectingExtent(extent, function(feature) {
                    select_feature_if_not_selected(feature, collection_select_interaction);
                });
            });
        }
        else {
            if(typeof search_layer != 'undefined')
            {
              // Add the selected features to search layer
              search_layer.getSource().forEachFeatureIntersectingExtent(extent, function(feature) {
                  select_feature_if_not_selected(feature, search_select_interaction);
              });
            }
        }
    }

    get_map = function(){
        return map;
    }

    get_map_extents = function(){
        var extent = map.getView().calculateExtent(map.getSize());
        var geographic_extent = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

        return geographic_extent;
     }

    // Code copied from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    hexToRgb = function(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    get_fill_color = function(color){
        var rgb = hexToRgb(color);
        return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.3)';
    }

    create_layer_styles = function(color){
        var fill_color = 'rgba(255,255,255,0.4)',
            stroke_color = '#3399CC',
            stroke_width = 5,
            point_radius = 8;

        if(color){
            fill_color = get_fill_color(color);
            stroke_color = color;
            stroke_width = 3,
            point_radius = 5;
        }

        var fill = new ol.style.Fill({
           color: fill_color
        });
        var stroke = new ol.style.Stroke({
           color: stroke_color,
           width: stroke_width
        });
        var styles = [
           new ol.style.Style({
             image: new ol.style.Circle({
               fill: fill,
               stroke: stroke,
               radius: point_radius
             }),
             fill: fill,
             stroke: stroke
           })
        ];

        return styles;
    }

    get_source_url = function(params){
        var url = get_features_url + '?' + $.param(params);
        return url;
    }

    bind_event_listeners = function(){
        map.addInteraction(collection_select_interaction);
        map.addInteraction(drag_box_interaction);

        // use the features Collection to detect when a feature is selected,
        // the collection will emit the add event
        collection_select_interaction.getFeatures().on('add', select_table_element_for_feature);

        // when a feature is removed, clear the table selection
        collection_select_interaction.getFeatures().on('remove', deselect_table_elements_for_feature);

        // select active layer features when drag box is drawn
        drag_box_interaction.on('boxend', select_features_from_drag_box);
    }

  /************************************************************************
   *                            TOP LEVEL CODE
   *************************************************************************/
  /*
   * Library object that contains public facing functions of the package.
   */

   public_interface = {
      // mapping of public function name to function declaration
      get_map: get_map,
      add_collection_layer: add_collection_layer,
      add_search_layer: add_search_layer,
      add_raster_layer: add_raster_layer,
      remove_layer: remove_layer,
      update_collection_layer: update_collection_layer,
      update_collection_layer_color: update_collection_layer_color,
      get_selected_features: get_selected_features,
      activate_collection_interaction: activate_collection_interaction,
      deactivate_collection_interaction: deactivate_collection_interaction,
      activate_search_layer_interaction: activate_search_layer_interaction,
      deactivate_search_layer_interaction: deactivate_search_layer_interaction,
      select_feature: select_feature_if_not_selected,
      toggle_feature_selection_by_id: toggle_feature_selection_by_id,
      set_layer_visibility: set_layer_visibility,
    };

  // Initialization: jQuery function that gets called when
  // the DOM tree finishes loading
  $(function() {

    // Initialize globals
    map = TETHYS_MAP_VIEW.getMap();
    SEARCH_LAYER_NAME = 'search-layer';
    search_layer = null;
    search_select_interaction = null;
    collection_layers = {};
    collection_select_interaction = new ol.interaction.Select(),
    active_interaction = collection_select_interaction;

    drag_box_interaction = new ol.interaction.DragBox({
      condition: ol.events.condition.shiftKeyOnly,
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: [0, 0, 255, 1]
        })
      })
    });

    // Other initialization code
    bind_event_listeners();
  });

  return public_interface;

}()); // End of package wrapper

/*****************************************************************************
 *                      Public Functions
 *****************************************************************************/

// define public functions here (wrap library object functions if necessary)
