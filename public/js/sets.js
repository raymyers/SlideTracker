function requestSetsInit() {
    var addSetButtonConfig = {icons: {primary:'ui-icon-circle-plus'}};
    $("button.addSet").button(addSetButtonConfig).click(addSetClick);
    var orderAllButtonConfig = {icons: {primary:'ui-icon-clipboard'}};
    $("button.orderAll").button(orderAllButtonConfig).click(orderAllClick).hide();
    $(".requestDate").datepicker();
    $(".selectNoneInGroup").button().click(selectNoneInGroupClick);
    $(".selectAllInGroup").button().click(selectAllInGroupClick);
    showPigsButtonInit();
    $(".pigSelect, .selectAllInGroup, .selectNoneInGroup").click(pigSelectChange);
    refreshTissues();
    $(".tissueSelector").change(tissueSelectorChange);
    $("input, select").change(formChange);
    $(".requestedSetsLabel").hide();
}

function formChange() {
    $(".addSet").data("changed",true);
}

function pigSelectChange() {
    refreshTissues();
}

function tissueSelectorChange() {
    var selectedTissue = $(this).val();
    var pigs = $(".pig");
    pigs.removeClass("pigWithSeletedTissueAvailable");
    if (selectedTissue != "") {
        pigs.each(function() {
            if ($.inArray(selectedTissue, getPigTissues($(this))) > -1) {
                $(this).addClass("pigWithSeletedTissueAvailable");
            }
        });
    }
}

function refreshTissues() {
    var allTissues = allAvailableTissues();
    var oldVal = $(".tissueSelector").val();
    var oldValStillPresent = false;
    $(".tissueSelector").html("");
    if (allTissues.length == 0) {
        addTissueOption("","No tissues available");
    } else {
        addTissueOption("","Select tissue");
    }
    $.each(allTissues, function(i, tissue) {
        var escapedTissue = tissue.replace(/'/g, "&#039;");
        oldValStillPresent |= (escapedTissue == oldVal);
        addTissueOption(escapedTissue,escapedTissue);
    });
    
    $(".tissueSelector").val(oldValStillPresent ? oldVal : "");
    if (!oldValStillPresent) {
        $(".tissueSelector").change();
    }
}

function addTissueOption(key, value) {
    $(".tissueSelector").append("<option value='" + key + "'>"+ value +"</option>");
}

function allAvailableTissues() {
    var allTissues = [];
    $(".pigSelect:checked").each(function() {
        var pigTissues = getPigTissues($(this).parent());
        $.each(pigTissues, function(i, tissue) {
            tissue = $.trim(tissue);
            if ($.inArray(tissue, allTissues) == -1) {
                allTissues.push(tissue);
            }
        });
    });
    allTissues.sort();
    return allTissues;
}

function getPigTissues(pig) {
    var tissuesJson = pig.find(".tissues").val();
    var pigTissues = $.parseJSON(tissuesJson).tissues;
    if (pigTissues == null) {
        pigTissues = [];
    }
    return pigTissues;
}

function selectAllInGroupClick() {
    $(this).parent().find(".pigSelect").attr('checked',true).change();
}

function selectNoneInGroupClick() {
    $(this).parent().find(".pigSelect").attr('checked',false).change();
}


function updateSetClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var data = getSetData();
    data.id = id;
    data.rev = rev;
    $.get("/api/save_set", data, pendingClick);
}

function addSetClick() {
    var set = getSetData();    
    if (validateSet(set)) {
        if (!$(this).data("changed") && !confirm("You have already added this set. Add again?")) {
            return true;
        }
        $(".setsLabel").show();
        $(".orderAll").show();
        var a = [pigSummary(set.pigIds), set.tissue, set.stain];
        $(".sets").append("<p class='set'>" + a.join(" ") + "<p>")
        $(".sets .set:last").data('set',set);
        $(this).data("changed",false);
    }    
}

