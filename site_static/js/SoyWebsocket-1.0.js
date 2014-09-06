

function SoyWebSocket($Name,$DefaultPort,$CreateUI)
{
	if ( $CreateUI == undefined )
		$CreateUI = true;
	if ( !$DefaultPort )
		$DefaultPort = 8080;
	
	this.mName = $Name;
	this.mSocket = null;
	this.mDiv = null;
	
	//	default callback functions
	this.mOnMessage = function($SoyWebSocket,$Message)	{	console.log( $SoyWebSocket.mName + "::mOnMessage()");	}
	this.mOnConnected = function($SoyWebSocket)			{	console.log( $SoyWebSocket.mName + "::mOnConnected()");	}
	this.mOnDisconnected = function($SoyWebSocket)		{	console.log( $SoyWebSocket.mName + "::mOnDisconnected()");	}

	if ( $CreateUI )
		this.CreateUI( $DefaultPort );
	this.OnDisconnected(true);
}

SoyWebSocket.prototype.IsConnected = function()
{
	if ( !this.mSocket )
		return false;
	//http://stackoverflow.com/a/12466133/355753
	return (this.mSocket.readyState == 1);
}

SoyWebSocket.prototype.Connect = function($Url)
{
	this.Disconnect();
	if ( $Url == undefined )
	{
		if ( this.mUrlInput == undefined )
			return false;
		$Url = this.mUrlInput.value;
	}
	
	//console.log( this.mName + " connecting to " +  $Url );
	
	this.mSocket = new WebSocket( $Url );
	this.mSocket.mSoyWebSocket = this;

	this.mSocket.onopen =		function($Event) {	$Event.srcElement.mSoyWebSocket.OnConnected($Event);	};
	this.mSocket.onclose =		function($Event) {	$Event.srcElement.mSoyWebSocket.OnClosed($Event);	};
	this.mSocket.onmessage =	function($Event) {	$Event.srcElement.mSoyWebSocket.OnMessage($Event);	};
	this.mSocket.onerror =		function($Event) {	$Event.srcElement.mSoyWebSocket.OnError($Event);	};

}

SoyWebSocket.prototype.OnConnected = function($Event)
{
//	console.log("on connected");
//	console.log($Event);
	if ( this.mDiv )
	{
		this.mDisconnectButton.disabled = false;
		this.mConnectButton.disabled = true;
	}
	
	if ( this.mOnConnected )
		this.mOnConnected( this );
}

SoyWebSocket.prototype.OnClosed = function($Event)
{
//	console.log("on closed");
//	console.log($Event);
	this.Disconnect();
}

SoyWebSocket.prototype.OnMessage = function($Event)
{
//	console.log("on message");
//	console.log($Event);
	
	if ( this.mOnMessage )
	{
		$Message = $Event.data;
		this.mOnMessage( this, $Message );
	}
}

SoyWebSocket.prototype.OnError = function($Event)
{
//	console.log("on error");
//	console.log($Event);
	this.Disconnect();
}

SoyWebSocket.prototype.Disconnect = function()
{
	if ( !this.mSocket )
	{
		this.OnDisconnected(true);
		return;
	}
	
//	console.log( this.mName + " disconnecting" );
	this.mSocket.close();
	this.mSocket = null;
	this.OnDisconnected(false);
}

SoyWebSocket.prototype.OnDisconnected = function(Forced)
{
	if ( this.mDiv )
	{
		this.mDisconnectButton.disabled = true;
		this.mConnectButton.disabled = false;
	}
	
	if ( !Forced )
		if ( this.mOnDisconnected )
			this.mOnDisconnected( this );
}

SoyWebSocket.prototype.CreateUI = function($DefaultPort)
{
	this.mDiv = document.createElement("DIV");
	this.mDiv.className = "SoyWebSocket";
	
	var Header = document.createTextNode("Websocket: " + this.mName );
	this.mDiv.appendChild(Header);
	this.mDiv.appendChild( document.createElement("br") );
	
	
	var UrlLabel = document.createElement("label");
	UrlLabel.innerText = "Host";
	this.mDiv.appendChild( UrlLabel );
	
	this.mUrlInput = document.createElement("input");
	this.mUrlInput.value = "ws://localhost:" + $DefaultPort;
	this.mDiv.appendChild( this.mUrlInput );
	
	this.mConnectButton = document.createElement("button");
	this.mConnectButton.innerText = "Connect";
	this.mConnectButton.mSocket = this;
	this.mConnectButton.onclick = function(e) {	e.toElement.mSocket.Connect();	};
	this.mDiv.appendChild( this.mConnectButton );
	
	this.mDisconnectButton = document.createElement("button");
	this.mDisconnectButton.innerText = "Disconnect";
	this.mDisconnectButton.mSocket = this;
	this.mDisconnectButton.onclick = function(e) {	e.toElement.mSocket.Disconnect();	};
	this.mDiv.appendChild( this.mDisconnectButton );
	
	document.body.appendChild( this.mDiv );
}

SoyWebSocket.prototype.SendMessage = function($Message)
{
	if ( !this.mSocket )
	{
		console.log( this.mName + " not connected. SendMessage() aborted" );
		return false;
	}
	
	this.mSocket.send($Message);
	return true;
}

