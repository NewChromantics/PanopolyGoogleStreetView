<?php
	$_GET['panoname'] = 'xxx';
	require('panopoly.php');

	
	function DoSomethingWithImage(&$Image)
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
	
	
	
	$Width = 500;
	$Height = 500;
	
	function GetComponents(&$r,&$g,&$b,$rgb)
	{
		$r = ($rgb >> 16) & 0xFF;
		$g = ($rgb >> 8) & 0xFF;
		$b = $rgb & 0xFF;
	}
	
	function GetRgb($r,$g,$b,$Image=false)
	{
		if ( $Image )
			$rgb = imagecolorallocate( $Image, $r, $g, $b );
		else
			$rgb = ($r << 16) | ($g << 8) | ($b << 0);
		return $rgb;
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
	
	function ImageToPng($Image)
	{
		ob_start();
		imagepng($Image);
		$Png = ob_get_contents();
		ob_end_clean();
		return $Png;
	}
	
	
	//	if input file specified, run with ffmpeg and pipe raw image to here
	if ( array_key_exists('in',$_GET) )
	{
		$InputFilename = $_GET['in'];
		$OutputFilename = $_GET['out'];
		
		$Param_Codec = '-f image2 -codec:v png';
		//$Param_Codec = '-codec:v rawvideo -pix_format rgb24';
		//$Param_Codec = '-codec:v libx264';	//	h265

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

		$Param_CatchStdErr = "2>&1";
		$Param_Scale = "-vf scale=$Width:$Height";
		$Param_Input = "-i $InputFilename";
		$Param_Output = 'pipe:1';	//	0 in, 1 out, 2 err
		//$Param_Output = "$OutputFilename";
		
		$ExecCmd = FFMPEG_BIN . " $Param_Quiet $Param_Overwrite $Param_Input $Param_Scale $Param_Quality $Param_FrameSet $Param_OutputOther $Param_TimeLimit $Param_Codec $Param_Output $Param_CatchStdErr";
	
		if ( false )
		{
			exec( $ExecCmd, $ExecOut, $ExitCode );
			$ExecOut = join('', $ExecOut );
		}
		else
		{
			//	gr: this doesn;t work either
			ob_start();
			passthru( $ExecCmd, $ExitCode );
			$ExecOut = ob_get_contents();
			ob_end_clean();
		}
		
		if ( $ExitCode != 0 )
		{
			return OnError("failed [$ExecCmd]: [$ExitCode] $ExecOut");
		}
		
		$Image = imagecreatefromstring( $ExecOut );
	}
	else
	{
		//	no input, use test
		$Image = CreateTestImage( $Width, $Height );
	}
	
	DoSomethingWithImage( $Image );

	$Png = ImageToPng($Image);
	if ( $Png === false )
		return OnError('failed to create image');

	header('Content-Type: image/png');
	echo $Png;
	
	
	
?>