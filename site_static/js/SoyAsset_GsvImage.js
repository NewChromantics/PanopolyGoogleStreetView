
function GsvTile($PanoId,$Zoom,$Tilex,$Tiley,$Parent)
{
	var $CacheInvalidate = '';
	this.mUrl =	'http://maps.google.com/cbk?output=tile&panoid=' + $PanoId + '&zoom=' + $Zoom + '&x=' + $Tilex + '&y=' + $Tiley + '&' + $CacheInvalidate;
	this.mTile = new THREE.Vector2($Tilex,$Tiley);
	this.mGsvImage = $Parent;
	
	var $Meta = new SoyAssetMeta( this.mUrl, null );

	var $this = this;
	this.mAsset = new SoyAsset_Image( $Meta, function($Asset){ $this.OnLoaded($Asset); }, function($Asset){ $this.OnFailed($Asset); } );
}

GsvTile.prototype.OnLoaded = function($Asset)
{
	this.mGsvImage.OnTileLoaded( this.mTile, this.mAsset.mAsset );
}

GsvTile.prototype.OnFailed = function($Asset)
{
	this.mGsvImage.OnTileFailed( this.mTile );
}



SoyAsset_GsvImage.prototype = new SoyAsset('GsvImage');

function SoyAsset_GsvImage($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
	this.mGooglePanoId = null;
	this.mLatLon = null;	//	array of 2 coords

	$Meta = GoogleLocationToMeta($Meta);
	if ( $Meta.Filename )
	{
		var $LatLon = MatchLatLonString( $Meta.Filename );
		if ( $LatLon !== false )
			this.mLatLon = $LatLon;
		else
			this.mGooglePanoId = $Meta.Filename;
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
		//alert('LoadGsvPanoMeta OnLoaded');
		console.log('pano meta; ' + $Asset.mAsset);
		$this.mGooglePanoId = $Asset.mAsset;
		$this.Load();
	};
	var $OnFailed = function($Asset)
	{
		//alert('LoadGsvPanoMeta OnFailed');
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
		//alert('LoadImage OnLoaded');
		$this.OnLoadedImage($Asset);
	}
	var $OnFailed = function($Asset)
	{
		//alert('LoadImage OnFailed');
		$this.OnError('failed to load gsv image ' + $Asset );
	};
	
	//	make canvas to draw on
	var $Zoom = 0;

	this.mCanvas = document.createElement("canvas");

	var $TileW = Math.pow( 2, $Zoom );
	var $TileH = Math.pow( 2, $Zoom-1 );
	
	//	gr: there's overlap and dead space in all the google images.... correct for this
	//	note: for three js we probably want the square sizes, but not for cubemap mode.
	//		might need to retun some scalar for shaders.
	//var $ratiox = 417/512;
	//var $ratioy = 208/512;
	var $ratiox = 512/512;
	var $ratioy = 256/512;
	this.mCanvas.width = $TileW * 512*$ratiox;
	this.mCanvas.height = $TileW * 512*$ratioy;
	
	this.mTileScale = new THREE.Vector2( 512, 512 );

	
	//	construct tiles
	this.mTiles = [];
	for ( var $tx=0;	$tx<$TileW;	$tx++ )
	{
		for ( var $ty=0;	$ty<$TileH;	$ty++ )
		{
			this.mTiles[$tx + ',' + $ty] = false;
		}
	}
	
	//	populate
	var $this = this;
	
	for ( var $TileXY in this.mTiles )
	{
		var $xy = $TileXY.split(',');
		this.mTiles[$TileXY] = new GsvTile( this.mGooglePanoId, $Zoom, $xy[0], $xy[1], this );
	}
}

SoyAsset_GsvImage.prototype.OnTileLoaded = function($TilePos,$Image)
{
	var $ctx = this.mCanvas.getContext("2d");
	
	var $x = $TilePos.x * this.mTileScale.x;
	var $y = $TilePos.y * this.mTileScale.y;
	
	$ctx.drawImage( $Image, $x, $y );

	this.mTiles[$x + ',' + $y] = true;
	
	//	have we finished?
	var $AllFinished = true;
	forEach( this.mTiles, function($Finished){ $AllFinished = ($AllFinished && $Finished); } );

	if ( !$AllFinished )
		return;
	
	var $DataUrl = this.mCanvas.toDataURL();
	this.mAsset = document.createElement("img"); // create img tag
	this.mAsset.src = $DataUrl;
	this.OnLoaded();
}

SoyAsset_GsvImage.prototype.OnTileFailed = function($Tile)
{
	//	put fake tile down
	var $Canvas = document.createElement("canvas");
	var $w = this.mTileScale.x;
	var $h = this.mTileScale.y;
	$Canvas.width = $w;
	$Canvas.height = $h;
	var $Ctx = $Canvas.getContext("2d");
	var $PixelImage = $Ctx.createImageData(1,1);
	var $Pixel = $PixelImage.data;
	for ( var $y=0;	y<$h;	$y++ )
	{
		for ( var $x=0;	x<$w;	$x++ )
		{
			$Pixel[0] = 255;
			$Pixel[1] = 0;
			$Pixel[2] = 255;
			$Pixel[3] = 255;
			
			$Ctx.putImageData( $PixelImage, $x, $y );
		}
	}
	var $DataUrl = $Canvas.toDataURL();
	var $Image = document.createElement("img"); // create img tag
	$Image.src = $DataUrl;
	this.OnTileLoaded($Tile,$Image);
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

	console.log(this);
	this.OnError("missing panoid and latlon");
	return false;
}


SoyAsset_GsvImage.prototype.Stop = function()
{
}


SoyAsset_GsvImage.prototype.OnLoadedImage = function($Asset)
{
	this.mAsset = $Asset.mAsset;
	this.OnLoaded();
}
