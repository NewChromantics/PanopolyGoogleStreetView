
SoyFileSelect.prototype = new SoySupport('SoyFileSelect');
RegisterSupport('FileSelect', new SoyFileSelect() );

function SoyFileSelect()
{
	//	call super
	SoySupport.apply( this, arguments );
}

SoyFileSelect.prototype.IsSupported = function()
{
	//	does browser support input?
	if ( !window.File || !window.FileReader )
		return false;
	
	return true;
}
