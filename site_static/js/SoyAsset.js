var HAVE_NOTHING = 0;//	- no information whether or not the audio/video is ready
var HAVE_METADATA = 1;	//	- metadata for the audio/video is ready
var HAVE_CURRENT_DATA = 2;	//- data for the current playback position is available, but not enough data to play next frame/millisecond
var HAVE_FUTURE_DATA = 3;	//- data for the current and at least the next frame is available
var HAVE_ENOUGH_DATA = 4;

function GetHost()
{
	return 'http://image.panopo.ly/';
}


function SoyAsset($Meta,$OnLoaded,$OnFailed)
{
	if ( arguments.length <= 1 )
	{
		this.mType = arguments[0];
		return;
	}

	var $Host = GetHost();
	
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

function SoyAsset_Ajax($FileName,$OnLoaded,$OnFailed)
{
	var $Meta = new SoyAssetMeta();
	$Meta.Filename = $FileName;
	
	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );

	this.mAjax = null;

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
	try
	{
		this.mAsset = JSON.parse( $Event.target.responseText );
	}
	catch ( e )
	{
		console.log("bad json" + $Event.target.responseText);
		//	fail on bad json
		this.OnError($Event);
		return;
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
	console.log("Loading " + this.mUrl );
	
	var $Image = document.createElement('img');
	this.mImage = $Image;
	$Image.addEventListener('load', function($Event){ $this.OnLoad($Event); }, false );
//	$Image.addEventListener('progress', function($Event){ $this.OnLoad($Event); }, false );
	$Image.addEventListener('error', function($Event){ $this.OnError($Event); }, false );
			
	$Image.crossOrigin = '';
	$Image.src = this.mUrl;
}

SoyAsset_Image.prototype.OnLoad = function($Event)
{
	//	move ownership
	this.mAsset = this.mImage;
	this.mImage = null;
	
	assert( this.IsLoaded(), "Loaded state wrong" );
	this.mOnLoaded( this );
}

SoyAsset_Image.prototype.OnError = function($Event)
{
	assert( !this.IsLoaded(), "Loaded state wrong" );
	//	not a failure if we cancelled
	if ( !this.mDesired )
		return;
	this.mOnFailed( this );
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
	if ( this.Width > $Config.mMaxResolution || this.Height > $Config.mMaxResolution )
		return false;
	
	var $CubemapMode = ($Config.mRenderMode == RENDERMODE_CUBEMAP);

	//	only support cubemaps if cubemap mode
	if ( this.IsCubemap() != $CubemapMode )
		return false;
	
	if ( this.IsVideo() )
	{
		var $Type = this.Format;
		var $Codec = this.Codec;
		var $IsMjpeg = ( $Type == 'mjpeg' && $Codec == 'mjpeg' );

		//	currently mjpeg is CSS only
		if ( $CubemapMode )
		{
			return $IsMjpeg;
		}
		else
		{
			//	not supporting mjpeg in non-cubemap
			if ( $IsMjpeg )
				return false;
			
			//	mobile (ios?) only supports mjpeg, as video needs to be clicked. no auto play!
			if ( IsMobile() )
				return false;
			
			var $Video = document.createElement('video');
			var $VideoTypeString = 'video/' + $Type + ';codecs="' + $Codec + '"';
			var $CanPlay = $Video.canPlayType($VideoTypeString);
			if ( $CanPlay == "" )
				return false;
		}
	}
	
	
	return true;
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

	if ( this.mAsset )
	{
		//	abort video by setting invalid src
		this.mAsset.src = '';
		this.mAsset.load();
	//	this.mAsset.stop();
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
	{
		//	abort video by setting invalid src
		this.mAsset.src = '';
		this.mAsset.load();
		//	this.mAsset.stop();
		delete this.mAsset;
		this.mAsset = null;
	}
	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_Mjpeg.prototype.Load = function()
{
	var $this = this;
	var $Loop = true;
	
	var OnNewJpeg = function($JpegData) { $this.OnLoad($JpegData); };
	var OnError = function() { $this.OnError(); }
	var $Mjpeg = new SoyMJpeg( this.mUrl, 25, $Loop, OnNewJpeg, OnError );
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



