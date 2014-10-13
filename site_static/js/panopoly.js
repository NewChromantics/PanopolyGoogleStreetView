
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
var $DesktopOculusRestMode = new Array('OculusRest'/*,'Fullscreen'*/);
var $DesktopOculusBridgeMode = new Array('OculusBridge'/*,'Fullscreen'*/);
var $IosRiftMode = new Array('Gyro','ExternalDisplay');
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



function GetCameraPosition()
{
	var $Control = GetSupport($CurrentCameraControl);
	if ( $Control && $Control.IsEnabled() && !IsUndefined($Control.mPosition) )
	{
		return $Control.mPosition;
	}
	
	if ( typeof camera != 'undefined' )
		return camera.position;
	
	return new THREE.Vector3(0,0,0);
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

function ScaleVectors($a,$b)
{
	return new THREE.Vector2( $a.x * $b.x, $a.y * $b.y );
}

function DivideVectors($a,$b)
{
	return new THREE.Vector2( $a.x / $b.x, $a.y / $b.y );
}


//	returns array of coords or false
function MatchLatLonString($Haystack,$Prefix)
{
	$Prefix = CheckDefaultParam($Prefix,'');
	
	//	detect lat/lon coords
	//	-X.Y,-Z.W
	var $Pattern = '^' + $Prefix + '([-0-9]+).([0-9]+),([-0-9]+).([0-9]+)';
	var $RegExp = new RegExp($Pattern);
	var $Match = $RegExp.exec($Haystack);
	if ( $Match == null )
		return false;

	var $Lat = $Match[1] + '.' + $Match[2];
	var $Lon = $Match[3] + '.' + $Match[4];
	return [ $Lat, $Lon ];
}


