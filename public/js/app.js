$(function() {
    $(".nav button").button();
    $(".nav button").button("option", "disabled", true );
    $(".nav button.groups").button("option", "disabled", false).click(groupsClick).click();
    $(".nav button.sacrifice").button("option", "disabled", false).click(sacrificeClick);
});

function loadPage(path, callback) {
    loadPageInto(".content", path, callback);
}

function loadPageInto(sel, path, callback) {
    $(sel).html("<img src='/img/ajax-loader.gif'/>");
    $(".errorContent").html("");
    $.ajax({
        url: path,
        success: function(data) {
            $(sel).html(data);
            callback();
        },
        error: function(xhr) {
            $(".errorContent").html(xhr.responseText);
        }
    });
    
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
    var showPigsButtonConfig = {icons: {primary:'ui-icon-folder-collapsed'}};
    $("button.newGroup").button(newGroupButtonConfig).click(newGroupClick);
    $(".groups .group .showPigs").button(showPigsButtonConfig).click(showPigsClick);
    var editGroupButtonConfig = {icons: {primary:'ui-icon-gear'}};
    $(".groups .group .editGroup").button(editGroupButtonConfig).click(editGroupClick);
    $(".groups .group .pigs").hide();
    var editPigButtonConfig = {icons: {primary:'ui-icon-gear'}};
    $("button.editPig").button(editPigButtonConfig).click(editPigClick);
}

function showPigsClick() {
    var button = $(this);
    button.parent().find(".pigs").slideToggle('fast');
    if (button.button("option","icons").primary == 'ui-icon-folder-open') {
        button.button("option", "icons", {primary:'ui-icon-folder-collapsed'});
    } else {
        button.button("option", "icons", {primary:'ui-icon-folder-open'});
    }
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

function addTissueButtonInit() {
    var addTissueButtonConfig = {icons: {primary:'ui-icon-plus'}};
    $("button.addTissue").button(addTissueButtonConfig).click(addTissueClick);
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
    var data = getGroupData();
    data.id = id;
    data.rev = rev;
    if ($(".baseline").val()) {
        data.baseline = true;
    }
    $.get("/api/save_group", data, groupsClick);
}

function sacrificeClick() {
    loadPage("/_sacrifice", editPigInit);
}

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
    if ($(".baseline").val()) {
        data.baseline = true;
    }
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
