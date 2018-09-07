"use strict"; // And enable strict mode for this library

// mapping of datasets to their feature id
var datasets_by_feature = {};

/*******************************************************************************
 *
 *                        FUNCTIONS
 *
 *******************************************************************************/

function update_collection_status(collection_name, message){
  var collection_status = $('#' + collection_name + '-collection-status');
  collection_status.find('.collection-status-message').text(message);
  collection_status.show();
  return collection_status;
}

function add_features_to_collection(e){
  e.preventDefault();
  var url = $(this).attr('action');
  var data = $(this).serializeArray();
  var data_obj = object_from_array(data);
  var parameter = $('#parameter').val();
  var selected_features = QUEST_MAP.get_selected_features();
  var features = selected_features.getArray().map(function(feature){
      return feature.getId();
  });

  data.push({'name': 'features',
             'value': features},
            {'name': 'parameter',
             'value': parameter}
            );

  if(data_obj.new_collection_name){
    var placeholder = add_collection_placeholder(data_obj.new_collection_name);
    var collection_status = placeholder.find('.collection-status');
    collection_status.find('.collection-status-message').text('Adding ' + features.length + ' features...');
    collection_status.show();
  }
  else{
    var collection_name = data_obj.collection;
    var collection_status = update_collection_status(collection_name, 'Adding ' + features.length + ' features...');
  }

  // Reset page
  $('#add-to-collection-button').hide();
  $('#add-features-modal').modal('hide');
  $('#manage-tab').click();


  // Clear form fields
  $('#collection').select2({'placeholder': 'Select a collection'})
    .val('')
    .trigger('change');
  $('#new_collection_name').val('');
  $('#new_collection_description').val('');

  $.get(url, data)
  .done(function(result) {
      if(result.success){
          QUEST_MAP.deactivate_search_layer_interaction();
          update_datasets_by_feature(result.collection);
          QUEST_MAP.update_collection_layer(result.collection);

          if(result.collection_html)
          {
            //add new colleciton and assicated info
            update_collection_html(result);
          }
          else {
            // update details table
            update_details_table(result.collection.name, result.details_table_html);
          }
      }
      else{
        console.log('error');
        console.log(result);
      }

  })
  .fail(function() {
      console.log( "error" );
  })
  .always(function() {
    collection_status.hide();
  });
};

function initialize_datatable(selector)
{
  selector.DataTable({
        destroy: true,
        columnDefs: [
          { orderable: false, targets: $(selector[0]).find('thead').find('th').length - 1 }
        ],
        initComplete: function () {
            this.api().columns().every( function () {
                var column = this;
                if($(column.header()).text()!="Action")
                {
                  var select = $('<select class="form-control right"><option value=""></option></select>')
                      .on( 'change', function () {
                          var val = $.fn.dataTable.util.escapeRegex(
                              $(this).val()
                          );

                          // update the style of the filter icon
                          if(val == ''){
                            $(this).parent().removeClass('filtered')
                          }
                          else{
                            $(this).parent().addClass('filtered')
                          }

                          column
                              .search( val ? '^'+val+'$' : '', true, false )
                              .draw();
                      } );

                  $(column.header()).append(select);
                  select.select2({
                                  dropdownCssClass : 'bigdrop',
                                  containerCssClass: 'datatable-filters',
                                  width: '15px',
                                });
                  column.data().unique().sort().each( function ( d, j ) {
                      select.append( '<option value="'+d+'">'+d+'</option>' )
                  });
                  select.on('select2:open', function(){
                    setTimeout(function(){
                        $('.select2-results__option').first().html('All');
                    }, 10);
                  });
                }
            });
        }
  });

  //prevent select 2 click from calling the column sort
  $('#collection-details-container').find('.datatable-filters').on("click", function(event){
    event.stopPropagation();
  });
  // modify icon to be filter
  $('#collection-details-container').find('.datatable-filters')
                                    .find('.select2-selection__arrow')
                                    .replaceWith('<span class="glyphicon glyphicon-filter select2-selection__arrow" aria-hidden="true"></span>');
//  resize_table();

  //initilize popovers
  selector.find('[data-toggle="popover"]').popover();
}


