/*globals $:false, Offline:false */ // for JSHint validation
var months = [
	{ 'name' : 'January' },
	{ 'name' : 'February' },
	{ 'name' : 'Mars' },
	{ 'name' : 'April' },
	{ 'name' : 'May' },
	{ 'name' : 'June' },
	{ 'name' : 'July' },
	{ 'name' : 'August' },
	{ 'name' : 'September' },
	{ 'name' : 'October' },
	{ 'name' : 'November' },
	{ 'name' : 'December' }
];
var days = [
	{ 'sLbl': 'Mon', 'lLbl' : 'Monday' },
	{ 'sLbl': 'Tue', 'lLbl' : 'Tuesday' },
	{ 'sLbl': 'Wed', 'lLbl' : 'Wednesday' },
	{ 'sLbl': 'Thu', 'lLbl' : 'Thursday' },
	{ 'sLbl': 'Fri', 'lLbl' : 'Friday' },
	{ 'sLbl': 'Sat', 'lLbl' : 'Saturday' },
	{ 'sLbl': 'Sun', 'lLbl' : 'Sunday' }
];
var xData   = [];
var xTemp   = { 'xDate' : '', 'myX': false, 'smallX': false, 'xMonth': '', 'xComment' : '' };
var dToday  = new Date();
var db      = null;

// check for orientation change to reload the page in corresponding layout
if(window.DeviceOrientationEvent) {
  window.addEventListener('orientationchange', function() { location.reload(); }, false);
}


/**
 ************************************************************************************************************
 * document READY
 ************************************************************************************************************
 */
$(document).ready(function() {
	/* no more Cordova... using PhoneGap instead
	// if we actively run Cordova, add listener for when Cordova is fully loaded...
	if(location.hostname !== '' && location.pathname !== '/www/') // this check is also used at index.html!
		document.addEventListener("deviceready", onReady, false);
	else //...if not, then we don't use Cordova and no need to wait for it
	*/
		onReady();
}); 

/**
 * Document/Device ready (Cordova/jQuery fully loaded)
 */
function onReady() {
	// init buttons ------------------------------------------------------
	$('#navPrev')
		.click(calNav)
		.button({
			icon      :  "ui-icon-seek-prev",
			showLabel : false
		});
	$('#navNext')
		.click(calNav)
		.button({
			icon      :  "ui-icon-seek-next",
			showLabel : false,
		});
	$("#menu" ).menu({
		icons    : { submenu: "ui-icon-blank" },
		position : { my: "left top", at: "left bottom" },
		select   : function( event, ui ) { 
			if(ui.item.attr('id') == 'menu-help') {
				var winW = $(window).width() - 80;
				var winH = $(window).height() - 120;
				// add dialog with help on how to use the app
				$('<div/>', {
					id    : 'diaHelp',
					html  : '<ol>'+
							'<li>To add or remove an <span class="xCol">X</span>, simply tap the day</li>'+
							'<li>If the day was &quot;<span style="font-style:italic">half&#45;fantastic</span>&quot; you can instead add a <span class="xCol">small x</span>&#58;'+
							'<ul><li>Double-tap the day and choose a &quot;small x option&quot;</li>'+
							'<li>In your browser, right-click on the day instead</li></ul>'+
							'</li>'+
							'<li>To add a comment also double-tap the day and choose a &quot;comment option&quot;'+
							'<ul><li>In your browser, again, simply right-click instead</li></ul>'+
							'</li>'+
							'<li>Click the menu again for other, cool features &#58;&#41;</li>'+
							'<li>Congrats! You now know how to use this app &#58;&#41;</li>'+
					        '</ol>',
				})
				.appendTo('#page')
				.dialog({
					height    : "auto",
					maxHeight : winH,
					width     : winW > 500 ? 500 : winW,
					title     : 'Help',
					buttons   : {
						"Close": function() {
							$(this).dialog( "close" );
							$('#diaHelp').remove();
						}
					}
				});
			}
			else if(ui.item.attr('id') == 'menu-resetData') {
				$("#menu" ).css({'display' : 'none'});
				$('#diaConfirm').data('confirmCallback', deleteTable); // set delete table as callback if user confirms
				$('#diaConfirm').dialog('open'); // open confirmation dialog
			} else if(ui.item.attr('id') == 'menu-exportData') {
				$("#menu" ).css({'display' : 'none'});
				exportXData();
			} else if(ui.item.attr('id') == 'menu-importData') {
				$("#menu" ).css({'display' : 'none'});
				importXData();
			}
		}
	});
	$('#openMenu')
		.click(function(e) {
			if($('#menu').css('display') == 'none')
				$("#menu" ).slideDown();
			else {
				$("#menu" ).slideUp();
				$("#menu" ).removeData();
				$(this).blur(); // remove focus of clicked button
			}
			e.stopPropagation(); // don't continue with any other click event ( $('html').click )
		})
		.button();
	$('html').click(function() {
		// hide the menu if visible
		if($("#menu" ).is(":visible"))
			$("#menu" ).slideUp();
	});

	// score popover -----------------------------------------------------
	$('#scoreIcn').click(function(e) {
		if($('div[id^=fu_popover]').length > 0) {
		    // if the popover is currently visible and the score icon was clicked again, the user prolly wants to close
			if($('div.fu_popover_default').is(":visible")) {
				$('#scoreIcn').fu_popover('hide');
				return false; // needed to stop the "click trigger" initialized for this icon button from showing the popover again!
			}
			else {
				// update existing popover - recalculate score
				var loading = startScorePopover(); // this returns loading img until DB read is done
				$('#scoreIcn').fu_popover('updContent', loading);
				$('#scoreIcn').fu_popover('show');
			}
		}
		else {
			// init popover
			$('#scoreIcn')
				.css({ cursor: 'pointer' })
				.fu_popover({
					content     : startScorePopover(), // this returns loading img until DB read is done
					width       : '16.9rem',
					dismissable : true
			});
		}
	});

	// jQuery UI dialog for comments -------------------------------------
	$( "#diaCom" ).dialog({ 
		autoOpen  : false,
		resizable : false,
		draggable : false,
		modal     : true,
		height    : 110,
		width     : '22rem',
		buttons   : [ 
		  { id    : 'comOK',
			text  : 'OK',
			click : function() { 
			  var success = dayComment($(this).data('opener'), $(this).data('mode'));
			  if(success !== false)
				$(this).dialog( "close" );
			}
		  },
		  { text  : 'Cancel',
			click : function() {
			  $(this).dialog( "close" );
			}
		  }
		]
	});
	// when enter in comment field is pressed, click OK button
	$("#comInp").keyup(function(event) {
		if(event.keyCode === 13)
			$("#comOK").click();
	});
	
	// jQuery UI dialog for Import/Export --------------------------------
	$( "#diaExIn" ).dialog({
		autoOpen  : false,
		resizable : false,
		modal     : true,
		height    : "auto",
	});
	
	// jQuery UI dialog for confirmation ---------------------------------
	$( "#diaConfirm" ).dialog({
		autoOpen  : false,
		resizable : false,
		modal     : true,
		height    : "auto",
		width     : '22rem',
		buttons   : {
			"Delete": function() {
				var cb = $(this).data('confirmCallback');
				if(typeof cb === 'function')
				  cb();
				$(this).dialog( "close" );
			},
			Cancel: function() {
				$(this).dialog( "close" );
			}
		}
	});
	
	// change settings for message toaster -------------------------------
	$.toaster({ settings : {
	  toaster: { 
	    css : { width: 'auto', display: 'inline-block', top: 'unset', bottom: '42px', right: 'unset', margin: '0 auto' }
	  },
	  toast: { 
	    fade     : { 'in': 'normal', 'out': 'slow' },
		defaults : { title: '' },
	    template : 
			'<div class="alert alert-%priority% alert-dismissible" role="alert">' +
				'<span class="ui-icon" style="margin-top:0"></span> <span class="title"></span> <span class="message"></span>' +
				'<button type="button" class="close" data-dismiss="alert">' +
					'<span aria-hidden="true">&times;</span>' +
				'</button>' +
			'</div>'
	  },
	  timeout  : 4500,
	  donotdismiss : ['danger']
	} });
	
	// change settings for offline.js ------------------------------------
	Offline.options = {checks: {image: {url: 'favico.svg'}, active: 'image'}};
	Offline.reconnect = false; // no automatic, periodic check whether connection is down
	Offline.requests  = false; // don't attempt to remake requests which fail while connection is down
	Offline.on('up',function(){
		// The connection has gone from down to up
		$.toaster("Reconnected to internet!");
		// Check if danger toast for "no internet connection" is still visible
		$('div.alert-danger>span.message').each(function() {
		  if( $(this).text().substr(0,8) == 'Caution:' ) {
		    $(this).parent().remove(); // if yes, remove it
			return false;
		  }
		});
	});
	Offline.on('down',function(){
		// The connection has gone from up to down
		$.toaster("Connection lost!", '', 'warning');
		$.toaster("Caution: Using this app without an active internet connection may result in unexpected behavior!", '', 'danger');
	});
	
	/* nice little js to make "title" attribute appear on click, for example for mobile devices
	$('td[title]').click(function() {
		var $title = $(this).find('.pop-title');
		if(!$title.length)
			$(this).append('<span class="pop-title"' + $(this).attr('title') +'</span>' );
		else
			$title.remove();
	}); */
	
	// build calendar ----------------------------------------------------
	buildCal();
	
	// get x-data and add to calendar ------------------------------------
	initXData();
	
}

