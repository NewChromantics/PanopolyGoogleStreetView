
SoyShrink.prototype = new SoySupport('SoyShrink');
RegisterSupport('Shrink', new SoyShrink() );

function SoyShrink()
{
	//	call super
	SoySupport.apply( this, arguments );
}


SoyShrink.prototype.IsSupported = function()
{
	return IsDevice('iPad');
}
/*
SoyShrink.prototype.IsEnabled = function()
{
	return (effect!=null);
}
*/
SoyShrink.prototype.Enable = function()
{
	if ( !this.IsEnabled() )
	{
		var Container = document.getElementById("container");
		if ( !Container )
			return;
		Container.className = "ipad_smallviewport";
		onContainerResize();
		this.OnEnabled();
	}
}

SoyShrink.prototype.Disable = function()
{
	if ( this.IsEnabled() )
	{
		var Container = document.getElementById("container");
		if ( !Container )
			return;
		Container.className = "";
		onContainerResize();
		this.OnDisabled();
	}
}
