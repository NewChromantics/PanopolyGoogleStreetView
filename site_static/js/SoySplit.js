
SoySplit.prototype = new SoySupport('SoySplit');

function SoySplit()
{
	//	call super
	SoySupport.apply( this, arguments );
}

SoySplit.prototype.Init = function()
{
	this.OnSupported();
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
		console.log("SoySplit.prototype.Enable");
		console.log(this);
		effect = new THREE.StereoEffect( renderer );
		effect.separation = 1;
		onContainerResize();
		this.OnEnabled();
	}
}

SoySplit.prototype.Disable = function()
{
	console.log("SoySplit.prototype.Disable");
	console.log(this);
	if ( this.IsEnabled() )
	{
		effect = null;
		onContainerResize();
		this.OnDisabled();
	}
}