/**
 ************************************************************************************************************
 */
 
 
/**
 * Get English number's "th"
 * @param {Number|String} number 
 * @return {String} number's "th"
 */
function numbTh(number) {
  var nStr = ''+number;
  var n = parseInt(nStr.slice(-1));
  if(n === 1 && ( number < 11 || number > 19) )
    return 'st';
  else if(n === 2 && ( number < 11 || number > 19) )
    return 'nd';
  else if(n === 3 && ( number < 11 || number > 19) )
    return 'rd';
  return 'th';
}
/**
 * Convert number to have X digits with leading 0
 * @param {Number} n: number
 * @param {Number} d=2: how many digits
 * @return {String} number with X digits
 */
function numbXDigit(n,d) {
  d = typeof d !== 'undefined' ? d : 2;
  return ("0000000" + n).slice(-d);
}

/**
 * Check string trim function and create, if it doesn't exist
 */
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  };
}

/**
 * Get week of date
 * @return {Number} week number
 */
Date.prototype.getWeek = function() { 
  var d = new Date(+this);
  d.setHours(0,0,0);
  d.setDate(d.getDate()+4-(d.getDay()||7));
  return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};
/**
 * Get month of date as 2 digit number (e.g. 01 for January)
 * @return {String} month
 */
Date.prototype.getMonth2Digit = function() { 
  return numbXDigit( this.getMonth()+1 );
};
/**
 * Get date's day as 2 digit number (e.g. 09 for 9.1.1900)
 * @return {String} day
 */
Date.prototype.getDate2Digit = function() { 
  return numbXDigit( this.getDate() );
};
/**
 * Get week day (1-7) with 1 = Monday, 7 = Sunday (instead of 0)
 * @return {String} week day
 */
Date.prototype.getWeekDay = function() { 
  var d = this.getDay();
  d = d === 0 ? 7 : d;
  return d;
};
/**
 * Get date as string in format YYYYMMDD
 * @return {String} date string
 */
Date.prototype.getDateStr = function() { 
  return this.getFullYear() + this.getMonth2Digit() + this.getDate2Digit();
}; 

/**
 * Search through array of objects for certain property and value
 * @param {String} prop
 * @param {any} value
 * @param {Boolean} idxOnly=false: return array index if found, not object
 * @return {Object|Number|Boolean}: object or index of first match found or false 
 */
Array.prototype.getByPropValue = function(prop, value, idxOnly) {
  idxOnly = typeof idxOnly === 'boolean' ? idxOnly : false;
  for(var i=0; i < this.length; i++) {
    if(this[i].hasOwnProperty(prop)) {
	  if(this[i][prop] == value) 
	    if(!idxOnly)
          return this[i];
		else
		  return i;
    }
  }
  return false;
};

/* DATABASE FUNCTIONS ################################################################################ */

/**
 * load DB and create table, if needed
 */
function initXData() {
  // IndexeDB
  window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
  window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
  if(!window.indexedDB) {
    $.toaster("Your browser doesn't support a stable version of IndexedDB. The app won't function properly as save and load of data will not be available.", '', 'danger');
	return false;
  }
  // load DB
  var request = window.indexedDB.open("xcal", 1);
  // first time / upgrade version: create DB
  request.onupgradeneeded = function(event) {
	var dbUpg = event.target.result;
	if(dbUpg !== null) {
	  var objectStore = dbUpg.createObjectStore("xcal", {keyPath: "xDate"});
	  //objectStore.createIndex("xDate", "xDate", { unique: true });
	  objectStore.createIndex("xMonth", "xMonth", { unique: false });
	}
  };
  // DB loaded successfully
  request.onsuccess = function(event) {
    db = event.target.result;
	fetchXData();
  };
  // DB load error
  request.onerror = function(event) {
    console.log(event);
	$.toaster("An error occurred while initializing the database", '', 'danger');
  };
  
  // SQLite / WebSQL Database
  /*db = window.openDatabase("xcal", "1.0", "XCal DB", 0);
  db.transaction(function(tx) {
	tx.executeSql("CREATE TABLE IF NOT EXISTS xcal (xDate TEXT primary key, myX TEXT NOT NULL CHECK (myX IN ('TRUE','FALSE')), smallX TEXT NOT NULL CHECK (myX IN ('TRUE','FALSE')), xMonth TEXT NOT NULL, xComment TEXT)", [], function(tx, result) { // would be overkill :P CHECK (xMonth REGEX '^(\d{4})(1[0-2]|0[1-9])$')
	  fetchXData(); // get today's month's data
	});
  }, function(err){
	console.log(err);
	$.toaster("An error occurred while initializing the database", '', 'danger');
  });*/
}

/**
 * Read data from table
 * @param {Number} month default today's month
 * @param {Function} callback: default false
 */
