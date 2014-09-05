/*
	supported mode checks and callbacks
*/

//	create probes and trigger static callbacks
var $Supports = {};

function CreateSupports()
{
	$Supports['RiftWebsocket'] = new SoyRiftWebsocket();
	$Supports['Split'] = new SoySplit();
	$Supports['Shrink'] = new SoyShrink();
	$Supports['Fullscreen'] = new SoyFullscreen();
}
CreateSupports();

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



