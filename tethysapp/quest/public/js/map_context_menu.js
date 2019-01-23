
/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var MAP_CONTEXT_MENU = (function() {
  // Wrap the library in a package function
  "use strict"; // And enable strict mode for this library

  /************************************************************************
   *                      MODULE LEVEL / GLOBAL VARIABLES
   *************************************************************************/
   var public_interface,        // Object returned by the module
       map,
       map_context_menu;

    // private functions
    var get_menu_items,
        update_menu,
        hide_context_menu,
        bind_event_listeners;


  /************************************************************************
   *                    PRIVATE FUNCTION DECLARATIONS
   *************************************************************************/
    // define private functions here.
    get_menu_items = function(feature, layer){
        var feature_id = feature.getId();
        if(QUEST_MAP.is_search_active()){
          if(layer.get('name') == 'search-layer'){
            return [{
                text: 'Add To Collection',
                callback: function(){
                    //select feature
                    QUEST_MAP.select_feature(feature);
                    // open add to collection modal
                    $('#add-to-collection-button').click();
                }
            }]
          }
        }else{
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
                    text: dataset.display_name,
                    items: get_dataset_context_menu_items(dataset),
                });
            });

            return location_contextmenu_items;
        };
    }

    update_menu = function(evt){
      var feature_data = map.forEachFeatureAtPixel(evt.pixel, function(feature, layer){
        return [feature, layer];
      });

      hide_context_menu();

      if (feature_data) { // open only on features
        var feature = feature_data[0];
        var layer = feature_data[1];
        var menu_items = get_menu_items(feature, layer);

        if(menu_items){
            map_context_menu.enable();
            map_context_menu.clear();
            map_context_menu.extend(menu_items);
        }
      }
    }

    hide_context_menu = function(){
      map_context_menu.close();
//      map_context_menu.clear();
      map_context_menu.disable();
    }

    bind_event_listeners = function(){
        map.addControl(map_context_menu);

        map_context_menu.on('beforeopen', update_menu);

        // prevent standard browser context menu from displaying
        map.getViewport().addEventListener('contextmenu', function (evt) {
            evt.preventDefault();
        });

        map.getViewport().addEventListener('click', function (evt) {
            hide_context_menu();
        });
    }

  /************************************************************************
   *                            TOP LEVEL CODE
   *************************************************************************/
  /*
   * Library object that contains public facing functions of the package.
   */
  public_interface = {
    // mapping of public function name to function declaration
    // i.e. my_func: my_func
  };

  // Initialization: jQuery function that gets called when
  // the DOM tree finishes loading
  $(function() {

    // Initialize globals
    map = QUEST_MAP.get_map();
    map_context_menu = new ContextMenu({
        width: 300,
    });

    // Other initialization code
    bind_event_listeners();
  });

  return public_interface;

}()); // End of package wrapper

/*****************************************************************************
 *                      Public Functions
 *****************************************************************************/

// define public functions here (wrap library object functions if necessary)