function fetchXData(month, callback) {
  month = typeof month === 'string' ? month : ''+ dToday.getFullYear() + (dToday.getMonth2Digit());
  callback = typeof callback === 'function' ? callback : false;
  
  // IndexedDB: check if DB was successfully loaded
  if(db === null)
     return false;
  var tx = db.transaction(["xcal"]);
  var objectStore = tx.objectStore("xcal");
  
  // check month parameter
  if(month.length == 6) {
	// check if month reading is needed
	if(xData.getByPropValue('xMonth', month, true) !== false) { //console.log("already read");
	  addXMonthToCal(month);
	  return true; // no reading needed
	}
  } else
    return false; // don't allow to read without "where"
  
  // read from IndexedDB
  var index = objectStore.index("xMonth");
  index.openCursor(month).onsuccess = function(event) { //console.log(event.target.result);
	var cursor = event.target.result;
	if(cursor) {
	  // set result
	  var x = $.extend({}, xTemp);
      x.xDate    = cursor.value.xDate;
      x.myX      = cursor.value.myX;
      x.smallX   = cursor.value.smallX;
	  x.xMonth   = cursor.value.xMonth;
	  x.xComment = cursor.value.xComment;
      xData.push(x);
	  addXToCal(x);
	  cursor.continue();
    } else {
	  // cursor completed
	  if(callback !== false)
        callback();
	}
  };
}/*
// SQLite
function fetchXData(month, where, data, callback) {
  month = typeof month === 'string' ? month : ''+ dToday.getFullYear() + (dToday.getMonth()+1);
  where = typeof where === 'string' ? where : '';
  data = typeof data !== 'undefined' ? data : new Array();
  callback = typeof callback === 'function' ? callback : false;
  var sel = "SELECT * FROM xcal WHERE ";
  
  // set where clause and data for where
  if(where != '') {
    sel += where; 
	// if where clause is sent as string, data needs to be sent in data parameter 
	if(data.length <= 0)
      return false;
  } else if(month.length == 6) {
	// check if month reading is needed
	if(xData.getByPropValue('xMonth', month, true) !== false) { //console.log("already read");
	  addXMonthToCal(month);
	  return true; // no reading needed
	}
	sel += " month = ?";
	data = [ month ]; // set month as data for where
  } else
    return false; // don't allow to read without where clause
  
  // read from DB
  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM xcal WHERE xMonth = ?", data, function(tx,result) {
      for(var i=0; i < result.rows.length; i++) { //console.log(result.rows.item(i));
        // set result
		var x = $.extend({}, xTemp);
        x.xDate    = result.rows.item(i).xDate;
        x.myX      = result.rows.item(i).myX == "TRUE" ? true : false;
        x.smallX   = result.rows.item(i).smallX == "TRUE" ? true : false;
		x.xMonth   = result.rows.item(i).xMonth;
		x.xComment = result.rows.item(i).xComment;
        xData.push(x);
		addXToCal(x);
      }
	  if(callback !== false)
        callback();
    });
  });
}*/

/**
 * Save into table 
 * @param {Object} x 
 * @param {String} mode: default 'ins'
 */
function saveXData(x,mode) {
  mode = typeof mode !== 'undefined' ? mode : 'ins';
  
  // IndexedDB: check if DB was successfully loaded
  if(db === null)
     return false;
  var tx = db.transaction(["xcal"], "readwrite");
  var objectStore = tx.objectStore("xcal");
  var request;
  
  if(mode == 'ins') {
    // insert new X-Data
	request = objectStore.add(x);
    request.onerror = function(event) {
      console.log(event);
	  $.toaster("An error occurred while saving", '', 'warning');
    };
	request.onsuccess = function(event) {
	  $.toaster("Saved!"); //alert("Saved ("+event.target.result+")");
    };
	
  } else if(mode == 'upd') {
	// get row to update via index
	objectStore.get(x.xDate).onsuccess = function(event) {
	  // get existing data
      var data = event.target.result;
	  if(data) {
	    // update data
	    data.myX      = x.myX;
	    data.smallX   = x.smallX;
	    data.xComment = x.xComment;
	    var request = objectStore.put(data);
	    request.onerror = function(event) {
          console.log(event);
	      $.toaster("An error occurred while updating", '', 'warning');
        };
	    request.onsuccess = function(event) {
          $.toaster("Updated!");
	    };
	  } else {
		console.log(event);
		$.toaster("Unable to update data. Check console log for event", '', 'warning');
	  }
	};
	
  } else if(mode == 'del') {
	// delete row
	request = objectStore.delete(x.xDate);
	request.onerror = function(event) {
      console.log(event);
	  $.toaster("An error occurred while deleting", '', 'warning');
    };
	request.onsuccess = function(event) {
      $.toaster("Deleted!");
	  // remove from X-Data array
	  var xIdx = xData.getByPropValue('xDate', x.xDate, true);
	  xData.splice(xIdx, 1); 
    };
  }
 /*
  // SQLite
  if(mode == 'ins') {
	// set array of data for ? placeholder in correct order
	var data = [
	  x.xDate,
	  x.myX === true ? "TRUE" : "FALSE",
	  x.smallX === true ? "TRUE" : "FALSE",
	  x.xMonth,
	  x.xComment
	];
	// insert data to DB
    db.transaction(function(tx) {
	  tx.executeSql("INSERT INTO xcal (xDate, myX, smallX, xMonth, xComment) VALUES (?,?,?,?,?)", data, function(tx,res) {
	    alert("Saved");    
	  });
    }, function(err){
	  console.log(err);
	  alert("An error occured while saving");
    });
	
  } else if(mode == 'upd') {
	// set array of data for ? placeholder in correct order
	var data = [
	  x.myX === true ? "TRUE" : "FALSE",
	  x.smallX === true ? "TRUE" : "FALSE",
	  x.xComment,
	  x.xDate
	];
	// update to DB
	db.transaction(function(tx) {
	  tx.executeSql("UPDATE xcal SET myX = ?, smallX = ?, xComment = ? WHERE xDate = ?", data, function(tx,res) {
	    alert("Updated");    
	  });
    }, function(err){
	  console.log(err);
	  alert("An error occured while deleting");
    });
	
  } else if(mode == 'del') {
	// set array of data for ? placeholder in correct order
	var data = [
	  x.xDate
	];
	// delete from DB
	db.transaction(function(tx) {
	  tx.executeSql("DELETE FROM xcal WHERE xDate = ?", data, function(tx,res) {
	    // remove from X-Data array
	    xData.splice(x, 1); 
		alert("Deleted");    
	  });
    }, function(err){
	  console.log(err);
	  alert("An error occured while deleting");
    });
  }*/
}

/**
 * Delete DB table
 */
function deleteTable(drop) {
  drop = typeof drop !== 'undefined' ? drop : false;
  var request;
 
  // IndexedDB
  if(drop) {
	if(db !== null) {
	  // DB needs to be closed before it can be fully deleted
      db.close();
	  db = null;
	}
	// delete whole DB
	request = window.indexedDB.deleteDatabase("xcal");
    request.onsuccess = function () {
	  // is successful, remove all visual Xs
      $('section div.days').removeClass('myX');
	  $('section div.days').removeClass('smallX');
	  $('section div.days').children('div.inner').remove();
	  $.toaster("Table deleted! Please refresh the page to reinitialize DB and table!", '', 'danger');
    };
    request.onerror = function () {
	  $.toaster("An error occurred while deleting the table", '', 'danger');
    };
    request.onblocked = function () {
      $.toaster("Couldn't delete database due to the operation being blocked", '', 'danger');
    };
  } else {
    // check if DB was successfully loaded
    if(db === null)
      return false;
	var tx = db.transaction(["xcal"], "readwrite");
    var objectStore = tx.objectStore("xcal");
	request = objectStore.clear();
    request.onsuccess = function(event) {
      $('section div.days').removeClass('myX');
	  $('section div.days').removeClass('smallX');
	  $('section div.days').children('div.inner').remove();
	  // reset X-Data array
      xData = [];
	  $.toaster("All data deleted successfully");
    };
  }
  
  // SQLite
  /*
  if(drop)
    var sql = "DROP TABLE IF EXISTS xcal";
  else
	var sql = "DELETE FROM xcal";
  
  db.transaction(function(tx) {
	tx.executeSql(sql, [], function(tx, result) {
	  $('section div.days').removeClass('myX');
	  $('section div.days').removeClass('smallX');
	  $('section div.days').children('div.inner').remove();
	  // reset X-Data array
      xData = [];
	  //
	  if(drop)
	    alert("Table deleted! Please refresh page to reinitialize DB and table!");
	});
  }, function(err){
	console.log(err);
	alert("An error occurred while deleting the table");
  });*/
}

/**
 * Count scores
 * @param {function} callback 
 * @param {String} what - name of one property of score object to be returned
 * @return {Object|Number} scores
 */
