var HAVE_NOTHING = 0;//	- no information whether or not the audio/video is ready
var HAVE_METADATA = 1;	//	- metadata for the audio/video is ready
var HAVE_CURRENT_DATA = 2;	//- data for the current playback position is available, but not enough data to play next frame/millisecond
var HAVE_FUTURE_DATA = 3;	//- data for the current and at least the next frame is available
var HAVE_ENOUGH_DATA = 4;

function GetHost()
{
	return 'http://image.panopo.ly/';
}


function SoyAsset($Pano,$Meta,$FileExtension,$OnLoaded,$OnFailed)
{
	if ( arguments.length <= 1 )
	{
		this.mType = arguments[0];
		return;
	}

	var $Host = GetHost();
	
	this.mPano = $Pano;
	this.mAsset = null;			//	set once loaded
	this.mUrl = $Host + $Pano.mName + $FileExtension;
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

function SoyAsset_Ajax($Pano,$FileExtension,$OnLoaded,$OnFailed)
{
	//	call super
	SoyAsset.apply( this, [$Pano,null,$FileExtension,$OnLoaded,$OnFailed] );

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

function SoyAsset_Image($Pano,$Meta,$FileExtension,$OnLoaded,$OnFailed)
{
	//	call super
	SoyAsset.apply( this, [$Pano,$Meta,$FileExtension,$OnLoaded,$OnFailed] );
	
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
function SoyAssetMeta($Width,$Height,$Format,$Codec,$BitRate)
{
	//	if only one arg, we've supplied JSON
	if ( arguments.length <= 1 )
	{
		var $Json = arguments[0];
		this.Width = $Json.Width;
		this.Height = $Json.Height;
		this.Format = $Json.Format;
		this.Codec = $Json.Codec;
		this.BitRate = $Json.BitRate;
		return;
	}
	
	this.Width = $Width;
	this.Height = $Height;
	this.Format = $Format;
	this.Codec = $Codec;
	this.BitRate = $BitRate;
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
	
	if ( this.BitRate )
	{
		if ( this.BitRate > $that.BitRate )
			return true;
		if ( this.BitRate < $that.BitRate )
			return false;
	}
	
	//	not better, same
	return false;
}

SoyAssetMeta.prototype.IsVideo = function()
{
	if ( this.BitRate )
		return true;
	return false;
}

SoyAssetMeta.prototype.IsSupported = function()
{
	//	test
	if ( this.Width > 4000 || this.Height > 4000 )
		return false;
	//	do video codec test
	return true;
}






SoyAsset_Video.prototype = new SoyAsset('Video');

function SoyAsset_Video($Pano,$Meta,$OnLoaded,$OnFailed)
{
	//	call super
	var $FileExtension = '.' + $Meta.Width + 'x' + $Meta.Height + '.' + $Meta.Format;
	SoyAsset.apply( this, [$Pano,$Meta,$FileExtension,$OnLoaded,$OnFailed] );

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
	$Video.addEventListener('loadstart', $StartFunc, false );
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
	assert( !this.IsLoaded(), "Loaded state wrong" );
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
	this.mMetaAsset = new SoyAsset_Ajax( this, '.meta', OnLoaded, OnFailed );
	
	//	attempt to load some assets immediately for speed
	this.mAssets = new Array(
							new SoyAsset_Image( this, new SoyAssetMeta(256,256,'jpg'), '.256.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(512,512,'jpg'), '.512.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(1024,1024,'jpg'), '.1024.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(2048,2048,'jpg'), '.2048.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(4096,4096,'jpg'), '.4096.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(256,256,'jpg'), '.256x256.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(512,512,'jpg'), '.512x512.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(1024,1024,'jpg'), '.1024x1024.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(2048,2048,'jpg'), '.2048x2048.jpg', OnLoaded, OnFailed ),
							new SoyAsset_Image( this, new SoyAssetMeta(4096,4096,'jpg'), '.4096x4096.jpg', OnLoaded, OnFailed )
							);

	//	do a deffered load of an asset to prove priority works
//	setTimeout( function() { $this.mAssets.push( new SoyAsset_Image( $this, '.256.jpg', 1, OnLoaded, OnFailed ) ); }, 2*1000 );
	
}


SoyPano.prototype.OnLoadedAsset = function($Asset)
{
	assert( $Asset.IsLoaded(), "Asset isn't loaded" );
	
	//	do stuff
	if ( $Asset == this.mMetaAsset )
	{
		assert( $Asset.GetType() == 'Ajax', "Meta is not ajax" );
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
			if ( $OtherAsset == $Asset )
				continue;
			if ( $OtherAsset.mMeta.IsBetter($Asset.mMeta) )
			{
				//console.log("other:" + $OtherAsset.mUrl + " pri: " + $OtherAsset.mPriority + " >= " + $Asset.mPriority );
				//	if other higher-priority asset is loaded, ditch self
				if ( $OtherAsset.IsLoaded() )
				{
					this.OnFailedAsset( $Asset );
					return;
				}
				continue;
			}
			
			//	we're loaded, delete the other asset (gr: unneccessary?)
			//this.OnFailedAsset( $OtherAsset );
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
	var $CurrentMeta = this.mCurrentAsset ? this.mCurrentAsset.mMeta : null;
	
	//	load some better stuff compared to mAssets
	var $BestRemoteMeta = null;
	for ( var $Key in this.mMeta.assets )
	{
		var $RemoteMeta = new SoyAssetMeta( this.mMeta.assets[$Key] );

		//	can client cope with this asset?
		if ( !$RemoteMeta.IsSupported() )
			continue;
		
		//console.log($RemoteMeta);
		if ( $CurrentMeta == null && $BestRemoteMeta == null )
		{
			$BestRemoteMeta = $RemoteMeta;
			continue;
		}
		
		//	compare
		if ( $CurrentMeta && !$RemoteMeta.IsBetter($CurrentMeta) )
			continue;
		if ( $BestRemoteMeta && !$RemoteMeta.IsBetter($BestRemoteMeta) )
			continue;
		
		$BestRemoteMeta = $RemoteMeta;
	}
	
	if ( !$BestRemoteMeta )
	{
		console.log("No better assets");
		return;
	}

	//	load this better asset
	console.log("Load better asset: ");
	console.log($BestRemoteMeta);

	
	var $this = this;
	var OnLoaded = function($Asset) { $this.OnLoadedAsset($Asset); }
	var OnFailed = function($Asset) { $this.OnFailedAsset($Asset); }

	this.mAssets.push( new SoyAsset_Video( this, $BestRemoteMeta, OnLoaded, OnFailed ) );
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

	this.mCurrentAsset = $Asset;
	
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
	this.mCurrentAsset = $Asset;
	
	//	update texture
	console.log("New frame: " + $Asset.mUrl );

	var $Texture = new THREE.Texture( $Asset.mAsset, new THREE.UVMapping() );
	$Texture.needsUpdate = true;
	
	//	overwrite old texture
	this.mMaterial.map = $Texture;
	this.mMaterial.needsUpdate = true;
}