function reload_collection_details_tabs(selector, collection_name){
    collection_name = collection_name || false;

    var active_tab = $('#collection-details-nav li.active');
    // remove active state so tab can be reset
    active_tab.removeClass('active');
    // activate all tabs
    $('#collection-details-nav li a').tab('show');

    if(collection_name) {
        //activate specific tab
        $('#collection-details-nav .' + collection_name + '-collection a').tab('show');
    }
    else if(active_tab.length) {
        // reactivate active tab
        active_tab.children('a').tab('show');
    }
    else{
        // activate the first tab
        $('#collection-details-nav li:first a').tab('show');
    }
    initialize_datatable(selector);
    resize_table();
}


function update_details_table(collection_name, html){
    html = html || false;

    if(html)
    {
      $('#collection-detail-' + collection_name).replaceWith(html);
    }
    reload_collection_details_tabs($('#collection-detail-' + collection_name)
                                   .find('.collection_detail_datatable'),
                                   collection_name);
    bind_context_menu();

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
            reset_plot(dataset_id);
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
                TETHYS_SELECT_INPUT.initSelectInput($('#options-content').find('.select2'));
            }
            else{
                update_details_table(result.collection_name, result.details_table_html);
                update_datasets_by_feature(result.collection);
            }
        }

    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function resize_plot() {
    var layout_plot_div = $("#plot-container");
    var plot_id = layout_plot_div.find('.plotly-graph-div').attr('id');
    if (typeof plot_id != 'undefined')
    {
        var resize_info =  {
                             width  : layout_plot_div.width(),
                             height : layout_plot_div.height()-20
                           };

        Plotly.relayout(plot_id, resize_info);
    }
}

function reset_plot(dataset_id)
{
    var plot_dataset_id = $('#plot-content').data('dataset_id');
    if (dataset_id == plot_dataset_id && plot_dataset_id != 'undefined')
    {
        //reset plot
        $('#plot-content').replaceWith('<div id="plot-content"></div>');
        $('#plot-content-placeholder').removeClass('hidden');
    }
}

function resize_table() {
    var layout_table_div = $("#collection-details-container");
    layout_table_div.find('.dataTables_scrollBody').height(layout_table_div.height()-185+"px");
    //https://datatables.net/forums/discussion/24424/column-header-element-is-not-sized-correctly-when-scrolly-is-set-in-the-table-setup
    $('.collection_detail_datatable').DataTable()
    .columns.adjust().draw();

}

function perform_dataset_action(event){
    var dataset_id = $(this).attr('data-dataset-id');
    var action_type = $(this).attr('data-action-type');

    if(action_type == 'export'){
        export_dataset(dataset_id);
    }
    else if(action_type == 'delete'){
        delete_dataset(dataset_id);
    }
    else{
        populate_options_form_for_dataset(dataset_id, action_type);
    }
}

