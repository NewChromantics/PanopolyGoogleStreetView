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

SoyAsset_Ajax.prototype.GetType = function()
{
	return 'Ajax';
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

SoyAsset_Image.prototype.GetType = function()
{
	return 'Image';
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



function SoyVideoFormat($Size,$Type,$Codec)
{
	this.mSize = $Size;
	this.mType = $Type;
	this.mCodec = $Codec;
}



function SoyAsset_Video($Pano,$VideoFormat,$Priority,$OnLoaded,$OnFailed)
{
	var $Host = GetHost();
	
	this.mPano = $Pano;
	this.mAsset = null;
	this.mAssetType = null;
	this.mUrl = $Host + $Pano.mName + '.' + $VideoFormat.mSize + '.' + $VideoFormat.mType;
	this.mOnLoaded = $OnLoaded;
	this.mOnFailed = $OnFailed;
	this.mDesired = true;		//	when we don't want the

	this.mVideoFormat = $VideoFormat;
	
	this.Load();
}

SoyAsset_Video.prototype.GetType = function()
{
	return 'Video';
}

SoyAsset_Video.prototype.Stop = function()
{
	this.mDesired = false;

	this.mAsset.stop();
	
	delete this.mAsset;
}

SoyAsset_Video.prototype.Load = function()
{
	var $this = this;
	
	//	fetch
	console.log("Loading " + this.mUrl );
	
	var $Video = document.createElement('video');
	this.mAsset = $Video;

	var $Type = this.mVideoFormat.mType;
	var $Codec = this.mVideoFormat.mCodec;
	var $CanPlay = $Video.canPlayType('video/' + $Type + ';codecs="' + $Codec + '"');
	if ( $CanPlay == "" )
	{
		OnError();
		return;
	}
	
	//	video.width = 640;
	//	video.height = 360;
	//	video.type = ' video/ogg; codecs="theora, vorbis" ';
	$Video.autoplay = true;
	$Video.loop = true;
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

	$Video.load(); // must call after setting/changing source
	$Video.play();

}

SoyAsset_Video.prototype.OnLoad = function($Event)
{
	this.mOnLoaded( this );
}

SoyAsset_Video.prototype.OnError = function($Event)
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
		if ( $Asset.GetType() == 'Image' )
			this.OnNewJpegFrame($Asset);
		
		//	start update of video
		if ( $Asset.GetType() == 'Video' )
			this.OnNewVideoFrame($Asset);
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
	//	don't need to do anything else
	if ( !this.mMeta.isVideo )
		return;
	
	var $this = this;
	var OnLoaded = function($Asset) { $this.OnLoadedAsset($Asset); }
	var OnFailed = function($Asset) { $this.OnFailedAsset($Asset); }

	//	gr: need to get video options from meta
	var $Videos = new Array();
//	$Videos.push( {'url': GetHost() + this.mName + '.256.webm', 'contentType':'video/webm', 'codec':'vp8' } );
	$Videos.push( new SoyVideoFormat( 256, 'webm', 'vp8' ) );

	var $Priority = 90;
	for ( var $Key in $Videos )
	{
		var $Format = $Videos[$Key];
		$Priority = $Priority + 1;
		this.mAssets.push( new SoyAsset_Video( this, $Format, $Priority, OnLoaded, OnFailed ) );
	}

}

						  
SoyPano.prototype.OnNewVideoFrame = function($Asset)
{
	var $this = this;
	var $Video = $Asset.mAsset;

	if ( $Video.mError != null )
	{
		//	something gone wrong, don't update!
		return;
	}

	//	push texture
	if ( $Video.readyState >= HAVE_CURRENT_DATA )
	{
		//	first time
		if ( !this.mVideoTexture )
		{
			this.mVideoTexture = new THREE.Texture( $Video );
			this.mVideoTexture.generateMipmaps = false;
			this.mVideoTexture.minFilter = THREE.LinearFilter;
			this.mVideoTexture.magFilter = THREE.LinearFilter;
			
			//	overwrite old texture
			this.mMaterial.map = this.mVideoTexture;
			this.mMaterial.needsUpdate = true;
		}
		
		//	grab new frame from video
		this.mVideoTexture.needsUpdate = true;
	//	this.OnNewVideoFrame();
	}
	
	//	fetch next frame
	setTimeout( function() { $this.OnNewVideoFrame($Asset) }, 1000/60, false );
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
