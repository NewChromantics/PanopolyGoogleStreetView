function SoyFrameIndex($FirstIndex,$LastIndex)
{
	this.mFirstIndex = $FirstIndex;
	this.mLastIndex = $LastIndex;
	this.mLength = $LastIndex - $FirstIndex;
	this.mDataUrl = null;
}

SoyFrameIndex.prototype.GetDataUrl = function($ArrayBuffer)
{
	//	if data url already generated, return
	if ( this.mDataUrl !== null )
		return this.mDataUrl;
	
	if ( !$ArrayBuffer )
		return null;
	
	var $JpegDataView = new DataView( $ArrayBuffer, this.mFirstIndex, this.mLength );
	var $Blob = new Blob([$JpegDataView], {type: "image/jpeg"});
	this.mDataUrl = URL.createObjectURL( $Blob );
	console.log("new data url",this.mDataUrl);
	//delete $Blob;
	return this.mDataUrl;
}


function SoyMJpeg($Url,$FrameRate,$Loop,$OnUpdateJpeg,$OnError)
{
	var $this = this;

	//	if an element is provided instead of OnUpdate, make a func
	if ( typeof $OnUpdateJpeg == 'object' )
	{
		var $Element = $OnUpdateJpeg;
		$OnUpdateJpeg = function($JpegData) { $Element.src = $JpegData; };
	}
	
	this.mLastJpegStart = -1;
	this.mLastReadPos = -1;
	this.mFrames = new Array();	//	SoyFrameIndex
	this.mJpegHeader = null;
	this.mAjax = null;
	this.mUrl = $Url;
	this.mFrameRate = $FrameRate;
	this.mOnError = $OnError;
	this.mOnUpdateJpeg = $OnUpdateJpeg;
	this.mLoop = $Loop;
	this.mCurrentFrame = 0;
	this.mFinishedParse = false;

	
	var ajax = new XMLHttpRequest();
	this.mAjax = ajax;
	ajax.addEventListener("progress", function($Event) { $this.OnMJpegData($Event,'progress'); }, false );
	//	ajax.addEventListener("load", function($Event){ $this.OnReply($Event); }, false);
	//	ajax.addEventListener("error", function($Event){ $this.OnError($Event); }, false);
	//	ajax.addEventListener("abort", function($Event){ $this.OnError($Event); }, false);
	ajax.onreadystatechange = function($Event) {	$this.OnAjaxStateChanged($Event); };

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
	//	no callback to execute :/
	if ( !this.mOnUpdateJpeg )
		return false;

	//	waiting for next frame
	if ( this.mCurrentFrame >= this.mFrames.length )
	{
		//	loop
		if ( this.mFinishedParse )
			this.mCurrentFrame = this.mCurrentFrame % this.mFrames.length;
	}
	if ( this.mCurrentFrame >= this.mFrames.length )
		return false;

	
	//	encode to datauri for html
	var $FrameIndex = this.mFrames[this.mCurrentFrame];
	if ( typeof $FrameIndex == 'undefined' )
	{
		console.log("bad frame",this.mCurrentFrame);
		return false;
	}
	var $DataUrl = $FrameIndex.GetDataUrl( this.mAjax.response );
	if ( !$DataUrl )
		return false;
	this.mOnUpdateJpeg( $DataUrl );
	
	return true;
}

SoyMJpeg.prototype.UpdateJpegToElement = function($Timestamp)
{
	//	timestamp only valid on animation call
	$Timestamp = CheckDefaultParam($Timestamp,false);
	if ( $Timestamp )
	{
		var $UpdateRateMs = 1000/parseFloat(this.mFrameRate);
		var $NewFrame = Math.floor( $Timestamp / $UpdateRateMs );
		if ( $NewFrame != this.mCurrentFrame )
		{
			this.mCurrentFrame = $NewFrame;
			this.PopJpeg();
		}
	}
	
	//	use request animation frame to be more CPU friendly and allow tab sleep
	var $this = this;
	requestAnimationFrame( function($Timestamp){ $this.UpdateJpegToElement($Timestamp); } );
//	setTimeout( function(){ $this.UpdateJpegToElement(); }, $UpdateRateMs );
}


SoyMJpeg.prototype.AddFrame = function($FirstIndex,$LastIndex)
{
	this.mFrames.push( new SoyFrameIndex($FirstIndex,$LastIndex) );
	console.log("found jpeg #" + this.mFrames.length + " from " + $FirstIndex + " to " + $LastIndex );
	

}

SoyMJpeg.prototype.OnAjaxStateChanged = function($Event)
{
	var $ReadyState = $Event.target.readyState;
	if ( $ReadyState >= 2 )
	{
		this.OnMJpegData( $Event, 'OnAjaxStateChanged' );
	}
}

SoyMJpeg.prototype.OnFinishedDownloadingData = function()
{
	this.mFinishedParse = true;
}

SoyMJpeg.prototype.OnMJpegData = function($Event,$Caller)
{
	var $Ajax = $Event.target;//this.mAjax;
	
	if ( !$Ajax.response )
		return;

	var $Data = new DataView( $Ajax.response );

	var $Int32Size = 4;
	var $HeaderLength = 2;
	
	//	need to read header
	if ( this.mHeader == null )
	{
		//	header in 32bit chunks for speed
		if ( $Data.byteLength < $Int32Size * $HeaderLength )
			return;
		
		this.mHeader = new Array();
		for ( var $i=0;	$i<$HeaderLength;	$i++ )
			this.mHeader.push( $Data.getUint32($i*$Int32Size) );
		console.log("jpeg header is ", Uint32ToString(this.mHeader[0]), Uint32ToString(this.mHeader[1]) );
		this.mLastJpegStart = 0;
		this.mLastReadPos = $Int32Size;
	}

	//	look for next header
	for ( var $i=this.mLastReadPos;	$i<$Data.byteLength-($Int32Size*$HeaderLength);	$i++ )
	{
		var $Match = true;
		for ( var $h=0;	$h<this.mHeader.length;	$h++ )
			$Match &= this.mHeader[$h] == $Data.getUint32($i + ($Int32Size*$h));
		if ( !$Match )
		{
			this.mLastReadPos = $i;
			continue;
		}
		
		this.AddFrame( this.mLastJpegStart, $i );
		
		this.mLastJpegStart = $i;
		this.mLastReadPos = this.mLastJpegStart;
	}
	/*
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
*/
	//	gr: check for premature end if this ready state changes WHISLT parsing?
	if ( $Event.target.readyState == 4 )
		this.OnFinishedDownloadingData();
}

