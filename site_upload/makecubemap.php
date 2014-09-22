<?php
	require('panopoly.php');
	require('cubemap.php');
	require('ffmpeg.php');

	//	limit to X min processing
	set_time_limit( 10*60 );

	$InputFilename = GetArg('inputfilename',false);
	$SampleWidth = GetArg('samplewidth',4096);
	$SampleHeight = GetArg('sampleheight',4096);
	$SampleTime = GetArg('SampleTime',0);
	
	$OutputFilename = GetArg('outputfilename',false);		//	false = output to browser
	$OutputLayout = GetArg('layout','23ULFRBD');
	$OutputWidth = GetArg('Width',256);
	$OutputHeight = GetArg('Height',256);
	
	//	get params
	if ( IsCli() )
	{
		//	when being executed from command line the htaccess settings aren't used...
		//	ideally read this from htaccess.txt
		ini_set('memory_limit','1024M');
	}

	

	function EquirectToCubemap(&$EquiImage,$Cubemap)
	{
		//	make cubemap image to fill
		$InWidth = imagesx( $EquiImage );
		$InHeight = imagesy( $EquiImage );
		$OutWidth = $Cubemap->GetImageWidth();
		$OutHeight = $Cubemap->GetImageHeight();

		$CubeImage = imagecreatetruecolor($OutWidth,$OutHeight);
		
		$MinSampleX = 9999;
		$MaxSampleX = -9999;
		$MinSampleY = 9999;
		$MaxSampleY = -9999;
		$MinLon = 9999;
		$MaxLon = -9999;
		$MinLat = 9999;
		$MaxLat = -9999;
		$MinViewY = 9999;
		$MaxViewY = -9999;
		
		//	re-using class objects saves cpu time in massive loops
		$ViewVector = new Vector3(0,0,0);
		$LatLon = new Vector2(0,0);
		$SphereImagePos = new Vector2(0,0);
		
		$debugminmax = GetArg('debugsample',false);
		
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
				
				if ( !$Cubemap->ScreenToWorld( $Face, $vx, $vy, $ViewVector ) )//	0.9s
				{
					//$Colour = GetRgb( 255, 0, 255 );
				}
				else
				{
				//	$Colour = GetVector3Colour( $ViewVector );
					ViewToLatLon( $ViewVector, $LatLon );	//	 0.9s
					
				//	$Colour = GetLatLonColour( $LatLon );
					GetScreenFromLatLong( $LatLon->x, $LatLon->y, $InWidth, $InHeight, $SphereImagePos );	//	0.41

				//	$Colour = GetVector2Colour( $SphereImagePos );
					$Colour = ReadPixel_Clamped( $EquiImage, $SphereImagePos->x, $SphereImagePos->y, $InWidth, $InHeight );	//	 1.77
				
					//	saves ~2 secs
					if ( $debugminmax )
					{
						$MinViewY = min( $MinViewY, $ViewVector->y );
						$MaxViewY = max( $MaxViewY, $ViewVector->y );
						$MinLon = min( $MinLon, $LatLon->y );
						$MaxLon = max( $MaxLon, $LatLon->y );
						$MinLat = min( $MinLat, $LatLon->x );
						$MaxLat = max( $MaxLat, $LatLon->x );
						$MinSampleX = min( $MinSampleX, $SphereImagePos->x );
						$MaxSampleX = max( $MaxSampleX, $SphereImagePos->x );
						$MinSampleY = min( $MinSampleY, $SphereImagePos->y );
						$MaxSampleY = max( $MaxSampleY, $SphereImagePos->y );
					}
				}
				 
				imagesetpixel( $CubeImage, $x, $y, $Colour );
			}
		}
		
		if ( $debugminmax )
			OnError("MinSampleX=$MinSampleX; MaxSampleX=$MaxSampleX; MinSampleY=$MinSampleY; MaxSampleY=$MaxSampleY; MinLon=$MinLon; MaxLon=$MaxLon; MinLat=$MinLat; MaxLat=$MaxLat; MinViewY=$MinViewY; MaxViewY=$MaxViewY; ");
		
		$EquiImage = $CubeImage;
	}
	

	if ( $InputFilename === false )
		return OnError("No inputfilename specified");
	if ( !file_exists($InputFilename) )
		return OnError("404 ($InputFilename)");
	
	//	try different formats
	$LoadFormats = GetFfmpegInputFormats();
	foreach ( $LoadFormats as $LoadFormat )
	{
		$Image = LoadImage( $InputFilename, $SampleWidth, $SampleHeight, $SampleTime, $LoadFormat, $Error );
		if ( $Image !== false )
			break;
	}
	if ( $Image === false )
		return OnError("Error reading file: $Error");
	
	if ( $OutputLayout != false && $OutputLayout != 'false' )
	{
		//	equirect to cubemap
		$Cubemap = new SoyCubemap( $OutputLayout );
		$Cubemap->Resize( $OutputWidth, $OutputHeight );
		
		$start = microtime(true);
		EquirectToCubemap( $Image, $Cubemap );
		$time_elapsed_us = microtime(true) - $start;
		if ( GetArg('debugtimer',false) )
			OnError("EquirectToCubemap took $time_elapsed_us secs");
	}

	if ( $OutputFilename !== false )
	{
		$ext = substr( $OutputFilename, -3 );
		if ( $ext == 'png' )
			$Result = ImageToJpeg($Image,$OutputFilename);
		else if ( $ext == 'jpg' )
			$Result = ImageToJpeg($Image,$OutputFilename);
		else
			return OnError("Failed to create image: " + $ext );
		
		if ( !$Result )
			return OnError('failed to create image');
		exit(0);
	}
	
	//	output to browser
	$Png = ImageToPng($Image);
	if ( $Png === false )
		return OnError('failed to create image');

	header('Content-Type: image/png');
	echo $Png;
?>