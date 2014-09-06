
SoyGyro.prototype = new SoySupport('SoyGyro');
RegisterSupport('Gyro', new SoyGyro() );


function SoyGyro()
{
	//	call super
	SoySupport.apply( this, arguments );

	//	constructed on first message to determine if we recieve any
	this.mQuaternion = null;
	this.mScreenOrientation = 0;
}


SoyGyro.prototype.Init = function()
{
	if ( !IsGyroSupported() )
	{
		this.OnUnsupported();
		return;
	}

	//	add listener
	var $this = this;
	window.addEventListener( 'orientationchange', function($Event){ $this.OnScreenOrientationChanged($Event); }, false );
	window.addEventListener( 'deviceorientation', function($Event){ $this.OnDeviceOrientationChanged($Event); }, false );
}


SoyGyro.prototype.OnScreenOrientationChanged = function($Event)
{
	this.mScreenOrientation = window.orientation || 0;
}


SoyGyro.prototype.OnDeviceOrientationChanged = function($Event)
{
	var $First = (this.mQuaternion == null);
	if ( $First )
		this.mQuaternion = new THREE.Quaternion();
	
	var alpha  = THREE.Math.degToRad( $Event.alpha ); // Z
	var beta   = THREE.Math.degToRad( $Event.beta ); // X'
	var gamma  = THREE.Math.degToRad( $Event.gamma ); // Y''
	var orient = THREE.Math.degToRad( this.mScreenOrientation );

	var zee = new THREE.Vector3( 0, 0, 1 );
	var euler = new THREE.Euler();
	var q0 = new THREE.Quaternion();
	var q1 = new THREE.Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis
	euler.set( beta, alpha, - gamma, 'YXZ' );                       // 'ZXY' for the device, but 'YXZ' for us
	this.mQuaternion.setFromEuler( euler );                               // orient the device
	this.mQuaternion.multiply( q1 );                                      // camera looks out the back of the device, not the top
	this.mQuaternion.multiply( q0.setFromAxisAngle( zee, - orient ) );    // adjust for screen orientation

	if ( $First )
	{
		$First = false;
		this.OnSupported();
	}
}

SoyGyro.prototype.IsSupported = function()
{
	return (this.mQuaternion != null);
}
