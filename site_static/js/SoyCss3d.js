var $TransformProperty = GetTransformProperty();


function GetTransformProperty()
{
	var props = 'transform WebkitTransform MozTransform OTransform msTransform'.split(' ');
	var el = document.createElement('div');
	
	for(var i = 0, l = props.length; i < l; i++) {
		if(typeof el.style[props[i]] !== "undefined") {
			return props[i];
		}
	}
	
	return null;
}



function SetElementTransform3d($Element,$TransformCss)
{
	if ( !$Element && $TransformProperty != null )
		return;
	$Element.style[$TransformProperty] = $TransformCss;
}





SoyCss3d.prototype = new SoySupport('SoyCss3d');
RegisterSupport('Css3d', new SoyCss3d() );

function SoyCss3d()
{
	//	call super
	SoySupport.apply( this, arguments );
}

SoyCss3d.prototype.IsSupported = function()
{
	if ( $TransformProperty == null )
		return false;
	
	//	gr: cache this?
	var el = document.createElement('p'),
	has3d,
	transforms = {
		'webkitTransform':'-webkit-transform',
		'OTransform':'-o-transform',
		'msTransform':'-ms-transform',
		'MozTransform':'-moz-transform',
		'transform':'transform'
	};
	
    // Add it to the body to get the computed style.
    document.body.insertBefore(el, null);
	
    for (var t in transforms) {
        if (el.style[t] !== undefined) {
            el.style[t] = "translate3d(1px,1px,1px)";
            has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
        }
    }
	
    document.body.removeChild(el);
	
    return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
}
