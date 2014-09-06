/*
	supported mode checks and callbacks
*/

//	create probes and trigger static callbacks
var $Supports = {};

function RegisterSupport($Name,$Instance)
{
	$Supports[$Name] = $Instance;
}

function InitSupport()
{
	OnFileSelectSupported();
	
	for ( var $Key in $Supports )
	{
		var $Support = $Supports[$Key];
		if ( !$Supports.hasOwnProperty($Key) )
			continue;
		$Support.Init();
	}
}

function ShutdownSupport()
{
	for ( var $Key in $Supports )
	{
		var $Support = $Supports[$Key];
		delete $Supports[$Key];
		$Support.OnUnsupported();
	}
}

function GetSupport($Name)
{
	return $Supports[$Name];
}

function AddOnSupportedChangedListener($Name,$Function)
{
	var $Support = GetSupport($Name);
	if ( !$Support )
		return false;
	
	$Support.mOnSupportedChanged = $Function;
	return true;
}


function AddOnEnabledChangedListener($Name,$Function)
{
	var $Support = GetSupport($Name);
	if ( !$Support )
		return false;
	
	$Support.mOnEnabledChanged = $Function;
	return true;
}

function SupportToggleEnable($Name)
{
	var $Support = GetSupport($Name);
	if ( !$Support )
		return false;
	
	if ( $Support.IsEnabled() )
		$Support.Disable();
	else
		$Support.Enable();
	return true;
}


function IsSupported($Name)
{
	var $Support = GetSupport($Name);
	if ( !$Support )
		return false;
	return $Support.IsSupported();
}

function IsSupportEnabled($Name)
{
	var $Support = GetSupport($Name);
	if ( !$Support )
		return false;
	return $Support.IsSupported() && $Support.IsEnabled();
}

function SetSupportEnabled($Name,$Enable)
{
	if ( $Enable == undefined )
		$Enable = true;
	
	var $Support = GetSupport($Name);
	if ( !$Support )
		return false;
	
	if ( $Enable )
		$Support.Enable();
	else
		$Support.Disable();
	
	return $Support.IsEnabled() == $Enable;
}






function IsFileSelectSupported()
{
	//	does browser support input?
	if ( !window.File || !window.FileReader )
		return false;
	
	return true;
}

function OnFileSelectSupported()
{
	var $Supported = IsFileSelectSupported();
	var Uploader = GetElement("image_selector");
	if ( Uploader )
	{
		ShowElement("ImageSelector", $Supported );
		if ( $Supported )
			Uploader.addEventListener('change', OnFileSelect, false);
		else
			Uploader.removeEventListener('change', OnFileSelect, false);
	}
}