function scoreCount(callback, what) {
  what = typeof what !== 'undefined' ? what : '';
  var score = {
    'allTot'   : 0.0,
	'monTot'   : 0.0,
	'xTot'     : 0,
	'sxTot'    : 0,
	'monXTot'  : 0,
	'monSXTot' : 0,
	'xsSpree'  : 0,  // any X sprees
	'xsSprMon' : '',
	'xSpree'   : 0,  // only big X sprees
	'xSprMon'  : '',
	'cxsSpree' : 0,  // CURRENT (needs to end TODAY) any X spree
	'cxSpree'  : 0,  // CURRENT (needs to end TODAY) only big X spree
	'bestMon'  : '', // best month as "value" in format YYYYMM
	'bestMonT' : '', // best month's description
	'bestMonS' : 0.0 // best month's score
  };
  var month = $('#currmon').attr('data-currmon');
  var spreeTemp  = 0;
  var spreeTempX = 0;
  var dateBefore = 0;
  var bestMon = { 'month': '', 'totScore': 0.00, 'totX': 0, 'totSX': 0, 'tmpMon': '', 'tmpScore': 0.00, 'tmpX': 0, 'tmpSX': 0 };
  
  // IndexedDB: check if DB was successfully loaded
  if(db === null)
     return false;
  var tx = db.transaction(["xcal"]);
  var objectStore = tx.objectStore("xcal");
  objectStore.openCursor().onsuccess = function(event) {
    var cursor = event.target.result;
    if(cursor) {
		var resetSpr = false;
		
		// check if month swapped
		checkBestMonth(bestMon, cursor.value.xMonth);
		
		// count scores -------------------------------------------------------
		if(cursor.value.myX) {
		  score.allTot++;        // total score: 1 for X, 0.5 for small X
		  score.xTot++;          // amount of Xs
		  // best month check
		  bestMon.tmpScore++;
		  bestMon.tmpX++;
		  // current month check
		  if(cursor.value.xMonth == month) {
		    score.monTot++;      // month score..
			score.monXTot++;     // amount of month's Xs
		  }
		}
	    else if(cursor.value.smallX) {
		  score.allTot += 0.5;   // total score: 1 for X, 0.5 for small X
		  score.sxTot++;         // amount of small Xs
		  // best month check
		  bestMon.tmpScore += 0.5;
		  bestMon.tmpSX++;
		  // current month check
		  if(cursor.value.xMonth == month) {
		    score.monTot += 0.5; // month score..
			score.monSXTot++;    // amount of month's small Xs
		  }
		}
		
		// check for "X spree" - how many X are adjacent dates ----------------
		if(cursor.value.myX || cursor.value.smallX) {
		  if(dateBefore === 0) {
			// first "any" X
			spreeTemp = 1; // we count Xs, not scores so we don't need to check for small X
			if(cursor.value.myX)
			  spreeTempX = 1; // first big X
		  }
		  else {
		    var year = parseInt( cursor.value.xDate.substr(0,4) );
			var mon  = parseInt( cursor.value.xDate.substr(4,2) );
			var day  = parseInt( cursor.value.xDate.substr(6,2) );
			// subtract 1 day from current date to check with dateBefore
			if(day == 1) {
			  var dPrev = getLastDayPrevMonth(year,mon-1); // date object has month 0 = Jan etc.
			  day = dPrev.getDate();
			}
			else
			  day--;
		    var dateNow = parseInt( ''+year+numbXDigit(mon)+numbXDigit(day) );
			// check if dates are adjacent
			if(dateNow == dateBefore) {
			  spreeTemp++;    // increase "any" X spree
			  if(cursor.value.myX)
			    spreeTempX++; // increase big X spree
			  else if(spreeTempX > 0) {
				// restart big X spree because small X doesn't count
				if(score.xSpree <= spreeTempX) {
				  score.xSpree  = spreeTempX;
				  score.xSprMon = months[mon-1].name +" "+ year;
				}
			    spreeTempX = 0;
			  }
			}
		    else
			  resetSpr = true; // dates are no longer adjacent -> reset
		  }
		}
		else
		  resetSpr = true; // comment only and no X -> reset
	    if(resetSpr) {
		  if(score.xsSpree <= spreeTemp) {
			score.xsSpree  = spreeTemp;
			score.xsSprMon = months[parseInt( String(dateBefore).substr(4,2) )-1].name +" "+ String(dateBefore).substr(0,4);
		  }
		  if(score.xSpree <= spreeTempX) {
			score.xSpree = spreeTempX;
			score.xSprMon = months[parseInt( String(dateBefore).substr(4,2) )-1].name +" "+ String(dateBefore).substr(0,4);
		  }
		  spreeTemp = 1;  // restart "any" X spree with first X
		  if(cursor.value.myX)
			spreeTempX = 1; // restart big X spree with first X
		  else
			spreeTempX = 0; // restart big X spree because smallX doesn't count
		}
		
		// NEXT ENTRY ---------------------------------------------------------
		dateBefore = parseInt( cursor.value.xDate ); // set dateBefore as current date, for next db entry comparison
		cursor.continue();
    }
	
    else {
	  // set current sprees, if applicable (last counted sprees end today)
	  if(dateBefore > 0) {
		var todayInt = parseInt( ''+ dToday.getFullYear() + dToday.getMonth2Digit() + dToday.getDate2Digit() );
		if(dateBefore == todayInt) {
		  score.cxsSpree = spreeTemp;  // need to use Temp vars as those have the last counts
		  score.cxSpree  = spreeTempX;
		}			
	  }
	  // check if last counted sprees are the highest
	  if(score.xsSpree <= spreeTemp) {
		score.xsSpree  = spreeTemp;
		if(dateBefore > 0)
		  score.xsSprMon = months[parseInt( String(dateBefore).substr(4,2) )-1].name +" "+ String(dateBefore).substr(0,4);
	  }
	  if(score.xSpree <= spreeTempX) {
		score.xSpree = spreeTempX;
		if(dateBefore > 0)
		  score.xSprMon = months[parseInt( String(dateBefore).substr(4,2) )-1].name +" "+ String(dateBefore).substr(0,4);
	  }
	  // check if month swapped after last read row
	  checkBestMonth(bestMon, 'YYYYMM'); // set any random comparison value
	  // set best month
	  if(bestMon.month !== '') {
		score.bestMon  = bestMon.month;
	    score.bestMonT = (months[parseInt( bestMon.month.substr(4,2) )-1].name).substr(0,3) +" "+ bestMon.month.substr(0,4);
		score.bestMonS = bestMon.totScore;
	  }
	  // return certain score or score object
	  if(what === '')
		callback(score);
	  else { 
		if(score.hasOwnProperty(what))
		  callback(score[what]);
		else
		  callback(0);
	  }
    }
  };
  
  // SQLite: read from DB
  /*
  db.transaction(function(tx) {
    tx.executeSql("SELECT * FROM xcal ORDER BY xDate ASC", [], function(tx,result) {
      for(var i=0; i < result.rows.length; i++) { //console.log(result.rows.item(i));
        var myX    = false;
	    var smallX = false;
		// count scores
		if(result.rows.item(i).myX == "TRUE") {
		  score.allTot++;        // total score: 1 for X, 0.5 for small X
		  score.xTot++;          // amount of Xs
		  if(result.rows.item(i).xMonth == month) {
		    score.monTot++;      // month score..
			score.monXTot++;     // amount of month's Xs
		  }
		  myX = true;
		}
	    else if(result.rows.item(i).smallX == "TRUE") {
		  score.allTot += 0.5;   // total score: 1 for X, 0.5 for small X
		  score.sxTot++;         // amount of small Xs
		  if(result.rows.item(i).xMonth == month) {
		    score.monTot += 0.5; // month score..
			score.monSXTot++;    // amount of month's small Xs
		  }
		  smallX = true;
		}
		// check for "X spree" - how many X are adjacent dates
		if(myX || smallX) {
		  if(dateBefore == 0) {
			spreeTemp = 1;    // first "any" X
			if(myX)
			  spreeTempX = 1; // first big X
		  }
		  else {
		    var year = parseInt( result.rows.item(i).xDate.substr(0,4) );
			var mon  = parseInt( result.rows.item(i).xDate.substr(4,2) );
			var day  = parseInt( result.rows.item(i).xDate.substr(6,2) );
			// subtract 1 day from current date to check with dateBefore
			if(day == 1) {
			  var dPrev = getLastDayPrevMonth(year,mon-1); // date object has month 0 = Jan etc.
			  day = dPrev.getDate();
			}
			else
			  day--;
		    var dateNow = parseInt( ''+year+numbXDigit(mon)+numbXDigit(day) );
			// check if dates are adjacent
			if(dateNow == dateBefore) {
			  spreeTemp++;    // increase "any" X spree
			  if(myX)
			    spreeTempX++; // increase big X spree
			  else if(spreeTempX > 0) {
				// restart big X spree because smallX doesn't count
				if(score.xSpree <= spreeTempX) {
				  score.xSpree  = spreeTempX;
				  score.xSprMon = months[mon-1].name +" "+ year;
				}
			    spreeTempX = 0;
			  }
			}
		    else {
			  if(score.xsSpree <= spreeTemp) {
				score.xsSpree  = spreeTemp;
				score.xsSprMon = months[parseInt( String(dateBefore).substr(4,2) )-1].name +" "+ String(dateBefore).substr(0,4);
			  }
			  if(score.xSpree <= spreeTempX) {
				score.xSpree = spreeTempX;
				score.xSprMon = months[parseInt( String(dateBefore).substr(4,2) )-1].name +" "+ String(dateBefore).substr(0,4);
			  }
			  spreeTemp = 1;  // restart "any" X spree with first X
			  spreeTempX = 1; // restart big X spree with first X
			}
		  }
		}
		dateBefore = parseInt( result.rows.item(i).xDate );
      }
	  // return certain score or score object
	  if(what == '')
		callback(score);
	  else { 
		if(score.hasOwnProperty(what))
		  callback(score[what]);
		else
		  callback(0);
	  }
    });
  });*/
}

