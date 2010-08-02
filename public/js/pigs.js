
function editPigInit() {
    var savePigButtonConfig = {icons: {primary:'ui-icon-disk'}};
    var updatePigButtonConfig = {icons: {primary:'ui-icon-disk'}};
    var selectTissuesButtonConfig = {icons: {primary:'ui-icon-clipboard'}};
    $("button.savePig").button(savePigButtonConfig).click(savePigClick);
    $("button.updatePig").button(updatePigButtonConfig).click(updatePigClick);
    var deletePigButtonConfig = {icons: {primary:'ui-icon-trash'}};
    $("button.deletePig").button(deletePigButtonConfig).click(deletePigClick);
    removeTissueButtonInit();
    addTissueButtonInit();
    $(".sacDate").datepicker();
    $("select.group").change(selectGroupChange);
}

function selectGroupChange() {
    var groupId = $("select.group").val();
    if ($('input.populateTissuesFromGroup').attr('checked')) {
        populateTissuesFromGroup(groupId);
    }
}

function populateTissuesFromGroup(groupId) {
    if(groupId == "") {
        $(".tissueSelect").html("");
    }
    else {
        loadPageInto(".tissueSelect","/_tissue_select?groupId=" + groupId, function() {
            addTissueButtonInit();
            removeTissueButtonInit();
        });
    }
}

function deletePigClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var pigNumber = $(".pigNumber").val();
    if (confirm("Delete pig '" + pigNumber  + "'?")) {
        $.get("/api/delete_pig", {id: id, rev:rev}, groupsClick);
    }
}

function updatePigClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var data = getPigData();
    data.id = id;
    data.rev = rev;
    $.get("/api/save_pig", data, groupsClick);
}

function savePigClick() {
    var data = getPigData();
    $.get("/api/save_pig", data, groupsClick);
}

function getPigData() {
    var tissues = $(".tissue").map(function() {return $(this).val();}).get();
    return {
        pigNumber: $(".pigNumber").val(),
        sacDate: $(".sacDate").val(),
        groupId: $("select.group").val(),
        tissues: tissues,
        comment: $(".comment").val(),
    }
}
