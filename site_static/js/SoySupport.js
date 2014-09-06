
function SoySupport($Type)
{
	var $this = this;
	this.mType = $Type;
	this.mOnSupportedChanged = function($Supported) {	console.log("mOnSupportedChanged " + $this.GetType() );	}
	this.mOnEnabledChanged = function($Enabled)		{	console.log("mOnEnabledChanged " + $this.GetType() );	}
	this.GetType = function() { return $Type;	}
	this.mIsEnabled = false;
}

SoySupport.prototype.Init = function()
{
}

SoySupport.prototype.IsSupported = function()
{
	return false;
}

SoySupport.prototype.OnSupported = function()
{
	if ( this.mOnSupportedChanged )
		this.mOnSupportedChanged(true);
}

SoySupport.prototype.OnUnsupported = function()
{
	if ( this.mOnSupportedChanged )
		this.mOnSupportedChanged(false);
}

SoySupport.prototype.IsSupported = function()
{
	return false;
}

SoySupport.prototype.IsEnabled = function()
{
	return this.mIsEnabled;
}

SoySupport.prototype.Enable = function()
{
	this.OnEnabled();
}

SoySupport.prototype.Disable = function()
{
	this.OnDisabled();
}

SoySupport.prototype.OnEnabled = function()
{
	if ( this.mIsEnabled )
		return;
	this.mIsEnabled = true;

	if ( this.mOnEnabledChanged )
		this.mOnEnabledChanged(true);
}

SoySupport.prototype.OnDisabled = function()
{
	if ( !this.mIsEnabled )
		return;
	this.mIsEnabled = false;
	
	if ( this.mOnEnabledChanged )
		this.mOnEnabledChanged(false);
}