/**
 * Export everything saved in DB and show "file content" (but not actual file due to smartphones)
 */
function exportXData() {
  var content = '';
  
  // IndexedDB: check if DB was successfully loaded
  if(db === null)
     return false;
  
  // update dialog for export
  $("#diaExIn" ).dialog('option', 'title', 'Export Data'); 
  $("#diaExIn" ).dialog('option', 'width', '23rem'); 
  $("#diaExIn" ).children('div.importProcessing').css({ display: 'block' });
  $("#exinHelp").text('Reading data to export...');
  $("#diaExIn" ).dialog('option', 'buttons', {
	"Close": function() {
	  $(this).dialog( "close" );
	}
  });
  $("#exinTA").prop('cols',41);
  $("#exinTA").val('');
  // show export
  $("#diaExIn" ).dialog('open');
 
  var tx = db.transaction(["xcal"]);
  var objectStore = tx.objectStore("xcal");
  objectStore.openCursor().onsuccess = function(event) {
    var cursor = event.target.result;
    if(cursor) {
	  var data = cursor.value.xDate +';'+ cursor.value.myX +';'+ cursor.value.smallX +';'+ cursor.value.xMonth +';'+ cursor.value.xComment;
	  if(content === '')
	    content = data;
	  else
		content += '\n'+ data; // &#10; Line Feed and &#13; Carriage Return for HTML textarea
	  cursor.continue();
	} else {
	  // update dialog with export-content to textarea
	  $("#diaExIn" ).dialog('option', 'title', 'Export Data - ready'); 
	  $("#diaExIn" ).children('div.importProcessing').slideUp();
	  $("#exinHelp").text("Copy the exported data displayed below and save to a file, that's it :)");
	  $("#exinTA").val(content);
	  $("#exinTA")[0].focus(); // for iOS
	  $("#exinTA")[0].setSelectionRange(0, content.length); // for iOS
	  $("#exinTA").on('click', function(){ 
		this.focus();
		this.setSelectionRange(0, this.value.length); // for iOS
	  });
	}
  };
}

/**
 * Check and save imported data to DB
 * @param {Boolean} overwrite: default true
 */
function importSave(overwrite) {
  overwrite = typeof overwrite === 'boolean' ? overwrite : true;
  
  // regex for the exact import format per line
  // YYYYMMDD;true|false;true|false;YYYYMM;free text with space and country specific letters (optional)
  var regex = /^(\d{4})(1[0-2]|0[1-9])(3[0-1]|2[0-9]|1[0-9]|0[1-9])(;{1})(true|false)(;{1})(true|false)(;{1})(\d{4})(1[0-2]|0[1-9])(;{1})[a-zA-Z0-9(),!\?\.\-\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF ]*$/;
  
  // IndexedDB: check if DB was successfully loaded
  if(db === null)
     return false;
  var tx = db.transaction(["xcal"], "readwrite");
  /*tx.oncomplete = function(event) {
	importClose({}, $("#diaExIn" ));
  };*/
  var objectStore = tx.objectStore("xcal");
 
  var lines = $('#exinTA').val().split('\n');
  var i     = 0;
  if(lines.length > 0)
    importSaveNext();

  //for(var i=0; i < lines.length; i++) {
  function importSaveNext() {
	if(i < lines.length) {
	  // ******************************************************************************************
	  // process current line 
	  // ******************************************************************************************
	  lines[i] = lines[i].trim();
	  if(!regex.test(lines[i])) {
	    if(lines[i].length > 1) // prolly just empty if less than 1, otherwise...
	      console.log('Could not process line '+(i+1)+' due to formatting error: '+lines[i]); //...inform wrong format
		// continue with next!
	    i++;
		importSaveNext();
		return;
	  }
	  
	  // convert data
	  var x = $.extend({}, xTemp);
	  var data = lines[i].split(';');
	  x.xDate  = data[0];
	  x.myX    = (data[1] == 'true');
	  x.smallX = (data[2] == 'true');
	  if(x.myX && x.smallX)
	    x.smallX = false;  // can't be both X
      x.xMonth   = data[3];
	  if(data.length == 5) // check if comment has been provided (optional)
	    x.xComment = data[4];
    
	  // check if X-Data already exists
	  var check = objectStore.get(x.xDate);
	  check.onsuccess = function(event) {
	    var data = event.target.result;
		
		if(data) {
		  // UPDATE mode ------------------------------------------------------
		  if(!overwrite) {
			// continue with next
	        i++;
		    importSaveNext();
		    return false;
		  }
		  // update to DB
	      data.myX      = x.myX;
	      data.smallX   = x.smallX;
	      data.xComment = x.xComment;
	      var updRequest = objectStore.put(data);
	      updRequest.onerror = function(event) {
	        console.log('Error while saving line '+(i+1)+' for update ('+lines[i] +')');
	        console.log(event);
			// continue with next
	        i++;
		    importSaveNext();
	      };
	      updRequest.onsuccess = function(event) {
	        // get updated X-Data from xData array (if existing) and update
		    var updX = xData.getByPropValue('xDate', x.xDate);
		    if(updX !== false) {
		      updX.myX      = x.myX;
		      updX.smallX   = x.smallX;
		      updX.xComment = x.xComment;
		    }
		    // check if updated month is currently visible
		    if(x.xMonth == $('#currmon').attr('data-currmon'))
		      addXToCal(x); // only if yes, update visually in calendar
		    // continue with next
	        i++;
		    importSaveNext();
	      };
		}
		else {
		  // INSERT mode ------------------------------------------------------
		  var insRequest = objectStore.add(x);
          insRequest.onerror = function(event) {
	        console.log('Error while saving line '+(i+1)+' ('+lines[i] +')');
	        console.log(event);
			// continue with next
	        i++;
		    importSaveNext();
	      };
	      insRequest.onsuccess = function(events) {
		    // check if inserted month is already read into xData array
		    var monCheck = xData.getByPropValue('xMonth', x.xMonth);
		    if(monCheck !== false)
		      xData.push(x); // only if yes, add inserted X-Data to array
		    // check if inserted month is currently visible
		    if(x.xMonth == $('#currmon').attr('data-currmon'))
		      addXToCal(x); // only if yes, add visually to calendar
		    // continue with next
	        i++;
		    importSaveNext();
	      };
		}
	  };
	  check.onerror = function(event) {
	    console.log('DB get() error: '+event);
		// continue with next
	    i++;
		importSaveNext();
	  };
    }
	
    else {
	  // ******************************************************************************************
	  // all complete 
	  // ******************************************************************************************
	  $.toaster("Import complete! (Check console log for any errors)");
      importClose({}, $("#diaExIn" ));
	}		
  }
}
/**
 * Close the import dialog
 * @param {Object} e: event
 * @param {Object} o: default $(this)
 */
