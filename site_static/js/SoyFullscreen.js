
SoyFullscreen.prototype = new SoySupport('SoyFullscreen');
RegisterSupport('Fullscreen', new SoyFullscreen() );

function SoyFullscreen()
{
	//	call super
	SoySupport.apply( this, arguments );
}


SoyFullscreen.prototype.IsSupported = function()
{
	return false;
	return ( document.fullscreenEnabled ||
			document.webkitFullscreenEnabled ||
			document.mozFullScreenEnabled ||
			document.msFullscreenEnabled );
}

SoyFullscreen.prototype.IsEnabled = function()
{
	return false;
}

SoyFullscreen.prototype.Enable = function()
{
	if ( !this.IsEnabled() )
	{
	//	OnEnabled();
	}
}

SoyFullscreen.prototype.Disable = function()
{
	if ( this.IsEnabled() )
	{
	//	OnDisabled();
	}
}
