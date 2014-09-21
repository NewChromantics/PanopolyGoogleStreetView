
function GetUploadUrl()
{
	//	locally testing
	if ( window.location.origin == "file://" )
		return "http://localhost:8888/upload.php";
	return "http://upload.panopo.ly/upload.php";
}

function AllowWebGl()
{
	return true;
}


var $WebglCache = null;

function HasWebGl()
{
	if ( !AllowWebGl() )
		return false;
	
	if ( !window.WebGLRenderingContext )
		return false;
	
	//	rendering context could exist, but not enabled (iphone!)
	//	so need to check if we can fetch a context
	
	//	gr: there is no way to delete a context once we've "get" one, so cache
	//	http://stackoverflow.com/a/14992981/355753
	if ( !$WebglCache )
	{
		var canvas = document.createElement("canvas");
		try			{	$WebglCache = canvas.getContext("webgl");	}
		catch (e)	{		}
	
		//	do we have experimental? (safari 7 osx enabled from developer menu)
		if ( !$WebglCache )
		{
			try			{	$WebglCache = canvas.getContext("experimental-webgl"); }
			catch (e)	{	}
		}
	}

	return ($WebglCache != null);
}

function IsMobile()
{
	if ( IsDevice('iPad') )
		return true;
	if ( IsDevice('iPhone') )
		return true;
	
	//	desktop safari != mobile..
	return false;
	//return !HasWebGl();
}


function GetDefaultPanoFilename()
{
	return "equirectangular.png";
}

function IsShrinkSupported()
{
	if ( IsDevice('iPad') )
		return true;
	return false;
}

function IsSplitSupported()
{
	return true;
}


function IsGyroSupported()
{
	//	gr: event supported... but assume not availible until we get a first event. so we need to create this regardless
	if ( !window.DeviceOrientationEvent )
		return false;
	
	if ( IsDevice('iPad') || IsDevice('iPhone') )
		return true;
	return false;
}


function UseCanvasMode()
{
	return IsCanvasSupported() && ( HasWebGl() || !IsMobile() );
}

function UseCubemapMode()
{
//	var $Css3D = new SoyCss3d();
//	return $Css3D.IsSupported();
	return true;
}





function SoyMode($CameraControl)
{
	this.mCameraControl = $CameraControl;
	this.mSplit = IsSupportEnabled('Split');
	this.mFullscreen = IsSupportEnabled('Fullscreen');
}

//	current control
var $CurrentCameraControl = null;
//	previous modes
var $ModeStack = new Array();

//	auto-switch modesets
var $DesktopOculusRestMode = new Array('OculusRest','Split'/*,'Fullscreen'*/);
var $DesktopOculusBridgeMode = new Array('OculusBridge','Split'/*,'Fullscreen'*/);
var $IosRiftMode = new Array('Gyro','Split','ExternalDisplay');
var $IosGyroMode = new Array('Gyro');
var $DesktopMouseMode = new Array('Mouse');


//	save current mode
function PushMode()
{
	var $CurrentMode = new SoyMode($CurrentCameraControl);
	$ModeStack.push( $CurrentMode );
}

//	restore last mode
function PopMode($SpecificMode)
{
	//	pop last
	var $Last = $ModeStack.length-1;
	if ( $Last < 0 )
		return false;
	
	var $LastMode = $ModeStack[$Last];
	
	//	if specified, only pop if in certain mode
	if ( $SpecificMode )
		if ( $LastMode.mCameraControl != $SpecificMode )
			return false;
	
	$ModeStack.splice($Last);
	
	//	restore settings
	$CurrentCameraControl = $LastMode.mCameraControl;
	SetSupportEnabled('Split',$LastMode.mSplit);
	SetSupportEnabled('Fullscreen',$LastMode.mFullscreen);
	return true;
}