function importClose(e, o) {
  o = typeof o !== 'undefined' ? o : $(this);
  // remove the additional data in dialog, only added for import
  o.children('div.dataFormat').remove();
  // close
  o.dialog( "close" );
}
/**
 * Let user fill "file content" (but not actual file due to smartphones) and use it to save to DB
 */
function importXData() {
  // update dialog for import
  $("#diaExIn" ).dialog('option', 'title', 'Import Data'); 
  $("#diaExIn" ).dialog('option', 'width', '33rem'); 
  $("#diaExIn" ).children('div.importProcessing').css({ display: 'none' });
  $("#diaExIn" ).dialog('option', 'buttons', {
	"Import": function() {
	  // quick check on input (detailed regex check per line in save function)
	  if($("#exinTA").val().length < 26) {
		$("#exinTA").focus();
	    return false;
	  }
	  // set processing
	  $(this).dialog('option', 'title', 'Import Data - Processing...'); 
	  $(this).children('div.importProcessing').slideDown();
	  // get radio choice
	  var overwrite = ( $('input[name=saveMode]:checked').val() == 'true');
	  importSave(overwrite);
	},
	Cancel: importClose
  });
  $("#exinHelp").html('Fill data to import in below text area <span class="xCol">in correct format</span>:');
  $('<div/>',{
	html     : 'Date&nbsp;&nbsp;&nbsp; &#59;big X&nbsp;&nbsp;&nbsp;&nbsp; &#59;small X&nbsp;&nbsp; &#59;Month &#59;Comment<br />'+
	           'YYYYMMDD&#59;true|false&#59;true|false&#59;YYYYMM&#59;Text allowing \'space\' and: 0-9 ( ) . , ! ? -'
  }).addClass("dataFormat").insertAfter("#exinHelp");
  $("#exinTA").prop('cols',58);
  $("#exinTA").val('');
  $("#exinTA").focus();
  $("#exinTA").off('click');
  $('<div/>',{
	html     : '<p>Please <span class="xCol">choose</span> how to handle <span class="xCol">existing data</span>:</p>'+
	           '<input id="owTrue"  type="radio" name="saveMode" value="true" checked="checked" /><label for="owTrue">Overwrite data</label>'+
			   '<input id="owFalse" type="radio" name="saveMode" value="false" /><label for="owFalse">Skip</label>'
  }).insertAfter("#exinTA");
  // show import options
  $("#diaExIn" ).dialog('open');
}


/* HELP FUNCTIONS ######################################################################################## */

/**
 * Get date string of a calendar div in format YYYYMMDD
 * @param {String} str
 * @return {Boolean} 
 */
function inputCheck(str) {
  var regex = /^[a-zA-Z0-9(),!\?\.\-\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF ]*$/;
  if(!regex.test(str)) {
	return false;
  }
  return true;
}

/**
 * Get date string of a calendar div in format YYYYMMDD
 * @param {Object} o 
 * @return {String} date string
 */
function dateStrFromCalDiv(o) {
  if(typeof o === 'undefined')
    return '';
  return $('#currmon').attr('data-currmon') + numbXDigit(o.attr('id').slice(1));
}
/**
 * Check if calendar div (specific date) is contained in X-Data and return if true
 * @param {Object} o 
 * @return {Object|Boolean} X-Data object or false
 */
function xdataFromCalDiv(o) {
  return xData.getByPropValue('xDate', dateStrFromCalDiv(o));
}

/**
 * Get calendar div (specific date) from X-Data object
 * @param {Object} x 
 * @return {Object|Boolean} jQuery calendar div
 */
function calDivFromXData(x) {
  var div = $('#d'+x.xDate.substr(6,2));
  if(div.length === 0 || div.length > 1)
	return false;
  else
	return div;
}

/**
 * Add a certain month from X-Data array to calendar
 * @param {String} m 
 */
function addXMonthToCal(m) {
  for(var i = 0; i < xData.length; i++) {
    if(xData[i].xMonth == m)
	  addXToCal(xData[i]);
  }
}

/**
 * Add X-Data object to calendar
 * @param {Object} x 
 */
function addXToCal(x) {
  // add X visually
  if(x.myX) {
    // normal X -------------------------------------
    if(x.xComment.length === 0)
	  dayX({ type : 'add' }, x);
    else
	  dayComment(x,'XCom',x.xComment);
  }
  
  else if(x.smallX) {
    // small X --------------------------------------
    if(x.xComment.length === 0)
	  dayX({ type : 'add' }, x);
    else
	  dayComment(x,'sXCom',x.xComment);
  } 
  
  else {
    // comment only ---------------------------------
    if(x.xComment.length === 0) {
	  // wrong data: no X and no comment
	  saveXData(x,'del');
    } else 
	  dayComment(x,'Com',x.xComment);
  }
}

/**
 * Get date object for the last day of the PREVIOUS month
 * @param {Number} year
 * @param {Number} mon
 * @return {Date}  
 */
function getLastDayPrevMonth(year,mon) {
  if(mon === 0)
	return new Date(year-1, 12, 0);  // last day of previous month which is Dec last year
  else 
	return new Date(year, mon, 0);   // last day of previous month
}

/**
 * Get date object for the first day of the NEXT month
 * @param {Number} year
 * @param {Number} mon
 * @return {Date}  
 */
function getFirstDayNextMonth(year,mon) {
  if(mon == 11)
    return new Date(year+1, 0, 1);   // first day of next month which is Jan next year
  else 
    return new Date(year, mon+1, 1); // first day of next month
}

/**
 * Set score popover content, after reading
 * @return {String} popover content
 */
function displayScorePopover(score) {
  var cont = '';
  var cls  = 'bestMonth';
  cont += '<table class="score">';
  cont += '<tr><td>Total Score</td><td>'+ score.allTot +'</td></tr>';
  cont += '<tr><td>Total <span class="xCol">X</span>s</td><td>'+ score.xTot +'</td></tr>';
  cont += '<tr><td>Total small <span class="xCol">x</span>s</td><td>'+ score.sxTot +'</td></tr>';
  cont += '<tr class="divider"><td>Month Score</td><td>'+ score.monTot +'</td></tr>';
  cont += '<tr><td>Month <span class="xCol">X</span>s</td><td>'+ score.monXTot +'</td></tr>';
  cont += '<tr><td>Month small <span class="xCol">x</span>s</td><td>'+ score.monSXTot +'</td></tr>';
  if(score.bestMon == $('#currmon').attr('data-currmon'))
	cls = 'today';
  cont += '<tr><td>Best Month</td><td><span class="'+ cls +'">'+ score.bestMonT +'</span></br><span class="bestMonth">( '+ score.bestMonS +' )</span></td></tr>';
  cont += '<tr class="divider"><td>Longest <span class="xCol">Xx</span> spree</td><td title="'+ score.xsSprMon +'">'+ score.xsSpree +'</td></tr>';
  cont += '<tr><td>Longest <span class="xCol">X</span> spree</td><td title="'+ score.xSprMon +'">'+ score.xSpree +'</td></tr>';
  cont += '<td>Current <span class="xCol">Xx</span> spree</td><td>'+ score.cxsSpree +'</td></tr>';
  cont += '<tr><td>Current <span class="xCol">X</span> spree</td><td>'+ score.cxSpree +'</td></tr>';
  cont += '</table>';
  // update score popover
  $('#scoreIcn').fu_popover('updContent',cont);
  $('#scoreIcn').fu_popover('show');
}

