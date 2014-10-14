var RENDERMODE_WEBGL = 'webgl';		//	three js
var RENDERMODE_CANVAS = 'canvas';	//	three js without webgl
var RENDERMODE_CSS = 'css';	//	css3d
var RENDERMODE_NONE = null;

var GEOMODE_CUBEMAP = 'cubemap';
var GEOMODE_SPHERE = 'sphere';
var GEOMODE_SHADER = 'shader';


function SoyConfig($RenderMode,$GeoMode)
{
	//	higher fov = higher seperation
	
	//	webgl
	//	100 = 0.08 (0.09 tolerable on both)
	//	90 = 0.05

	//	cubemap
	//	100 = 0.10
	//	90 = 0.08
	//	70 = 0.07
	this.mFov = 90;
	this.mSeperation = 0.06;
	this.mSplitEnabled = true;
	this.mVideoEnabled = false;
	
	this.mPositionScalar = 1.5;

	//	gr: fov ~100 has clipping issues in css mode
	
	//	larger res = clipping issues
	//	gr: trying low res for mobile to stop crashes
	if ( IsMobile() )
	{
		this.mFaceResolution = 256;
		this.mMaxResolution = 2048;
		this.mSplitEnabled = false;
	}
	else
	{
		//	osx chrome css clips badly at 2000px
		//	performance improves as resolution lowers...
		//		this.mFaceResolution = 1500;
		//		this.mMaxResolution = 4096;
		//	ideal: face resolution matches actual face res... otherwise we're wasting video pixels
		this.mFaceResolution = 512;
		this.mMaxResolution = 4096;
	}

	this.mRenderMode = $RenderMode;
	this.mGeoMode = $GeoMode;
}


SoyConfig.prototype.SupportsAssetMeta = function($AssetMeta)
{
	var $Config = this;
	
	if ( !$Config.mVideoEnabled && $AssetMeta.IsVideo() )
		return false;
	
	if ( $AssetMeta.Width > $Config.mMaxResolution || $AssetMeta.Height > $Config.mMaxResolution )
		return false;

	var $CubemapMode = ($Config.mRenderMode == RENDERMODE_CSS);

	//	only support cubemaps if cubemap mode
	if ( $AssetMeta.IsCubemap() != $CubemapMode )
		return false;

	if ( $AssetMeta.IsVideo() )
	{
		var $Type = $AssetMeta.Format;
		var $Codec = $AssetMeta.Codec;
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


