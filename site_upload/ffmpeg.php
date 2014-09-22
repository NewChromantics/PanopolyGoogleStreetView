<?php
	define('PHP_JPEG_QUALITY', 75 );	//	100(best)...0(worst)

	function ImageToPng($Image,$Filename=false)
	{
		if ( $Filename !== false )
			return imagepng($Image,$Filename);

		ob_start();
		imagepng($Image);
		$Png = ob_get_contents();
		ob_end_clean();
		return $Png;
	}
	
	function ImageToJpeg($Image,$Filename=false,$Quality=PHP_JPEG_QUALITY)
	{
		if ( $Filename !== false )
			return imagejpeg($Image,$Filename,$Quality);
		
		ob_start();
		imagejpeg($Image,NULL,$Quality);
		$Png = ob_get_contents();
		ob_end_clean();
		return $Png;
	}
	
	function GetComponents(&$r,&$g,&$b,$rgb)
	{
		$r = ($rgb >> 16) & 0xFF;
		$g = ($rgb >> 8) & 0xFF;
		$b = $rgb & 0xFF;
	}
	
	function GetRgb($r,$g,$b,$Image=false)
	{
		$r = intval($r) & 0xFF;
		$g = intval($g) & 0xFF;
		$b = intval($b) & 0xFF;
		
		if ( $Image )
			$rgb = imagecolorallocate( $Image, $r, $g, $b );
		else
			$rgb = ($r << 16) | ($g << 8) | ($b << 0);
		return $rgb;
	}
	
	//	on 512x512 providing w/h saved 0.2sec
	function ReadPixel_Clamped($Image,$x,$y,$w=false,$h=false)
	{
		if ( $w === false )	$w = imagesx( $Image );
		if ( $h === false )	$h = imagesy( $Image );
		//assert($x < $w, $x.'<'.$w );
		//assert($y < $h, $y.'<'.$h );
		$x = max( 0, min( $x, $w-1 ) );
		$y = max( 0, min( $y, $h-1 ) );
		return imagecolorat( $Image, $x, $y );
	}
	
	function GetVector3Colour($Vector3)
	{
		$vx = $Vector3->x;
		$vy = $Vector3->y;
		$vz = $Vector3->z;
		return GetRgb( ($vx+1.0)/2.0*255, ($vy+1.0)/2.0*255, ($vz+1.0)/2.0*255 );
	}
	
	function GetVector2Colour($Vector2)
	{
		$vx = $Vector2->x;
		$vy = $Vector2->y;
		$vz = 0;
		return GetRgb( ($vx+1.0)/2.0*255, ($vy+1.0)/2.0*255, ($vz+1.0)/2.0*255 );
	}
	
	function GetImageVector2Colour($Vector2,$Image)
	{
		$w = imagesx($Image);
		$h = imagesy($Image);
		$x = $Vector2->x / $w;
		$y = $Vector2->y / $h;
		return GetVector2Colour( new Vector2($x,$y) );
	}
	
	function GetLatLonColour($LatLon)
	{
		if ( $LatLon->x < -1 )
			return GetRgb( 0,255,0 );
		if ( $LatLon->x > 1 )
			return GetRgb( 255,255,0 );
		
		$x = $LatLon->x + kPiF;
		$x /= kPiF * 2.0;
		$y = $LatLon->y + kPiF;
		$y /= kPiF * 2.0;
		return GetRgb( $x*255, 0, $y*255 );
	}
	
	function GetFaceColour($Face)
	{
		switch ( $Face )
		{
			case 'U':	return GetRgb(255,0,0);
			case 'L':	return GetRgb(0,255,0);
			case 'F':	return GetRgb(0,0,255);
			case 'R':	return GetRgb(255,255,0);
			case 'B':	return GetRgb(0,255,255);
			case 'D':	return GetRgb(255,0,255);
			default:	return GetRgb(255,255,255);
		}
	}
	
	//	create an image and display it
	function CreateTestImage($Width,$Height)
	{
		$Image = imagecreatetruecolor($Width,$Height);
		
		//	set all pixels
		for ( $y=0; $y<$Height; $y++ )
			for ( $x=0;	$x<$Width; $x++ )
			{
				$r = $x % 255;
				$g = $y % 255;
				$b = 0 % 255;
				$rgb = GetRgb( $r, $g, $b );
				imagesetpixel( $Image, $x, $y, $rgb );
			}
		return $Image;
	}
	
	function CycleComponents(&$Image)
	{
		$w = imagesx( $Image );
		$h = imagesy( $Image );
		
		//	change components
		for ( $y=0; $y<$h; $y++ )
		{
			for ( $x=0;	$x<$w; $x++ )
			{
				$rgb = imagecolorat( $Image, $x, $y );
				GetComponents( $r, $g, $b, $rgb );
				$rgb = GetRgb( $g, $b, $r );
				imagesetpixel( $Image, $x, $y, $rgb );
			}
		}
	}
	

	//	returns an image or false
	function LoadImage($InputFilename,$Width,$Height,$TimeOffset,$InputFormat,&$Error)
	{
		//	if input is static image, we can't have an offset... this is a little hacky...
		if ( $InputFormat !== false )
			$TimeOffset = 0;
		
		$OutputFilename = 'pipe:1';
		//	output to png (image2)
		$Param_Codec = '-f image2';

		//	resize with ffmpeg
		$ExitCode = -1;
		$Param_Quiet = "-loglevel error";
		$Param_Overwrite = "-y";
		$Param_FrameSet = "-vframes 1";	//	video -> image
		$Param_CpuUsage = '';
		$Param_OutputOther = '';
		$Param_Quality = '';
		$Param_TimeLimit = '';

		//$Param_OutputOther .= " -b:v $BitRate";
		//$FFMPEG_WEBM_QUALITY = 'medium';
		//$Param_Quality = " -preset " . $FFMPEG_H264_QUALITY;
		//$Param_OutputOther .= " -codec:v libx264";
		//$Param_OutputOther .= " -b:v $BitRate";

		$Param_SeekPos = " -ss $TimeOffset";
		
		$Param_Scale = "-vf scale=$Width:$Height";
		
		$Param_Input = '';
		if ( $InputFormat !== false )
			$Param_Input .= "-f $InputFormat";
		$Param_Input .= " -i $InputFilename";
		$Param_Output = "$OutputFilename";
		
		$ExecCmd = FFMPEG_BIN . " $Param_Quiet $Param_Overwrite $Param_SeekPos $Param_Input $Param_Scale $Param_Quality $Param_FrameSet $Param_OutputOther $Param_TimeLimit $Param_Codec $Param_Output";

		$ExecOut = '';
		$ExitCode = SoyExec( $ExecCmd, $ExecOut );
		
		if ( $ExitCode != 0 )
		{
			$Error = "ffmpeg error [$ExitCode] [$ExecOut] [$ExecCmd]";
			return false;
		}
		
		//	if imagecreatefromstring we error and abort... so silence. But this could give other info if required
		$Image = @imagecreatefromstring( $ExecOut );
		if ( $Image === false )
		{
			$Error = "imagecreatefromstring() failed [$ExecOut]";
		}
		
		return $Image;
	}

?>