var LAYOUT_DIV_MAPPING = {
    'map': '#map_view_outer_container',
    'plot': '#plot-container',
    'table': '#collection-details-container',
    'details': '#details-container',
};

var row = {
        type: 'row',
        id: 'row',
      	isClosable: false,
        content: [{
          type: 'column',
          id: 'col',
          isClosable: false,
          content: [
            {
              type: 'stack',
              id: 'stack',
              isClosable: false,
              activeItemIndex:0,
              content: [
                {
                  type:'component',
                  isClosable: false,
                  id: 'map',
                  componentName: 'map',
                  componentState: { text: 'Map' }
               },
               {
                 type:'component',
                 isClosable: false,
                 id: 'plot',
                 componentName: 'plot',
                 componentState: { text: 'plot' }
              },
            ],
          },
        ]
        }]
    }




var config = {
    settings: {
        hasHeaders: true,
        constrainDragToContainer: false,
        reorderEnabled: true,
        selectionEnabled: false,
        popoutWholeStack: false,
        blockedPopoutsThrowError: true,
        closePopoutsOnUnload: true,
        showPopoutIcon: false,
        showMaximiseIcon: false,
        showCloseIcon: false,
        isClosable: false,
    },
    content: [row]
};

var myLayout = new window.GoldenLayout( config, $('#layout') );

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

myLayout.registerComponent( 'details', function( container, state ){
    var plot = $(LAYOUT_DIV_MAPPING['details']).detach();
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
        isClosable: false,
        componentName: id,
        componentState: { text: id }
    };
    myLayout.root.getItemsById(parent_id)[0].addChild( newItemConfig, index );
}

function show_layout_item(id, parent_id, index){
    add_layout_item(id, parent_id, index);
    //https://datatables.net/forums/discussion/24424/column-header-element-is-not-sized-correctly-when-scrolly-is-set-in-the-table-setup
    if(id == 'table')
    {
        $('.collection_detail_datatable').DataTable()
        .columns.adjust().draw();
    }
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
}

function show_map_layout(){
    var item = myLayout.root.getItemsById('map')[0];
    myLayout.root.getItemsById('stack')[0].setActiveContentItem(item);
}

function show_plot_layout(){
    var item = myLayout.root.getItemsById('plot')[0];
    myLayout.root.getItemsById('stack')[0].setActiveContentItem(item);
}

function show_table_layout(){
    var id = 'table', parent_id = 'col', index = 1;
    $('#table-toggle').addClass('active');
    var item = myLayout.root.getItemsById(id);
    if(item.length > 0){
        // table is already visible
    }
    else
    {
        show_layout_item(id, parent_id, index);
    }
}

function show_details_layout(){
    var id = 'details', parent_id = 'row';

    var item = myLayout.root.getItemsById(id);
    if(item.length > 0){
        // details is already visible
    }
    else
    {
        show_layout_item(id, parent_id);
        item = myLayout.root.getItemsById(id);
        var container = item[0].container;
        container.setSize(container.width/2, container.height);
    }
}

// handle close events for close buttons
['table', 'details'].forEach(function(elem){
  $('#close-' + elem + '-btn').click(function(){
      var item = myLayout.root.getItemsById(elem);

      if(item.length > 0){
          hide_layout_item(item[0], elem);
      }
  });
});

$('#table-toggle').click(function(){
    toggle_layout_item(this, 'table', 'col');
});


$(LAYOUT_DIV_MAPPING['plot']).changeSize(resize_plot);
$(LAYOUT_DIV_MAPPING['table']).changeSize(resize_table);
