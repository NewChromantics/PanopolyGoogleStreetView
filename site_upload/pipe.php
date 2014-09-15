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
	
	
	//	LatLonToView
	function VectorFromCoordsRad($latlon)
	{
		//	http://en.wikipedia.org/wiki/N-vector#Converting_latitude.2Flongitude_to_n-vector
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
	
	function ViewToLatLon($View3)
	{
		//	http://en.wikipedia.org/wiki/N-vector#Converting_n-vector_to_latitude.2Flongitude
		$x = $View3->x;
		$y = $View3->y;
		$z = $View3->z;
		
		/*
		$lat = atan( $z / sqrt( ($x*$x) + ($y*$y) ) );
		//$lat = asin( $z );
		$lon = 0;
		if ( $x != 0 )
			$lon = atan( $y / $x );
		 */
		
		$lat = atan2( $x, $z );
		
		//	normalise y
		$xz = sqrt( ($x*$x) + ($z*$z) );
		$normy = $y / sqrt( ($y*$y) + ($xz*$xz) );
		$lon = asin( $normy );
		//$lon = atan2( $y, $xz );

		 
		return new Vector2( $lat, $lon );
	}
	
	function GetVector3Colour($Vector3)
	{
		$vx = $Vector3->x;
		$vy = $Vector3->y;
		$vz = $Vector3->z;
		return GetRgb( ($vx+1.0)/2.0*255, ($vy+1.0)/2.0*255, ($vz+1.0)/2.0*255 );
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
	
	function GetLatLong($x,$y,$Width,$Height)
	{
		$xmul = 2.0;
		$xsub = 1.0;
		$ysub = 0.5;
		$ymul = 1.0;

		$xfract = $x / $Width;
		$xfract *= $xmul;
		
		$yfract = ($Height - $y) / $Height;
		$yfract *= $ymul;
		
		$lon = ( $xfract - $xsub) * kPiF;
		$lat = ( $yfract - $ysub) * kPiF;
		return new Vector2( $lat, $lon );
	}
	
	function GetLatLongInverse($lat,$lon,$Width,$Height)
	{
		//	-pi...pi -> -1...1
		$lat /= kPiF;
		$lon /= kPiF;

		//	-1..1 -> 0..2
		$lat += 1.0;
		$lon += 1.0;
		
		//	0..2 -> 0..1
		$lat /= 2.0;
		$lon /= 2.0;
		
		$lon = 1.0 - $lon;
		$lat *= $Width;
		$lon *= $Height;

		return new Vector2( $lat, $lon );
	}
	
	function CubemapToEquirect(&$CubeImage,$Cubemap)
	{
		//	make equirect image to fill
		$InWidth = imagesx( $CubeImage );
		$InHeight = imagesy( $CubeImage );
		$OutWidth = $InWidth;
		$OutHeight = $InHeight;
	
		$EquiImage = imagecreatetruecolor($OutWidth,$OutHeight);
		$Cubemap->Resize( $OutWidth, $OutHeight);
		
		//	render each pixel
		for ( $y=0; $y<$OutHeight; $y++ )
		for ( $x=0;	$x<$OutWidth; $x++ )
		{
			$latlon = GetLatLong( $x, $y, $OutWidth, $OutHeight );
			$Sample = $Cubemap->ReadPixel_LatLon( $latlon, $CubeImage );
			imagesetpixel( $EquiImage, $x, $y, $Sample );
		}
		
		$CubeImage = $EquiImage;
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
	
	function EquirectToCubemap(&$EquiImage,$Cubemap)
	{
		//	make cubemap image to fill
		$InWidth = imagesx( $EquiImage );
		$InHeight = imagesy( $EquiImage );
		$OutWidth = $InWidth;
		$OutHeight = $InHeight;

		$CubeImage = imagecreatetruecolor($OutWidth,$OutHeight);
		
		//	go through each tile, convert pixel to lat long, then read
		foreach ( $Cubemap->mFaceMap as $Face => $FaceOffset )
		{
			$Colour = GetFaceColour( $Face );
			
			for ( $fy=0;	$fy<$Cubemap->mTileSize->y;	$fy++ )
			for ( $fx=0;	$fx<$Cubemap->mTileSize->x;	$fx++ )
			{
				$x = $fx + ($FaceOffset->x * $Cubemap->mTileSize->x);
				$y = $fy + ($FaceOffset->y * $Cubemap->mTileSize->y);
				
				$vx = $fx / $Cubemap->mTileSize->x;
				$vy = $fy / $Cubemap->mTileSize->y;
				
				$ViewVector = $Cubemap->ScreenToWorld( $Face, new Vector2($vx, $vy) );
				if ( $ViewVector === false )
				{
					$Colour = GetRgb( 255, 0, 255 );
				}
				else
				{
					$Colour = GetVector3Colour( $ViewVector );

					$LatLon = ViewToLatLon( $ViewVector );
					$Colour = GetLatLonColour( $LatLon );
						
					$SphereImagePos = GetLatLongInverse( $LatLon->x, $LatLon->y, $InWidth, $InHeight );
					$Colour = ReadPixel_Clamped( $EquiImage, $SphereImagePos->x, $SphereImagePos->y );
					
					
				}
				 
				imagesetpixel( $CubeImage, $x, $y, $Colour );
			}
		}
		
		$EquiImage = $CubeImage;
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
	$CubemapLayout = false;
	if ( array_key_exists('cubemap',$_GET) )
		$CubemapLayout = $_GET['cubemap'];
	
	
	//	output size
	$OutputWidth = 2048;
	$OutputHeight = 2048;

	$InputFilename = $_GET['in'];
	if ( !file_exists($InputFilename) )
		return OnError("404");
	
	$Image = LoadImage( $InputFilename, $OutputWidth, $OutputHeight );
	if ( $Image === false )
		return OnError("Error reading file");

	
	
	//	if cubemap specified then cubemap -> equirect
	if ( $CubemapLayout !== false )
	{
		//	need to grab this!
		$OrigWidth = 400;
		$OrigHeight = 300;
		$Cubemap = new SoyCubemap( $OrigWidth, $OrigHeight, $CubemapLayout );
		if ( !$Cubemap->IsValid() )
			return OnError("Invalid cubemap spec");
		CubemapToEquirect( $Image, $Cubemap );
	}
	else
	{
		//	equirect to cubemap
		$Cubemap = new SoyCubemap( 400, 300, 'XUXXLFRBXDXX' );
		$Cubemap->Resize( $OutputWidth, $OutputHeight );
		EquirectToCubemap( $Image, $Cubemap );
		//CubemapToEquirect( $Image, $Cubemap );
	}
	
	
	//	modify image
	//CycleComponents( $Image );

	$Png = ImageToPng($Image);
	if ( $Png === false )
		return OnError('failed to create image');

	header('Content-Type: image/png');
	echo $Png;
	
	
	
?>