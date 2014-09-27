function SoyMJpeg($Url,$FrameRate,$Loop,$OnUpdateJpeg,$OnError)
{
	var $this = this;

	//	if an element is provided instead of OnUpdate, make a func
	if ( typeof $OnUpdate == 'object' )
	{
		var $Element = $OnUpdateJpeg;
		$OnUpdateJpeg = function($JpegData) { $Element.src = $JpegData; };
	}
	
	this.mLastJpegStart = -1;
	this.mLastReadPos = -1;
	this.mJpegs = new Array();
	this.mJpegHeader = null;
	this.mMJpegAjax = null;
	this.mUrl = $Url;
	this.mFrameRate = $FrameRate;
	this.mOnError = $OnError;
	this.mOnUpdateJpeg = $OnUpdateJpeg;
	this.mLoop = $Loop;
	this.mCurrentFrame = 0;
	this.mCurrentTime = 0;
	this.mFirstRenderTime = false;
	this.mFinishedParse = false;
	this.mDeferTimeout = null;

	
	var ajax = new XMLHttpRequest();
	this.mMJpegAjax = ajax;
	ajax.addEventListener("progress", function($Event) { if ( !$this.mDeferTimeout )	$this.OnMJpegData($Event); }, false );
	//	ajax.addEventListener("load", function($Event){ $this.OnReply($Event); }, false);
	//	ajax.addEventListener("error", function($Event){ $this.OnError($Event); }, false);
	//	ajax.addEventListener("abort", function($Event){ $this.OnError($Event); }, false);
	ajax.onreadystatechange = function($Event) { if ( !$this.mDeferTimeout )	$this.OnAjaxStateChanged($Event); };

	ajax.open("GET", this.mUrl, true );
	//ajax.setRequestHeader('Content-Type', 'multipart/form-data;');
	ajax.withCredentials = false;
	ajax.responseType = 'arraybuffer';
	ajax.send( null );
	
	//	gr: on first success start the auto-update
	this.UpdateJpegToElement();
}


SoyMJpeg.prototype.PopJpeg = function()
{
	if ( !this.mOnUpdateJpeg )
		return false;

	//	waiting for next frame
	if ( this.mCurrentFrame >= this.mJpegs.length )
	{
		//	loop
		if ( this.mFinishedParse )
			this.mCurrentFrame = this.mCurrentFrame % this.mJpegs.length;
	}
	if ( this.mCurrentFrame >= this.mJpegs.length )
		return false;
	//if ( !( this.mCurrentFrame in this.mJpegs ) )
	//	return false;
	
	//	encode to datauri for html
	var $JpegData = this.mJpegs[this.mCurrentFrame];
	if ( typeof $JpegData == 'undefined' )
	{
		console.log("bad jpeg data",$JpegData);
		return false;
	}
	//console.log("pop " + this.mCurrentFrame + "/" + this.mJpegs.length );

	var $Blob = $JpegData;
//	var $DataUrl = URL.createObjectURL( $Blob );
	var $DataUrl = $Blob;
	this.mLastBlobUrl = $DataUrl;
//	console.log("new jpeg" + $DataUrl );
	
	this.mOnUpdateJpeg( $DataUrl );
	
	return true;
}

SoyMJpeg.prototype.UpdateJpegToElement = function()
{
	//	first render
	if ( this.mFirstRenderTime === false && this.mJpegs.length > 0 )
	{
		console.log("first render");
		this.mFirstRenderTime = new Date().getTime();
		this.mCurrentFrame = -1;
	}

	if ( this.mFirstRenderTime !== false )
	{
		var now = new Date().getTime();
		var dt = now - this.mFirstRenderTime;
		this.mCurrentTime = dt;
		
	//	console.log("current time",this.mCurrentTime);
		var $UpdateRateMs = 1000/parseFloat(this.mFrameRate);
		var NewFrame = Math.floor( this.mCurrentTime / $UpdateRateMs );
		
		if ( NewFrame != this.mCurrentFrame )
		{
			this.mCurrentFrame = NewFrame;
			this.PopJpeg();
		}
	}
	
	//	use request animation frame to be more CPU friendly and allow sleep
	var $this = this;
	requestAnimationFrame( function(){ $this.UpdateJpegToElement(); } );
//	setTimeout( function(){ $this.UpdateJpegToElement(); }, $UpdateRateMs );
}

