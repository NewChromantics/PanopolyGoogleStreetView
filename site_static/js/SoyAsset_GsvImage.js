



SoyAsset_GsvImage.prototype = new SoyAsset('GsvImage');

function SoyAsset_GsvImage($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
	this.mGooglePanoId = null;
	this.mLatLon = null;	//	array of 2 coords
	
	if ( isArray($Meta) )
	{
		if ( $Meta.length == 2 )
			this.mLatLon = $Meta;
		$Meta = new SoyAssetMeta();
	}
	
	if ( typeof $Meta == 'string' )
	{
		var $LatLon = MatchLatLonString( $Meta );
		if ( $LatLon !== false )
		{
			this.mLatLon = $LatLon;
		}
		else
		{
			this.mGooglePanoId = $Meta;
		}
		$Meta = new SoyAssetMeta();
	}

	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	if ( $DoLoad )
		this.Load();
}

SoyAsset_GsvImage.prototype.LoadGsvPanoMeta = function()
{
	var $this = this;
	var $OnLoaded = function($Asset)
	{
		alert('LoadGsvPanoMeta OnLoaded');
		$this.mGooglePanoId = $Asset.mAsset;
		$this.Load();
	};
	var $OnFailed = function($Asset)
	{
		alert('LoadGsvPanoMeta OnFailed');
		$this.OnError('failed to load gsv pano meta ' + $Asset );
	};
	this.mGsvPanoMetaAsset = new SoyAsset_GsvPanoMeta( this.mLatLon, $OnLoaded, $OnFailed );
	return true;
}

SoyAsset_GsvImage.prototype.LoadImage = function()
{
	var $this = this;
	var $OnLoaded = function($Asset)
	{
		alert('LoadImage OnLoaded');
		$this.OnLoadedImage($Asset);
	}
	var $OnFailed = function($Asset)
	{
		alert('LoadImage OnFailed');
		$this.OnError('failed to load gsv image ' + $Asset );
	};
	
	var $Tilex = 0;
	var $Tiley = 0;
	var $Zoom = 0;
	var $CacheInvalidate = Date.now();
	var $url = 'http://maps.google.com/cbk?output=tile&panoid=' + this.mGooglePanoId + '&zoom=' + $Zoom + '&x=' + $Tilex + '&y=' + $Tiley + '&' + $CacheInvalidate;
	var $AssetMeta = {};
	$AssetMeta.Layout = 'equirect';
	$AssetMeta.Filename = $url;
	$AssetMeta.Format = 'jpg';
	
	//	gr: post processing to adjust for extra spacing, overlapping image, tile construction etc
	//	http://blog.mridey.com/2010/05/how-to-create-and-display-custom.html
	$AssetMeta.CropWidth = 417;
	$AssetMeta.CropHeight = 208;
	//$AssetMeta.TileX = x;
	//$AssetMeta.TileY = y;

	this.mImageAssetMeta = $AssetMeta;
	this.mImageAsset = new SoyAsset_Image( this.mImageAssetMeta, $OnLoaded, $OnFailed );
	return true;
}

SoyAsset_GsvImage.prototype.Load = function()
{
	//	if we don't know the pano id, we need to fetch it
	if ( this.mGooglePanoId == null && this.mLatLon != null )
	{
		return this.LoadGsvPanoMeta();
	}
	
	if ( this.mGooglePanoId != null )
	{
		return this.LoadImage();
	}

	return false;
}



SoyAsset_GsvImage.prototype.OnLoadedImage = function($Asset)
{
	this.mAsset = $Asset.mAsset;
	this.OnLoaded();
}
