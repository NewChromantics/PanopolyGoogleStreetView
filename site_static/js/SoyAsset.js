var HAVE_NOTHING = 0;//	- no information whether or not the audio/video is ready
var HAVE_METADATA = 1;	//	- metadata for the audio/video is ready
var HAVE_CURRENT_DATA = 2;	//- data for the current playback position is available, but not enough data to play next frame/millisecond
var HAVE_FUTURE_DATA = 3;	//- data for the current and at least the next frame is available
var HAVE_ENOUGH_DATA = 4;

function GetHost()
{
	return 'http://image.panopo.ly/';
}








//	same as asset data in .meta so can construct from json
function SoyAssetMeta($Filename,$Width,$Height,$Format,$Codec,$BitRate,$Layout)
{
	if ( arguments.length == 0 )
		return;
	
	//	if only one arg, we've supplied JSON
	if ( arguments.length <= 1 )
	{
		var $Json = arguments[0];
		for ( var $Key in $Json )
			this[$Key] = $Json[$Key];
		return;
	}
	
	$Layout = CheckDefaultParam( $Layout, 'equirect' );
	$Layout = CheckDefaultParam( $Codec, null );
	$Layout = CheckDefaultParam( $BitRate, null );
	
	this.Width = $Width;
	this.Height = $Height;
	this.Format = $Format;
	this.Codec = $Codec;
	this.BitRate = $BitRate;
	this.Filename = $Filename;
	this.Layout = $Layout;
}

SoyAssetMeta.prototype.IsBetter = function($that)
{
	console.log(this);
	//	gr: temp, jsonp (google street depth is best)
	var $this_isjsonp = (this.Format == 'jsonp');
	var $that_isjsonp = ($that.Format == 'jsonp');
	if ( $this_isjsonp != $that_isjsonp )
		return $this_isjsonp;
	
	//	video always better than image
	if ( this.IsVideo() != $that.IsVideo() )
		return this.IsVideo();
	
	//	compare width
	if ( this.Width > $that.Width )
		return true;
	if ( this.Width < $that.Width )
		return false;
	
	//	compare height
	if ( this.Height > $that.Height )
		return true;
	if ( this.Height < $that.Height )
		return false;
	
	if ( this.IsVideo() )
	{
		if ( this.BitRate > $that.BitRate )
			return true;
		if ( this.BitRate < $that.BitRate )
			return false;
	}
	
	//	not better, same
	return false;
}

//	.mName and .mParam
SoyAssetMeta.prototype.GetLayoutAndParam = function()
{
	//	legacy default
	var $LayoutAndParam = { 'mName':"equirect", 'mParam':null };
	var $Layout = this.Layout;
	if ( !$Layout )
		$Layout = this.Codec;
	if ( !$Layout )
		return $LayoutAndParam;
	
	var $ParamStart = $Layout.indexOf('_');
	if ( $ParamStart > 0 )
	{
		$LayoutAndParam.mParam = $Layout.slice($ParamStart+1);
		$LayoutAndParam.mName = $Layout.slice(0,$ParamStart);
	}
	else
	{
		$LayoutAndParam.mName = $Layout;
	}
	
	//	legacy codec was cubemap or some video codec, if it's not cubemap, it was equirect
	if ( $Layout == this.Codec && $LayoutAndParam.mName != 'cubemap' )
	{
		$LayoutAndParam.mName = 'equirect';
	}
	
	return $LayoutAndParam;
}

SoyAssetMeta.prototype.GetLayout = function()
{
	var $LayoutAndParam = this.GetLayoutAndParam();
	return $LayoutAndParam.mName;
}


SoyAssetMeta.prototype.GetCubemapLayout = function()
{
	var $LayoutAndParam = this.GetLayoutAndParam();
	if ( $LayoutAndParam.mName != 'cubemap' )
		return false;
	return $LayoutAndParam.mParam;
}

SoyAssetMeta.prototype.IsCubemap = function()
{
	var $Layout = this.GetCubemapLayout();
	return $Layout != false;
}

SoyAssetMeta.prototype.IsVideo = function()
{
	if ( typeof this.BitRate == 'undefined' )
		return false;
	return true;
}