SoyMJpeg.prototype.OnJpeg = function($JpegData)
{
//	console.log("Found jpeg");
	var $JpegDataView = new DataView($JpegData);
	var $Blob = new Blob([$JpegDataView], {type: "image/jpeg"});
	var $DataUrl = URL.createObjectURL( $Blob );
	//delete $Blob;
	this.mJpegs.push( $DataUrl );
}

SoyMJpeg.prototype.OnAjaxStateChanged = function($Event)
{
	var $ReadyState = $Event.target.readyState;
	if ( $ReadyState >= 3 )
	{
		this.OnMJpegData( $Event );
	}
}

SoyMJpeg.prototype.OnFinishedDownloadingData = function()
{
	this.mFinishedParse = true;
}

SoyMJpeg.prototype.OnMJpegData = function($Event)
{
	if ( this.mDeferTimeout )
	{
		clearTimeout( this.mDeferTimeout );
		this.mDeferTimeout = null;
	}
	
	var $Data = $Event.target.response;
	if ( $Data == null )
	{
		if ( $Event.target.readyState == 4 )
			this.OnFinishedDownloadingData();
		return;
	}
	
	console.log($Event);
	console.log($Data);
	var $DataLength = $Data.byteLength;
	
	console.log( typeof $Data );
	
	//	first case
	if ( this.mHeader == null )
	{
		//	calc header
		if ( $DataLength < 5 )
			return;
		this.mHeader = $Data.slice(0,10);
		console.log("jpeg header is ", ab2str(this.mHeader), " (" + this.mHeader.byteLength + ")" );
		this.mLastReadPos = this.mHeader.byteLength;
		this.mLastJpegStart = 0;
	}
	
	//	look for next header
	var $DataView = new DataView($Data);
	var $HeaderView = new DataView(this.mHeader);
	
	//	gr: currently with defer the Nth one seems to be corrupted...
	//	starting next data (mLastReadPos) in wrong place?
	var $SessionJpegs = 0;
	var $MaxSessionJpegs = 9999;
	
	for ( var $i=this.mLastReadPos;	$i<$DataLength && $SessionJpegs<$MaxSessionJpegs;	$i++ )
	{
		var $Match = true;
		for ( var $h=0;	$Match && $h<this.mHeader.byteLength;	$h++ )
		{
			var $dd = $DataView.getInt8($i+$h);
			var $hd = $HeaderView.getInt8($h);
			$Match = $Match && ($dd == $hd);
			//	console.log( $dd + "(" + ($i+$h) + ")==" + $hd + " (" + $Match + ")" );
		}
		if ( !$Match )
		{
			this.mLastReadPos = $i;
			continue;
		}
		
		console.log("found jpeg #" + this.mJpegs.length + " from " + this.mLastJpegStart + " to " + $i, $SessionJpegs );
		
		//	found next jpeg
		var $JpegData = $Data.slice(this.mLastJpegStart,$i);
		this.OnJpeg( $JpegData );
		$SessionJpegs++;
		
		this.mLastJpegStart = $i;
		this.mLastReadPos = this.mLastJpegStart;
	}
	
	//	more to do
	if ( $i < $DataLength )
	{
		var $this = this;
		var $DeferMs = 100;
		if ( !this.mDeferTimeout )
		{
			console.log("defer");
			this.mDeferTimeout = setTimeout( function() { $this.OnMJpegData($Event); }, $DeferMs );
		}
		return;
	}

	if ( $Event.target.readyState == 4 )
		this.OnFinishedDownloadingData();
}

