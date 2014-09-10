
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

function HasWebGl()
{
	if ( !AllowWebGl() )
		return false;
	
	if ( !window.WebGLRenderingContext )
		return false;
	
	//	could exist, but not enabled (iphone!)
	var canvas = document.createElement("canvas");
	var gl = null;
	var experimental = false;
	try			{	gl = canvas.getContext("webgl");	}
	catch (e)	{	gl = null;	}
	if ( gl )
		return true;
	
	//	do we have experimental? (safari 7 osx enabled from developer menu)
	try			{	gl = canvas.getContext("experimental-webgl"); experimental = true;	}
	catch (e)	{	gl = null;	}
	if (gl)
		return true;

	return false;
}

function IsMobile()
{
	if ( IsDevice('iPad') )
		return true;
	//return true;
	return !HasWebGl();
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



function ReplaceFilename(Filename,Number,NextNumber)
{
	var NewFilename = Filename.replace( "."+Number.toString(), "."+NextNumber.toString() );
	//console.log( NewFilename + " = " + Filename + " .replace( " + Number.toString() + " , " + NextNumber.toString() + ")" );
	if ( NewFilename == Filename )
		return null;
	return NewFilename;
}

function GetNextResFilename(Filename)
{
	//	0 is our special "not loaded" resolution
	var NewFilename = ReplaceFilename( Filename, 0, 256 );
	if ( NewFilename )
		return NewFilename;
	
	var NewFilename = ReplaceFilename( Filename, 256, 1024 );
	if ( NewFilename )
		return NewFilename;
	
	if ( IsMobile() )
		return null;

	var NewFilename = ReplaceFilename( Filename, 1024, 2048 );
	if ( NewFilename )
		return NewFilename;
	
	NewFilename = ReplaceFilename( Filename, 2048, 4096 );
	if ( NewFilename )
		return NewFilename;
	return null;
}


function LoadHigher(Material)
{
	if ( !Material.map )
		return false;
	//console.log("LoadHigher - " + Material.map.sourceFile );
	var NewFilename = GetNextResFilename( Material.map.sourceFile );
	if ( NewFilename == null )
	{
		//console.log("no higher res");
		return false;
	}
	console.log("loading higher res:" + NewFilename );
	
	//	enable cross-site loading
	THREE.ImageUtils.crossOrigin = "";
	
	var HiTexture = THREE.ImageUtils.loadTexture( NewFilename,
												 new THREE.UVMapping(),
												 function(NewHiTexture)
												 {
												 Material.map = NewHiTexture;
												 Material.needsUpdate = true;
												 LoadHigher( Material );
												 },
												 function ()
												 {
												 //	error: maybe 404, just try next res up
												 //LoadHigher( Material );
												 }
												 );
}

function OnVideoEvent($Video,$VideoTexture,$Material,$Event)
{
	var HAVE_NOTHING = 0;//	- no information whether or not the audio/video is ready
	var HAVE_METADATA = 1;	//	- metadata for the audio/video is ready
	var HAVE_CURRENT_DATA = 2;	//- data for the current playback position is available, but not enough data to play next frame/millisecond
	var HAVE_FUTURE_DATA = 3;	//- data for the current and at least the next frame is available
	var HAVE_ENOUGH_DATA = 4;

	//	error
	switch ( $Event.type )
	{
		case 'error':
			StopVideo( $Video, $VideoTexture, $Material, 'error' );
			return;
	
		case 'canplay':
			$Material.map = videoTexture;
			$Material.needsUpdate = true;
			UpdateVideo( $Video, $VideoTexture, $Material, 1000/60 );
			return;
	}

}

function StopVideo($Video,$VideoTexture,$Material,$Error)
{
	//	stop the auto updates by setting an error
	$Video.mError = $Error;
}

function UpdateVideo($Video,$VideoTexture,$Material,$UpdateRateMs)
{
	if ( $Video.mError != null )
	{
		//	something gone wrong, don't update!
		return;
	}
	
	//	push texture
	if ( $Video.readyState >= HAVE_CURRENT_DATA )
	{
		$VideoTexture.needsUpdate = true;
//		$Material.map = videoTexture;
//		$Material.needsUpdate = true;
	}
	
	//	update again!
	setTimeout( function() { UpdateVideo( $Video, $VideoTexture, $Material, $UpdateRateMs ); }, $UpdateRateMs );
}

function LoadHigherVideo($Material)
{
	if ( !$Material.map )
		return false;
	//console.log("LoadHigher - " + Material.map.sourceFile );
	var $NewFilename = GetNextResFilename( $Material.map.sourceFile );
	if ( $NewFilename == null )
	{
		//console.log("no higher res");
		return false;
	}
	console.log("loading higher res video:" + $NewFilename );

	var video = document.createElement('video');
//	video.width = 640;
//	video.height = 360;
//	video.type = ' video/ogg; codecs="theora, vorbis" ';
	video.autoplay = true;
	video.loop = true;
	video.crossOrigin='';
	video.src = $NewFilename;
	video.mError = null;

	videoTexture = new THREE.Texture( video );
	/*
	video.addEventListener('loadstart', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('canplay', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('progress', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('canplaythrough', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('loadeddata', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('loadedmetadata', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('timeupdate', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('playing', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('waiting', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
	video.addEventListener('error', function($Event) { OnVideoDataChanged( video, videoTexture, $Material, $Event); }, false );
*/
	setTimeout( function() { OnVideoDataChanged( video, videoTexture, $Material, null ); }, 1000/60 );
	
	video.load(); // must call after setting/changing source
	video.play();
	
	
	videoTexture.generateMipmaps = false;
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
//	videoTexture.needsUpdate = true;
	
	//LoadHigher( Material );
	
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




function CubemapLayout($ImageUrl,$ImageWidth,$ImageHeight)
{
	this.mFront = new THREE.Vector2(3,1);
	this.mBack = new THREE.Vector2(1,1);
	this.mLeft = new THREE.Vector2(0,1);
	this.mRight = new THREE.Vector2(2,1);
	this.mUp = new THREE.Vector2(1,0);
	this.mDown = new THREE.Vector2(1,2);
	this.mBlockCount = new THREE.Vector2( 4, 3 );
	this.mImageUrl = $ImageUrl;
	this.mImageSize = new THREE.Vector2( $ImageWidth, $ImageHeight );
}

function ScaleVectors($a,$b)
{
	return new THREE.Vector2( $a.x * $b.x, $a.y * $b.y );
}

function DivideVectors($a,$b)
{
	return new THREE.Vector2( $a.x / $b.x, $a.y / $b.y );
}

CubemapLayout.prototype.GetFaceSize = function()	{	return DivideVectors( this.mImageSize, this.mBlockCount );	}
CubemapLayout.prototype.GetFront = function()	{	return ScaleVectors( this.mFront, this.GetFaceSize() );	}
CubemapLayout.prototype.GetBack = function()	{	return ScaleVectors( this.mBack, this.GetFaceSize() );	}
CubemapLayout.prototype.GetLeft = function()	{	return ScaleVectors( this.mLeft, this.GetFaceSize() );	}
CubemapLayout.prototype.GetRight = function()	{	return ScaleVectors( this.mRight, this.GetFaceSize() );	}
CubemapLayout.prototype.GetUp = function()		{	return ScaleVectors( this.mUp, this.GetFaceSize() );	}
CubemapLayout.prototype.GetDown = function()	{	return ScaleVectors( this.mDown, this.GetFaceSize() );	}