SoyAssetMeta.prototype.IsSupported = function($Config)
{
	return $Config.SupportsAssetMeta(this);
	
}




function SoyAsset($Meta,$OnLoaded,$OnFailed)
{
	if ( arguments.length <= 1 )
	{
		this.mType = arguments[0];
		return;
	}

	var $UrlIsData = $Meta.Filename.startsWith('data:');
	var $UrlIsHttp = $Meta.Filename.startsWith('http:');
	var $Host = ($UrlIsData||$UrlIsHttp) ? '' : GetHost();
	
	this.mAsset = null;			//	set once loaded
	this.mUrl = $Host + $Meta.Filename;
	this.mOnLoaded = $OnLoaded;
	this.mOnFailed = $OnFailed;
	this.mDesired = true;		//	when we don't want the asset we mark it
	this.mMeta = $Meta;
}

SoyAsset.prototype.GetType = function()
{
	return this.mType;
}

SoyAsset.prototype.OnError = function()
{
	//	not a failure if we cancelled
	if ( !this.mDesired )
		return;
	this.mOnFailed( this );
}

SoyAsset.prototype.IsLoaded = function()
{
	return (this.mAsset != null);
}




SoyAsset_Ajax.prototype = new SoyAsset('Ajax');

function SoyAsset_Ajax($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
	if ( typeof $Meta == 'string' )
	{
		var $Filename = $Meta;
		$Meta = new SoyAssetMeta();
		$Meta.Filename = $Filename;
	}
	
	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	this.mAjax = null;
	this.mOnParseData = CheckDefaultParam( $Meta.mOnParse, null );
	
	if ( $DoLoad )
		this.Load();
}


