var LAYOUT_DIV_MAPPING = {
    'map': '#map_view_outer_container',
    'plot': '#plot-container',
    'table': '#collection-details-container',
    'metadata': '#metadata-container',
};

var row = {
        type: 'row',
        id: 'row',
      	isClosable: false,
        content: [{
          type: 'column',
          id: 'col',
          isClosable: false,
          content: [{
              type:'component',
              isClosable: false,
              id: 'map',
              componentName: 'map',
              componentState: { text: 'Map' }
          }]
        }]
    }




var config = {
    settings: {
        hasHeaders: false,
        constrainDragToContainer: false,
        reorderEnabled: true,
        selectionEnabled: false,
        popoutWholeStack: false,
        blockedPopoutsThrowError: true,
        closePopoutsOnUnload: true,
        showPopoutIcon: false,
        showMaximiseIcon: false,
        showCloseIcon: true
    },
    content: [row]
};

var myLayout = new window.GoldenLayout( config, $('#layout') );

myLayout.registerComponent( 'example', function( container, state ){
    container.getElement().html( '<h2>' + state.text + '</h2>');
});

myLayout.registerComponent( 'map', function( container, state ){
    var map = $(LAYOUT_DIV_MAPPING['map']).detach();
    container.getElement().append(map);
});

myLayout.registerComponent( 'table', function( container, state ){
    var table = $(LAYOUT_DIV_MAPPING['table']).detach();
    container.getElement().append(table);
});

myLayout.registerComponent( 'plot', function( container, state ){
    var plot = $(LAYOUT_DIV_MAPPING['plot']).detach();
    container.getElement().append(plot);
});

myLayout.registerComponent( 'metadata', function( container, state ){
    var plot = $(LAYOUT_DIV_MAPPING['metadata']).detach();
    container.getElement().append(plot);
});

myLayout.init();

/*
* Since our layout is not a direct child
* of the body we need to tell it when to resize
*/
$(window).resize(function(){
  myLayout.updateSize();
});


// resize layout when nav is toggled
$('.toggle-nav').click(function(){
    setTimeout(function(){
        myLayout.updateSize();
    }, 200);
});

function add_layout_item( id, parent_id, index){
    var newItemConfig = {
        id: id,
        width: 20,
        type: 'component',
        componentName: id,
        componentState: { text: id }
    };

    myLayout.root.getItemsById(parent_id)[0].addChild( newItemConfig, index );

}

function show_layout_item(id, parent_id, index){
    add_layout_item(id, parent_id, index);
}

function hide_layout_item(item, id){
    $('#hidden').append($(LAYOUT_DIV_MAPPING[id]));
    item.remove();
}

function toggle_layout_item( toggle_control, id, parent_id, index){
    $(toggle_control).toggleClass('active');

    var item = myLayout.root.getItemsById(id);

    if(item.length > 0){
        hide_layout_item(item[0], id);
    }
    else
    {
        show_layout_item(id, parent_id, index);
    }

    TETHYS_PLOT_VIEW.initPlot($('.d3-plot, .highcharts-plot'));
}

function show_plot_layout(){
    var id = 'plot', parent_id = 'col', index = 1;
    $('#plot-toggle').addClass('active');
    var item = myLayout.root.getItemsById(id);
    if(item.length > 0){
        // plot is already visible
    }
    else
    {
        show_layout_item(id, parent_id, index);
    }
}

function show_table_layout(){
    var id = 'table', parent_id = 'col', index = 1;
    $('#table-toggle').addClass('active');
    var item = myLayout.root.getItemsById(id);
    if(item.length > 0){
        // plot is already visible
    }
    else
    {
        show_layout_item(id, parent_id, index);
    }
}

function show_metadata_layout(){
    var id = 'metadata', parent_id = 'row';

    var item = myLayout.root.getItemsById(id);
    if(item.length > 0){
        // plot is already visible
    }
    else
    {
        show_layout_item(id, parent_id);
        item = myLayout.root.getItemsById(id);
        var container = item[0].container;
        container.setSize(container.width/2, container.height);
    }
}

$('#close-metadata-btn').click(function(){
    var item = myLayout.root.getItemsById('metadata');

    if(item.length > 0){
        hide_layout_item(item[0], 'metadata');
    }
});

$('#plot-toggle').click(function(){
    toggle_layout_item(this, 'plot', 'col', 1)
});

$('#table-toggle').click(function(){
    toggle_layout_item(this, 'table', 'col')
});

