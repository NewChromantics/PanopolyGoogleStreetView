
SoyRect = function($x,$y,$w,$h)
{
	this.x = Math.floor( CheckDefaultParam( $x, 0 ) );
	this.y = Math.floor( CheckDefaultParam( $y, 0 ) );
	this.w = Math.floor( CheckDefaultParam( $w, 0 ) );
	this.h = Math.floor( CheckDefaultParam( $h, 0 ) );
}

SoyRect.prototype.Equals = function($Rect)
{
	if ( !$Rect )
		return false;
	
	return this.x == $Rect.x && this.y == $Rect.y && this.w == $Rect.w && this.h == $Rect.h;
}
