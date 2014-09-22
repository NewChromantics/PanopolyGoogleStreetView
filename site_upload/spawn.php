<?php
	
	//define('UPLOAD_META',false);
	//define('UPLOAD_ORIG',false);
	define('ALLOW_SCALE_UP', true );
	
	require('panopoly.php');
	require('s3.php');

	if ( IsLocalhost() )
		define('FAKE_UPLOAD','/Users/grahamr/Desktop/upload');

	date_default_timezone_set("Europe/London");
	
	//	limit to 1 hour processing
	set_time_limit( 60 * 60 );
	
	//	release mode catches exceptions
	S3::setExceptions(true);
	S3::setAuth( AWS_ACCESS, AWS_SECRET );

	$PanoName = GetArg('panoname',false);
	$PanoFormat = GetArg('panoformat',false);
	
	if ( !file_exists(FFMPEG_BIN) )
		return OnError("Missing ffmpeg " . FFMPEG_BIN );

	if ( $PanoName === false )
		return OnError("No PanoName specified");
	
	//	if we have a . assume it's a full path
	if ( strpos($PanoName,'.') !== false || strpos($PanoName,'/') !== false )
	{
		$TempFilename = $PanoName;
		$PanoName = SanitisePanoName('ArgTemp');
		$DeleteTempFile = false;
	}
	else
	{
		$TempFilename = GetPanoTempFilename($PanoName);
		$DeleteTempFile = true;
	}
	if ( !file_exists($TempFilename) )
		return OnError("Missing temp file $TempFilename");

	function DeleteTempFile($TempFilename)
	{
		@unlink($TempFilename);
	}
	
	//	delete temp file on exit if not executed via GET test
	if ( $DeleteTempFile )
	{
		register_shutdown_function('DeleteTempFile',$TempFilename);
	}

	//	parse images as video
	$Image = new TVideo($TempFilename);
	if ( !$Image->IsValid() )
	{
		return OnError("failed to read image or video information from $TempFilename");
	}
	
	//	returns associative array
	function SoyAssetMeta($Width,$Height,$Format,$Codec=false,$BitRate=false)
	{
		$Asset = [];
		$Asset['Width'] = $Width;
		$Asset['Height'] = $Height;
		$Asset['Format'] = $Format;
		if ( $Codec !== false )
			$Asset['Codec'] = $Codec;
		if ( $BitRate !== false )
			$Asset['BitRate'] = $BitRate;
		return $Asset;
	}
		
	//	assets we've created
	$OutputAssets = [];

	//	upload initial meta
	UploadMeta( $OutputAssets );

	//	assets we want to try and create
	$AssetParams = [];

	$AssetParams[] = SoyAssetMeta( 256, 256, 'jpg' );
//	$AssetParams[] = SoyAssetMeta( 1024, 1024, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 2048, 2048, 'jpg' );
//	$AssetParams[] = SoyAssetMeta( 4096, 2048, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 4096, 4096, 'jpg' );
//	$AssetParams[] = SoyAssetMeta( 512, 256, 'webm', 'vp8', '1000k' );
	$AssetParams[] = SoyAssetMeta( 256, 256, 'jpg', 'cubemap_23ULFRBD' );
	$AssetParams[] = SoyAssetMeta( 2048, 2048, 'jpg', 'cubemap_23ULFRBD' );
	
