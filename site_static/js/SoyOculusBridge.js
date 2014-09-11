
SoyOculusBridge.prototype = new SoySupport('SoyOculusBridge');
RegisterSupport('OculusBridge', new SoyOculusBridge() );


function SoyOculusBridge()
{
	//	call super
	SoySupport.apply( this, arguments );

	this.mWebsocket = null;
	this.mQuaternion = null;
	this.mEular = null;
	this.mReconnectMs = 10*1000;
}


SoyOculusBridge.prototype.Init = function()
{
	if ( !IsWebsocketSupported() )
	{
		this.OnUnsupported();
		return;
	}
	
	if ( !("SoyWebSocket" in window) )
	{
		//alert("Websocket supported, SoyWebSocket missing");
		this.OnUnsupported();
		return;
	}

	var $this = this;
	this.mWebsocket = new SoyWebSocket("OculusBridge",0,false);
	this.mWebsocket.mOnMessage = function($SoyWebSocket,$Message) { $this.OnRiftMessage($Message); }
	this.mWebsocket.mOnConnected = function($SoyWebSocket) { $this.OnRiftConnected(); }
	this.mWebsocket.mOnDisconnected = function($SoyWebSocket) { $this.OnRiftDisconnected(); }
	this.mWebsocket.Connect("ws://localhost:9005");
}

SoyOculusBridge.prototype.OnRiftDisconnected = function()
{
	this.mWebsocket = null;
	this.mQuaternion = null;
	this.OnUnsupported();
	
	//	try to reconnect again in 10 secs
	var $this = this;
	setTimeout( function(){ $this.Init() }, this.mReconnectMs );
}

SoyOculusBridge.prototype.OnRiftConnected = function()
{
	//	gr: onsupported when we get our first orientation
	//this.OnSupported();
}

SoyOculusBridge.prototype.OnRiftMessage = function($Message)
{
	var $Json = {};
	try
	{
		$Json = JSON.parse($Message);
	}
	catch ( e )
	{
		//	ignore bad messages
		console.log("Failed to parse oculus bridge JSON");
		return;
	}

	var $WasSupported = this.IsSupported();

	//	update quaternion
	var $QuatArray = $Json["o"];
	if ( $QuatArray && ($QuatArray.length == 4) )
	{
		var $x = Number($QuatArray[1]);
		var $y = Number($QuatArray[2]);
		var $z = Number($QuatArray[3]);
		var $w = Number($QuatArray[0]);
		
		this.mQuaternion = new THREE.Quaternion( $x, $y, $z, $w );
	}
	
	//	detect first support
	if ( $WasSupported != this.IsSupported() )
	{
		assert( this.IsSupported(), "IsSupported wrong result" );
		this.OnSupported();
	}
}

SoyOculusBridge.prototype.IsSupported = function()
{
	if ( !this.mWebsocket )
		return false;

	if ( !this.mWebsocket.IsConnected() )
		return false;
	
	//	not supported until we've had a quaternion through
	if ( !this.mQuaternion )
		return false;
	
	return true;
}
