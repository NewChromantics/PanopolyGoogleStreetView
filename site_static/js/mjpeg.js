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
	this.mFinishedParse = false;
	
	var ajax = new XMLHttpRequest();
	this.mMJpegAjax = ajax;
	//ajax.addEventListener("progress", function($Event) { $this.OnMJpegData($Event); }, false );
	//	ajax.addEventListener("load", function($Event){ $this.OnReply($Event); }, false);
	//	ajax.addEventListener("error", function($Event){ $this.OnError($Event); }, false);
	//	ajax.addEventListener("abort", function($Event){ $this.OnError($Event); }, false);
	ajax.onreadystatechange = function($Event) { $this.OnAjaxStateChanged($Event); };

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
		if ( this.mFinishedParse )
			this.mCurrentFrame = 0;
		return false;
	}
	
	//	encode to datauri for html
	var $JpegData = this.mJpegs[this.mCurrentFrame];

	var $Blob = $JpegData;
//	console.log("$Blob:",$Blob);
	var $DataUrl = URL.createObjectURL( $Blob );
//	console.log("new jpeg" + $DataUrl );
	
	this.mOnUpdateJpeg( $DataUrl );
	
	return true;
}

SoyMJpeg.prototype.UpdateJpegToElement = function()
{
	this.PopJpeg();
	this.mCurrentFrame ++;
	
	var $UpdateRateMs = 1000/parseFloat(this.mFrameRate);
	var $this = this;
	setTimeout( function(){ $this.UpdateJpegToElement(); }, $UpdateRateMs );
}

SoyMJpeg.prototype.OnJpeg = function($JpegData)
{
//	console.log("Found jpeg");
	var $JpegDataView = new DataView($JpegData);
	var $Blob = new Blob([$JpegDataView], {type: "image/jpeg"});
	this.mJpegs.push( $Blob );
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
	
	for ( var $i=this.mLastReadPos;	$i<$DataLength;	$i++ )
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
		
	//	console.log("found jpeg from " + this.mLastJpegStart + " to " + $i );
		
		//	found next jpeg
		var $JpegData = $Data.slice(this.mLastJpegStart,$i);
		this.OnJpeg( $JpegData );
		
		this.mLastJpegStart = $i;
		this.mLastReadPos = this.mLastJpegStart;
	}
	

	if ( $Event.target.readyState == 4 )
		this.OnFinishedDownloadingData();
}

