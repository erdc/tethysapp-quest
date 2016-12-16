// mapping of datasets to their feature id
var datasets_by_feature = {};


function update_datasets_by_feature(collection){
    collection.features[1].forEach(function(feature){
        datasets_by_feature[feature.id] = [];
    });
    collection.datasets.forEach(function(dataset){
        datasets_by_feature[dataset.feature].push(dataset);
    });
}

collections.forEach(update_datasets_by_feature);

/*******************************************************************************
 *
 *                        FUNCTIONS
 *
 *******************************************************************************/

function reload_collection_details_tabs(select_index){
    var active_tab = $('#collection-details-nav li.active');
    // remove active state so tab can be reset
    active_tab.removeClass('active');
    // activate all tabs
    $('#collection-details-nav li a').tab('show');

    if(active_tab.length){
        // reactivate active tab
        active_tab.children('a').tab('show');
    }
    else{
        // activate the first tab
        $('#collection-details-nav li:first a').tab('show');
    }
}


function update_details_table(collection_name, html){
    $('#collection-detail-' + collection_name).replaceWith(html);
    $('#collection-detail-' + collection_name)
    .find('.collection_detail_datatable').DataTable();

    reload_collection_details_tabs();
    bind_context_menu();
    //https://datatables.net/forums/discussion/24424/column-header-element-is-not-sized-correctly-when-scrolly-is-set-in-the-table-setup
    $('#collection-detail-' + collection_name)
    .find('.collection_detail_datatable').DataTable()
    .columns.adjust().draw();
}