function TryMode($ModeParams,$ModeName)
{
	var $InModeNow = true;
	for ( var $Key in $ModeParams )
	{
		var $Support = GetSupport( $ModeParams[$Key] );
		if ( !$Support )
			return false;
		if ( !$Support.IsSupported() )
			return false;
		if ( !$Support.IsEnabled() )
			$InModeNow = false;
	}
	
	//	alraedy in mode
	if ( $InModeNow )
	{
		//alert("already in mode " + $ModeName );
		return true;
	}
	
	//	save current state
	PushMode();
	
	//	all supported, try and switch
	for ( var $Key in $ModeParams )
	{
		var $SupportName = $ModeParams[$Key];
		if ( !SetSupportEnabled( $SupportName ) )
		{
			//alert("failed to enable " + $SupportName );
			PopMode();
			return false;
		}
	}
	//	and set controller
	$CurrentCameraControl = $ModeParams[0];
	
	//alert("set mode " + $ModeName );
	return true;
}

function CheckAutoSwitch($ChangedSupport,$Supported)
{
	//	support was lost, if it's the current control, drop out of mode
	if ( !$Supported )
	{
		while ( $CurrentCameraControl == $ChangedSupport )
			if ( !PopMode( $ChangedSupport ) )
				break;
		return false;
	}
	
	//	something became enabled, try the different modes
	if ( TryMode( $DesktopOculusRestMode, "DesktopOculusRest" ) )	return true;
	if ( TryMode( $DesktopOculusBridgeMode, "DesktopOculusBridge" ) )	return true;
	if ( TryMode( $IosRiftMode, "IosRift" ) )	return true;
	if ( TryMode( $IosGyroMode, "IosGyro" ) )	return true;
	if ( TryMode( $DesktopMouseMode, "DesktopMouseMode" ) )	return true;
	
	return false;
}

function AddDefaultSupportAutoSwitch()
{
	for ( var $Key in $Supports )
	{
		var $Support = $Supports[$Key];
		if ( $Support.mOnSupportedChanged )
			continue;
		
		$Support.mOnSupportedChanged = function($Supported){	CheckAutoSwitch( $Key, $Supported ); };
	}
}



function GetCameraQuaternion()
{
	var $Control = GetSupport($CurrentCameraControl);
	if ( $Control && $Control.IsEnabled() )
	{
		return $Control.mQuaternion;
	}
	
	if ( typeof camera != 'undefined' )
		return camera.quaternion;

	return new THREE.Quaternion();
}




function CubemapLayout($ImageUrl,$ImageWidth,$ImageHeight,$Layout)
{
	this.mFaces = {};
	
	//	layout should be WH<FACES>
	var $TileWidth = $Layout[0];
	var $TileHeight = $Layout[1];
	for ( var $t=2;	$t<$Layout.length;	$t++ )
	{
		var $Face = $Layout[$t];
		var $x = ($t-2) % $TileWidth;
		var $y = Math.floor(($t-2) / $TileWidth);
		this.mFaces[$Face] = new THREE.Vector2($x,$y);
		//console.log($Face + " = " + $x + "," + $y );
	}
	
	this.mFaceCount = new THREE.Vector2( $TileWidth, $TileHeight );
	this.mImageUrl = $ImageUrl;
	this.mImageSize = new THREE.Vector2( $ImageWidth/$TileWidth, $ImageHeight/$TileHeight );
}

function ScaleVectors($a,$b)
{
	return new THREE.Vector2( $a.x * $b.x, $a.y * $b.y );
}

function DivideVectors($a,$b)
{
	return new THREE.Vector2( $a.x / $b.x, $a.y / $b.y );
}

CubemapLayout.prototype.GetFaceSize = function()	{	return DivideVectors( this.mImageSize, this.mFaceCount );	}
CubemapLayout.prototype.GetFront = function()	{	return ScaleVectors( this.mFaces['F'], this.GetFaceSize() );	}
CubemapLayout.prototype.GetBack = function()	{	return ScaleVectors( this.mFaces['B'], this.GetFaceSize() );	}
CubemapLayout.prototype.GetLeft = function()	{	return ScaleVectors( this.mFaces['L'], this.GetFaceSize() );	}
CubemapLayout.prototype.GetRight = function()	{	return ScaleVectors( this.mFaces['R'], this.GetFaceSize() );	}
CubemapLayout.prototype.GetUp = function()		{	return ScaleVectors( this.mFaces['U'], this.GetFaceSize() );	}
CubemapLayout.prototype.GetDown = function()	{	return ScaleVectors( this.mFaces['D'], this.GetFaceSize() );	}


