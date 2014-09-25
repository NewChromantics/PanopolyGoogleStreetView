
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
	//	currently three js only
	if ( !UseCanvasMode() )
		return false;
	//if ( typeof effect == 'undefined' )
	//	return false;
	return true;
}

SoySplit.prototype.IsEnabled = function()
{
	if ( !this.IsSupported() )
		return false;
	if ( typeof effect == 'undefined' )
		return false;
	return (effect!=null);
}

SoySplit.prototype.Enable = function()
{
	if ( !this.IsEnabled() )
	{
		console.log("Making stereo effect with ", $RendererLeft, $RendererRight );
		if ( $RendererLeft == $RendererRight )
			console.log("same");
		
		effect = new THREE.StereoEffect( $RendererLeft, $RendererRight );
		//effect.separation = 1;
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
