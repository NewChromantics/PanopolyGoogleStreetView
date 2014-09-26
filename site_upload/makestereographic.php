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
	$OutputWidth = GetArg('Width',256);
	$OutputHeight = GetArg('Height',256);
	
	$InputLayout = 'equirect';
	
	//	get params
	if ( IsCli() )
	{
		//	when being executed from command line the htaccess settings aren't used...
		//	ideally read this from htaccess.txt
		ini_set('memory_limit','1024M');
	}

	//	screen pos is normalised
	//	http://www.subblue.com/blog/2010/6/17/little_planets
	function ScreenStereographicToLatLon($ScreenPos)
	{
		$x = $ScreenPos->x;
		$y = $ScreenPos->y;

		$x -= 0.5;
		$x *= 2;
		
		$y -= 0.5;
		$y *= 2;
		
		
		//	sphere radius.
		$R = 1;
		$r = max( 0.0001, sqrt( $x*$x + $y*$y ) );
		//	gr: range of c : -PI ... PI
		//	range of X in y=atan(X) : -1...1
		//	range og f in y=atan(X) : -PI/4 (inf=-PI/2) ... PI/4(inf=PI/2)
		//	range of $r : 0..1
		//	therefore; c = 4*atan (not 2)
		//	therefore; X = 0..1 / 1
		//	therefore $R = 1
		// http://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Atan_acot_plot.svg/640px-Atan_acot_plot.svg.png
		$c = 4 * atan( $r / $R );
		
		//	user controlled offset
		//$ViewLat = -kPiF/2;
		//$ViewLon = -kPiF/2;
		$ViewLat = DegreesToRadians(-90);
		$ViewLon = 0;//DegreesToRadians(90);
		
		$Lat = asin( cos($c) * sin($ViewLat) + ($y * sin($c) * cos($ViewLat) / $r ) );
		$Lon = $ViewLon + atan( $x * sin($c) / ($r * cos($ViewLat) * cos($c) - $y * sin($ViewLat) * sin($c) ) );
	
		$Lat *= 2;
		$Lon *= 2;
		
		return new Vector2($Lon,$Lat);
	}


	function EquirectToStereographic(&$EquiImage,$OutSize)
	{
		//	make cubemap image to fill
		$InWidth = imagesx( $EquiImage );
		$InHeight = imagesy( $EquiImage );
		$OutWidth = $OutSize->x;
		$OutHeight = $OutSize->y;
		
		$StereoImage = imagecreatetruecolor($OutWidth,$OutHeight);
		
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
		//	render each pixel
		for ( $y=0; $y<$OutHeight; $y++ )
		{
			for ( $x=0;	$x<$OutWidth; $x++ )
			{
				//	destination latlon
			//	$LatLon = GetLatLong( $x, $y, $OutWidth, $OutHeight );
			//	$LatLon = ScreenEquirectToLatLon( new Vector2( $x/$OutWidth, $y/$OutHeight ) );
				$LatLon = ScreenStereographicToLatLon( new Vector2( $x/$OutWidth, $y/$OutHeight ) );
				
				//	extract pixel at lat lon
				$EquirectScreen = LatLonToScreenEquirect( $LatLon );
				$EquirectScreen->x *= $InWidth;
				$EquirectScreen->y *= $InHeight;
				$Colour = ReadPixel_Clamped( $EquiImage, $EquirectScreen->x, $EquirectScreen->y, $InWidth, $InHeight );
				
				//$Colour = GetLatLonColour($LatLon);
				
				imagesetpixel( $StereoImage, $x, $y, $Colour );
				
				//	saves ~2 secs
				if ( $debugminmax )
				{
					$SphereImagePos = $EquirectScreen;
					//$MinViewY = min( $MinViewY, $ViewVector->y );
					//$MaxViewY = max( $MaxViewY, $ViewVector->y );
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
		}
		
		if ( $debugminmax )
			OnError("$debugminmax MinSampleX=$MinSampleX; MaxSampleX=$MaxSampleX; MinSampleY=$MinSampleY; MaxSampleY=$MaxSampleY; MinLon=$MinLon; MaxLon=$MaxLon; MinLat=$MinLat; MaxLat=$MaxLat; MinViewY=$MinViewY; MaxViewY=$MaxViewY; ");
		
		$EquiImage = $StereoImage;
	}
	

	

	if ( $InputFilename === false )
		return OnError("No inputfilename specified");
	if ( $InputLayout === false )
		return OnError("No layout specified");
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
	
	{
		$start = microtime(true);
		EquirectToStereographic( $Image, new Vector2($OutputWidth,$OutputHeight) );
		$time_elapsed_us = microtime(true) - $start;
		if ( GetArg('debugtimer',false) )
			OnError("CubemapToEquirect took $time_elapsed_us secs");
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