
SoyMouse.prototype = new SoySupport('SoyMouse');
RegisterSupport('Mouse', new SoyMouse() );


function SoyMouse($Container)
{
	if ( $Container == undefined )
		$Container = document.body;
	
	//	call super
	SoySupport.apply( this, arguments );
	
	this.mUpdateRateMs = 1000/30;
	this.mQuaternion = new THREE.Quaternion();
	this.mContainer = $Container;
	
	
	this.mScreenOrientation = window.screenOrientation || 0;
	this.isUserInteracting = false;
	this.onMouseDownMouseX = 0;
	this.onMouseDownMouseY = 0;
	this.lon = 0;
	this.onMouseDownLon = 0;
	this.lat = 0;
	this.onMouseDownLat = 0;
	this.phi = 0;
	this.theta = 0;
	this.onPointerDownLon = 0;
	this.onPointerDownLat = 0;
}


SoyMouse.prototype.IsSupported = function()
{
	return true;
}

SoyMouse.prototype.Init = function()
{
	if ( !this.IsSupported() )
	{
		this.OnUnsupported();
		return;
	}
	
	var $this = this;
	this.mContainer.addEventListener( 'mousedown', function($Event){ $this.OnMouseDown($Event); }, false );
	this.mContainer.addEventListener( 'mousemove', function($Event){ $this.OnMouseMove($Event); }, false );
	this.mContainer.addEventListener( 'mouseup', function($Event){ $this.OnMouseUp($Event); }, false );

	this.UpdateQuaternion();
	
	this.OnSupported();
}

SoyMouse.prototype.OnMouseDown = function($Event)
{
	$Event.preventDefault();
	
	this.isUserInteracting = true;
	this.onPointerDownPointerX = $Event.clientX;
	this.onPointerDownPointerY = $Event.clientY;
	this.onPointerDownLon = this.lon;
	this.onPointerDownLat = this.lat;
	
}

SoyMouse.prototype.OnMouseMove = function($Event)
{
	if ( !this.isUserInteracting )
		return;

	this.lon = ( this.onPointerDownPointerX - $Event.clientX ) * 0.1 + this.onPointerDownLon;
	this.lat = ( $Event.clientY - this.onPointerDownPointerY ) * 0.1 + this.onPointerDownLat;
	this.UpdateQuaternion();
}


SoyMouse.prototype.OnMouseUp = function($Event)
{
	this.isUserInteracting = false;
}


SoyMouse.prototype.UpdateQuaternion = function()
{
	var lat = Math.max( - 85, Math.min( 85, this.lat ) );
	var phi = THREE.Math.degToRad( 90 - this.lat );
	var theta = THREE.Math.degToRad( this.lon );
	
	var Origin = new THREE.Vector3(0,0,0);
	var Up = new THREE.Vector3(0,1,0);
	var Forward = new THREE.Vector3();
	Forward.x = 1 * Math.sin( phi ) * Math.cos( theta );
	Forward.y = 1 * Math.cos( phi );
	Forward.z = 1 * Math.sin( phi ) * Math.sin( theta );
	
	var Mat = new THREE.Matrix4();
	Mat.lookAt( Origin, Forward, Up );
	
	this.mQuaternion.setFromRotationMatrix( Mat );
}


SoyMouse.prototype.OnEnabled = function()
{
	//	call super
	SoySupport.prototype.OnEnabled.apply(this);

	//	start self-updating
	this.Update();
}


SoyMouse.prototype.Update = function()
{
	if ( !this.IsEnabled() )
		return;
	
	//	move this to it's own controller!
	if ( this.isUserInteracting === false )
	{
		this.lon += 0.1;
		this.UpdateQuaternion();
	}
	
	//	self-update
	var $this = this;
	setTimeout( function(){ $this.Update(); }, this.mUpdateRateMs );
}



