var HAVE_NOTHING = 0;//	- no information whether or not the audio/video is ready
var HAVE_METADATA = 1;	//	- metadata for the audio/video is ready
var HAVE_CURRENT_DATA = 2;	//- data for the current playback position is available, but not enough data to play next frame/millisecond
var HAVE_FUTURE_DATA = 3;	//- data for the current and at least the next frame is available
var HAVE_ENOUGH_DATA = 4;

function GetHost()
{
	return 'http://image.panopo.ly/';
}


function SoyAsset_Ajax($Pano,$FileExtension,$Priority,$OnLoaded,$OnFailed)
{
	var $Host = GetHost();

	this.mPano = $Pano;
	this.mAsset = null;
	this.mAssetType = null;
	this.mUrl = $Host + $Pano.mName + $FileExtension;
	this.mOnLoaded = $OnLoaded;
	this.mOnFailed = $OnFailed;
	this.mDesired = true;		//	when we don't want the
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
	this.mAssetType = $Event.target.responseType;
	this.mOnLoaded( this );
}

SoyAsset_Ajax.prototype.OnError = function($Event)
{
	//	not a failure if we cancelled
	if ( !this.mDesired )
		return;
	this.mOnFailed( this );
}










function SoyAsset_Image($Pano,$FileExtension,$Priority,$OnLoaded,$OnFailed)
{
	var $Host = GetHost();
	
	this.mPano = $Pano;
	this.mAsset = null;
	this.mAssetType = null;
	this.mUrl = $Host + $Pano.mName + $FileExtension;
	this.mOnLoaded = $OnLoaded;
	this.mOnFailed = $OnFailed;
	this.mDesired = true;		//	when we don't want the
	
	this.Load();
}

SoyAsset_Image.prototype.Stop = function()
{
	this.mDesired = false;
	
	//	stop loading of img
	delete this.mAsset;
}

SoyAsset_Image.prototype.Load = function()
{
	var $this = this;
	
	//	fetch
	console.log("Loading " + this.mUrl );
	
	var $Image = document.createElement('img');
	this.mAsset = $Image;
	$Image.addEventListener('load', function($Event){ $this.OnLoad($Event); }, false );
//	$Image.addEventListener('progress', function($Event){ $this.OnLoad($Event); }, false );
	$Image.addEventListener('error', function($Event){ $this.OnError($Event); }, false );
			
	$Image.crossOrigin = '';
	$Image.src = this.mUrl;
}

SoyAsset_Image.prototype.OnLoad = function($Event)
{
	this.mOnLoaded( this );
}

SoyAsset_Image.prototype.OnError = function($Event)
{
	//	not a failure if we cancelled
	if ( !this.mDesired )
		return;
	this.mOnFailed( this );
}







function SoyPano($PanoName,$Material,$OnMetaFailed)
{
	//	default
	if ( typeof $OnMetaFailed == 'undefined' )
	{
		$OnMetaFailed = function() { console.log("Failed to load meta"); };
	}
	
	var $this = this;
	var OnLoaded = function($Asset) { $this.OnLoadedAsset($Asset); }
	var OnFailed = function($Asset) { $this.OnFailedAsset($Asset); }
	

	this.mName = $PanoName;
	this.mOnMetaFailed = $OnMetaFailed;
	this.mMaterial = $Material;
	this.mMeta = null;

	//	load assets
	this.mMetaAsset = new SoyAsset_Ajax( this, '.meta', null, OnLoaded, OnFailed );
	this.mAssets = new Array(
							new SoyAsset_Image( this, '.256.jpg', 1, OnLoaded, OnFailed ),
							new SoyAsset_Image( this, '.512.jpg', 2, OnLoaded, OnFailed ),
							new SoyAsset_Image( this, '.1024.jpg', 3, OnLoaded, OnFailed ),
							new SoyAsset_Image( this, '.2048.jpg', 4, OnLoaded, OnFailed ),
							new SoyAsset_Image( this, '.4096.jpg', 5, OnLoaded, OnFailed )
							);
}


