$(function() {
    $(".nav button").button();
    $(".nav button").button("option", "disabled", true );
    $(".nav button.groups").button("option", "disabled", false).click(groupsClick).click();
});

function loadPage(path, callback) {
    
    $(".content").html("<img src='/img/ajax-loader.gif'/>").load(path, callback);
}

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

function groupsClick() {
    loadPage("/_groups", groupsInit);
}

function groupsInit() {
    var newGroupButtonConfig = {icons: {primary:'ui-icon-circle-plus'}};
    var editGroupButtonConfig = {icons: {primary:'ui-icon-gear'}};
    $("button.newGroup").button(newGroupButtonConfig).click(newGroupClick);
    $(".groups .group .editGroup").button(editGroupButtonConfig).click(editGroupClick);
}

function editGroupClick() {
    var id = $(this).parent().find(".id").val();
    loadPage("/_edit_group?id=" + id, editGroupInit);
}

function editGroupInit() {
    var updateGroupButtonConfig = {icons: {primary:'ui-icon-disk'}}
    var deleteGroupButtonConfig = {icons: {primary:'ui-icon-trash'}};
    var addTissueButtonConfig = {icons: {primary:'ui-icon-plus'}};
    $("button.updateGroup").button(updateGroupButtonConfig).click(updateGroupClick);
    $("button.deleteGroup").button(deleteGroupButtonConfig).click(deleteGroupClick);
    $("button.addTissue").button(addTissueButtonConfig).click(addTissueClick);
    removeTissueButtonInit();
}

function removeTissueButtonInit() {
    var removeTissueButtonConfig = {icons: {primary:'ui-icon-trash'}};
    $("button.removeTissue").button(removeTissueButtonConfig).click(removeTissueClick);

}

function deleteGroupClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var name = $(".name").val();
    if (confirm("Delete group '" + name  + "'?")) {
        $.get("/api/delete_group", {id: id, rev:rev}, groupsClick);
    }
}

function removeTissueClick() {
    $(this).parent().remove();
}

function addTissueClick() {
    $(".tissues").append("<li><input class='tissue' /> <button class='removeTissue'>Remove</button></li>");
    removeTissueButtonInit();
}

function updateGroupClick() {
    var id = $(".id").val();
    var rev = $(".rev").val();
    var name = $(".name").val();
    var data = getGroupData();
    data.id = id;
    data.rev = rev;
    if ($(".baseline").val()) {
        data.baseline = true;
    }
    $.get("/api/save_group", data, groupsClick);
}