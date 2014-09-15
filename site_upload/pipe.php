<?php
	$_GET['panoname'] = 'xxx';
	require('panopoly.php');
	require('cubemap.php');
	require('ffmpeg.php');
	
	

	//	limit to 1 min processing
	set_time_limit( 60 );
	
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
	
		
	//	orig size (needed for cubemap)
	$OrigWidth = 400;
	$OrigHeight = 300;
	$Cubemap = new SoyCubemap( $OrigWidth, $OrigHeight, 'XUXXLFRBXDXX' );
	if ( !$Cubemap->IsValid() )
		return OnError("Invalid cubemap spec");
	
	//	output size
	$OutputWidth = 512;
	$OutputHeight = 512;
	
	$InputFilename = $_GET['in'];
	if ( !file_exists($InputFilename) )
		return OnError("404");
	
	$Image = LoadImage( $InputFilename, $OutputWidth, $OutputHeight );
	if ( $Image === false )
		return OnError("Error reading file");
	
	//	modify image
	//CubemapToEquirect( $Image, $Cubemap );
	CycleComponents( $Image );

	$Png = ImageToPng($Image);
	if ( $Png === false )
		return OnError('failed to create image');

	header('Content-Type: image/png');
	echo $Png;
	
	
	
?>