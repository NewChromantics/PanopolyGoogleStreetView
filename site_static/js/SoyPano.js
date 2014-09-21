


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
	this.mMetaAsset = new SoyAsset_Ajax( this, $PanoName+'.meta', OnLoaded, OnFailed );
	
	//	attempt to load some assets immediately for speed
	this.mAssets = new Array(
							 new SoyAsset_Image( this, new SoyAssetMeta($PanoName + '.1024x1024.jpg',1024,1024,'jpg'), OnLoaded, OnFailed )
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
	
	if ( $BestRemoteMeta.IsVideo() )
		this.mAssets.push( new SoyAsset_Video( this, $BestRemoteMeta, OnLoaded, OnFailed ) );
	else
		this.mAssets.push( new SoyAsset_Image( this, $BestRemoteMeta, OnLoaded, OnFailed ) );
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
