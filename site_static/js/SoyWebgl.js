var $WebglCache = null;


SoyWebgl.prototype = new SoySupport('SoyWebgl');
RegisterSupport('Webgl', new SoyWebgl() );

function SoyWebgl()
{
	//	call super
	SoySupport.apply( this, arguments );
}

SoyWebgl.prototype.IsSupported = function()
{
	if ( !window.WebGLRenderingContext )
		return false;
	
	//	rendering context could exist, but not enabled (iphone!)
	//	so need to check if we can fetch a context
	
	//	gr: there is no way to delete a context once we've "get" one, so cache
	//	http://stackoverflow.com/a/14992981/355753
	if ( !$WebglCache )
	{
		var canvas = document.createElement("canvas");
		try			{	$WebglCache = canvas.getContext("webgl");	}
		catch (e)	{		}
		
		//	do we have experimental? (safari 7 osx enabled from developer menu)
		if ( !$WebglCache )
		{
			try			{	$WebglCache = canvas.getContext("experimental-webgl"); }
			catch (e)	{	}
		}
	}
	
	return ($WebglCache != null);
}
