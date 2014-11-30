if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str){
		return this.slice(0, str.length) == str;
	};
}

if (typeof String.prototype.endsWith != 'function') {
	String.prototype.endsWith = function (str){
		return this.slice(-str.length) == str;
	};
}

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

//	hijack console.log
function BindConsole($ElementName)
{
	var $console = document.getElementById( $ElementName );
	if ( !$console )
		return;

	var oldLog = console.log;
	console.log = function (message)
	{
		$console.innerText += message + "\n";
		oldLog.apply(console, arguments);
	};
}

BindConsole('console');



function ascii (a)
{
	return a.charCodeAt(0);
}



function ab2str(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function Uint32ToString($Int)
{
	var $a = ($Int >> 24) & 0xff;
	var $b = ($Int >> 16) & 0xff;
	var $c = ($Int >> 8) & 0xff;
	var $d = ($Int >> 0) & 0xff;
	return String.fromCharCode($a) + String.fromCharCode($b) + String.fromCharCode($c) + String.fromCharCode($d);
}

function str2ab(str) {
	var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
	var bufView = new Uint8Array(buf);
	for (var i=0, strLen=str.length; i<strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
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

function IsUndefined($Value)
{
	return typeof $Value == 'undefined';
}

function CheckDefaultParam($Param,$Default)
{
	if ( IsUndefined($Param) )
		return $Default;
	return $Param;
}


//	integer eg; FF0000 to hex
function GetHexColour($Rgb)
{
	var $Length = 6
	return ('000000000' + $Rgb.toString(16) ).substr(-$Length);
}


function forEach($Array,$Callback)
{
	for ( var $Key in $Array )
	{
		$Callback( $Array[$Key] );
	}
}

Math.RadiansToDegrees = function(rad)
{
	return rad*(180/Math.PI);
}

Math.DegreesToRadians = function(deg)
{
	return deg * (Math.PI/180);
}

function MathSign(n)
{
	return n?n<0?-1:1:0;
}

function isInt(n)
{
	var $Int = parseInt(n);
	return $Int != NaN;
}

//	get params from hash
//	pano.option.option.option
var $HashParams = window.location.hash.split('.');
if ( $HashParams.length > 0 && $HashParams[0][0] == '#' )
	$HashParams[0] = $HashParams[0].substr(1);

function GetHashParam($Index)
{
	if ( $Index < 0 || $Index > $HashParams.length )
		return null;
	return $HashParams[$Index];
}

function HasHashParam($Name)
{
	var $HasParam = false;
	forEach( $HashParams, function($Param) { $HasParam = $HasParam || ($Param==$Name); } );
	return $HasParam;
}



function Lerp($From,$To,$t)
{
	var $Delta = $To - $From;
	return $From + ( $Delta * $t );
}

function GetLerp($From,$To,$Value)
{
	var $Delta = $To - $From;
	var $t = ($Value - $From) / $Delta;
	return $t;
}



function GetType($Object)
{
	var $Type = typeof $Object;
	if ( $Type != 'object' )
		return $Type;

	var $ObjectPrefix = '[object ';
	$Type = Object.prototype.toString.call( $Object );
	if ( !$Type.startsWith($ObjectPrefix) )
		return $Type;

	$Type = $Type.substring( $ObjectPrefix.length );
	$Type = $Type.substring( 0, $Type.length-1 );
	return $Type;
}

function isType($Object,$Type)
{
	return GetType($Object) == $Type;
}

function isArray($Object)
{
	return isType($Object,'Array');
}


function frac(f)
{
	return f - Math.floor(f);
}

//	modified aras' algorithm for RGB so I can use alpha for something else
//	http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
function EncodeFloatRGB(f)
{
	var enc = new THREE.Vector4( f * 1.0, f*255.0, f*65025.0, 0);
	enc.x = frac(enc.x);
	enc.y = frac(enc.y);
	enc.z = frac(enc.z);
	
	enc.x -= enc.y * (1.0/255.0);
	enc.y -= enc.z * (1.0/255.0);
	enc.z -= enc.w * 0;//(1.0/255.0);
	//enc -= enc.yzww * new THREE.Vector4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);
	return enc;
}


function CanPlayVideo($Type,$Codec)
{
	var $Video = document.createElement('video');
	var $VideoTypeString = 'video/' + $Type;
	
	//	gr: in chrome, h264 won't play as a codec type...
	if ( $Codec == 'h264' )
		$Codec = '';
	
	if ( $Codec != '' )
		$VideoTypeString += ';codecs="' + $Codec + '"';

	var $CanPlay = $Video.canPlayType($VideoTypeString);
	if ( $CanPlay == "" )
	{
		console.log("Browser cannot play " + $VideoTypeString );
		return false;
	}
	
	return true;
}


