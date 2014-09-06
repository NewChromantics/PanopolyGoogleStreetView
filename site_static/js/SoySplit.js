
SoySplit.prototype = new SoySupport('SoySplit');
RegisterSupport('Split', new SoySplit() );

function SoySplit()
{
	//	call super
	SoySupport.apply( this, arguments );
}

SoySplit.prototype.IsSupported = function()
{
	return true;
}

SoySplit.prototype.IsEnabled = function()
{
	return (effect!=null);
}

SoySplit.prototype.Enable = function()
{
	if ( !this.IsEnabled() )
	{
		effect = new THREE.StereoEffect( renderer );
		effect.separation = 1;
		onContainerResize();
		this.OnEnabled();
	}
}

SoySplit.prototype.Disable = function()
{
	if ( this.IsEnabled() )
	{
		effect = null;
		onContainerResize();
		this.OnDisabled();
	}
}
