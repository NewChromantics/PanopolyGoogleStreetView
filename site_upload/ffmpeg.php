<?php
	//	limit to 1 min processing
	set_time_limit( 60 );
	
	
	//	not an ffmpeg function!
	function ImageToPng($Image)
	{
		ob_start();
		imagepng($Image);
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
		if ( $Image )
			$rgb = imagecolorallocate( $Image, $r, $g, $b );
		else
			$rgb = ($r << 16) | ($g << 8) | ($b << 0);
		return $rgb;
	}
		
	//	returns an image or false
	function LoadImage($InputFilename,$Width,$Height)
	{
		$OutputFilename = 'pipe:1';
		//	output to png
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
		$Param_Output = "$OutputFilename";
		
		$ExecCmd = FFMPEG_BIN . " $Param_Quiet $Param_Overwrite $Param_Input $Param_Scale $Param_Quality $Param_FrameSet $Param_OutputOther $Param_TimeLimit $Param_Codec $Param_Output $Param_CatchStdErr";
		
		if ( false )
		{
			exec( $ExecCmd, $ExecOut, $ExitCode );
			$ExecOut = join('', $ExecOut );
		}
		else
		{
			ob_start();
			passthru( $ExecCmd, $ExitCode );
			$ExecOut = ob_get_contents();
			ob_end_clean();
		}
		
		if ( $ExitCode != 0 )
			return false;
		
		$Image = imagecreatefromstring( $ExecOut );
		return $Image;
	}

?>