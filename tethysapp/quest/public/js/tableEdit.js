/*
TableEdit
 @description  Javascript library to make HMTL tables editable, using Bootstrap
 @version 1.1
*/
  "use strict";
  //Global variables
  var params = null;  		//Parameters
  var colsEdi =null;
  var newProj = false;
  var newColHtml = '<div class="btn-group pull-right">'+
                      '<button id="bEdit" type="button" class="btn btn-xs btn-default bEdit" onclick="rowEdit(this);">' +
                      '<span class="glyphicon glyphicon-pencil" > </span>'+
                      '</button>'+
                      '<button id="bAcep" type="button" class="btn btn-sm btn-default" style="display:none;" onclick="rowAcep(this);">' +
                      '<span class="glyphicon glyphicon-ok" > </span>'+
                      '</button>'+
                      '<button id="bCanc" type="button" class="btn btn-sm btn-default" style="display:none;" onclick="rowCancel(this);">' +
                      '<span class="glyphicon glyphicon-remove" > </span>'+
                      '</button>'+
                      '<button id="bElim" type="button" class="btn btn-xs btn-default" onclick="rowElim(this);">' +
                      '<span class="glyphicon glyphicon-trash" > </span>'+
                      '</button>'+
                   '</div>';
  var colEdicHtml = '<td name="buttons">'+newColHtml+'</td>';

  $.fn.SetEditable = function (options) {
    var defaults = {
        columnsEd: null,         //Index to editable columns. If null all td editables. Ex.: "1,2,3,4,5"
        $addButton: null,        //Jquery object of "Add" button
        onEdit: function(row, row2) {

          var i = 0;
          var project_key = $(row2).data("project-id");
          //console.log(project_key);
          var proj_data = [];
          var $row = $(row).parents('tr');
          var $cols = $row.find('td');
          IterarCamposEdit($cols, function($td) {
              var cont = $td.html();
              var div = '<div style="display: none;">' + cont + '</div>';
              var input = '<input class="form-control input-sm"  value="' + cont + '">';
              $td.html(div + input);
              //console.log(cont);

              i = i+1;
              proj_data[i] = cont;
          });
          console.log(proj_data[1]);
          console.log(proj_data[2]);
          //console.log(proj_data[3]);
          var project_name = proj_data[1];//$(row).data("project-id");
          var project_description = proj_data[2];

          if (!newProj) {
            console.log('this is not a new project');

            var url = update_project_workflow_url;
            var csrftoken = getCookie('csrftoken');
            var data = {project_key: project_key,
                        project_name: project_name,
                        project_description: project_description,
                        csrfmiddlewaretoken: csrftoken};
            $.post(url, data)
            .done(function(result) {
              window.location = result.redirect_url;
            })
            .fail(function() {
                console.log( "error" );
            })
            .always(function(result) {
                update_messages(result.messages);
            });
          }
          else {
            console.log(newProj + ' This is a new Project');
            var url = add_project_workflow_url;
            var csrftoken = getCookie('csrftoken');
            var data = {project_name: project_name,
                        project_description: project_description,
                        csrfmiddlewaretoken: csrftoken};
            $.post(url, data)
            .done(function(result) {
              window.location = result.redirect_url;
            })
            .fail(function() {
                console.log( "error" );
            })
            .always(function(result) {
                update_messages(result.messages);
            });
            //params.onAdd(proj_data);
          }
        },   //Called after edition
		    onBeforeDelete: function(row) {
		      var project_name = $(row).closest('tr').find('td:eq(2) input').val();
          return confirm("Are you sure you want to delete the project: " + project_name + "?");

		    }, //Called before deletion

        onDelete: function(row) {
          var project_key = $(row).data("project-id");

          var url = delete_project_workflow_url;
          var csrftoken = getCookie('csrftoken');
          var data = {delete_project: project_key,
                      csrfmiddlewaretoken: csrftoken};
          $.post(url, data)
          .done(function(result) {
            window.location = result.redirect_url;
          })
          .fail(function() {
              console.log( "error" );
          })
          .always(function(result) {
              update_messages(result.messages);
          });
        }, //Called after deletion
        onAdd: function(row) {
            row.find('.bEdit').click();
            row.addClass('new-project');
            console.log('The onAdd row function is called');

//          var i = 0;
//          //var project_key = $(row2).data("project-id");
//          var proj_data = [];
//          var $row = $(row).parents('tr');
//          var $cols = $row.find('td');
//          IterarCamposEdit($cols, function($td) {
//              var cont = $td.html();
//              var div = '<div style="display: none;">' + cont + '</div>';
//              var input = '<input class="form-control input-sm"  value="' + cont + '">';
//              $td.html(div + input);
//              //console.log(cont);
//
//              i = i+1;
//              proj_data[i] = cont;
//          });


          console.log(row[1]);
          console.log(row[2]);

//          var project_name = row[1];//$(row).data("project-id");
//          var project_description = row[2];
//
//          var url = add_project_workflow_url;
//          var csrftoken = getCookie('csrftoken');
//          var data = {project_name: project_name,
//                      project_description: project_description,
//                      csrfmiddlewaretoken: csrftoken};
//          $.post(url, data)
//          .done(function(result) {
//            window.location = result.redirect_url;
//          })
//          .fail(function() {
//              console.log( "error" );
//          })
//          .always(function(result) {
//              update_messages(result.messages);
//          });
     }//Called when added a new row
    };
    params = $.extend(defaults, options);
    this.find('thead tr').append('<th name="buttons"> Action </th>');  //encabezado vacío
    this.find('tbody tr').append(colEdicHtml);
	var $tabedi = this;
    if (params.$addButton != null) {
        params.$addButton.click(function() {
            rowAddNew($tabedi.attr("id"));
        });
    }
    //Process
    if (params.columnsEd != null) {
        colsEdi = params.columnsEd.split(',');
    }
  };

