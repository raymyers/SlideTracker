function newGroupClick() {
    loadPage("/_new_group", newGroupInit);
}

function newGroupInit() {
    var saveGroupButtonConfig = {icons: {primary:'ui-icon-disk'}};
    $("button.saveGroup").button(saveGroupButtonConfig).click(saveGroupClick);
    editGroupInit();
}

function saveGroupClick() {
    var data = getGroupData();
    $.get("/api/save_group", data, groupsClick);
}

function getGroupData() {
    var tissues = $(".tissue").map(function() {return $(this).val();}).get();
    return {
        name: $(".name").val(),
        tissues: tissues,
        comment: $(".comment").val(),
    }
}

function groupsInit() {
    var newGroupButtonConfig = {icons: {primary:'ui-icon-circle-plus'}};
    $("button.newGroup").button(newGroupButtonConfig).click(newGroupClick);
    var editGroupButtonConfig = {icons: {primary:'ui-icon-gear'}};
    $(".groups .group .editGroup").button(editGroupButtonConfig).click(editGroupClick);
    
    var editPigButtonConfig = {icons: {primary:'ui-icon-gear'}};
    $("button.editPig").button(editPigButtonConfig).click(editPigClick);
    showPigsButtonInit();
}

function editPigClick() {
    var id = $(this).parent().find(".pigId").val();
    loadPage("/_edit_pig?id=" + id, editPigInit);
}

function editGroupClick() {
    var id = $(this).parent().find(".id").val();
    loadPage("/_edit_group?id=" + id, editGroupInit);
}

function editGroupInit() {
    var updateGroupButtonConfig = {icons: {primary:'ui-icon-disk'}}
    var deleteGroupButtonConfig = {icons: {primary:'ui-icon-trash'}};

    $("button.updateGroup").button(updateGroupButtonConfig).click(updateGroupClick);
    $("button.deleteGroup").button(deleteGroupButtonConfig).click(deleteGroupClick);
    addTissueButtonInit();
    removeTissueButtonInit();
}

function deleteGroupClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var name = $(".name").val();
    if (confirm("Delete group '" + name  + "'?")) {
        $.get("/api/delete_group", {id: id, rev:rev}, groupsClick);
    }
}

function updateGroupClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var data = getGroupData();
    data.id = id;
    data.rev = rev;
    if ($(".baseline").val()) {
        data.baseline = true;
    }
    $.get("/api/save_group", data, groupsClick);
}
