var mouse_coords = null;

$(document).ready( function() {
    setupHttpSessionForm();
    setupPageFadeIn();
    setupAutoReloadingSessionPage();
    $('.advanced-options').hide();
    $('#send-request-button').click(sendRequest);
    // Prevent form submission from actually doing anything.
    $("form").submit(function() {return false;});
});

function sendRequest() {
    $("body").removeClass("create-session-page").addClass("session-listing-page");
    var method = $("input[name='method']").val();
    var url = $("input[name='url']").val();
    var request = {method:method, url:url, headers:collectRequestHeaderMappings()};
    var proxyUrl = "/spyglass/_proxy?" + $.param(request);
    populateRequestHtml(request);
    displayWaiting();
    $.getJSON(proxyUrl,{}, proxyResponseHandler)
    return false;
}

function collectRequestHeaderMappings() {
    var headers = {};
    $(".extra-headers tr").each(function() {
        var inputs = $(this).find("input")
        var key = $(inputs[0]).val();
        var val = $(inputs[1]).val();
        headers[key] = val;
    });
    return headers;
}

function displayWaiting() {
    $(".response .code-listing .linenos").html();
    $(".response .code-listing .data").html("<div class='loading-placeholder'><img src='img/ajax-loader.gif'> Waiting...</div>");
}

function proxyResponseHandler(data) {
   populateResponseHtml(data.response);
   prettyPrint();
}

function populateResponseHtml(response) {
  if(response.error) {
    console.log("spyglass: Request had error: %d", data.error)
    $('.response.session-listing').replaceWith(error_msg);
    $(".response .code-listing .linenos").text();
    $(".response .code-listing .data").text("Error: " + data.error);
  } else {
    $('.response .datetime').html('completed in ' + response.elapsedMillis +
      ' <abbr title="milliseconds">ms</abbr>');
    insertCodeListing(".response .code-listing", responseString(response), "html");
  }
}

function responseString(response) {
  var s = "HTTP/" + response.version/10.0 + " " + response.status + " " + response.reason + "\n";
  var h;
  $.each(response.headers, function(i, h) {
    s += h[0] + ": " + h[1] + "\n";
  }); 
  s += "\n" + response.data;
  return s;
}

function populateRequestHtml(request) {
   var currentTime = new Date();
   var dateTimeString = currentTime.toLocaleString();
   $(".request .datetime").html("for " + request.url + " sent " + dateTimeString);
   
   var parsedUri = parseUri(request.url);
   var host = parsedUri.host;
   var path = parsedUri.relative;
   if (path === "") {
      path = "/";
   }
   var rawRequest = request.method + " " + path + " HTTP/1.1\nHost: " + host + "\nAccept: */*\n";
   $.each(request.headers, function(k,v) {rawRequest += k + ": " + v +"\n";});
   if (request.body) {
      rawRequest += "\n" + request.body;
   }
   insertCodeListing(".request .code-listing", rawRequest, "js");
}

function insertCodeListing(sel, code, lang) {
   $(sel + " .linenos").text(lineNumbers(code)).wrapInner(codeListingWrap("plain"));
   $(sel + " .data").text(code).wrapInner(codeListingWrap(lang));
}

function lineNumbers(code) {
  var lineCount = lineBreakCount(code) + 1;
  var a = [];
  for (var i=0;i<lineCount;i++) {
    a[i] = i+1;
  }
  return a.join("\n");
}

function lineBreakCount(str){
  try {
    return str.match(/[^\n]*\n[^\n]*/gi).length;
  } catch(e) {
    return 0;
  }
}


function codeListingWrap(lang) {
  if (!lang) {
    lang = "js";
  }
  if (lang === "plain") {
    return "<pre><code>" + "</code></pre>"
  }
  return "<pre class=\"prettyprint lang-" + lang + "\"><code>" + "</code></pre>"
}

function setupHttpSessionForm() {
    $('select.spyglass-dropdown').each( function(idx, el) {
        setupDropdown($(el));
    });
    
    var url_value = $('#create-session-header-form .url-input').val();
    setSelectionRange($('#create-session-header-form .url-input')[0], url_value.length, url_value.length);
    
    $('.advanced-options table.extra-headers').after('<p class="add-extra-header-link"><a href="#">add another</a></p>');
    $('.advanced-options .add-extra-header-link').click( function(e) {
        e.preventDefault();
        
        var current_form_count = $('#id_header-TOTAL_FORMS').val();
        current_form_count++;
    
        const TEMPLATE = '<tr><td><input type="text" name="header-__prefix__-name" id="id_header-__prefix__-name" /></td><td><input type="text" name="header-__prefix__-value" id="id_header-__prefix__-value" /></td></tr>';
        var row_html = TEMPLATE.replace(/__prefix__/g, current_form_count);
        
        $('#id_header-TOTAL_FORMS').val(current_form_count);
        
        var table = $('table.extra-headers');
        console.log(table);
        table.append(row_html);
    })
    
    $('.advanced-form-toggle').click( function(e) {
        var current_text = $(this).text();
        if(current_text == 'Advanced Options')
            $(this).text('Basic Options');
        else
            $(this).text('Advanced Options');
        $('.advanced-options').toggle();
        e.preventDefault();
    })
}

