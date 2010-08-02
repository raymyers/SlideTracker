$(function() {
    $(".nav button").button();
    $(".nav button.search").button("option", "disabled", true );
    $(".nav button.groups").click(groupsClick).click();
    $(".nav button.sacrifice").click(sacrificeClick);
    $(".nav button.requestSets").click(requestSetsClick);
    $(".nav button.pending").button("option", "disabled", true );
    //$(".nav button.pending").click(pendingClick);
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

function groupsClick() {
    loadPage("/_groups", groupsInit);
}

function sacrificeClick() {
    loadPage("/_sacrifice", editPigInit);
}

function requestSetsClick() {
    loadPage("/_request_sets", requestSetsInit);
}

function pendingClick() {
    loadPage("/_pending_sets", requestSetsInit);
}

function addTissueButtonInit() {
    var addTissueButtonConfig = {icons: {primary:'ui-icon-plus'}};
    $("button.addTissue").button(addTissueButtonConfig).click(addTissueClick);
}

function removeTissueButtonInit() {
    var removeTissueButtonConfig = {icons: {primary:'ui-icon-trash'}};
    $("button.removeTissue").button(removeTissueButtonConfig).click(removeTissueClick);

}


function removeTissueClick() {
    $(this).parent().remove();
}

function addTissueClick() {
    $(".tissues").append("<li><input class='tissue' /> <button class='removeTissue'>Remove</button></li>");
    removeTissueButtonInit();
}

function showPigsButtonInit() {
    var showPigsButtonConfig = {icons: {primary:'ui-icon-folder-collapsed'}};
    $(".groups .group .showPigs").button(showPigsButtonConfig).click(showPigsClick);
    $(".groups .group .pigs").hide();
    $(".pigControl").hide();
}

function showPigsClick() {
    var button = $(this);
    var parent = button.parent();
    if (parent.find(".pigSelect:checked").length > 0) {
        parent.find(".pigs, pigControl").show();
        button.button("option", "icons", {primary:'ui-icon-folder-open'});
    } else {
        parent.find(".pigs, .pigControl").toggle();
        toggleButtonFolder(button);
   }
}

function toggleButtonFolder(button) {
    if (button.button("option","icons").primary == 'ui-icon-folder-open') {
        button.button("option", "icons", {primary:'ui-icon-folder-collapsed'});
    } else {
        button.button("option", "icons", {primary:'ui-icon-folder-open'});
    }
}
