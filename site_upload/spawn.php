<?php
//	define('FAKE_UPLOAD','/Users/grahamr/Desktop/upload');
	
	//define('UPLOAD_META',false);
	//define('UPLOAD_ORIG',false);
	define('ALLOW_SCALE_UP', true );
	
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

//	$AssetParams[] = SoyAssetMeta( 256, 256, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 1024, 1024, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 2048, 2048, 'jpg' );
//	$AssetParams[] = SoyAssetMeta( 4096, 2048, 'jpg' );
	$AssetParams[] = SoyAssetMeta( 4096, 4096, 'jpg' );
//	$AssetParams[] = SoyAssetMeta( 512, 256, 'webm', 'vp8', '1000k' );
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
		$Asset = UploadResize( $Asset, $TempFilename, $Panoname );
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
	
	
	
	function UploadResize($Asset,$InputFilename,$Panoname)
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
		$RemoteFilename = "$Panoname.$Suffix.$Format";
		$ResizedTempFilename = GetPanoTempFilename($Panoname,$Suffix,$Format);
		register_shutdown_function('DeleteTempFile',$ResizedTempFilename);
		
		//	resize with ffmpeg
		$ExitCode = -1;
		$ExecCmd = '';
	
		if ( $Format == 'jpg' && $Codec !== false && strpos($Codec,'cubemap_')==0 )
		{
			$CubemapLayout = substr($Codec,strlen('cubemap_'));
		
			//	parse cubemap layout
			$OutputTileWidth = intval($CubemapLayout[0]);
			$OutputTileHeight = intval($CubemapLayout[1]);
			$OutputLayout = substr($CubemapLayout,2);
			
			$Params = array();
			$Params[] = $InputFilename;
			$Params[] = 4096;//$Image->GetWidth();
			$Params[] = 4096;//$Image->GetHeight();
			$Params[] = '1';		//	sample time
			
			$Params[] = $ResizedTempFilename;
			$Params[] = $OutputLayout;
			$Params[] = $OutputTileWidth;
			$Params[] = $OutputTileHeight;
			$Params[] = $Asset['Width'];
			$Params[] = $Asset['Height'];
		
			$ExecCmd = "php makecubemap.php ";
			foreach ( $Params as $Param )
				$ExecCmd .= "$Param ";
		}
		else if ( $Format == 'jpg' && $Codec === false )
		{
			$ExecCmd .= FFMPEG_BIN;
			$ExecCmd .= " -loglevel error";
			$ExecCmd .= " -y";
			$ExecCmd .= " -i $InputFilename";
			$ExecCmd .= " -vf scale=$Width:$Height";
			
			$ExecCmd .= " -qscale:v " . FFMPEG_JPEG_QUALITY;
			$ExecCmd .= " -vframes 1";
			
			$ExecCmd .= " $ResizedTempFilename";
		}
		else if ( $Format == 'webm' || $Format == 'mp4' || $Format == 'gif' || $Format == 'mjpeg' )
		{
			$ExecCmd .= FFMPEG_BIN;
			$ExecCmd .= " -loglevel error";
			$ExecCmd .= " -y";
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
		
		//	stderr -> stdout
		$ExecCmd .= " 2>&1";
		
		$Asset['Command'] = $ExecCmd;
		
		//	execute
		exec( $ExecCmd, $ExecOut, $ExitCode );
		$ExecOut = join("\n", $ExecOut );
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