SoyPano.prototype.OnLoadedAsset = function($Asset)
{
	//	do stuff
	if ( $Asset == this.mMetaAsset )
	{
		this.mMeta = $Asset.mAsset;
		this.OnLoadedMeta();
	}
	else
	{
		console.log("Loaded asset: " + $Asset.mUrl );
		
		//	abort lesser assets
		for ( var $Key in this.mAssets )
		{
			var $OtherAsset = this.mAssets[$Key];
			if ( !$OtherAsset.mPriority )
				continue;
			if ( $OtherAsset.mPriority >= $Asset.mPriority )
			{
				//	if other higher-priority asset is loaded, ditch self
				if ( $Other.mAsset )
				{
					OnFailedAsset( $Asset );
					return;
				}
				continue;
			}
			
			//	abort
			//console.log("aborting " + $OtherAsset.mUrl );
			OnFailedAsset( $OtherAsset );
		}
		
		//	update texture
		this.OnNewJpegFrame($Asset);
	}
}


SoyPano.prototype.OnFailedAsset = function($Asset)
{
	$Asset.Stop();
	
	//	do stuff
	if ( $Asset == this.mMetaAsset )
	{
		this.mOnMetaFailed();
	}
	else
	{
		//	delete asset
		for ( var $Key in this.mAssets )
		{
			var $OtherAsset = this.mAssets[$Key];
			if ( $OtherAsset != $Asset )
				continue;
			
			delete this.mAssets[$Key];
		}
	}
}

SoyPano.prototype.OnLoadedMeta = function()
{
	return;
	//	don't need to do anything else
	if ( !this.mMeta.isVideo )
		return;
	
	//	gr: need to get video options from meta
	var $Videos = new Array();
//	$Videos.push( {'url': GetHost() + this.mName + '.256.webm', 'contentType':'video/webm', 'codec':'vp8' } );
	$Videos.push( {'size': 256, 'type:':'webm','codec':'vp8' } );
	

	//	create video
	this.mVideo = document.createElement('video');
	//	video.width = 640;
	//	video.height = 360;
	//	video.type = ' video/ogg; codecs="theora, vorbis" ';
	this.mVideo.autoplay = true;
	this.mVideo.loop = true;
	this.mVideo.crossOrigin = '';
	this.mVideo.src = null;
	
	//	find format we support
	for ( var $Format in $Videos )
	{
		var $Size = $Format.size;
		var $Type = $Format.type;
		var $Codec = $Format.codec;
		var $Url = GetHost() + this.mName + '.' + $Size + '.' + $Type;
		var $CanPlay = this.mVideo.canPlayType('video/' + $Type + ';codecs="' + $Codec + '"');
		
		if ( $CanPlay == "" )
			continue;
		
		this.mVideo.src = $Url;
	}
	
	//	if no url, we cannot do video...
	if ( this.mVideo.src == null )
		return;

/*
	this.mVideo.addEventListener('loadstart', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('canplay', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('progress', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('canplaythrough', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('loadeddata', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('loadedmetadata', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('timeupdate', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('playing', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('waiting', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	this.mVideo.addEventListener('error', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
*/

	this.mVideo.mError = null;
	this.mVideo.load(); // must call after setting/changing source
	this.mVideo.play();

	//	keep checking video state
	var $this = this;
	this.UpdateVideo();	//	self updating
	

	//	videoTexture.needsUpdate = true;

}

SoyPano.prototype.UpdateVideo = function()
{
	var $this = this;

	if ( this.mVideo.mError != null )
	{
		//	something gone wrong, don't update!
		return;
	}
	
	//	push texture
	if ( this.mVideo.readyState >= HAVE_CURRENT_DATA )
	{
		//	first time
		if ( !this.mVideoTexture )
		{
			this.mVideoTexture = new THREE.Texture( this.mVideo );
			this.mVideoTexture.generateMipmaps = false;
			this.mVideoTexture.minFilter = THREE.LinearFilter;
			this.mVideoTexture.magFilter = THREE.LinearFilter;
			
			//	overwrite old texture
			this.mMaterial.map = this.mVideoTexture;
			this.mMaterial.needsUpdate = true;
		}
		
		//	grab new frame from video
		this.OnNewVideoFrame();
	}
	
	
	setTimeout( function() { $this.UpdateVideo() }, 1000/60, false );
}

SoyPano.prototype.OnNewVideoFrame = function()
{
	this.mVideoTexture.needsUpdate = true;
}

SoyPano.prototype.OnNewJpegFrame = function($Asset)
{
	//	update texture
	console.log("New frame: " + $Asset.mUrl );

	var $Texture = new THREE.Texture( $Asset.mAsset, new THREE.UVMapping() );
	$Texture.needsUpdate = true;
	
	//	overwrite old texture
	this.mMaterial.map = $Texture;
	this.mMaterial.needsUpdate = true;
}
