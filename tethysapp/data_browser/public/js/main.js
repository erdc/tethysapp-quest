
function update_details_table(collection_name, html){
    $('#collection-detail-' + collection_name).replaceWith(html);
    // get new details table to show
    $('#collection-details-nav a:first').tab('show');
    $('#collection-details-nav a:last').tab('show');
    $('li.' + collection_name + '-collection a').tab('show');


}


/*******************************************************************************
 *
 *                        BUTTON HANDLERS
 *
 *******************************************************************************/

// Download/Visualize Options Button
$('#collection-details-content').on('click', '.get-options', function(e){
    var dataset = $(this).attr('data-dataset-id');
    var data = {'dataset': dataset};
    var type = $(this).attr('data-options-type');
    var url = {'download': get_download_options_url,
               'filter': get_filter_options_url,
               'visualize': visualize_dataset_url,
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
            var func = {'download': options,
             'filter': options,
             'visualize': visualize,
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

});

// Download Button
$('#options-content').on('click', '.options-submit', function(e){

    // submit form to update dataset download options and then download
    e.preventDefault();
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

});

function add_collection_details(collection_name, collection_display_name, details_html){
    nav_html = '<li role="presentation" class="nav-tab ' + collection_name + '-collection"><a href="#collection-detail-' + collection_name + '" aria-controls="collection-detail-' + collection_name + '" role="tab" data-toggle="tab">' + collection_name + '</a></li>';
    $('#collection-details-nav').child('ul').append(nav_html);
    $('#collection-details-content').append(details_html);
}

// New Collection Button
$('#new-collection-form').on('submit', function(event){
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
});

// Delete Collection Link
$('#collections-list').on('click', '.delete-collection', function(event){
    event.preventDefault();
    var url = $(this).attr('href');
    var collection_name = $(this).attr('data-collection-name');
    var collection_elements = $('.' + collection_name + '-collection');

    $.get(url, function(result){
        if(result.success){
            $(collection_elements).remove();
            remove_layer(collection_name);
            $('#collection-details-nav a:first').tab('show');

        }
    });
});





//$('#download-dataset-form').submit(function(e){
//    e.preventDefault();
//    var url = $(this).attr('action');
//    var data = $(this).serializeArray();
//    var selected_features = search_select_interaction.getFeatures();
//    var features = selected_features.array_.map(function(feature){
//        return feature.id_;
//    });
//    data.push({'name': 'features',
//               'value': features});
//
//    $.get(url, data, function(result){
//        console.log(result);
//    })
//    .done(function() {
//        $('#add-features-modal').hide();
//    })
//    .fail(function() {
//        console.log( "error" );
//    })
//    .always(function() {
//
//    });
//});




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