SoyAsset_Ajax.prototype.Stop = function()
{
	this.mDesired = false;
	if ( this.mAjax )
	{
		this.mAjax.abort();
		this.mAjax = null;
	}
	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_Ajax.prototype.Load = function()
{
	var $this = this;
	
	//	fetch
	console.log("Loading " + this.mUrl );
	
	var ajax = new XMLHttpRequest();
	this.mAjax = ajax;
	ajax.addEventListener("load", function($Event){ $this.OnLoad($Event); }, false);
	ajax.addEventListener("error", function($Event){ $this.OnError($Event); }, false);
	ajax.addEventListener("abort", function($Event){ $this.OnError($Event); }, false);
	ajax.open("GET", this.mUrl, true );
	//ajax.setRequestHeader('Content-Type', 'multipart/form-data;');
	ajax.withCredentials = false;

	ajax.send( null );
}

SoyAsset_Ajax.prototype.OnLoad = function($Event)
{
	if ( this.mOnParseData )
	{
		this.mAsset = this.mOnParseData($Event.target.responseText);
		if ( this.mAsset === false || this.mAsset === null )
		{
			this.mAsset = null;
			this.OnError($Event);
			return;
		}
	}
	else
	{
		this.mAsset = $Event.target.responseText;
	}
	//this.mAssetType = $Event.target.responseType;
	assert( this.IsLoaded(), "Loaded state wrong" );
	this.mOnLoaded( this );
}



function ParseJson($Data)
{
	try
	{
		var $Asset = JSON.parse( $Event.target.responseText );
		return $Asset;
	}
	catch ( e )
	{
		//	fail on bad json
		console.log("bad json" + $Event.target.responseText.substring(0,20) );
		return false;
	}
}


SoyAsset_JsonP.prototype = new SoyAsset('JsonP');

function SoyAsset_JsonP($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
	if ( typeof $Meta == 'string' )
	{
		var $Filename = $Meta;
		$Meta = new SoyAssetMeta();
		$Meta.Filename = $Filename;
	}
	
	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	this.mAjax = null;
	this.mOnParseData = CheckDefaultParam( $Meta.mOnParse, null );
	
	if ( $DoLoad )
		this.Load();
}


SoyAsset_JsonP.prototype.Stop = function()
{
	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_JsonP.prototype.Load = function()
{
	//	http://stackoverflow.com/questions/22780430/javascript-xmlhttprequest-using-jsonp
	
	console.log("JsonP " + this.mUrl );
	var url = this.mUrl;
	var $this = this;
	
	var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
	window[callbackName] = function(data)
	{
		delete window[callbackName];
		document.body.removeChild(script);
		$this.OnLoad( data );
	};
	
	var script = document.createElement('script');
	script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
	document.body.appendChild(script);
	
	//	catch callback finish...
}

SoyAsset_JsonP.prototype.OnLoad = function($Json)
{
	if ( this.mOnParseData )
	{
		this.mAsset = this.mOnParseData($Json);
		if ( IsUndefined(this.mAsset) || this.mAsset === false || this.mAsset === null )
		{
			this.mAsset = null;
			this.OnError($Json);
			return;
		}
	}
	else
	{
		this.mAsset = $Json;
	}
	//this.mAssetType = $Event.target.responseType;
	assert( this.IsLoaded(), "Loaded state wrong" );
	this.mOnLoaded( this );
}




SoyAsset_Image.prototype = new SoyAsset('Image');

function SoyAsset_Image($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	if ( typeof $DoLoad == 'undefined' )
		$DoLoad = true;
		
	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	if ( $DoLoad )
		this.Load();
}

SoyAsset_Image.prototype.Stop = function()
{
	this.mDesired = false;
	
	//	stop loading of img
	delete this.mAsset;

	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_Image.prototype.Load = function()
{
	var $this = this;
	
	//	fetch
	console.log("Loading " + this.mUrl + " ... " + window.location.hash );
		
	var $Image = document.createElement('img');
	this.mImage = $Image;
	$Image.addEventListener('load', function($Event){ $this.OnLoad($Event); }, false );
//	$Image.addEventListener('progress', function($Event){ $this.OnLoad($Event); }, false );
	$Image.addEventListener('error', function($Event){ $this.OnError($Event); }, false );
				
	$Image.crossOrigin = '';
	//alert("start load of " + this.mUrl.substring(0,40) );
	$Image.src = this.mUrl;
}


SoyAsset_Image.prototype.PostProcessImage = function()
{
	var $w = this.mImage.width;
	var $h = this.mImage.height;
	//	something wrong with w/h
	if ( !isInt($w) || !isInt($h) )
		return false;
	
	var $CropWidth = CheckDefaultParam( this.mMeta.CropWidth, $w );
	var $CropHeight = CheckDefaultParam( this.mMeta.CropHeight, $h );
	if ( $CropWidth != $w || $CropHeight != $h )
	{
		//	draw to canvas then replace image with new data image
		var canvas = document.createElement("canvas");
		canvas.width = $CropWidth;
		canvas.height = $CropHeight;

		var ctx = canvas.getContext("2d");
		ctx.drawImage( this.mImage, 0, 0 );
		
		var $DataUrl = canvas.toDataURL();
		this.mImage = document.createElement("img"); // create img tag
		this.mImage.src = $DataUrl;
	}
	
	return true;
}

SoyAsset_Image.prototype.OnLoad = function($Event)
{
	//	gr: do any post-processing
	this.PostProcessImage();
	
	//	take dimensions - this sets dimensions for unknown sizes, and corrects existing meta data
	var $w = this.mImage.width;
	var $h = this.mImage.height;
	if ( isInt($w) && isInt($h) )
	{
//	console.log("onload image ",this.mImage,$w,$h);
		this.mMeta.Width = $w;
		this.mMeta.Height = $h;
	}
	
	//alert('OnLoad' + $w + ' ' + $h );

	//	move ownership
	this.mAsset = this.mImage;
	this.mImage = null;

	assert( this.IsLoaded(), "Loaded state wrong" );
	this.mOnLoaded( this );
}

SoyAsset_Image.prototype.OnError = function($Event)
{
	console.log($Event);
	alert('OnError');
	assert( !this.IsLoaded(), "Loaded state wrong" );
	//	not a failure if we cancelled
	if ( !this.mDesired )
		return;
	this.mOnFailed( this );
}













SoyAsset_Video.prototype = new SoyAsset('Video');

function SoyAsset_Video($Meta,$OnLoaded,$OnFailed)
{
	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );

	this.Load();
}

SoyAsset_Video.prototype.Stop = function()
{
	this.mDesired = false;
	this.mError = 'Stopped';

	if ( this.mAsset )
	{
		//	abort video by setting invalid src
		this.mAsset.src = '';
		this.mAsset.load();
		//this.mAsset.stop();
		delete this.mAsset;
		this.mAsset = null;
	}
	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_Video.prototype.Load = function()
{
	var $this = this;
	
	//	fetch
	console.log("Loading " + this.mUrl );
	
	var $Video = document.createElement('video');
	this.mVideo = $Video;

	var $Type = this.mMeta.Format;
	var $Codec = this.mMeta.Codec;
	var $VideoTypeString = 'video/' + $Type + ';codecs="' + $Codec + '"';
	var $CanPlay = $Video.canPlayType($VideoTypeString);
	if ( $CanPlay == "" )
	{
		console.log("Browser cannot play " + $VideoTypeString );
		this.OnError();
		return;
	}
	
	//	video.width = 640;
	//	video.height = 360;
	//	video.type = ' video/ogg; codecs="theora, vorbis" ';
	$Video.autoplay = true;
	$Video.loop = false;	//	deal with this later
	$Video.crossOrigin = '';
	$Video.src = this.mUrl;

	var $ErrorFunc = function($Event) { $this.OnError($Event); };
	var $StartFunc = function($Event) { $this.OnLoad($Event); };
/*	this.mVideo.addEventListener('loadstart', $ErrorFunc, false );
	this.mVideo.addEventListener('progress', $ErrorFunc, false );
	this.mVideo.addEventListener('canplaythrough', $ErrorFunc, false );
	this.mVideo.addEventListener('loadeddata', $ErrorFunc, false );
	this.mVideo.addEventListener('loadedmetadata', $ErrorFunc, false );
	this.mVideo.addEventListener('timeupdate', $ErrorFunc, false );
	this.mVideo.addEventListener('playing', $ErrorFunc, false );
	this.mVideo.addEventListener('waiting', $ErrorFunc, false );
*/
	$Video.addEventListener('error', $ErrorFunc, false );
	$Video.addEventListener('loadedmetadata', $StartFunc, false );
	//$Video.addEventListener('loadstart', $StartFunc, false );
	//$Video.addEventListener('progress', $StartFunc, false );
	//$Video.addEventListener('playing', $StartFunc, false );

	$Video.load(); // must call after setting/changing source
	$Video.play();

}

SoyAsset_Video.prototype.OnLoad = function($Event)
{
	//	gr: swap ownership?
	this.mAsset = this.mVideo;
	assert( this.IsLoaded(), "Loaded state wrong" );
	this.mOnLoaded( this );
}

SoyAsset_Video.prototype.OnError = function($Event)
{
	if ( this.IsLoaded() )
		this.Stop();

	assert( !this.IsLoaded(), "Loaded state wrong" );
	//	not a failure if we cancelled
	if ( !this.mDesired )
		return;
	this.mOnFailed( this );
}









SoyAsset_Mjpeg.prototype = new SoyAsset('Mjpeg');

function SoyAsset_Mjpeg($Meta,$OnLoaded,$OnFailed)
{
	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	this.Load();
}

SoyAsset_Mjpeg.prototype.Stop = function()
{
	this.mDesired = false;
	
	if ( this.mAsset )
		this.mAsset = null;
	
	if ( this.mMjpeg )
	{
		this.mMjpeg.Destroy();
		this.mMjpeg = null;
	}
	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_Mjpeg.prototype.Load = function()
{
	var $this = this;
	var $Loop = true;
	
	var OnNewJpeg = function($JpegData) { $this.OnLoad($JpegData); };
	var OnError = function() { $this.OnError(); }
	console.log("load mjpeg", this);
	this.mMjpeg = new SoyMJpeg( this.mUrl, 25, $Loop, this.mMeta.MjpegIndexes, OnNewJpeg, OnError );
}

SoyAsset_Mjpeg.prototype.OnLoad = function($JpegData)
{
	this.mAsset = $JpegData;
	assert( this.IsLoaded(), "Loaded state wrong" );
	this.mOnLoaded( this );
}

SoyAsset_Mjpeg.prototype.OnError = function($Event)
{
	if ( this.IsLoaded() )
		this.Stop();
	
	assert( !this.IsLoaded(), "Loaded state wrong" );
	//	not a failure if we cancelled
	if ( !this.mDesired )
		return;
	this.mOnFailed( this );
}



