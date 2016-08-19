
/*******************************************************************************
 *
 *                        BUTTON HANDLERS
 *
 *******************************************************************************/

// Download Options Button
$('.download-dataset-options').click(function(e){
    console.log(this);
    var dataset = $(this).attr('data-dataset-id');
    var data = {'dataset': dataset};
    var url = get_download_options_url;
//    $('#download-options-content').load(url, $.param(data), function(e){
//        $('.select2').select2();
//    });
    $.get(url, data, function(result){
        if(result.success){
            $('#download-options-content').html(result.html);
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
$('#download-options-content').on('click', '.download-dataset', function(e){

    // submit form to update dataset download options and then download
    e.preventDefault();
    var dataset = $(this).attr('data-dataset-id');
    var url = $('#download-dataset-form').attr('action');
    var data = $('#download-dataset-form').serializeArray();

    $('#download-modal').hide();

    $.post(url, data, function(result){
        if(result.success){
            //change download button to visualize

             //TODO
                //update details table data
                //
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
            $('#collections-list').append(result.html);
            $('#new-collection-modal').modal('hide')
            $('#collection').select2({data: [{id: result.name, text: result.display_name }]});
            $('#collection').trigger('change');
            console.log(result.name);
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