//	$AssetParams[] = SoyAssetMeta( 1024, 512, 'webm', 'vp8', '2000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'webm', 'vp8', '5000k' );
//	$AssetParams[] = SoyAssetMeta( 4096, 2048, 'webm', 'vp8', '8000k' );
//	$AssetParams[] = SoyAssetMeta( 4096, 4096, 'webm', 'vp8', '10000k' );
//	$AssetParams[] = SoyAssetMeta( 512, 256, 'mp4', 'h264', '1000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'mp4', 'h264', '5000k' );
//	$AssetParams[] = SoyAssetMeta( 512, 256, 'gif', 'gif', '5000k' );
//	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'gif', 'gif', '5000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'mjpeg', 'mjpeg', '5000k' );

	
	foreach ( $AssetParams as $Asset )
	{
		$Asset = UploadResize( $Asset, $TempFilename, $PanoName, $Image );
		//	failed
		if ( $Asset === false )
			continue;
		
		//	echo out errors
		if ( array_key_exists('Error',$Asset) )
			echo $Asset['Error'] . "\n";
		
		//	add to & update meta
		$OutputAssets[] = $Asset;
		UploadMeta( $OutputAssets );
	}

	//	upload orig
	UploadOrig();

	
	function UploadMeta($Assets)
	{
		if ( defined('UPLOAD_META') && !UPLOAD_META )
			return false;
		
		global $PanoName,$Image;
		
		$Meta = array();
		//$Meta['date'] = gmdate('U');
		$Meta['OrigWidth'] = $Image->GetWidth();
		$Meta['OrigHeight'] = $Image->GetHeight();
		$Meta['OrigContentType'] = $Image->GetContentType();
		$Meta['OrigFormatType'] = $Image->GetFfmpegInputFormat();
		$Meta['isVideo'] = $Image->IsVideo();
		$Meta['assets'] = $Assets;
		
		$MetaJson = json_encode($Meta, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
		$RemoteFilename = "$PanoName.meta";
		$Error = UploadContent( $MetaJson, $RemoteFilename, "text/plain" );
		if ( $Error !== true )
			OnError($Error);
		
		return true;
	}
	
	
	
	function UploadResize($Asset,$InputFilename,$PanoName,$Image)
	{
		$Width = $Asset['Width'];
		$Height = $Asset['Height'];
		$Format = $Asset['Format'];
		$BitRate = array_key_exists('BitRate',$Asset) ? $Asset['BitRate'] : false;
		$Codec = array_key_exists('Codec',$Asset) ? $Asset['Codec'] : false;

		//	return asset we created (in case params were changed)
		$Asset['Width'] = $Width;
		$Asset['Height'] = $Height;
	
		//	gr: process parent should ensure these filenames won't clash beforehand so this script can assume these filenames are safe
		//	make filename
		$Suffix = "{$Width}x$Height";
		if ( $Codec !== false )
			$Suffix .= ".$Codec";
		$RemoteFilename = "$PanoName.$Suffix.$Format";
		$ResizedTempFilename = GetPanoTempFilename($PanoName,$Suffix,$Format);
		register_shutdown_function('DeleteTempFile',$ResizedTempFilename);
		
		//	resize with ffmpeg
		$ExitCode = -1;
		$ExecCmd = '';
		
		$InputFormat = $Image->GetFfmpegInputFormat();
		
		if ( $Format == 'jpg' && $Codec !== false && strpos($Codec,'cubemap_')==0 )
		{
			$CubemapLayout = substr($Codec,strlen('cubemap_'));
	
			$Params = array();
			$Params['inputfilename'] = $InputFilename;
			$Params['samplewidth'] = 4096;//$Image->GetWidth();
			$Params['sampleheight'] = 4096;//$Image->GetHeight();
			$Params['SampleTime'] = 0;		//	sample time
			
			$Params['outputfilename'] = $ResizedTempFilename;
			$Params['layout'] = $CubemapLayout;
			$Params['Width'] = $Asset['Width'];
			$Params['Height'] = $Asset['Height'];
		
			$ExecCmd = "php makecubemap.php ";
			$ExecCmd .= ParamsToParamString( $Params );
		}
		else if ( $Format == 'jpg' && $Codec === false )
		{
			$ExecCmd .= FFMPEG_BIN;
			$ExecCmd .= " -loglevel error";
			$ExecCmd .= " -y";
			if ( $InputFormat !== false )
				$ExecCmd .= " -f $InputFormat";
			$ExecCmd .= " -i $InputFilename";
			$ExecCmd .= " -vf scale=$Width:$Height";
			
			$ExecCmd .= " -qscale:v " . FFMPEG_JPEG_QUALITY;
			$ExecCmd .= " -vframes 1";
			
			$ExecCmd .= " $ResizedTempFilename";
		}
		else if ( $Format == 'webm' || $Format == 'mp4' || $Format == 'gif' || $Format == 'mjpeg' )
		{
			if ( !$Image->IsVideo() )
				return false;
			
			$ExecCmd .= FFMPEG_BIN;
			$ExecCmd .= " -loglevel error";
			$ExecCmd .= " -y";
			if ( $InputFormat !== false )
				$ExecCmd .= " -f $InputFormat";
			$ExecCmd .= " -i $InputFilename";
			$ExecCmd .= " -vf scale=$Width:$Height";
			$ExecCmd .= " -b:v $BitRate";
	
			if ( $Codec == 'vp8' )
			{
				//https://www.virag.si/2012/01/webm-web-video-encoding-tutorial-with-ffmpeg-0-9/
				$FFMPEG_WEBM_QUALITY = 'realtime';
				$ExecCmd .= " -quality " . $FFMPEG_WEBM_QUALITY;
				$ExecCmd .= " -codec:v libvpx";
				$ExecCmd .= " -cpu-used 1";
				$ExecCmd .= " -qmin 10 -qmax 42";
			}
			else if ( $Codec == 'h264' )
			{
				//	https://trac.ffmpeg.org/wiki/Encode/H.264
				$FFMPEG_H264_QUALITY = 'medium';
				$ExecCmd .= " -preset " . $FFMPEG_H264_QUALITY;
				$ExecCmd .= " -codec:v libx264";
			}
			else if ( $Codec == 'mjpeg' )
			{
				$ExecCmd .= " -f mjpeg";
				$ExecCmd .= " -codec:v mjpeg";
			}
			
			$ExecCmd .= " $ResizedTempFilename";
		}
		else
		{
			echo "Unsupported mix: $Format/$Codec";
			return false;
		}
				
		
		//	execute
		$ExitCode = SoyExec( $ExecCmd, $ExecOut );
		$Asset['Command'] = $ExecCmd;

		if ( $ExitCode != 0 )
		{
			$Asset['Error'] = "spawn error [$ExitCode] [$ExecOut] [$ExecCmd]";
			return $Asset;
		}

		//	upload
		$Error = UploadFile( $ResizedTempFilename, $RemoteFilename, $Format );
		if ( $Error !== true )
		{
			$Asset['Error'] = "upload error [$Error]";
			return $Asset;
		}

		//	save uploaded filename
		$Asset['Filename'] = $RemoteFilename;
		return $Asset;
	}
	
	function UploadOrig()
	{
		if ( defined('UPLOAD_ORIG') && !UPLOAD_ORIG )
			return false;
		
		global $PanoName,$Image;
		$Extension = $Image->GetContentTypeFileExtension();
		$RemoteFilename = "$PanoName.orig.$Extension";
		$Error = UploadFile( $Image->mFilename, $RemoteFilename, $Image->GetMimeType() );
		if ( $Error !== true )
			OnError($Error);
		return true;
	}
	
	
	$output = array();
	$output['panoname'] = $PanoName;
	$output['debug'] = ob_get_contents();
	ob_clean();
	if ( strlen($output['debug'] ) > 0 )
	{
		echo json_encode( $output, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES );
		echo "\n";
	}
?>