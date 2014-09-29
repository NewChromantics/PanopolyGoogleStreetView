<?php
	
	//define('UPLOAD_META',false);
	//define('UPLOAD_ORIG',false);
	define('ALLOW_SCALE_UP', true );
	
	require('panopoly.php');
	require('s3.php');
	require('ffmpeg.php');

	if ( IsLocalhost() )
		define('FAKE_UPLOAD','/Users/grahamr/Desktop/upload');

	date_default_timezone_set("Europe/London");
	
	//	limit to 1 hour processing
	set_time_limit( 60 * 60 );
	
	//	release mode catches exceptions
	S3::setExceptions(true);
	S3::setAuth( AWS_ACCESS, AWS_SECRET );

	$PanoName = GetArg('panoname',false);
	$PanoLayout = GetArg('panolayout','equirect');
	
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
	$Image = new TVideo($TempFilename,$PanoLayout);
	if ( !$Image->IsValid() )
	{
		return OnError("failed to read image or video information from $TempFilename");
	}
	
	//	returns associative array
	function SoyAssetMeta($Width,$Height,$Format,$Layout,$Codec=false,$BitRate=false)
	{
		$Asset = [];
		$Asset['Width'] = $Width;
		$Asset['Height'] = $Height;
		$Asset['Format'] = $Format;
		$Asset['Layout'] = $Layout;
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

	
	
	$EquirectLayout = 'equirect';
	$CubemapLayout = IsCubemapLayout($PanoLayout) ? $PanoLayout : 'cubemap_23ULFRBD';
	
	
	//	assets we want to try and create
	$AssetParams = [];

	$AssetParams[] = SoyAssetMeta( 256, 256, 'jpg', $EquirectLayout );
//	$AssetParams[] = SoyAssetMeta( 1024, 1024, 'jpg', $EquirectLayout );
	$AssetParams[] = SoyAssetMeta( 2048, 2048, 'jpg', $EquirectLayout );
//	$AssetParams[] = SoyAssetMeta( 4096, 2048, 'jpg', $EquirectLayout );
	$AssetParams[] = SoyAssetMeta( 4096, 4096, 'jpg', $EquirectLayout );
//	$AssetParams[] = SoyAssetMeta( 512, 256, 'webm', $EquirectLayout 'vp8', '1000k' );
	$AssetParams[] = SoyAssetMeta( 256, 256, 'jpg', $CubemapLayout );
	$AssetParams[] = SoyAssetMeta( 2048, 2048, 'jpg', $CubemapLayout );
	
//	$AssetParams[] = SoyAssetMeta( 1024, 512, 'webm', $EquirectLayout, 'vp8', '2000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'webm', $EquirectLayout, 'vp8', '5000k' );
//	$AssetParams[] = SoyAssetMeta( 4096, 2048, 'webm', $EquirectLayout, 'vp8', '8000k' );
//	$AssetParams[] = SoyAssetMeta( 4096, 4096, 'webm', $EquirectLayout, 'vp8', '10000k' );
//	$AssetParams[] = SoyAssetMeta( 512, 256, 'mp4', $EquirectLayout, 'h264', '1000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'mp4', $EquirectLayout, 'h264', '5000k' );
//	$AssetParams[] = SoyAssetMeta( 512, 256, 'gif', $EquirectLayout, 'gif', '5000k' );
//	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'gif', $EquirectLayout, 'gif', '5000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'mjpeg', $EquirectLayout, 'mjpeg', '5000k' );

//	$AssetParams[] = SoyAssetMeta( 1024, 512, 'webm', $CubemapLayout, 'vp8', '2000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'webm', $CubemapLayout, 'vp8', '5000k' );
	//	$AssetParams[] = SoyAssetMeta( 4096, 2048, 'webm', $CubemapLayout, 'vp8', '8000k' );
	//	$AssetParams[] = SoyAssetMeta( 4096, 4096, 'webm', $CubemapLayout, 'vp8', '10000k' );
	//	$AssetParams[] = SoyAssetMeta( 512, 256, 'mp4', $CubemapLayout, 'h264', '1000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'mp4', $CubemapLayout, 'h264', '5000k' );
	//	$AssetParams[] = SoyAssetMeta( 512, 256, 'gif', $CubemapLayout, 'gif', '5000k' );
	//	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'gif', $CubemapLayout, 'gif', '5000k' );
	$AssetParams[] = SoyAssetMeta( 2048, 1024, 'mjpeg', $CubemapLayout, 'mjpeg', '5000k' );
	

	
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
		$Meta['OrigLayout'] = $Image->GetLayout();
		$Meta['isVideo'] = $Image->IsVideo();
		$Meta['assets'] = $Assets;
		
		$MetaJson = json_encode($Meta, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
		$RemoteFilename = "$PanoName.meta";
		$Error = UploadContent( $MetaJson, $RemoteFilename, "text/plain" );
		if ( $Error !== true )
			OnError($Error);
		
		return true;
	}
	
	function IsEquirectLayout($Layout)
	{
		return $Layout == 'equirect';
	}
	
	function IsCubemapLayout($Layout)
	{
	   return strpos( $Layout, 'cubemap_' ) == 0;
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
		$Suffix .= '.' . $Asset['Layout'];
		$RemoteFilename = "$PanoName.$Suffix.$Format";
		$ResizedTempFilename = GetPanoTempFilename($PanoName,$Suffix,$Format);
		register_shutdown_function('DeleteTempFile',$ResizedTempFilename);
		
		//	resize with ffmpeg
		$ExitCode = -1;
		$ExecCmd = null;
		$PostProcessFunction = null;
		
		$InputFormat = $Image->GetFfmpegInputFormat();

		$OldLayout = $Image->GetLayout();
		$NewLayout = $Asset['Layout'];
		
		if ( $Format == 'jpg' && $Codec !== false && $OldLayout != $NewLayout )
		{
			//	converting layout
			$Script = false;
			if ( IsEquirectLayout($OldLayout) && IsCubemapLayout($NewLayout) )
			{
				$Script = 'php makecubemap.php';
			}
			else if ( IsCubemapLayout($OldLayout) && IsEquirectLayout($NewLayout) )
			{
				$Script = 'php makeequirectangular.php';
			}
			else
			{
				echo "$Format/$Codec Cannot convert from $OldLayout to $NewLayout";
				return false;
			}
			
			$CubemapLayout = substr($Codec,strlen('cubemap_'));
	
			$Params = array();
			$Params['inputfilename'] = $InputFilename;
			$Params['samplewidth'] = 4096;//$Image->GetWidth();
			$Params['sampleheight'] = 4096;//$Image->GetHeight();
			$Params['SampleTime'] = 0;		//	sample time
			
			$Params['outputfilename'] = $ResizedTempFilename;
			$Params['layout'] = $NewLayout;
			$Params['Width'] = $Asset['Width'];
			$Params['Height'] = $Asset['Height'];
		
			$ExecCmd = "$Script " . ParamsToParamString( $Params );
		}
		else if ( $Format == 'jpg' && $Codec === false && $OldLayout == $NewLayout )
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
		
			if ( $OldLayout != $NewLayout )
			{
				echo "$Format/$Codec Cannot convert from $OldLayout to $NewLayout";
				return false;
			}
			
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
				$ExecCmd .= " -qscale:v " . FFMPEG_MJPEG_QUALITY;
				
				$PostProcessFunction = function(&$Asset,$LocalFilename)
				{
					$Indexes = MakeMjpegIndexes($LocalFilename);
					if ( !is_array($Indexes) )
					{
						if ( !is_string($Indexes) )
							return 'Failed to generate mjpeg indexes';
						return 'MakeMjpegIndexes: ' . $Indexes;
					}
					$Asset['MjpegIndexes'] = join(' ',$Indexes);
					return true;
				};
			}
			
			$ExecCmd .= " $ResizedTempFilename";
		}
		
		if ( !$ExecCmd )
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

		//	execute post-process
		if ( $PostProcessFunction )
		{
			$Error = $PostProcessFunction( $Asset, $ResizedTempFilename );
			if ( $Error !== true )
				$Asset['PostProcessError'] = $Error;
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