/**
 * Best month score checks
 * @param {Object} bestMon 
 * @param {String} month
 */
function checkBestMonth(bestMon, month) {
  if(bestMon.tmpMon == month) {
	 return; // month didn't swap
  }
  // month swapped: check if temporary month is the new best one
  if(bestMon.tmpMon !== '') {
	if( ( bestMon.totScore < bestMon.tmpScore ) ||
	    ( bestMon.totScore == bestMon.tmpScore && bestMon.totX < bestMon.tmpX ) ||
	    ( bestMon.totScore == bestMon.tmpScore && bestMon.totX == bestMon.tmpX && bestMon.totSX <= bestMon.tmpSX )  
	  ) {
	  // the current temporary score is higher than the last best month -> set new best month
	  bestMon.month    = bestMon.tmpMon;
	  bestMon.totScore = bestMon.tmpScore;
	  bestMon.totX     = bestMon.tmpX;
	  bestMon.totSX    = bestMon.tmpSX;
	}
	// reset counting for new month
	bestMon.tmpScore = 0.0;
	bestMon.tmpX = bestMon.tmpSX = 0;
	bestMon.tmpMon = month; // set new month counting for 
  }
  else 
	bestMon.tmpMon = month; // first month - keep counting...
}

/**
 * Build and return content for simple score popover
 * @return {String} popover content
 */
function startScorePopover() {
  setTimeout(function() {
    scoreCount(displayScorePopover);
  }, 50);
  // diplay loading icon while score function is running
  return '<img src="img/ajax-loader.gif" style="display: block; margin: 0 auto;">';
}



/* EVENT FUNCTIONS ####################################################################################### */

/**
 * Navigate to previous/next month in calendar (button click event) and rebuild calendar divs
 * @param {Object} e 
 */
function calNav(e) {
  // get date to navigate too from button itself
  var newDateStr = $(this).attr('data-gotodate');
  // set month for Date() function
  var mon = parseInt( newDateStr.substr(4,2) );
  mon--;
  // set new date object
  var dNewDate = new Date(newDateStr.substr(0,4), mon, newDateStr.substr(6,2));
  // build calendar
  buildCal(dNewDate);
  // read x-Data for month
  fetchXData(newDateStr.substr(0,6));
  // remove focus of clicked button
  $(this).blur(); 
}

/**
 * Click event on calendar div
 * @param {Object} e 
 * @param {Object} o=$(this): calendar div jQuery object or X-Data object
 */
function dayX(e, o) { 
  o = typeof o !== 'undefined' ? o : $(this); // for click event, o is empty and $(this) is set / for fake call of this function, o is set
  if(typeof o === 'undefined')
    return false;
  var newX = false;
  var dateStr = '';
  var x = false;
  
  // check object parameter
  if(typeof o.attr === 'function') {
    // jQuery object
    dateStr = dateStrFromCalDiv(o);
	x = xData.getByPropValue('xDate', dateStr);
  } else {
	// X-Data object
	dateStr = o.xDate;
	x = $.extend({}, o);
	o = calDivFromXData(o);
	if(o === false)
	  return false;
  }
  
  // remove/set X --------------------------------------------------------
  if(e.type != 'add' && ( o.hasClass('myX') || o.hasClass('smallX') )) {
    // remove X visually
	o.removeClass('myX');
	o.removeClass('smallX');
	o.children('div.inner').remove();
	// remove X from X-Data
	if(x !== false) {
	  saveXData(x, 'del'); // SAVE data ---------------------------------------
	}
  } else {
	// add X to X-Data, if needed
    if(x === false) {
	  x = $.extend({}, xTemp);//Object.assign({}, xTemp);
	  x.xDate = dateStr;
	  x.xMonth = dateStr.substr(0,6);
	  newX = true;
	}
	if(e.type == 'contextmenuselect')
	  x.smallX = true;
    else if(e.type == 'click')
	  x.myX = true;
	// add X visually
    if(x.smallX) {
	  o.removeClass('myX');
	  o.addClass('smallX');
	}
	else {
	  o.removeClass('smallX');
	  o.addClass('myX');
	}
    // save update, if needed
    if(newX && e.type != 'add') {
	  xData.push(x);
	  saveXData(x);        // SAVE data ---------------------------------------
	} else if(e.type != 'add') {
	  saveXData(x, 'upd'); // SAVE data ---------------------------------------
	}
  }
  //console.log(xData);
}

/**
 * Enter/OK button handler for comment dialog
 * @param {Object} o: calendar div jQuery object or X-Data object
 * @param {String} m: comment "mode" (delC=delete, XCOM=X+comment, sXCom=small X+comment, otherwise comment only)
 * @param {String} c: comment, optional
 */
function dayComment(o, m, c) {
  if(typeof c !== 'string') {
    c = $('#comInp').val();
	if(c.length > 0) { 
	  if(!inputCheck(c)) {
	    $.toaster("Could not process the comment due to formatting error! Please only type text (alphanumeric inclusive space) or following special characters: ( ) . , ! ? - ", '', 'warning');
	    return false;
	  }
	}
  }
  if(typeof o === 'undefined')
    return false;
  var insert = false;
  var dateStr = '';
  var x = false;
  var fromDB = false;
  
  // check object parameter
  if(typeof o.attr === 'function') {
    // jQuery object
    dateStr = dateStrFromCalDiv(o);
	x = xData.getByPropValue('xDate', dateStr);
  } else {
	// X-Data object
	fromDB = true;
	dateStr = o.xDate;
	x = o;
	o = calDivFromXData(o);
	if(o === false)
	  return false;
  }
  
  // check if comment was entered
  if(c.length <= 0 && m != 'delC')
    return;

  // check if day exists in X-Data
  if(x === false && m != 'delC') {
    // new X-Data with comment
    x = $.extend({}, xTemp);
	x.xDate = dateStr;
	x.xMonth = dateStr.substr(0,6);
	xData.push(x);
	insert = true;
  }
  if(typeof x === 'undefined' || x === false)
    return false;
	
  // delete comment ------------------------------------------------------
  if(m == 'delC') {
    x.xComment = '';
	o.children('div.inner').remove();
	// check if it was a "comment only" that was deleted
	if(x.myX === false && x.smallX === false) {
	  insert = 'del'; // if yes: delete entry
	}
  }
  // set comment ---------------------------------------------------------
  else {
	x.xComment = c;
	o.children('div.inner').remove();
    o.html( o.html() + '<div class="inner">'+ x.xComment +'</div>' );
	
	// set X
	if(m == 'sXCom') {        // small X option was chosen
	  x.smallX = true;
	  x.myX    = false;
	  o.removeClass('myX');
	  o.addClass('smallX');
	} else if(m == 'XCom') {  // normal X
	  x.myX    = true;
	  x.smallX = false;
	  o.removeClass('smallX');
	  o.addClass('myX');
	} else {                  // comment only
	  x.myX    = false;
	  x.smallX = false;
	  o.removeClass('myX');
	  o.removeClass('smallX');
	}
  }
  
  // SAVE data -----------------------------------------------------------
  if(!fromDB) {
    if(insert === true)
      saveXData(x);
    else if(insert == 'del')
	  saveXData(x,'del');
    else
	  saveXData(x,'upd');
  }
  
  // reset comment field 
  if(m != 'delC' && !fromDB)
    $('#comInp').val('');
}


