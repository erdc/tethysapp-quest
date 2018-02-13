$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

var map,
    search_layer,
    search_select_interaction,
    collection_layers,
    collection_select_interaction,
    SEARCH_LAYER_NAME = 'search-layer';

var get_map_extents = function(){
    var extent = map.getView().calculateExtent(map.getSize());
    var geographic_extent = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

    return geographic_extent;
}

function add_raster_layer (metadata, extents){
    var dataset = metadata['dataset']
    var url = get_raster_image_url + '?' + $.param(metadata);
    var raster = new ol.layer.Image({
      opacity: .25,
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

function get_layer_by_name(name){
    var layer;
    map.getLayers().forEach(function(lyr){
        if(name == lyr.get('name')){
                layer = lyr;
        }
    });
    return layer;
}

function add_collection_layer(collection){
    var params = {'uris': collection.name};
    var source_url = get_source_url(params);
    load_map_layer(collection.name, source_url, collection.metadata.color);
}

function remove_layer(layer_name){
    var layer = get_layer_by_name(layer_name);
    map.removeLayer(layer);
    //remove collection layer from list
    if (layer_name != SEARCH_LAYER_NAME)
    {
        delete collection_layers[layer_name]
    }
}

function update_collection_layer(collection){
//    var source = collection_layer.getSource();
//    source.addFeatures(features);
    remove_layer(collection.name);
    add_collection_layer(collection);
}

function deactivate_search_layer() {
    remove_layer(SEARCH_LAYER_NAME);
    map.removeInteraction(search_select_interaction);
//    search_select_interaction.getFeatures().clear();
}

function deactivate_collection_interaction() {
    map.removeInteraction(collection_select_interaction);
}

function activate_collection_interaction() {
    map.addInteraction(collection_select_interaction);
}

function toggle_feature_selection_by_id(feature_id, collection_name, show)
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

var load_map_layer = function(name, source_url, color, legend, callback) {
    var layer_options = {'name': name};

    var geoJSONFormat = new ol.format.GeoJSON();
    var layer_source = new ol.source.Vector({
        /*
        loader: function(extent, resolution, projection) {
            $.get(source_url, {'extent' : extent})
            .done(function(response) {
                if ('error' in response) {
                    console.log("Layer load error: " + response.error);
                    reset_search();
                }
                else if (response.features.length <= 0) {
                    console.log("No features found ...");
                    reset_search();
                }
                else {
                    var features = geoJSONFormat.readFeatures(response, {featureProjection: 'EPSG:3857'});
                    layer_source.addFeatures(features);
                    console.log(layer_source.getFeatures());
                    console.log("loaded features ...");
                }
            })
            .fail(function(){
                console.log("Layer load error ...");
                reset_search();
            });
        },
        */
        format: geoJSONFormat,
        url: source_url,
        projection: 'EPSG:3857',
    });

    layer_options.source = layer_source;

     var fill = new ol.style.Fill({
       color: 'rgba(255,255,255,0.4)'
     });
     var stroke = new ol.style.Stroke({
       color: '#3399CC',
       width: 5
     });
     var styles = [
       new ol.style.Style({
         image: new ol.style.Circle({
           fill: fill,
           stroke: stroke,
           radius: 8
         }),
         fill: fill,
         stroke: stroke
       })
     ];

    if(color){
        var fill_color = get_fill_color(color);
        var fill = new ol.style.Fill({
            color: fill_color
        });
        var stroke = new ol.style.Stroke({
            color: color,
            width: 3
        });
        var styles = [
            new ol.style.Style({
             image: new ol.style.Circle({
               fill: fill,
               stroke: stroke,
               radius: 5
             }),
             fill: fill,
             stroke: stroke
            })
        ];
    }

    layer_options.style = styles;

    // a vector layer to render the source
    var layer = new ol.layer.Vector(layer_options);

    // add vector layer to the map
    map.addLayer(layer);

    if(name == SEARCH_LAYER_NAME){
        search_select_interaction = new ol.interaction.Select({
            layers: [layer]
        });
        map.addInteraction(search_select_interaction);
        search_layer = layer;
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

// Code copied from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
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

function get_fill_color(color){
    var rgb = hexToRgb(color);
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.3)';
}

function get_source_url(params){
    var url = get_features_url + '?' + $.param(params);
    return url;
}

$(function() { //wait for page to load

map = TETHYS_MAP_VIEW.getMap();

collection_layers = {};
collection_select_interaction = new ol.interaction.Select();
map.addInteraction(collection_select_interaction);

//////////////////////////////////////////////
//
//      Selection Handling
//
//////////////////////////////////////////////

// use the features Collection to detect when a feature is selected,
// the collection will emit the add event
collection_select_interaction.getFeatures().on('add', function(event) {
  var feature = event.element;
  $("tbody[data-collection_id='" + feature.get('collection')  + "'] tr[data-feature_id='" + feature.get('name') + "']")
  .addClass('selected');
});

// when a feature is removed, clear the table selection
collection_select_interaction.getFeatures().on('remove', function(event) {
  var feature = event.element;
  $("tbody[data-collection_id='" + feature.get('collection') + "'] tr[data-feature_id='" + feature.get('name') + "']")
  .removeClass('selected');
});

// a DragBox interaction used to select features by drawing boxes
var drag_box = new ol.interaction.DragBox({
  condition: ol.events.condition.shiftKeyOnly,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: [0, 0, 255, 1]
    })
  })
});

map.addInteraction(drag_box);

function select_feature_if_not_selected(feature, selection_interaction){
    var selected_features = selection_interaction.getFeatures();
    if ($.inArray(feature, selected_features.getArray()) == -1)
    {
        selected_features.push(feature);
    }
}

drag_box.on('boxend', function() {
    // features that intersect the box are added to the collection of
    // selected features, and their names are displayed in the "info"
    // div
    var extent = drag_box.getGeometry().getExtent();

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
});

//////////////////////////////////////////////
//
//      Context Menu
//
//////////////////////////////////////////////

function get_menu_items(feature){
    var feature_id = feature.getId();
    if(feature_id.startsWith('svc')){
        return [{
            text: 'Add To Collection',
            callback: function(){
                //select feature
                select_feature_if_not_selected(feature, search_select_interaction);
                // open add to collection modal
                $('#add-to-collection-button').click();
            }
        }]
    }else if(feature_id.startsWith('f')){
        var datasets = datasets_by_feature[feature_id];
        var location_contextmenu_items = [
            {
                text: 'Location',
                classname: 'context-menu-title ol-ctx-menu-separator',
            },
            '-',
            {
              text: 'Add Data',
              callback: function(){
                add_data(feature_id);
              },
            },
            {
              text: 'Details',
              callback: function(){
                show_details(feature_id);
              },
            },
    //        '-', // this is a separator
            {
              text: 'Delete',
              callback: function(){
                    delete_feature(feature_id);
              }
            },
            {
                text: 'Datasets',
                classname: 'context-menu-title ol-ctx-menu-separator',
            },
            '-',
          ];

        datasets.forEach(function(dataset){
            location_contextmenu_items.push({
                text: dataset.name,
                items: get_dataset_context_menu_items(dataset),
            });
        });

        return location_contextmenu_items;
    };
}

// Bind events to controls
var map_context_menu = new ContextMenu({
    width: 300,
});

map.addControl(map_context_menu);

map_context_menu.on('beforeopen', function(evt){
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer){
    return feature;
  });

  if (feature) { // open only on features
    map_context_menu.enable();
    map_context_menu.clear();
    map_context_menu.extend(get_menu_items(feature));
  } else {
    map_context_menu.disable();
  }
});

map.getViewport().addEventListener('contextmenu', function (evt) {
    evt.preventDefault();
});

}); //end of script