function IterarCamposEdit($cols, tarea) {
    var n = 0;
    $cols.each(function() {
        n++;
        if ($(this).attr('name')=='buttons') return;
        if (!EsEditable(n-1)) return;
        tarea($(this));
    });

    function EsEditable(idx) {
        if (colsEdi==null) {
            return true;
        } else {
            for (var i = 0; i < colsEdi.length; i++) {
              if (idx == colsEdi[i]) return true;
            }
            return false;  //
        }
    }
}
function FijModoNormal(but) {
    $(but).parent().find('#bAcep').hide();
    $(but).parent().find('#bCanc').hide();
    $(but).parent().find('#bEdit').show();
    $(but).parent().find('#bElim').show();
    var $row = $(but).parents('tr');  //
    $row.attr('id', '');  //
}
function FijModoEdit(but) {
    $(but).parent().find('#bAcep').show();
    $(but).parent().find('#bCanc').show();
    $(but).parent().find('#bEdit').hide();
    $(but).parent().find('#bElim').hide();
    var $row = $(but).parents('tr');  //
    $row.attr('id', 'editing');  //
}
function ModoEdicion($row) {
    if ($row.attr('id')=='editing') {
        return true;
    } else {
        return false;
    }
}
function rowAcep(but) {
//Row accept
    var $row = $(but).parents('tr');
    var $cols = $row.find('td');
    if (!ModoEdicion($row)) return;
    //
    IterarCamposEdit($cols, function($td) {  //
      var cont = $td.find('input').val(); //
      $td.html(cont);  //
    });

    FijModoNormal(but);
    params.onEdit(but, $row);
}
function rowCancel(but) {
    var $row = $(but).parents('tr');  //
    var $cols = $row.find('td');  //
    if (!ModoEdicion($row)) return;  //
    IterarCamposEdit($cols, function($td) {  //
        var cont = $td.find('div').html(); //
        $td.html(cont);  //
    });
    FijModoNormal(but);
}
function rowEdit(but) {  //
    var $row = $(but).parents('tr');  //
    var $cols = $row.find('td');  //
    if (ModoEdicion($row)) return;  //
    IterarCamposEdit($cols, function($td) {  //
        var cont = $td.html(); //
        var div = '<div style="display: none;">' + cont + '</div>';  //
        var input = '<input class="form-control input-sm"  value="' + cont + '">';
        $td.html(div + input);
    });
    FijModoEdit(but);
}
function rowElim(but) {
      var $row = $(but).parents('tr');
      var confirmed = params.onBeforeDelete($row);
      if (confirmed) {
        $row.remove();
        params.onDelete($row);
      }


}
function rowAddNew(tabId) {  //Row Add
    var $tab_en_edic = $("#" + tabId);  //Table to edit
    var $filas = $tab_en_edic.find('tbody tr');
    newProj = true;
    if ($filas.length==0) {
        var $row = $tab_en_edic.find('thead tr');  //
        var $cols = $row.find('th');
        var htmlDat = '';
        $cols.each(function() {
            if ($(this).attr('name')=='buttons') {
                htmlDat = htmlDat + colEdicHtml;  //
            } else {
                htmlDat = htmlDat + '<td></td>';
            }
        });
        $tab_en_edic.find('tbody').append('<tr>'+htmlDat+'</tr>');
    } else {
        var $ultFila = $tab_en_edic.find('tr:last');
        $ultFila.clone().appendTo($ultFila.parent());
        $ultFila = $tab_en_edic.find('tr:last');
        var $cols = $ultFila.find('td');
        $cols.each(function() {
            if ($(this).attr('name')=='buttons') {

            } else {
                $(this).html('');
            }
        });
    }
	params.onAdd($ultFila);
}
function TableToCSV(tabId, separator) {  //
    var datFil = '';
    var tmp = '';
	var $tab_en_edic = $("#" + tabId);  //
    $tab_en_edic.find('tbody tr').each(function() {
        if (ModoEdicion($(this))) {
            $(this).find('#bAcep').click();  //
        }
        var $cols = $(this).find('td');  //
        datFil = '';
        $cols.each(function() {
            if ($(this).attr('name')=='buttons') {
            } else {
                datFil = datFil + $(this).html() + separator;
            }
        });
        if (datFil!='') {
            datFil = datFil.substr(0, datFil.length-separator.length);
        }
        tmp = tmp + datFil + '\n';
    });
    return tmp;
}