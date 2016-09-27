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

var load_map_layer = function(name, source_url, selectable, color, legend){

    var layer_options = {'name': name};

    // create a vector source that loads a url that returns GeoJSON
    var layer_source = new ol.source.Vector({
        url: source_url,
        format: new ol.format.GeoJSON(),
        projection: 'EPSG:3857',
    });

    layer_options.source = layer_source;

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

        layer_options.style = styles;
    }

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

// map context menu
function get_dataset_context_menu_items(dataset){

    var dataset_id = dataset.name;

    var dataset_contextmenu_items = [];

    if(dataset.download_status != 'downloaded'){
        dataset_contextmenu_items.push(
            {
                text: 'Download',
                callback: function(){
                        populate_options_form_for_dataset(dataset_id, 'download');
                    },
            }
        )
    }
    if(dataset.download_status == 'downloaded'){
        dataset_contextmenu_items.push(
            {
                text: 'Visualize',
                callback: function(){
                        populate_options_form_for_dataset(dataset_id, 'visualize');
                    },
            },
            {
                text: 'Apply Filter',
                callback: function(){
                        populate_options_form_for_dataset(dataset_id, 'filter');
                    },
            }
        )
    }
    dataset_contextmenu_items.push(
        {
            text: 'Show Metadata',
            callback: function(){
                    show_metadata(dataset_id);
                },
        },
        {
            text: 'Delete',
            callback: function(){
                    delete_dataset(dataset_id);
                },
        }
    );

    return dataset_contextmenu_items;
}

function get_menu_items(feature){
    var feature_id = feature.id_;
    var datasets = datasets_by_feature[feature_id];
    var location_contextmenu_items = [
        {
            text: 'Location',
            classname: 'context-menu-title ol-ctx-menu-separator',
        },
        '-',
        {
          text: 'Show Metadata',
          callback: function(){
            show_metadata(feature_id);
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
}

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

$('#search-form').submit(function(e){
    e.preventDefault();
    remove_search_layer();
    var url = $(this).attr('action');
    var data = $(this).serializeArray();
    data.push({'name': 'bbox',
               'value': get_map_extents()});

    url = get_source_url(data);
    load_map_layer(SEARCH_LAYER_NAME, url, true);
});

$('#add-to-collection-button').click(function(e){
    var selected_features = search_select_interaction.getFeatures();
    $('#number-of-selected-features').text(selected_features.array_.length + ' features are selected.');

});

$('#add-features-form').submit(function(e){
    e.preventDefault();
    var url = $(this).attr('action');
    var data = $(this).serializeArray();
//    var collection_name = $(this).serializeObject().collection;
    var parameter = $('input[name="parameter"]:checked').val();
    var selected_features = search_select_interaction.getFeatures();
    var features = selected_features.array_.map(function(feature){
        return feature.id_;
    });

    data.push({'name': 'features',
               'value': features},
              {'name': 'parameter',
               'value': parameter}
              );

    $.get(url, data, function(result){
        if(result.success){
            remove_search_layer();
            update_datasets_by_feature(result.collection);
            update_collection_layer(result.collection);

            // update details table
            update_details_table(result.collection.name, result.details_table_html);

        }
    })
    .done(function() {
        $('#add-features-modal').modal('hide');
        $('#manage-tab').click()
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
});


// Tabs
$('#manage-tab').click(function(e){
    remove_search_layer();
});

}); //end of script