function SoyMJpeg($Url,$Element,$FrameRate)
{
	var $this = this;

	this.mLastJpegStart = -1;
	this.mLastReadPos = -1;
	this.mJpegs = new Array();
	this.mJpegHeader = null;
	this.mMJpegAjax = null;
	this.mUrl = $Url;
	this.mElement = $Element;
	this.mFrameRate = $FrameRate;
	
	
	var ajax = new XMLHttpRequest();
	this.mMJpegAjax = ajax;
	ajax.addEventListener("progress", function($Event) { $this.OnMJpegData($Event); }, false );
	//	ajax.addEventListener("load", function($Event){ $this.OnReply($Event); }, false);
	//	ajax.addEventListener("error", function($Event){ $this.OnError($Event); }, false);
	//	ajax.addEventListener("abort", function($Event){ $this.OnError($Event); }, false);
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
	//	time for another frame
	if ( this.mJpegs.length == 0 )
		return false;
	if ( !this.mElement )
		return false;
	
	//	encode to datauri for html
	var $JpegData = this.mJpegs[0];
	this.mJpegs.splice(0,1);
	
	var $Blob = $JpegData;
	console.log("$Blob:");
	console.log($Blob);
	var $DataUrl = URL.createObjectURL( $Blob );
	console.log("new jpeg" + $DataUrl );
	this.mElement.src = $DataUrl;
	
	return true;
}

SoyMJpeg.prototype.UpdateJpegToElement = function()
{
	this.PopJpeg();
	
	var $UpdateRateMs = 1000/parseFloat(this.mFrameRate);
	var $this = this;
	setTimeout( function(){ $this.UpdateJpegToElement(); }, $UpdateRateMs );
}

SoyMJpeg.prototype.OnJpeg = function($JpegData)
{
	console.log("Found jpeg");
	var $JpegDataView = new DataView($JpegData);
	var $Blob = new Blob([$JpegDataView], {type: "image/jpeg"});
	this.mJpegs.push( $Blob );
}

SoyMJpeg.prototype.OnMJpegData = function($Event)
{
	var $Data = $Event.target.response;
	if ( $Data == null )
		return;
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
		console.log("jpeg header is ");
		console.log(ab2str(this.mHeader) );
		console.log( this.mHeader.byteLength );
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
		
		console.log("found jpeg from " + this.mLastJpegStart + " to " + $i );
		
		//	found next jpeg
		var $JpegData = $Data.slice(this.mLastJpegStart,$i);
		this.OnJpeg( $JpegData );
		
		this.mLastJpegStart = $i;
		this.mLastReadPos = this.mLastJpegStart;
	}
	
}

