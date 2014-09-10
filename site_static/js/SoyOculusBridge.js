
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
	this.mWebsocket = new SoyWebSocket("OculusRest",0,false);
	this.mWebsocket.mOnMessage = function() { $this.OnRiftMessage(); }
	this.mWebsocket.mOnConnected = function() { $this.OnRiftConnected(); }
	this.mWebsocket.mOnDisconnected = function() { $this.OnRiftDisconnected(); }
	this.mWebsocket.Connect("ws://localhost:50000");
}

SoyOculusBridge.prototype.OnRiftDisconnected = function()
{
	this.mWebsocket = null;
	this.OnUnsupported();
	
	//	try to reconnect again in 10 secs
	var $this = this;
	setTimeout( function(){ $this.Init() }, this.mReconnectMs );
}

SoyOculusBridge.prototype.OnRiftConnected = function()
{
	this.OnSupported();
}

SoyOculusBridge.prototype.OnRiftMessage = function($SoyWebSocket,$Message)
{
	var $Json = {};
	try
	{
		$Json = JSON.parse(event.target.responseText);
	}
	catch ( e )
	{
		//	ignore bad messages
		return;
	}

	//	update rift input quaternion
	this.mQuaternion = $Json.quat;
	this.mEular = $Json.euler;
	//{"quat":{"x":0.2326346,"y":0.0608177,"z":0.0048655,"w":0.9706457},"euler":{"y":0.1352325,"p":0.4679076,"r":0.0423000}}
}

SoyOculusBridge.prototype.IsSupported = function()
{
	if ( !this.mWebsocket )
		return false;

	if ( !this.mWebsocket.IsConnected() )
		return false;
	return true;
}