function populate_options_form_for_dataset(dataset, button_type){
    change_status_to_loading(dataset);
    var data = {'dataset': dataset};
    var url = {retrieve: get_download_options_url,
               filter: get_filter_list_url,
               visualize: visualize_dataset_url,
               publish: get_publisher_list_url,
               }[button_type];

    $.get(url, data)
    .done(function(result) {
        if(result.success){
            var options = function(){
                if(result.html){
                    $('#options-content').html(result.html);
                    if(result.has_options){
                        $('#options-modal').modal('show');
                        change_status_to_complete(dataset);
                    }
                    else{
                        // submit the options form automatically if there are no options for the user to specify
                        $('#options-content .options-submit').click();
                    }

//                    TETHYS_SELECT_INPUT.initSelectInput($('#options-content').find('.select2'));
//                    setTimeout(function(){$('#options-content').find('.django-select2').djangoSelect2();}, 200);
                }
            };
            var visualize = function(){
               if(result.datatype == 'timeseries'){
                   show_plot_layout();
                   $('#plot-content-placeholder').addClass('hidden');
                   $('#plot-content').html('<h2 class="text-center"> Loading ... </h2>');
                   setTimeout(function(){
                       $('#plot-content').replaceWith(result.html);
                       resize_plot();
                   }, 100);

                   change_status_to_complete(dataset);

                   }
                else{
//                    console.log(result.file_extents);

                   QUEST_MAP.add_raster_layer(data, result.file_extents);


                    }

            };
            var func = {retrieve: options,
                        filter: options,
                        visualize: visualize,
                        publish: options,
                        }

             func[button_type]();

        }

    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function show_details(uri){
    var data = {'uri': uri};
    var url = show_details_url;

    $.get(url, data)
    .done(function(result) {
        if(result.success){
            show_details_layout();
            $('#details-content').html(result.html);
        }
    })
    .fail(function(result) {
        console.log( "error: " + result );
    })
    .always(function() {

    });
}

function change_status_to_loading(dataset_id){
    $('.dataset-action-btn-' + dataset_id).hide();
//    $('#retrieve-dataset-options-btn-' + dataset_id).hide();
//    $('#visualize-dataset-options-btn-' + dataset_id).hide();
//    $('#export-dataset-btn-' + dataset_id).hide();
    $('#loading-gif-' + dataset_id).show();
}


function change_status_from_loading(dataset_id, type){
    if(type === 'visualize'){
      $('#visualize-dataset-options-btn-' + dataset_id).show();
    }
    else{
      $('#retrieve-dataset-options-btn-' + dataset_id).show();
    }
    $('#loading-gif-' + dataset_id).hide();
}

function change_status_to_complete(dataset_id){
    $('.dataset-action-btn-' + dataset_id).show();
//    $('#retrieve-dataset-options-btn-' + dataset_id).show();
//    $('#visualize-dataset-options-btn-' + dataset_id).show();
//    $('#export-dataset-btn-' + dataset_id).show();
    $('#loading-gif-' + dataset_id).hide();
}

function custom_query_options(button_type){
    var len = $('#custom-query-table tr').length;

    var addRow = function(){

            //string to add row to table
            var rowStr = '<tr><td><input type="text" name="field"size="15"></td><td><input type="text" name="value" size="15"></td></tr>'

            $('#custom-query-table').append(rowStr);

                   }

    var deleteRow = function(){

        if($('#custom-query-table tr').length > 2)
             {
             $('#custom-query-table tr:last').remove();
             }
    }

    var func = {
                add: addRow,
                remove: deleteRow,
                        }

   func[button_type]();

//    $('#custom-query-table')

}

function submit_options(event){
    event.preventDefault();
    var form = $('#options-form');
    var url = form.attr('action');
    var data = form.serializeArray();
    var data_obj = object_from_array(data);
    $('#options-modal').modal('hide');

    var dataset_id = data_obj.dataset_id;

    change_status_to_loading(dataset_id);

    $.post(url, data)
    .done(function(result) {
        if(result.success){
            if(result.collection){
                update_details_table(result.collection_name, result.details_table_html);
                update_datasets_by_feature(result.collection);
            }
//            get_tasks();
        }
        else{
            console.log(result);
        }
    })
    .fail(function(result) {
        console.log( "error: " + result );
    })
    .always(function(result) {
        change_status_to_complete(dataset_id);
        if(result.messages){
            //display messages
            $('#messages').append(result.messages);
        }
    });
}

function export_dataset(dataset_id){
    var data = {'dataset': dataset_id};
    var url = export_dataset_url + '?' + $.param(data);
    window.location = url;
}

function update_datasets_by_feature(collection){
    collection.features.forEach(function(feature){
        datasets_by_feature[feature.name] = [];
    });
    collection.datasets.forEach(function(dataset){
        datasets_by_feature[dataset.feature].push(dataset);
    });
}

function update_collection_html(result){
  remove_collection_placeholder(result.collection.display_name);
  if(result.success){
      $('#table-placeholder').css('display', 'none');
      $('#collections-list').append(result.collection_html);
      // update collection select
      $('#collection').select2({data: [{id: result.collection.name, text: result.collection.display_name }],
                                placeholder: 'Select a collection',
                                })
        .val('')
        .trigger('change');
      $('#add-features-collection-select-div').css('display', 'block');
      // add details table
      $('#collection-details-nav').find('ul').append(result.details_table_tab_html);
      $('#collection-details-content').append(result.details_table_html);
      update_details_table(result.collection.name);
  }
}

function add_collection_placeholder(collection_name){
  var placeholder = $('#loading-gif-collections')
    .clone()
    .show()
    .attr('id', 'loading-gif-collections-' + collection_name.toLowerCase().replace(/ /g, '-'))
    .insertAfter('#loading-gif-collections');

  placeholder.children('h2').html(collection_name);

  return placeholder;
}

function remove_collection_placeholder(collection_name){
  $('#loading-gif-collections-' + collection_name.toLowerCase().replace(/ /g, '-')). detach();
}

function new_collection(event){
  event.preventDefault();
  $('#new-collection-modal').modal('hide');

  var url = $(this).attr('action');
  var data = $(this).serializeArray();
  var data_obj = object_from_array(data);

  var collection_name = data_obj.collection_name;

  add_collection_placeholder(collection_name);

  $.post(url, data)
  .done(function(result){
    update_collection_html(result);

  })
  .fail(function() {
      console.log( "error" );
  })
  .always(function() {
  });
}

function update_collection(collection){
  add_collection_placeholder(collection.display_name);
  $.get(get_collection_data_url, {'collection': collection.name})
    .done(function(result) {
      if(result.success){
        update_datasets_by_feature(result.collection);
        QUEST_MAP.add_collection_layer(result.collection);
        update_collection_html(result.html);
        // collections.push(result.collection);
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
    update_collection_status(collection_name, 'Deleting...');

    $.get(url)
    .done(function(result){
        if(result.success){
            $(collection_elements).remove();
            update_details_table(collection_name);
            // if there are no more collections display the placeholder div
            if(!$('#collection-details-nav').find('li').length){
                $('#table-placeholder').css('display', 'block');
            }
            QUEST_MAP.remove_layer(collection_name);
            // update collection select
            var collection_select = $('#collection')
            collection_select.find('option[value="' + collection_name + '"]').remove();
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
                    populate_options_form_for_dataset(dataset_id, 'retrieve');
                },
        }
    ];

    if(dataset.status === 'downloaded' || dataset.status === 'filter applied'){
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
            text: 'Details',
            callback: function(){
                    show_details(dataset_id);
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

function bind_context_menu(){
    $('#collection-details-container').find('td').contextMenu({
        menuSelector: '#details-context-menu',
    });

}

function reset_search() {
    QUEST_MAP.deactivate_search_layer_interaction();
    $('#search-button').show();
    $('#loading-gif-search').hide();
    $('#add-to-collection-button').hide();
}

function reset_service_tree(){
    $('.checkbox-tree input[type="checkbox"]').prop({
        checked: false,
        indeterminate: false,
        disabled: false,
    });
    $('.checkbox-tree .collapsible').each(function(){
        if(!$(this).hasClass('collapsed')){
            $(this).click();
        }
    });
}

function object_from_array(a){
  var o = {};
   $.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
           }
           o[this.name].push(this.value || '');
       } else {
           o[this.name] = this.value || '';
       }
   });
   return o;
}


/*******************************************************************************
 *
 *                        PAGE LOAD
 *
 *******************************************************************************/

$(function() { //wait for page to load

  //load collections
  $.get(get_collections_url)
    .done(function(result) {
      if(result.success){
        result.collections.forEach(update_collection);
      }
      else{
        console.log('error');
        console.log(result);
      }

    })
    .fail(function() {
      console.log( "error" );
    })
    .always(function() {
      $('#loading-gif-collections').hide();
    });

  $('#add-to-collection-button').click(function(e){
      var selected_features = QUEST_MAP.get_selected_features();
      $('#number-of-selected-features').text(selected_features.getArray().length + ' features are selected.');

  });

  $('#search-form').submit(function(e){
      e.preventDefault();
      show_map_layout();
      QUEST_MAP.deactivate_search_layer_interaction();
      $('#search-button').hide();
      $('#loading-gif-search').show();
      $('#add-to-collection-button').hide();

      var data = $(this).serializeArray();

      setTimeout(function(){  // allow map time to load if it wasn't already showing
        QUEST_MAP.add_search_layer(data, function(){
            show_map_layout();
            $('#search-button').show();
            $('#loading-gif-search').hide();
            $('#add-to-collection-button').show();
        });
      }, 100);
  });

  $('#add-features-form').submit(add_features_to_collection);

  //cleanup modals on close
  $('#new-collection-modal').on('hidden.bs.modal', function () {
      var modal = $(this);
      modal.find('#collection_name').val("");
      modal.find('#description').val("");
  });

  $('#new-collection-modal').on('shown.bs.modal', function () {
      var modal = $(this);
      modal.find('#collection_name').focus();
  });

  $('#new-features-modal').on('hidden.bs.modal', function () {
      var modal = $(this);
      modal.find('#new_collection_name').val("");
      modal.find('#new_collection_description').val("");
  });

  // Tabs
  $('#manage-tab').click(function(e){
      reset_search();
      // activate collection interaction
      QUEST_MAP.activate_collection_interaction();
  });

  $('#search-tab').click(function(e){
      // deactivate collection interaction
      show_map_layout();
      QUEST_MAP.deactivate_collection_interaction();
  });

  /*******************************************************************************
   *
   *                        BUTTON HANDLERS
   *
   *******************************************************************************/

  // Retrieve/Visualize/Filter/Export/Publish Action Buttons
  $('#collection-details-content').on('click', '.dataset-action', perform_dataset_action);

  // Options Form Submit Button
  $('#options-content').on('click', '.options-submit', submit_options);

  // New Collection Button
  $('#new-collection-form').on('submit', new_collection);

  // Delete Collection Link
  $('#collections-list').on('click', '.delete-collection', delete_collection);

  // Show Collection Details
  $('#collections-list').on('click', '.collection-details-menu-item', function(){
      var collection_name = $(this).data('collection-name');
      $('#collection-details-nav li.' + collection_name + '-collection a').click();
      show_table_layout();
  });

  // Toggle Collection Visibility
  $('#collections-list').on('click', '.collection-visibility-menu-item, .collection-visibility-checkbox', function(){
    var collection_name = $(this).data('collection-name');
    var menu_item = $(this).parents(".collection").find(".collection-visibility-menu-item");
    var check_box = $(this).parents(".collection").find(".collection-visibility-checkbox");
    var is_visible = menu_item.html() == "Hide";

    var is_visible1 = is_visible ? "Show" : "Hide";
    menu_item.html(is_visible1);
    check_box.prop('checked',!is_visible);


    QUEST_MAP.set_layer_visibility(collection_name, !is_visible);
  });

  //Add/delete row to custom query
  $('#add-custom-row-button').on('click', function(){custom_query_options('add')});
  $('#delete-custom-row-button').on('click', function(){custom_query_options('remove')});

  bind_context_menu();

  reload_collection_details_tabs($('.collection_detail_datatable'));

  // adjust DataTable headers on tab change
  $('#collection-details-nav').on('shown.bs.tab', 'a[data-toggle="tab"]',function(e) {
    var shown_tab_id = $(e.target).attr("href");
    //https://datatables.net/forums/discussion/24424/column-header-element-is-not-sized-correctly-when-scrolly-is-set-in-the-table-setup
    $(shown_tab_id).find('.collection_detail_datatable').DataTable()
    .columns.adjust().draw();
  });

  // collection detail table selection
  $('#collection-details-content').on('click', 'td:not(.status)', function(){
     var row = $(this).parent();
     row.toggleClass('selected');

     var feature_id = row.data('feature_id');
     var collection_name = row.parent().data('collection_id');

     QUEST_MAP.toggle_feature_selection_by_id(feature_id, collection_name, row.hasClass('selected'));
  });

  $('#collections-list').on('click', '.collection-color', function(event){
    var that = this;
    var change_color_timeout;
    var color_picker = $(this).parent().find('input[type=color]');
    color_picker.on('input', function(event){
        if(change_color_timeout){
            clearTimeout(change_color_timeout);
        }
        var color = event.target.value;
        $(that).css('background-color', color);

        change_color_timeout = setTimeout(function(){
            var collection_name = $(that).data('collection-name');
            var data = {
                'collection_name': collection_name,
                'color': color,
            }
            $.post(update_collection_url, data)
            .done(function(result) {
                $(that).css('background-color', result.color);
                $('li.' + collection_name + '-collection').find('a').css('background-color', result.color);
                QUEST_MAP.update_collection_layer_color(collection_name, result.color);
            });
        }, 1000);
    });
    color_picker.click();
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

  // undo app_base.js themeing
  $('#app-navigation .nav li a').removeAttr("style");


  // automate services enabled based on parameter selection
  $('#parameter').change(function(e){
      //clear map search layer & hide add to collection button
      reset_search();
      reset_service_tree();
      //update data services tree
      var selected_value = $('#parameter').val();
      for(var i=0, len=services.length; i<len; i++){
          var service = services[i];
          var service_checkbox = $('input[value="' + service.name + '"]');
          var parent_control = $(service_checkbox).parents().eq(4).find('.collapsible');
          if($.inArray(selected_value, service.parameters) > -1){
              $(service_checkbox).prop('disabled', false).change();
//              $(service_checkbox).prop('checked', true).change();

              // expand providers that contain services with the selected parameter
              if (parent_control.hasClass('collapsed')){
                parent_control.click();
              }
          }
          else{
              // disable services that don't provide the selected parameter
//              $(service_checkbox).prop('checked', false).change();
              $(service_checkbox).prop('disabled', true).change();
          };
      };
      //expand services tab
      if(!$('#collapse-services').hasClass('in')){
        $('#collapse-services-btn').click();
      }
  });

  // activate search button only when service is selected
  // TODO: button stays active when provider level checkbox is unchecked
  $('input[name="services"]').change(function(){
        var checked = false;
        $('input[name="services"]').each(function(){
            if(this.checked){
                checked = true;
            }
        });
        $('#search-button').attr('disabled', !checked);
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
        disabled = $(this).prop("disabled"),
        container = $(this).parent().parent().parent();

    // set all child elements checked property to be the same as the parent
    container.find('input[type="checkbox"]').prop({
      indeterminate: false,
      checked: checked,  // TODO don't check children if they are disabled.
      disabled: disabled
    });

    // set indeterminate state for parents if necessary
    function checkSiblings(el) {

      var parent = el.parent().parent(),
          all = true,
          all_disabled = true;

      el.siblings().each(function() {
        return all = ($(this).children('div').children('label').children('input[type="checkbox"]').prop("checked") === checked);
      });

      el.siblings().each(function() {
        return all_disabled = ($(this).children('div').children('label').children('input[type="checkbox"]').prop("disabled") === disabled);
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

      if (all_disabled && disabled) {
        parent.children('div').children('label').children('input[type="checkbox"]').prop({
          disabled: disabled,
        });

      } else if (all_disabled && !disabled) {

        parent.children('div').children('label').children('input[type="checkbox"]').prop("disabled", disabled);
//        parent.children('div').children('label').children('input[type="checkbox"]').prop("indeterminate", (parent.find('input[type="checkbox"]:checked').length > 0));
      }

    }

    checkSiblings(container);
  });


}); //wait for page to load

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
    var dataset_id = target.parent().data('dataset_id');
    var download_status = target.parent().children('td').last().prev().text();
    var dataset = {name: dataset_id,
               status: download_status,
               }
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