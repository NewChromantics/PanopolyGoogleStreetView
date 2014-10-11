var $GoogleStreetViewPrefix = 'gsv,';


function SoyPano($PanoName,$Config,$OnNewImage,$OnMetaFailed,$DoLoad)
{
	$OnMetaFailed = CheckDefaultParam( $OnMetaFailed, function() { console.log("Failed to load meta"); } );
	$DoLoad = CheckDefaultParam( $DoLoad, true );
	
	var $this = this;
	var OnLoaded = function($Asset) { $this.OnLoadedAsset($Asset); }
	var OnFailed = function($Asset) { $this.OnFailedAsset($Asset); }
	
	this.mPanoName = $PanoName;
	this.mConfig = $Config;
	this.mOnMetaFailed = $OnMetaFailed;
	this.mOnNewImage = $OnNewImage;
	this.mMeta = null;
	this.mMetaAsset = null;
	this.mAssets = new Array();
	
	//	load assets
	if ( $DoLoad )
	{
		var $MetaMeta = new SoyAssetMeta();
		$MetaMeta.mOnParse = ParseJson;
		$MetaMeta.Filename = $PanoName+'.meta';

		this.mMetaAsset = new SoyAsset_Ajax( $MetaMeta, OnLoaded, OnFailed );
	
		//	attempt to load some assets immediately for speed
		var $PreloadAssets = [];
		$PreloadAssets.push( new SoyAssetMeta($PanoName + '.256x256.jpg',256,256,'jpg',null,null,'equirect' ) );
		$PreloadAssets.push( new SoyAssetMeta($PanoName + '.2048x2048.jpg',2048,2048,'jpg',null,null,'equirect') );

		forEach( $PreloadAssets, function($AssetMeta)
		{
			if ( $AssetMeta.IsSupported($Config) )
			{
				$this.mAssets.push( new SoyAsset_Image( $AssetMeta, OnLoaded, OnFailed ) );
			}
		});

		//	do a deffered load of an asset to prove priority works
	//	setTimeout( function() { $this.mAssets.push( new SoyAsset_Image( '.256.jpg', 1, OnLoaded, OnFailed ) ); }, 2*1000 );
	}
}