function delete_dataset(dataset_id){
    var url = delete_dataset_url;
    var csrftoken = getCookie('csrftoken');
    var data = {dataset: dataset_id,
                csrfmiddlewaretoken: csrftoken};

    $.post(url, data)
    .done(function(result) {
        if(result.success){
            update_details_table(result.collection.name, result.details_table_html);
            update_datasets_by_feature(result.collection);
        }
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function delete_feature(feature_id){
    var url = delete_feature_url;
    var csrftoken = getCookie('csrftoken');
    var data = {feature: feature_id,
                csrfmiddlewaretoken: csrftoken};

    $.post(url, data)
    .done(function(result) {
        if(result.success){
            // delete feature on map
            var layer = get_layer_by_name(result.collection.name);
            layer.getSource().removeFeature(layer.getSource().getFeatureById(feature_id));

            // update details table
            update_details_table(result.collection.name, result.details_table_html);
            update_datasets_by_feature(result.collection);
        }
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function add_data(feature_id){
    var url = add_data_url;
    var csrftoken = getCookie('csrftoken');
    var data = {feature: feature_id,
                csrfmiddlewaretoken: csrftoken};

    $.post(url, data)
    .done(function(result) {
        if(result.success){
            if(result.html){
                $('#options-content').html(result.html);
                $('#options-modal').modal('show');
                $('#options-content').find('.select2').select2();
            }
            else{
                update_details_table(result.collection_name, result.details_table_html);
            }
        }

    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function get_dataset_id_from_details_table_row(row){
    var dataset_id = row.children('td').first().text();
    return dataset_id;
}

function resize_plot() {
    var layout_plot_div = $("#plot-container");
    var plot_id = layout_plot_div.find('.plotly-graph-div').attr('id');
    if (typeof plot_id != 'undefined')
    {
        var resize_info =  {
                             width  : layout_plot_div.width(),
                             height : layout_plot_div.height()
                           };

        Plotly.relayout(plot_id, resize_info);
    }
}

function resize_table() {
    var layout_table_div = $("#collection-details-container");
    layout_table_div.find('.dataTables_scrollBody').height(layout_table_div.height()-165+"px");
}

function populate_options_form(event){
    var dataset = $(this).attr('data-dataset-id');
    var type = $(this).attr('data-options-type');
    populate_options_form_for_dataset(dataset, type);
}

function populate_options_form_for_dataset(dataset, type){
    var data = {'dataset': dataset};
    var url = {retrieve: get_download_options_url,
               filter: get_filter_list_url,
               visualize: visualize_dataset_url,
               }[type];
//    $('#options-content').load(url, $.param(data), function(e){
//        $('.select2').select2();
//    });
    $.get(url, data)
    .done(function(result) {
        if(result.success){
            var options = function(){
                if(result.html){
                    $('#options-content').html(result.html);
                    $('#options-modal').modal('show');
                    $('#options-content').find('.select2').select2();
                }
                else{
                    update_details_table(result.collection_name, result.details_table_html);
                }
            };
            var visualize = function(){
               show_plot_layout();
               $('#plot-container').html('<h2 class="text-center"> Loading ... </h2>');
               setTimeout(function(){
                   $('#plot-container').html(result.html);
                   resize_plot();
               }, 100);

            };
            var func = {retrieve: options,
                        filter: options,
                        visualize: visualize,
                        }

             func[type]();

        }

    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function show_metadata(uri){
    var data = {'uri': uri};
    var url = show_metadata_url;

    $.get(url, data)
    .done(function(result) {
        if(result.success){
            show_metadata_layout();
            $('#metadata-content').html(result.html);
        }
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function change_status_to_loading(dataset_id){

    $('#retrieve-dataset-options-btn-' + dataset_id).hide();
    $('#visualize-dataset-options-btn-' + dataset_id).hide();
    $('#loading-gif-' + dataset_id).show();
}


function submit_options(event){
    event.preventDefault();
    var url = $('#options-form').attr('action');
    var data = $('#options-form').serializeArray();
    $('#options-modal').modal('hide');

    var dataset_id;
    data.forEach(function(obj){
        if(obj.name == 'uri'){
            dataset_id = obj.value;
        }
    });

    change_status_to_loading(dataset_id);

    $.post(url, data)
    .done(function(result) {
        if(result.success){
            update_details_table(result.collection_name, result.details_table_html);
        }
        else{
            console.log(result);
        }
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function export_dataset(dataset_id){
var data = {'dataset': dataset_id};
    var url = export_dataset_url + '?' + $.param(data);
    window.location = url;
}

function add_collection_details(collection_name, collection_display_name, details_html){
    nav_html = '<li role="presentation" class="nav-tab ' + collection_name + '-collection"><a href="#collection-detail-' + collection_name + '" aria-controls="collection-detail-' + collection_name + '" role="tab" data-toggle="tab">' + collection_name + '</a></li>';
    $('#collection-details-nav').child('ul').append(nav_html);
    $('#collection-details-content').append(details_html);
}


function new_collection(event){
    event.preventDefault();
    var url = $(this).attr('action');
    var data = $(this).serializeArray();

    $.post(url, data)
    .done(function(result){
        if(result.success){
            $('#table-placeholder').css('display', 'none');
            $('#collections-list').append(result.collection_html);
            $('#new-collection-modal').modal('hide');
            // update collection select
            $('#collection').select2({data: [{id: result.collection.name, text: result.collection.display_name }]});
            $('#collection').trigger('change');
            // add details table
            $('#collection-details-nav ul').append(result.details_table_tab_html);
            $('#collection-details-content').append(result.details_table_html);
            reload_collection_details_tabs();
        }
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function delete_collection(event){
    event.preventDefault();
    var url = $(this).attr('href');
    var collection_name = $(this).attr('data-collection-name');
    var collection_elements = $('.' + collection_name + '-collection');

    $.get(url)
    .done(function(result){
        if(result.success){
            $(collection_elements).remove();
            reload_collection_details_tabs();
            // if there are no more collections display the placeholder div
            if(!$('#collection-details-nav li').length){
                $('#table-placeholder').css('display', 'block');
            }
            remove_layer(collection_name);
            // update collection select
            $('#collection option[value="' + collection_name + '"]').remove();
            $('#collection').select2('val', '');
            $('#collection').trigger('change');
        }
    });
}

// map context menu
function get_dataset_context_menu_items(dataset){

    var dataset_id = dataset.name;

    var dataset_contextmenu_items = [

        {
            text: 'Download',
            callback: function(){
                    populate_options_form_for_dataset(dataset_id, 'download');
                },
        }
    ];

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
            },
            {
                text: 'Export',
                callback: function(){
                    export_dataset(dataset_id);
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
    if(feature_id.startsWith('svc')){
        return [{
            text: 'Add To Collection',
            callback: function(){
                //select feature
                search_select_interaction.getFeatures().push(feature);
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
    };
}

function bind_context_menu(){
    $("#collection-details-container td").contextMenu({
        menuSelector: "#details-context-menu",
//        menuSelected: function (invokedOn, selectedMenu) {
//            var options = {'Retrieve': function(dataset_id){populate_options_form_for_dataset(dataset_id, 'retrieve');},
//                           'Apply Filter': function(dataset_id){populate_options_form_for_dataset(dataset_id, 'filter');},
//                           'Visualize': function(dataset_id){populate_options_form_for_dataset(dataset_id, 'visualize');},
//                           'Show Metadata': show_metadata,
//                           'Download': function(dataset_id){export_dataset(dataset_id);},
//                           'Delete': delete_dataset,
//                           }
//
//            var option = options[selectedMenu.text()];
//            var dataset_id = get_dataset_id_from_details_table_row(invokedOn.parent());
//            option(dataset_id);
//        }
    });
}


$('#add-to-collection-button').click(function(e){
    var selected_features = search_select_interaction.getFeatures();
    $('#number-of-selected-features').text(selected_features.array_.length + ' features are selected.');

});

$('#search-form').submit(function(e){
    e.preventDefault();
    remove_search_layer();
    $('#search-button').hide();
    $('#loading-gif-search').show();
    $('#add-to-collection-button').hide();

    var url = $(this).attr('action');
    var data = $(this).serializeArray();
    data.push({'name': 'bbox',
               'value': get_map_extents()});

    url = get_source_url(data);
    load_map_layer(SEARCH_LAYER_NAME, url, true, null, null, function(){
        $('#search-button').show();
        $('#loading-gif-search').hide();
        $('#add-to-collection-button').show();
    });


});

$('#add-features-form').submit(function(e){
    e.preventDefault();
    $('#add-to-collection-button').hide();
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

    $.get(url, data)
    .done(function(result) {
        if(result.success){
            remove_search_layer();
            update_datasets_by_feature(result.collection);
            update_collection_layer(result.collection);

            // update details table
            update_details_table(result.collection.name, result.details_table_html);

        }

        $('#add-features-modal').modal('hide');
        $('#manage-tab').click()
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
});

$('#new-collection-modal').on('hidden.bs.modal', function () {
    // reset form
    $(this).find('#collection_name').val('');
    $(this).find('#description').val('');
})

// Tabs
$('#manage-tab').click(function(e){
    remove_search_layer();
    $('#search-button').show();
    $('#loading-gif-search').hide();
    $('#add-to-collection-button').hide();

});


/*******************************************************************************
 *
 *                        BUTTON HANDLERS
 *
 *******************************************************************************/

$(function() { //wait for page to load

// Retrieve/Visualize Options Button
$('#collection-details-content').on('click', '.get-options', populate_options_form);

// Export Dataset Button
$('#collection-details-content').on('click', '.export-dataset', function(){export_dataset($(this).attr('data-dataset-id'))});

// Retrieve Button
$('#options-content').on('click', '.options-submit', submit_options);

// New Collection Button
$('#new-collection-form').on('submit', new_collection);

// Delete Collection Link
$('#collections-list').on('click', '.delete-collection', delete_collection);

// Show Collection Details
$('#collections-list').on('click', '.collection-details-menu-item', function(){
    var collection_name = $(this).attr('data-collection-name');
    $('#collection-details-nav li.' + collection_name + '-collection a').click();
    show_table_layout();
});



bind_context_menu();

reload_collection_details_tabs();

$('.collection_detail_datatable').DataTable();

});


/*******************************************************************************
 *
 *                        DYNAMIC STYLES
 *
 *******************************************************************************/

// Nav Active Style
//$('.nav-tab').click(function(){
//    $('.nav-tab').each(function(){
//        this.toggleClass('active');
//    });
//});

 // collection detail table selection
$('#collection-details-content td:not(.status)').click(function(e){
    $(this).parent().toggleClass('selected')
});

// automate service selection based on parameter selection
$('input[name="parameter"]').change(function(e){
    var selected_value = $('input[name="parameter"]:checked').val();
    for(i=0, len=services.length; i<len; i++){
        var service = services[i];
        var service_checkbox = $('input[value="' + service.name + '"]');
        if($.inArray(selected_value, service.parameters) > -1){
            $(service_checkbox).prop('disabled', false);
            $(service_checkbox).prop('checked', true).change();
        }
        else{
            $(service_checkbox).prop('checked', false).change();
            $(service_checkbox).prop('disabled', true);
        };
    };
});


/*******************************************************************************
 *
 *                        CHECKBOX TREE
 *
 *******************************************************************************/


// code adapted from https://css-tricks.com/indeterminate-checkboxes/
// checkbox tree processing
$('.checkbox-tree input[type="checkbox"]').change(function(e) {

  var checked = $(this).prop("checked"),
      container = $(this).parent().parent().parent();

  // set all child elements checked property to be the same as the parent
  container.find('input[type="checkbox"]').prop({
    indeterminate: false,
    checked: checked
  });

  // set indeterminate state for parents if necessary
  function checkSiblings(el) {

    var parent = el.parent().parent(),
        all = true;

    el.siblings().each(function() {
      return all = ($(this).children('div').children('label').children('input[type="checkbox"]').prop("checked") === checked);
    });

    if (all && checked) {

      parent.children('div').children('label').children('input[type="checkbox"]').prop({
        indeterminate: false,
        checked: checked
      });

      checkSiblings(parent);

    } else if (all && !checked) {

      parent.children('div').children('label').children('input[type="checkbox"]').prop("checked", checked);
      parent.children('div').children('label').children('input[type="checkbox"]').prop("indeterminate", (parent.find('input[type="checkbox"]:checked').length > 0));
      checkSiblings(parent);

    } else {

      el.parents("li").children('div').children('label').children('input[type="checkbox"]').prop({
        indeterminate: true,
        checked: false
      });

    }

  }

  checkSiblings(container);
});

/*****************************************************************************
 *
 * Cross Site Request Forgery Token Configuration
 *   copied from (https://docs.djangoproject.com/en/1.7/ref/contrib/csrf/)
 *
 *****************************************************************************/

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

var csrftoken = getCookie('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

/*******************************************************************************
 *
 *                        CONTEXT MENU
 *
 *******************************************************************************/

function get_contextmenu_items(target){
    var dataset_id = get_dataset_id_from_details_table_row(target.parent());
    var download_status = target.parent().children('td').last().prev().text();
    dataset = {name: dataset_id,
               download_status: download_status}
    return get_dataset_context_menu_items(dataset);
}

function html_from_options(options){
    var html = '';
    options.forEach(function(option){
        html += '\n<li><a tabindex="-1" href="#">' + option.text + '</a></li>'
    });

    return html;
}


//Context Menu code from: http://jsfiddle.net/kylemit/x9tgy/
$.fn.contextMenu = function (settings) {

    return this.each(function () {

        // Open context menu
        $(this).on("contextmenu", function (e) {
            // return native menu if pressing control
            if (e.ctrlKey) return;

            // Get menu options
            var options = get_contextmenu_items($(e.target));

            var callbacks = {};

            options.forEach(function(option){
                callbacks[option.text] = option.callback;
            });

            //open menu
            var $menu = $(settings.menuSelector)
                .data("invokedOn", $(e.target))
                .data("options", options)
                .html(html_from_options(options))
                .show()
                .css({
                    position: "absolute",
                    left: getMenuPosition(e.clientX - parseInt($('#app-content').css('padding-right')), 'width', 'scrollLeft'),
                    top: getMenuPosition(e.clientY, 'height', 'scrollTop')
                })
                .off('click')
                .on('click', 'a', function (e) {
                    $menu.hide();

                    var $invokedOn = $menu.data("invokedOn");
                    var $selectedMenu = $(e.target);
                    callbacks[$selectedMenu.text()]();
//                    settings.menuSelected.call(this, $invokedOn, $selectedMenu);
                });

            return false;
        });

        //make sure menu closes on any click
        $('body').click(function () {
            $(settings.menuSelector).hide();
        });
    });

    function getMenuPosition(mouse, direction, scrollDir) {
        var win = $(window)[direction](),
            scroll = $(window)[scrollDir](),
            menu = $(settings.menuSelector)[direction](),
            position = mouse + scroll;

        // opening menu would pass the side of the page
        if (mouse + menu > win && menu < mouse)
            position -= menu;

        return position;
    }

};