function getSetData() {
    var pigIds = [];
    var pigsByGroup = {};
    $(".pigWithSeletedTissueAvailable .pigSelect:checked").each(function() {
        var pigId = $(this).val();
        var groupId = $(this).parent().find(".groupId").val();
        pigIds.push(pigId);
        if (null == pigsByGroup[groupId]) {
            pigsByGroup[groupId] = [];
        }
        pigsByGroup[groupId].push(pigId);
    });
    return {
        requester: $(".requester").val(),
        pigIds: pigIds,
        pigsByGroup: pigsByGroup,
        stain: $(".stain").val(),
        requestDate: $(".requestDate").val(),        
        tissue: $(".tissueSelector").val(),
        comment: $(".comment").val()
    }
}

function pigSummary(pigIds) {
    var noun = pigIds.length == 1 ? "pig" : "pigs";
    return pigIds.length + " " + noun;
}

function validateSet(set) {
    if ("" == set.requester) {
        showValidationError("Requester is blank");
        return false;
    }
    if ("" == set.stain) {
        showValidationError("Stain is blank");
        return false;
    }
    if ("" == set.requestDate) {
        showValidationError("Request date is blank");
        return false;
    }
    if (set.pigIds.length == 0) {
        showValidationError("No pigs selected");
        return false;
    }
    if ("" == set.tissue) {
        showValidationError("No tissue selected");
        return false;
    }
    $(".validationErrors").hide();
    return true;
}

function showValidationError(msg) {
    $(".validationErrors").hide().text("Error: " + msg).fadeIn();
}

function orderAllClick() {
    $(".orderAll, .addSet").attr('disabled','disabled');
    $(".set").each(function() {
        var elt = $(this);
        if (!elt.hasClass("ordered") && !elt.hasClass("ordering")) {
            orderSet(elt);
        }
    });
    $(".orderAll, .addSet").removeAttr('disabled');
}

function saveSetCompleteCallback(setElement) {
    return function() {
        setElement.removeClass("ordering").addClass("ordered");
    }
}

function saveSetErrorCallback(setElement) {
    return function() {
        setElement.removeClass("ordering").addClass("orderFailed");
    }
}



function orderSet(setElement) {
    setElement.addClass("ordering").removeClass("orderFailed");
    var path = "/api/save_set";
    var data = setElement.data("set");
    var success = saveSetCompleteCallback(setElement);
    var error = saveSetErrorCallback(setElement);
    $.ajax({
        type: 'POST',
        url: path,
        data: data,
        success: success,
        error: error,
        dataType: "json"
    });
}
// TODO: Get rid of the global variable.
var dataTable;

function pendingSetsInit() {
	rowSelectionInit();
    var deleteButtonConfig = {icons: {primary:'ui-icon-trash'}};
	$('.deleteSelectedSet').button(deleteButtonConfig).click(deleteSelectedSetClick);
	dataTable = $(".setsTable").dataTable({"bJQueryUI": true});
}

function rowSelectionInit() {
    $(".setsTable tbody").click(function(event) {
		$(dataTable.fnSettings().aoData).each(function (){
			$(this.nTr).removeClass('row_selected');
		});
        var node = event.target.parentNode;
		$(node).addClass('row_selected');
	    $(".selectedSetPigNumbers").text($(node).find(".pigNumbers").val());
        $(".selectedSetSacDates").text($(node).find(".pigSacDates").val());
        
    });
}

function deleteSelectedSetClick() {
    var anSelected = fnGetSelected(dataTable);
    if (anSelected.length > 0) {
        var setRow = $(anSelected[0]);
        var id = setRow.find(".id").val();
        var rev = setRow.find(".rev").val();
        var summary = setRow.find(".summary").val();
        if (confirm("Delete this " + summary + " set?")) {
            $.get("/api/delete_set", {id: id, rev:rev}, function() {
		        dataTable.fnDeleteRow(anSelected[0]);
            });
        }
    }
}

function fnGetSelected(oTableLocal) {
	var aReturn = new Array();
	var aTrs = oTableLocal.fnGetNodes();
	for (var i=0; i<aTrs.length; i++) {
		if ($(aTrs[i]).hasClass('row_selected')) {
			aReturn.push(aTrs[i]);
		}
	}
	return aReturn;
}
