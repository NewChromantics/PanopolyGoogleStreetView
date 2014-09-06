
SoyRiftAjax.prototype = new SoySupport('SoyRiftAjax');
RegisterSupport('RiftAjax', new SoyRiftAjax() );


function SoyRiftAjax()
{
	//	call super
	SoySupport.apply( this, arguments );

	this.mQuaternion = new THREE.Quaternion();
	this.mLastFetchSuccess = false;
	this.mRefreshMs = 1000/60;
	this.mReconnectMs = 10*1000;
	this.mUrl = 'http://localhost:50000';
//	this.mOnQuaternionChanged = function($Quaternion) {	console.log($Quaternion);	};
}


SoyRiftAjax.prototype.Init = function()
{
	if ( !IsAjaxSupported() )
	{
		this.OnUnsupported();
		return;
	}

	this.Fetch();
}

SoyRiftAjax.prototype.Fetch = function()
{
	var $this = this;
	var ajax = new XMLHttpRequest();
	ajax.addEventListener("load", function($Event){ $this.OnReply($Event); }, false);
	ajax.addEventListener("error", function($Event){ $this.OnError($Event); }, false);
	ajax.addEventListener("abort", function($Event){ $this.OnError($Event); }, false);
	ajax.open("GET", this.mUrl, true );
	//ajax.setRequestHeader('Content-Type', 'multipart/form-data;');
	ajax.withCredentials = false;
	ajax.send( null );
}


SoyRiftAjax.prototype.OnError = function($Event)
{
	if ( this.mLastFetchSuccess )
	{
		this.mLastFetchSuccess = false;
		this.OnUnsupported();
	}
	
	//	try to reconnect again in 10 secs
	var $this = this;
	setTimeout( function(){ $this.Fetch() }, this.mReconnectMs );
}

SoyRiftAjax.prototype.OnReply = function($Event)
{
	var $Json = {};
	try
	{
		$Json = JSON.parse(event.target.responseText);
	}
	catch ( e )
	{
		//	ignore bad messages
		this.OnError($Event);
		return;
	}

	if ( !this.mLastFetchSuccess )
	{
		this.mLastFetchSuccess = true;
		this.OnSupported();
	}
	
	//	update rift input quaternion
	this.mQuaternion.set( $Json.quat.x, $Json.quat.y, $Json.quat.z, $Json.quat.w );
	//this.mEular = $Json.euler;
	if ( this.mOnQuaternionChanged )
		this.mOnQuaternionChanged( this.mQuaternion );
	
	//	refresh
	var $this = this;
	setTimeout( function(){ $this.Fetch() }, this.mRefreshMs );
}

SoyRiftAjax.prototype.IsSupported = function()
{
	return this.mLastFetchSuccess;
}
