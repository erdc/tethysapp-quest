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
    search_select_interaction,
    table_select_interaction,
    SEARCH_LAYER_NAME = 'search-layer';


var get_map_extents = function(){
    var extent = map.getView().calculateExtent(map.getSize());
    var geographic_extent = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

    return geographic_extent;
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
    var params = {'collections': collection.name};
    var source_url = get_source_url(params);
    load_map_layer(collection.name, source_url, true, collection.metadata.color);
}

function remove_layer(layer_name){
    var layer = get_layer_by_name(layer_name);
    map.removeLayer(layer);
}

function update_collection_layer(collection){
//    var source = collection_layer.getSource();
//    source.addFeatures(features);
    remove_layer(collection.name);
    add_collection_layer(collection);
}

function remove_search_layer(){
    remove_layer(SEARCH_LAYER_NAME);
    map.removeInteraction(search_select_interaction);
//    search_select_interaction.getFeatures().clear();
}

function toggle_feature_selection_by_id(feature_id, collection_name, show)
{
  var collection_vector_layer = get_layer_by_name(collection_name);
  var feature = collection_vector_layer.getSource().getFeatureById(feature_id);

  if(show) {
    table_select_interaction.getFeatures().push(feature);
  }
  else {
    table_select_interaction.getFeatures().remove(feature);
  }
}

var load_map_layer = function(name, source_url, selectable, color, legend, callback){

    var layer_options = {'name': name};

    // create a vector source that loads a url that returns GeoJSON
    //TODO: NEED TO CHECK IF ANYTHING RETURNED
    var layer_source = new ol.source.Vector({
        url: source_url,
        format: new ol.format.GeoJSON(),
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

    if(selectable){
        search_select_interaction = new ol.interaction.Select({
            layers: [layer]
        });

        map.addInteraction(search_select_interaction);
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

//for(i=0, len=source_urls.length; i<len; i++){
//    var url = layer_source_urls[i];
//    load_map_layer(url);
//}


// Load Collection Layers
collections.forEach(add_collection_layer);
//for(var i=0, len=collections.length; i<len; i++){
//    var collection = collections[i];
//    add_collection_layer(collection);
//
//}



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

// a DragBox interaction used to select features by drawing boxes
var dragBox = new ol.interaction.DragBox({
  condition: ol.events.condition.shiftKeyOnly,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: [0, 0, 255, 1]
    })
  })
});

map.addInteraction(dragBox);

dragBox.on('boxend', function() {
  // features that intersect the box are added to the collection of
  // selected features, and their names are displayed in the "info"
  // div
  var extent = dragBox.getGeometry().getExtent();

  // Get the search layer
  var vector_layer = get_layer_by_name(SEARCH_LAYER_NAME);
  vector_layer.getSource().forEachFeatureIntersectingExtent(extent, function(feature) {
    search_select_interaction.getFeatures().push(feature);
  });
});


// a vector layer to render the source
var table_layer = new ol.layer.Vector({ source: new ol.source.Vector({})});

// add vector layer to the map
map.addLayer(table_layer);

table_select_interaction = new ol.interaction.Select({
    layers: [table_layer]
});

map.addInteraction(table_select_interaction);

// use the features Collection to detect when a feature is selected,
// the collection will emit the add event
var selected_table_features = table_select_interaction.getFeatures();
selected_table_features.on('add', function(event) {
  var feature = event.target.item(0);
  //$("tbody[data-collection_id='" + feature.get('collection') + "'] tr[data-feature_id='" + feature.get('name') + "']")
  //.addClass('selected');
});

// when a feature is removed, clear the photo-info div
selected_table_features.on('remove', function(event) {
  var feature = event.element;
  $("tbody[data-collection_id='" + feature.get('collection') + "'] tr[data-feature_id='" + feature.get('name') + "']")
  .removeClass('selected');
});

}); //end of script