function setupAutoReloadingSessionPage() {
    
    var placeholder = $('.loading-placeholder')
    var session_id = placeholder.attr('session_id');
    if(session_id === undefined) return;
    
    var url = '/sessions/' + session_id + '/is_complete.json';
    
    var checkWithServer = function() {

        $.getJSON(url, function(data) {
        
            if(data.complete === 'true') {
                
                if(data.error) {
                    console.log("spyglass: Request had error: %d", data.error)
                    var error_msg = $(document.createElement('p'));
                    error_msg.text('Error: ' + data.error);
                    error_msg.addClass('http-error');
                    $('.response.session-listing').replaceWith(error_msg);
                } else {
                    placeholder.replaceWith(data.pretty_response);
                    $('.response .linenos pre code').text(data.response_linenos);
                    $('.response .datetime').html('completed in ' + data.elapsed_milliseconds +
                        ' <abbr title="milliseconds">ms</abbr>')
                }
            } else {
                setTimeout(checkWithServer, 1000);
            }
        });    
    }
    
    setTimeout(checkWithServer, 1000);
}

function setSelectionRange(textElem, selectionStart, selectionEnd) {
    // copy-pasta from http://bytes.com/topic/javascript/answers/151663-changing-selected-text-textarea
    if (textElem.setSelectionRange) { // FF
    
        window.setTimeout( function(x,posL, posR) { // bug 265159
            return function(){ x.setSelectionRange(posL, posR); };
        }(textElem, selectionStart, selectionEnd), 100);
        
    } else if (textElem.createTextRange) { // IE
    
        var range = textElem.createTextRange();
        range.collapse(true);
        range.moveEnd('character', selectionEnd);
        range.moveStart('character', selectionStart);
        range.select();
    }
}

function setupPageFadeIn() {

    $('body.create-session-page #create-session-header-form h3').addClass('hidden-at-page-load');
    $('body.create-session-page #create-session-header-form .under-input:not(.advanced)').addClass('hidden-at-page-load');

    $('.hidden-at-page-load').hide();
    $('html').mousemove(fadeInOtherControls);
}

function fadeInOtherControls(event) {
    var event_coords = {x: event.pageX, y: event.pageY };

    if(mouse_coords != null) {
        if(!coordsAreEqual(mouse_coords, event_coords)) {
            $('.hidden-at-page-load').fadeIn(500);
            $('html').unbind('mousemove', fadeInOtherControls);
        }
    }
    mouse_coords = event_coords;
}

function coordsAreEqual(a, b) {
    return (a.x == b.x && a.y == b.y);
}

function setupDropdown(select) {
        
    var input = $(document.createElement('input'));
    input.attr('type', 'hidden');
    input.attr('name', select.attr('name'));
        
    var text_wrapper = $(document.createElement('span'));
    text_wrapper.css('margin-right', '10px');
    
    var container = $(document.createElement('div'));
    container.addClass('option-container');
    container.css('display', 'none');
    
    var dropdown = $(document.createElement('div'));
    dropdown.addClass('spyglass-dropdown');
    
    dropdown.append(input);
    dropdown.append(text_wrapper);
    dropdown.append(container);
    
    select.replaceWith(dropdown);
        
    var dropdownWasDefocused = function(event) {
        event.stopPropagation();
        container.hide();
        $(document).unbind('click', dropdownWasDefocused);
    }
    
        
    $('option', select).each( function(idx, opt) {
        opt = $(opt);
        
        if(opt.attr('selected')) {
            input.val(opt.text());
            text_wrapper.text(opt.text());
        }
        
        var new_opt = $(document.createElement('span'));
        new_opt.appendTo(container);

        new_opt.addClass('option');
        new_opt.text(opt.text());
        new_opt.width(80);

        new_opt.css('display', 'block');
        new_opt.css('padding-right', '20px');
        
        new_opt.click( function(event) {
    
            event.stopPropagation();
            
            var selected_value = $(this).text();
            input.val(selected_value);
            text_wrapper.text(selected_value);
            
            container.hide();
            $(document).unbind('click', dropdownWasDefocused);
        })
    })
    
    dropdown.click( function(event) {
        event.stopPropagation();
        container.show();
        
        $(document).bind('click', dropdownWasDefocused);
    });
    
}

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri (str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};
