<?php
	require('panopoly.php');
	require('s3.php');

	date_default_timezone_set("Europe/London");
	
	//	limit to 1 hour processing
	set_time_limit( 60 * 60 );
	
	//	release mode catches exceptions
	S3::setExceptions(true);
	S3::setAuth( AWS_ACCESS, AWS_SECRET );

	if ( !isset($argv) )
		$argv = array();
	
	if ( array_key_exists('arg',$_GET) )
		$argv[1] = $_GET['arg'];
	
	if ( !array_key_exists(1,$argv) )
		return OnError("Missing argv[1]");

	if ( !file_exists(FFMPEG_BIN) )
		return OnError("Missing ffmpeg " . FFMPEG_BIN );
	
	//	get temp file
	$Panoname = $argv[1];
	
	//	if we have a . assume it's a full path
	if ( strpos($Panoname,'.') !== false || strpos($Panoname,'/') !== false )
	{
		$TempFilename = $Panoname;
		$Panoname = 'ArgTemp';
		if ( array_key_exists('panoname',$_GET) )
		{
			$Panoname = SanitisePanoName($_GET['panoname']);
		}
	}
	else
	{
		$TempFilename = GetPanoTempFilename($Panoname);
	}
	if ( !file_exists($TempFilename) )
		return OnError("Missing temp file $TempFilename");

	function DeleteTempFile($TempFilename)
	{
		@unlink($TempFilename);
	}
	
	//	delete temp file on exit if not executed via GET test
	if ( !array_key_exists('arg',$_GET) )
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
	$AssetParams[] = SoyAssetMeta( 1024, 1024, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 2048, 2048, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 4096, 2048, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 4096, 4096, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 512, 256, 'webm', 'vp8', '1000k' );
	//$AssetParams[] = SoyAssetMeta( 1024, 512, 'webm', 'vp8', '2000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'webm', 'vp8', '5000k' );
	//$AssetParams[] = SoyAssetMeta( 4096, 2048, 'webm', 'vp8', '8000k' );
	//$AssetParams[] = SoyAssetMeta( 4096, 4096, 'webm', 'vp8', '10000k' );
	$AssetParams[] = SoyAssetMeta( 512, 256, 'mp4', 'h264', '1000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'mp4', 'h264', '5000k' );
	$AssetParams[] = SoyAssetMeta( 512, 256, 'gif', 'gif', '5000k' );
//	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'gif', 'gif', '5000k' );

	foreach ( $AssetParams as $Asset )
	{
		$Asset = UploadResize( $Asset );
		//	failed
		if ( $Asset === false )
			continue;
		
		//	add to & update meta
		$OutputAssets[] = $Asset;
		UploadMeta( $OutputAssets );
	}

	//	upload orig
	UploadOrig();

	
	function UploadMeta($Assets)
	{
		global $Panoname,$Image;
		
		$Meta = array();
		//$Meta['date'] = gmdate('U');
		$Meta['origWidth'] = $Image->GetWidth();
		$Meta['origHeight'] = $Image->GetHeight();
		$Meta['origType'] = $Image->GetContentType();
		$Meta['isVideo'] = $Image->IsVideo();
		$Meta['assets'] = $Assets;
		
		$MetaJson = json_encode($Meta);
		$RemoteFilename = "$Panoname.meta";
		$Error = UploadContent( $MetaJson, $RemoteFilename, "text/plain" );
		if ( $Error !== true )
			OnError($Error);
		
		return true;
	}
	
	function UploadResize($Asset)
	{
		$Width = $Asset['Width'];
		$Height = $Asset['Height'];
		$Format = $Asset['Format'];
		$BitRate = array_key_exists('BitRate',$Asset) ? $Asset['BitRate'] : false;
		$Codec = array_key_exists('Codec',$Asset) ? $Asset['Codec'] : false;

		global $Panoname,$Image;
		$w = $Image->GetWidth();
		$h = $Image->GetHeight();

		//	gr: don't scale up
		if ( $w < $Width && $h < $Height )
			return false;

		//	if original width is less <= height then make a square image
		if ( $w <= $Height )
			$Width = $Height;
		
		//	gr: process parent should ensure these filenames won't clash beforehand so this script can assume these filenames are safe
		//	make filename
		$RemoteFilename = "$Panoname.{$Width}x$Height.$Format";
		$ResizedTempFilename = GetPanoTempFilename($Panoname,"{$Width}x$Height",$Format);
		register_shutdown_function('DeleteTempFile',$ResizedTempFilename);
		
		//	resize with ffmpeg
		$ExitCode = -1;
		$Param_Quiet = "-loglevel error";
		$Param_Overwrite = "-y";
		$Param_FrameSet = '';
		$Param_CpuUsage = '';
		$Param_OutputOther = '';
		$Param_Quality = '';
		$Param_TimeLimit = '';
		
		if ( $Format == 'jpg' )
		{
			$Param_Quality = "-qscale:v " . FFMPEG_JPEG_QUALITY;
			$Param_FrameSet = "-vframes 1";
		}
		else if ( $Format == 'webm' || $Format == 'mp4' || $Format == 'gif' )
		{
			if ( !$Image->IsVideo() )
				return false;
			
			$Param_OutputOther .= " -b:v $BitRate";

			//	configure video
			if ( $Codec == 'vp8' )
			{
				//https://www.virag.si/2012/01/webm-web-video-encoding-tutorial-with-ffmpeg-0-9/
				$FFMPEG_WEBM_QUALITY = 'realtime';
				$Param_Quality = " -quality " . $FFMPEG_WEBM_QUALITY;
				$Param_OutputOther .= " -codec:v libvpx";
				$Param_OutputOther .= " -cpu-used 1";
				$Param_OutputOther .= " -qmin 10 -qmax 42";
			}
			else if ( $Codec == 'h264' )
			{
				//	https://trac.ffmpeg.org/wiki/Encode/H.264
				$FFMPEG_WEBM_QUALITY = 'medium';
				$Param_Quality = " -preset " . $FFMPEG_H264_QUALITY;
				$Param_OutputOther .= " -codec:v libx264";
				$Param_OutputOther .= " -b:v $BitRate";
			}
			else if ( $Codec == 'gif' )
			{
				
			}
			else
			{
				echo "Unsupported mix: $Format/$Codec";
				return false;
			}
		}
		else
		{
			echo "Unsupported mix: $Format/$Codec";
			return false;
		}
		
		$Param_CatchStdErr = "2>&1";
		$Param_Scale = "-vf scale=$Width:$Height";
		$Param_Input = "-i {$Image->mFilename}";
		$Param_Output = "$ResizedTempFilename";
		$ExecCmd = FFMPEG_BIN . " $Param_Quiet $Param_Overwrite $Param_Input $Param_Scale $Param_Quality $Param_FrameSet $Param_OutputOther $Param_TimeLimit $Param_Output $Param_CatchStdErr";
		exec( $ExecCmd, $ExecOut, $ExitCode );
		$ExecOut = join("\n", $ExecOut );
		if ( $ExitCode != 0 )
		{
			echo "failed to resize $Width $Height: [$ExitCode] $ExecOut\n";
			DeleteTempFile( $ResizedTempFilename );
			return false;
		}
		
		//	upload
		//	correct content type for easier online viewing
		$Error = UploadFile( $ResizedTempFilename, $RemoteFilename, $Format );
		if ( $Error !== true )
			OnError($Error);
	
		DeleteTempFile( $ResizedTempFilename );

		//	return asset we created (in case params were changed)
		$Asset['Width'] = $Width;
		$Asset['Height'] = $Height;
		$Assset['Command'] = $ExecCmd;
		return $Asset;
	}
	
	function UploadOrig()
	{
		global $Panoname,$Image;
		$Extension = $Image->GetContentTypeFileExtension();
		$RemoteFilename = "$Panoname.orig.$Extension";
		$Error = UploadFile( $Image->mFilename, $RemoteFilename, $Image->GetMimeType() );
		if ( $Error !== true )
			OnError($Error);
		return true;
	}
	
	
	$output = array();
	$output['panoname'] = $Panoname;
	$output['debug'] = ob_get_contents();
	ob_clean();
	if ( strlen($output['debug'] ) > 0 )
	{
		echo json_encode( $output );
		echo "\n";
	}
?>