SoyPano.prototype.Destroy = function()
{
	//	kill all assets
	for ( var $Key in this.mAssets )
	{
		var $Asset = this.mAssets[$Key];
		if ( !this.mAssets.hasOwnProperty($Key) )
			continue;
		$Asset.Stop();
		delete this.mAssets[$Key];
	}
	if ( this.mCurrentAsset )
	{
		this.mCurrentAsset.Stop();
		delete this.mCurrentAsset;
	}
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
		//console.log("Loaded asset: " + $Asset.mUrl );
		
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
		else if ( $Asset.GetType() == 'Mjpeg' )
			this.OnNewJpegFrame($Asset);
		else if ( $Asset.GetType() == 'Video' )
			this.OnNewVideoFrame($Asset);
		else
		{
			if ( $Asset.mAsset instanceof HTMLImageElement )
				this.OnNewJpegFrame($Asset);
			else
				console.log($Asset.mAsset );
		}
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

SoyPano.prototype.GetBetterAsset = function($FilterFunction)
{
	var $CurrentMeta = this.mCurrentAsset ? this.mCurrentAsset.mMeta : null;
	
	//	load some better stuff compared to mAssets
	var $BestRemoteMeta = null;
	console.log("GetBetterAsset", this.mMeta.assets, this );
	for ( var $Key in this.mMeta.assets )
	{
		var $RemoteMeta = new SoyAssetMeta( this.mMeta.assets[$Key] );
		
		//	can client cope with this asset?
		if ( !$RemoteMeta.IsSupported(this.mConfig) )
			continue;
		
		//	check filter
		if ( $FilterFunction )
			if ( !$FilterFunction($RemoteMeta) )
				continue;
		
		//console.log("supported meta: ", $RemoteMeta, this );
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
	
	return $BestRemoteMeta;
}

SoyPano.prototype.OnLoadedMeta = function()
{
	var $CurrentMeta = this.mCurrentAsset ? this.mCurrentAsset.mMeta : null;

	//	load some more assets
	var $LoadAssets = new Array();
	
	var $BestRemoteMeta = this.GetBetterAsset();
	$LoadAssets.push($BestRemoteMeta);
	if ( !$BestRemoteMeta )
		console.log("No better assets",$CurrentMeta,this.mMeta.assets);

	//	if we have nothing, and our best is a video
	//	gr: todo: convert this to kb-related, so maybe we can load super-low quality video first if it's small
	if ( !$CurrentMeta )
	{
		/*
		var $FilterFunction = function($Meta)
		{
			return $BestRemoteMeta != $Meta && !$Meta.IsVideo();
		};
		var $FastRemoteMeta = this.GetBetterAsset( $FilterFunction );
		$LoadAssets.push($FastRemoteMeta);
		 */
	}
	
	//	load any asset with parse callbacks
	//	gr: currently just for decoding google depth
	/*
	for ( var $Key in this.mMeta.assets )
	{
		var $RemoteMeta = new SoyAssetMeta( this.mMeta.assets[$Key] );
		if ( !$RemoteMeta.mOnParse )
			continue;
		$LoadAssets.push($RemoteMeta);
	}
*/
	
	var $this = this;
	var OnLoaded = function($Asset) { $this.OnLoadedAsset($Asset); }
	var OnFailed = function($Asset) { $this.OnFailedAsset($Asset); }
	
	for ( var $Key in $LoadAssets )
	{
		var $AssetMeta = $LoadAssets[$Key];
		if ( $AssetMeta == null )
			continue;
		console.log( this, "Load additonal asset: ", $AssetMeta );

		if ( $AssetMeta.IsVideo() && $AssetMeta.Format == 'mjpeg' )
		{
			this.mAssets.push( new SoyAsset_Mjpeg( $AssetMeta, OnLoaded, OnFailed ) );
		}
		else if ( $AssetMeta.IsVideo() )
		{
			this.mAssets.push( new SoyAsset_Video( $AssetMeta, OnLoaded, OnFailed ) );
		}
		else if ( $AssetMeta.Format == 'jpg' )
		{
			this.mAssets.push( new SoyAsset_Image( $AssetMeta, OnLoaded, OnFailed ) );
		}
		else if ( $AssetMeta.Format == 'jsonp' )
		{
			this.mAssets.push( new SoyAsset_JsonP( $AssetMeta, OnLoaded, OnFailed ) );
		}
		else if ( $AssetMeta.Format == 'GsvImage' )
		{
			this.mAssets.push( new SoyAsset_GsvImage( $AssetMeta, OnLoaded, OnFailed ) );
		}
		else if ( $AssetMeta.Format == 'GsvDepth' )
		{
			this.mAssets.push( new SoyAsset_GsvDepth( $AssetMeta, OnLoaded, OnFailed ) );
		}
		else
		{
			this.mAssets.push( new SoyAsset_Ajax( $AssetMeta, OnLoaded, OnFailed ) );
		}
	}
}


SoyPano.prototype.OnNewVideoFrame = function($Asset)
{
	var $this = this;
	var $Video = $Asset.mAsset;

	//	video has been unloaded
	if ( $Video == null )
	{
	//	console.log("null video in OnNewVideoFrame");
		return;
	}
	
	if ( $Video.mError != null )
	{
		//	something gone wrong, don't update!
	//	console.log("video error in OnNewVideoFrame " + $Video.mError );
		return;
	}

	if ( this.mCurrentAsset != $Asset )
	{
		console.log("New video: " + $Asset.mUrl );
	}
	this.mCurrentAsset = $Asset;
	
	//	push texture
	if ( $Video.readyState >= HAVE_CURRENT_DATA )
	{
		this.mOnNewImage( $Asset );
	}
	
	var $FrameRate = 25;
	
	//	fetch next frame
	//	gr: change to requestAnimationFrame!
	setTimeout( function() { $this.OnNewVideoFrame($Asset) }, 1000/$FrameRate, false );
}

SoyPano.prototype.OnNewJpegFrame = function($Asset)
{
	this.mCurrentAsset = $Asset;
	
	//	update texture
	console.log("New jpeg frame: " + $Asset.mUrl );

	this.mOnNewImage( $Asset );
}

SoyPano.prototype.AddAsset = function($Asset)
{
	this.mAssets.push( $Asset );
	this.OnLoadedAsset( $Asset );
}
