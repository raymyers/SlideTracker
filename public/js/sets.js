function requestSetsInit() {
    var saveSetButtonConfig = {icons: {primary:'ui-icon-clipboard'}};
    $("button.saveSet").button(saveSetButtonConfig).click(saveSetClick);
    $(".requestDate").datepicker();
    $(".selectNoneInGroup").button().click(selectNoneInGroupClick);
    $(".selectAllInGroup").button().click(selectAllInGroupClick);
    showPigsButtonInit();
    $(".pigSelect, .selectAllInGroup, .selectNoneInGroup").click(pigSelectChange);
    refreshTissues();
    $(".tissueSelector").change(tissueSelectorChange);
    $(".requestedSetsLabel").hide();
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
    $(this).parent().find(".pigSelect").attr('checked',true);
}

function selectNoneInGroupClick() {
    $(this).parent().find(".pigSelect").attr('checked',false);
}


function updateSetClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var data = getSetData();
    data.id = id;
    data.rev = rev;
    $.get("/api/save_set", data, pendingClick);
}

function saveSetClick() {
    var data = getSetData();
    $.get("/api/save_set", data, saveSetCompleteCallback(data));
}

function getSetData() {
    var pigIds = $(".pigWithSeletedTissueAvailable .pigSelect:checked").map(function() {
        return $(this).val();
    }).get();
    return {
        requester: $(".requester").val(),
        pigIds: pigIds,
        stain: $(".stain").val(),
        requestDate: $(".requestDate").val(),        
        tissue: $(".tissueSelector").val(),
        comment: $(".comment").val()
    }
}

function saveSetCompleteCallback(set) {
    $(".requestedSetsLabel").show();
    var a = [pigSummary(set.pigIds), set.tissue, set.stain];
    $(".requestedSets").append("<p>" + a.join(" ") + "<p>")
}

function pigSummary(pigIds) {
    var noun = pigIds.length == 1 ? "pig" : "pigs";
    return pigIds.length + " " + noun;
}