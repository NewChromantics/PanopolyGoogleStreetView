function removeFromArray(array, item)
{
    while((index = array.indexOf(item)) > -1)
        array.splice(index,1);
}

function ShowElement($ElementName,Visible)
{
	if ( Visible == undefined )
		Visible = true;
	var Element = document.getElementById($ElementName);
	if ( !Element )
		return;
	Element.style.display = Visible ? "block" : "none";
}

function GetElement($Name)
{
	return document.getElementById($Name);
}

function IsDevice(Name)
{
	return ( navigator.userAgent.indexOf(Name) != -1 );
}

function IsWebsocketSupported()
{
	if ( "WebSocket" in window )
		return true;
	
	//ws = new MozWebSocket(url);
	//if ( "MozWebSocket" in window )
	//	return true;
	
	return false;
}

function IsAjaxSupported()
{
	if ( "XMLHttpRequest" in window )
		return true;
	return false;
}

function IsCanvasSupported()
{
	//	check three.js support and canvas support...
	return true;
}

function console_logStack()
{
	var stack = new Error().stack;
	console.log(stack);
}

//	register error handler for devices where we can't see the console
//	if chrome()
if ( IsDevice('iPad') || IsDevice('iPhone') )
{
	window.onerror = function(error,file,line) {
		var Debug = file + "(" + line + "): " + error;
		alert(Debug);
	};
}


function ascii (a)
{
	return a.charCodeAt(0);
}

function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}
