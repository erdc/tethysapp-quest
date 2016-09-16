// mapping of datasets to their feature id
var datasets_by_feature = {};


function update_datasets_by_feature(collection){
    collection.features[1].forEach(function(feature){
        datasets_by_feature[feature.id] = [];
    });
    collection.datasets.forEach(function(dataset){
        datasets_by_feature[dataset.feature].push(dataset.name);
    });
}

collections.forEach(update_datasets_by_feature);

/*******************************************************************************
 *
 *                        FUNCTIONS
 *
 *******************************************************************************/

function reload_collection_details_tabs(){
    // hack to get new details table to show
    // TODO doesn't work when there is only one collection
    var active_tab = $('#collection-details-nav li.active');
    $('#collection-details-nav li a').tab('show')
    active_tab.tab('show');
    if(active_tab.length == 0){
        $('#collection-details-nav li.active').removeClass('active');
    }
    if($('#collection-details-nav li a').length == 1){
        // do something to get it to refresh.
    }
}


function update_details_table(collection_name, html){
    $('#collection-detail-' + collection_name).replaceWith(html);
    reload_collection_details_tabs();
    bind_context_menu();
}

function delete_dataset(dataset_id){
    var url = delete_dataset_url;
    var csrftoken = getCookie('csrftoken');
    var data = {dataset: dataset_id,
                csrfmiddlewaretoken: csrftoken};

    $.post(url, data, function(result){
        if(result.success){
            update_details_table(result.collection_name, result.details_table_html);
        }
    })
    .done(function() {

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

function populate_options_form(event){
    var dataset = $(this).attr('data-dataset-id');
    var type = $(this).attr('data-options-type');
    populate_options_form_for_dataset(dataset, type);
}

function populate_options_form_for_dataset(dataset, type){
    var data = {'dataset': dataset};
    var url = {download: get_download_options_url,
               filter: get_filter_options_url,
               visualize: visualize_dataset_url,
               }[type];
//    $('#options-content').load(url, $.param(data), function(e){
//        $('.select2').select2();
//    });
    $.get(url, data, function(result){
        if(result.success){
            var options = function(){
                if(result.html){
                    $('#options-content').html(result.html);
                    $('#options-modal').modal('show');
                }
                else{
                    update_details_table(result.collection_name, result.details_table_html);
                }
            };
            var visualize = function(){
               $('#visualize-modal').modal('show');
               $('#visualize-content').html(result.html);
               setTimeout(function(){
                    TETHYS_PLOT_VIEW.initPlot($('.d3-plot, .highcharts-plot'));
               }, 500);

            };
            var func = {download: options,
                        filter: options,
                        visualize: visualize,
                        }

             func[type]();

        }
    })
    .done(function() {
        $('.select2').select2();
    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function show_metadata(dataset){
    var data = {'dataset': dataset};
    var url = show_metadata_url;

    $.get(url, data, function(result){
        if(result.success){
             $('#metadata-content').html(result.html);
             $('#metadata-modal').modal('show');
        }
    })
    .done(function() {

    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
}

function submit_options(event){

    // submit form to update dataset download options and then download
    event.preventDefault();
    var dataset = $(this).attr('data-dataset-id');
    var url = $('#options-form').attr('action');
    var data = $('#options-form').serializeArray();
    var type = $(this).attr('data-options-type');
    $('#options-modal').modal('hide');

    $.post(url, data, function(result){
        if(result.success){
            update_details_table(result.collection_name, result.details_table_html);
        }
    })
    .done(function() {

    })
    .fail(function() {
        console.log( "error" );
    })
    .always(function() {

    });
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
    $.post(url, data, function(result){
        if(result.success){
            $('#collections-list').append(result.collection_html);
            $('#new-collection-modal').modal('hide')
            // update collection select
            $('#collection').select2({data: [{id: result.collection.name, text: result.collection.display_name }]});
            $('#collection').trigger('change');
            // add details table
            $('#collection-details-nav ul').append(
                $('<li role="presentation" class="nav-tab ' +  result.collection.name + '-collection"><a href="#collection-detail-' +  result.collection.name + '" aria-controls="collection-detail-' +  result.collection.name + '" role="tab" data-toggle="tab">' +  result.collection.display_name + '</a></li>')
            );
            $('#collection-details-content').append(result.details_table_html);
            $('#collection-details-nav li a').each(function(){
                bind_show_details(this);
            });
        }
    })
    .done(function() {

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

    $.get(url, function(result){
        if(result.success){
            $(collection_elements).remove();
            reload_collection_details_tabs();
            remove_layer(collection_name);
            $('#collection-details-nav a:first').tab('show');
            // update collection select
            $('#collection option[value="' + collection_name + '"]').remove();
            $('#collection').select2('val', '');
            $('#collection').trigger('change');
        }
    });
}

function bind_context_menu(){
    $("#collection-details-container td").contextMenu({
        menuSelector: "#details-context-menu",
        menuSelected: function (invokedOn, selectedMenu) {
            var options = {'Download': '',
                           'Apply Filter': '',
                           'Visualize': '',
                           'Delete': delete_dataset,
                           }

            var option = options[selectedMenu.text()];
            var dataset_id = get_dataset_id_from_details_table_row(invokedOn.parent());
            option(dataset_id);
        }
    });
}


/*******************************************************************************
 *
 *                        BUTTON HANDLERS
 *
 *******************************************************************************/

$(function() { //wait for page to load

// Download/Visualize Options Button
$('#collection-details-content').on('click', '.get-options', populate_options_form);

// Download Button
$('#options-content').on('click', '.options-submit', submit_options);

// New Collection Button
$('#new-collection-form').on('submit', new_collection);

// Delete Collection Link
$('#collections-list').on('click', '.delete-collection', delete_collection);

bind_context_menu();

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

// collection detail container toggle
function bind_show_details(elem){
    $(elem).unbind('click').click(function(e){
        $('#collection-details-container').slideDown();
        $('#collection-details-nav li a').each(function(){
            bind_show_details(this);
        });
        bind_hide_details(elem);
    });
}

function bind_hide_details(elem){
    $(elem).unbind('click').click(function(e){
        $('#collection-details-container').slideUp();
        setTimeout(function(){
            $('#collection-details-nav li.active').removeClass('active');
        }, 100);
        bind_show_details(elem);
    });
}

$('#collection-details-nav li a').each(function(){
    bind_show_details(this);
});
$('#minimize-collection-details').click(function(){
    $('#collection-details-container').slideUp();
    $('#collection-details-nav li.active').removeClass('active');
    $('#collection-details-nav li a').each(function(){
        bind_show_details(this);
    });
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


//Context Menu code from: http://jsfiddle.net/kylemit/x9tgy/
$.fn.contextMenu = function (settings) {

    return this.each(function () {

        // Open context menu
        $(this).on("contextmenu", function (e) {
            // return native menu if pressing control
            if (e.ctrlKey) return;

            //open menu
            var $menu = $(settings.menuSelector)
                .data("invokedOn", $(e.target))
                .show()
                .css({
                    position: "absolute",
                    left: getMenuPosition(e.clientX, 'width', 'scrollLeft'),
                    top: getMenuPosition(e.clientY, 'height', 'scrollTop')
                })
                .off('click')
                .on('click', 'a', function (e) {
                    $menu.hide();

                    var $invokedOn = $menu.data("invokedOn");
                    var $selectedMenu = $(e.target);

                    settings.menuSelected.call(this, $invokedOn, $selectedMenu);
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