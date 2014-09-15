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

	define('kPiF', 3.14159265358979323846264338327950288 );
	#define kDegToRad		(kPiF / 180.0f)
	#define kRadToDeg		(180.0f / kPiF)
	
	
	function VectorFromCoordsRad($latlon)
	{
		$latitude = $latlon->x;
		$longitude = $latlon->y;
		$las = sin($latitude);
		$lac = cos($latitude);
		$los = sin($longitude);
		$loc = cos($longitude);
		
		$result = new Vector3( $los * $lac, $las, $loc * $lac );
		//assert(fabsf(result.Length() - 1.0f) < 0.01f);
		
		return $result;
	}

	
	
	
	
	
	function GetLatLong($x,$y,$Width,$Height)
	{
		$xmul = 2.0;
		$xsub = 1.0;
		$xfract = $x / $Width;
		$xfract *= $xmul;
		
		$ysub = 0.5;
		$ymul = 1.0;
		$yfract = ($Height - $y) / $Height;
		$yfract *= $ymul;
		
		$lon = ( $xfract - $xsub) * kPiF;
		$lat = ( $yfract - $ysub) * kPiF;
		return new Vector2( $lat, $lon );
	}

	function CubemapToEquirect(&$Image,$Cubemap)
	{
		//	make equirect image to fill
		$InWidth = imagesx( $Image );
		$InHeight = imagesy( $Image );
		$OutWidth = $InWidth;
		$OutHeight = $InHeight;
		$EquiImage = imagecreatetruecolor($OutWidth,$OutHeight);
		$Cubemap->Resize( $OutWidth, $OutHeight);
		
		//	render each pixel
		for ( $y=0; $y<$OutHeight; $y++ )
		for ( $x=0;	$x<$OutWidth; $x++ )
		{
			$latlon = GetLatLong( $x, $y, $OutWidth, $OutHeight );
			$Sample = $Cubemap->ReadPixel_LatLon( $latlon, $Image );
			imagesetpixel( $EquiImage, $x, $y, $Sample );
		}
		
		$Image = $EquiImage;
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
	$OutputWidth = 1024;
	$OutputHeight = 512;
	
	$InputFilename = $_GET['in'];
	if ( !file_exists($InputFilename) )
		return OnError("404");
	
	$Image = LoadImage( $InputFilename, $OutputWidth, $OutputHeight );
	if ( $Image === false )
		return OnError("Error reading file");
	
	//	modify image
	CubemapToEquirect( $Image, $Cubemap );
	//CycleComponents( $Image );

	$Png = ImageToPng($Image);
	if ( $Png === false )
		return OnError('failed to create image');

	header('Content-Type: image/png');
	echo $Png;
	
	
	
?>