/* CALENDAR BUILDING... ################################################################################## */

/**
 * create calendar heading row divs
 */
function buildCalHead() {
  // week div
  $('<div/>', {
    id    : 'hWeek',
    title : 'Weeks',
    text  : 'W'
  }).addClass('headings week').appendTo('#cal');
  // day divs
  for(var i = 0; i < days.length; i++) {
	$('<div/>', {
		id    : 'h'+days[i].sLbl,
		title : days[i].lLbl,
		text  : days[i].sLbl
	}).addClass('headings').appendTo('#cal');
  }
}

/**
 * create calendar day divs
 * @param {Date} dCalDate=new Date(): date on which calendar build should be based on
 */
function buildCal(dCalDate) {
  dCalDate = typeof dCalDate !== 'undefined' ? dCalDate : new Date();
  var mon  = dCalDate.getMonth();
  var year = dCalDate.getFullYear();
  
  // init
  $('#cal').empty();
  buildCalHead();
  
  // set title
  $('#currmon').text( months[mon].name +" "+ year );
  $('#currmon').attr('data-currmon', year+numbXDigit(mon+1));
  
  // set previous and next month's dates
  var dPrev = getLastDayPrevMonth(year,mon);
  var dNext = getFirstDayNextMonth(year,mon);
  
  
  // set navigation
  $('#navPrev').attr('data-gotodate', dPrev.getDateStr());
  $('#navNext').attr('data-gotodate', dNext.getDateStr());
  
  // set days div height
  var h = $('#cal').height() / 100 * 16;  // 16% height of calendar per div (6 rows of days)
  var dFirst   = new Date(year, mon, 1); // get first day of calendar month/date
  var firstDay = dFirst.getWeekDay();
  var currWeek = dFirst.getWeek();
  var lastDayPrev = dPrev.getDate();     // now get last day of previous month, to build days before first day
  // week div
  $('<div/>', {
    id    : 'w'+currWeek,
    title : 'Week '+currWeek,
    text  : currWeek,
	css   : { height: h+'px' } 
  }).addClass('days week').appendTo('#cal');
  // day divs
  var nr = 0;
  for(var p = 1; p < firstDay; p++) {
	// calculate the day date number: 
	// e.g. last day of previous month was 31st of July. lastDayPrev=31
	// firstDay is the "weekday"(1-7 for Mon-Sun) which would be the 1st of August e.g. Wednesday. firstDay=3
	// now we need to build first Monday, then Tuesday so we count: 31 - (3-INDEX) + 1
	// 31 - (3-1) + 1 = 30 = Monday | 31 - (3-2) + 1 = 31 = Tuesday | and Wednesday would be 1st, which is build below
    nr = lastDayPrev - (firstDay-p)+1; 
    $('<div/>', { 
	  id   : 'p'+nr,
	  text : nr,
	  css  : { height: h+'px' }
	}).addClass('days inactive').appendTo('#cal');
  }
  
  // build calendar - current month -------------------------------------------
  var dLast    = new Date(year, mon+1, 0);
  var dayCount = firstDay; // days 1 - 7
  for(var i = 1; i <= dLast.getDate(); i++) {
    var cssClasses = 'days';
	var dateStr    = year+numbXDigit(mon+1)+numbXDigit(i);
	var content    = i;
	
	// check for today's date
	if(dToday.getDateStr() == dateStr)
	  cssClasses += ' today';
	
	// day div
	$('<div/>', { 
	  id    : 'd'+numbXDigit(i),
	  html  : content,
	  title : days[dayCount-1].lLbl +', '+ i + numbTh(i) +' of '+ months[mon].name +" "+ year,
	  css   : { height: h+'px', cursor: 'crosshair' },
	  click : dayX
	}).addClass(cssClasses).appendTo('#cal');
	dayCount++;
	
	// check week swap
	if(dayCount === 8) {
	  currWeek++;
	  if(mon == 11 && currWeek > 52)
	    currWeek = 1;
	  dayCount = 1;
	  // week div
	  $('<div/>', {
		id    : 'w'+currWeek,
		title : 'Week '+currWeek,
		text  : currWeek,
		css   : { height: h+'px' } 
	  }).addClass('days week').appendTo('#cal');
	}
  }
  
  // build calendar - after last ----------------------------------------------
  nr = 1; // first date of next month
  // day divs
  for(var n = dayCount; n <= 7; n++) {
    $('<div/>', { 
	  id   : 'n'+nr,
	  text : nr,
	  css  : { height: h+'px' }
	}).addClass('days inactive').appendTo('#cal');
	nr++;
  }
  
  // context menu -------------------------------------------------------------
  $('#cal').contextmenu({
    delegate : '.days:not(.inactive)',
	ignoreParentSelect : false,
	preventContextMenuForPopup : true,
	taphold : false,
	preventSelect: true,
	position:  { my: "left top", at: "left top" },
	menu : [
	  //{ title: "small X", cmd: "sX", uiIcon: "ui-icon-closethick", children: [ { title: "Comment...", cmd: "sXCom", uiIcon: "ui-icon-comment" } ] },
	  { title: "small x", cmd: "sX", uiIcon: "ui-icon-closethick" },
	  { title: "small x + Comment...", cmd: "sXCom", uiIcon: "ui-icon-comment" },
	  { title: "X + Comment...", cmd: "XCom", uiIcon: "ui-icon-comment" },
	  { title: "Comment only...", cmd: "Com", uiIcon: "ui-icon-comment" },
	  { title: "Remove Comment", cmd: "delC", uiIcon: "ui-icon-trash" }
	],
	select: function(event, ui) {
	  var o;
	  // check if comment div was clicked...
	  if(ui.target.hasClass('inner'))
	    o = ui.target.parent(); //...yes: get parent instead  
	  else
		o = ui.target;          //...no: use clicked div
	  // check clicked command 
	  if(ui.cmd == 'sX')
	    dayX(event, o);
	  else if(ui.cmd == 'sXCom' || ui.cmd == 'XCom' || ui.cmd == 'Com') {
	    $('#diaCom').dialog('option', 'position', {my: "left top", at: "left top", of: ui.target} );
	    $('#diaCom').data('opener', o);
		$('#diaCom').data('mode', ui.cmd);
		$('#diaCom').dialog('open');
	  }
	  else if(ui.cmd == 'delC')
	    dayComment(o, ui.cmd);
	},
	beforeOpen: function(event, ui) {
	  var o;
	  // check if comment div was clicked...
	  if(ui.target.hasClass('inner'))
	    o = ui.target.parent(); //...yes: get parent instead  
	  else
		o = ui.target;          //...no: use clicked div
	  // check if delete comment should be visible or not
	  var x = xdataFromCalDiv(o);
	  if(x === false)
	    $(this).contextmenu("showEntry", "delC", false);
	  else if(x.xComment === '')
	    $(this).contextmenu("showEntry", "delC", false);
	  else
	    $(this).contextmenu("showEntry", "delC", true);
	},
  });
  var tapped = false;
  $("#cal .days:not(.inactive)").on("touchstart",function(e) {
	var o = $(this); // set div object
    if(!tapped) {  //if tap is not set, set up new call to check for double tap
      tapped=setTimeout(function(){ 
	     tappedTimeout(o); // this will enable the .click event again, if user didn't double tap
	  },300);
    } else {       // tapped again within 300ms of last tap. double tap
      clearTimeout(tapped);
	  tapped= false;
      // double tapped:
	  $('#cal').contextmenu("open", o, 'doubletap');
    }
	e.preventDefault();  // this will remove the .click event which we need for double tap
	e.stopPropagation(); // don't continue with other touchstart
  });
  function tappedTimeout(o) {
    tapped=null;
    o.click();
  }
}