<?php
	$_GET['panoname'] = 'xxx';
	require('panopoly.php');
	require('cubemap.php');
	require('ffmpeg.php');
	
	//	get params
	if ( $argc > 1 )
	{
		
	}
	

	//	limit to X min processing
	set_time_limit( 3*60 );
	
	
	

	
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


	
	function EquirectToCubemap(&$EquiImage,$Cubemap)
	{
		//	make cubemap image to fill
		$InWidth = imagesx( $EquiImage );
		$InHeight = imagesy( $EquiImage );
		$OutWidth = $Cubemap->GetImageWidth();
		$OutHeight = $Cubemap->GetImageHeight();

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
	

		
		
	//	orig size (needed for cubemap)
	$CubemapLayout = false;
	if ( array_key_exists('cubemap',$_GET) )
		$CubemapLayout = $_GET['cubemap'];
	
	
	//	max-out source size for best-quality sample (fast)
	$SourceWidth = 4096;
	$SourceHeight = 4096;
	
	$InputFilename = $_GET['in'];
	if ( !file_exists($InputFilename) )
		return OnError("404");
	
	$Image = LoadImage( $InputFilename, $SourceWidth, $SourceHeight );
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
		//	output size
		$OutputWidth = 2048;
		$OutputHeight = 2048;
		
		//	equirect to cubemap
		$Cubemap = new SoyCubemap( 2, 3, 'ULFRBD' );
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