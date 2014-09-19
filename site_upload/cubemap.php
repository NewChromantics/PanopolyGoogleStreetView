<?php
	
	define('kPiF', 3.14159265358979323846264338327950288 );
	#define kDegToRad		(kPiF / 180.0f)
	#define kRadToDeg		(180.0f / kPiF)

	class Vector2
	{
		var $x;
		var $y;
		
		function Vector2($x,$y)
		{
			$this->x = $x;
			$this->y = $y;
		}
	};
	
	class Vector3
	{
		var $x;
		var $y;
		var $z;
		
		function Vector3($x,$y,$z)
		{
			$this->x = $x;
			$this->y = $y;
			$this->z = $z;
		}
	};

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
		
		//	stretch longitude...
		$lon *= 2.0;
		
		return new Vector2( $lat, $lon );
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
	
	class SoyCubemap
	{
		var $mRatio;	//	w/h vector2
		var $mTileSize;	//	w/h vector2
		var $mTileMap;	//	2D array of falseUDLRFB
		var $mFaceMap;	//	reverse of mTileMap to vector2
		
		function SoyCubemap($Width,$Height,$Layout)
		{
			$Layout = str_split( $Layout );
			
			//	calc ratio
			$this->mRatio = GetRatio( $Width, $Height, $SquareTileSize );
			if ( $this->mRatio === false )
				return;
			$this->mTileSize = new Vector2( $SquareTileSize, $SquareTileSize );
			
			//	see if layout fits
			$RatioTileCount = $this->mRatio->x * $this->mRatio->y;
			$LayoutTileCount = count( $Layout );
			if ( $RatioTileCount != $LayoutTileCount )
			{
				//	scale if posss
				$Remainder = $RatioTileCount % $LayoutTileCount;
				if ( $Remainder != 0 )
				{
					OnError("Layout doesn't fit in ratio");
					$this->mRatio = false;
					return;
				}
				//	ratio can only scale upwards...
				if ( $RatioTileCount > $LayoutTileCount )
				{
					OnError("Layout doesn't have enough tiles to fit in ratio");
					$this->mRatio = false;
					return;
				}
				$Scale = $LayoutTileCount / $RatioTileCount;
				$this->mRatio->x *= $Scale;
				$this->mRatio->y *= $Scale;
				$this->mTileSize->x /= $Scale;
				$this->mTileSize->y /= $Scale;
			}
			
			//	make up 2d map
			for ( $x=0;	$x<$this->GetTileWidth();	$x++ )
			{
				for ( $y=0;	$y<$this->GetTileHeight();	$y++ )
				{
					$i = ($y*$this->GetTileWidth()) + $x;
					$this->mTileMap[$x][$y] = $Layout[$i];
					$this->mFaceMap[$Layout[$i]] = new Vector2($x,$y);
				}
			}
		}
		
		function IsValid()		{	return $this->mRatio !== false;	}
		function GetTileWidth()		{	return $this->mRatio->x;	}
		function GetTileHeight()	{	return $this->mRatio->y;	}
		function GetImageWidth()	{	return $this->mRatio->x * $this->mTileSize->x;	}
		function GetImageHeight()	{	return $this->mRatio->y * $this->mTileSize->y;	}
		
		//	apply map to a different image
		function Resize($Width,$Height)
		{
			//	all we need to do is change tile size
			$this->mTileSize->x = $Width / $this->mRatio->x;
			$this->mTileSize->y = $Height / $this->mRatio->y;
		}
		
		function GetFaceOffset($Face)
		{
			if ( !array_key_exists( $Face, $this->mFaceMap ) )
				return new Vector2(0,0);
			
			return $this->mFaceMap[$Face];
		}

		function ScreenToWorld($Face,$ScreenPos)
		{
			//	0..1 -> -1..1
			$ScreenPos->x *= 2.0;
			$ScreenPos->y *= 2.0;
			$ScreenPos->x -= 1.0;
			$ScreenPos->y -= 1.0;
			
			switch ( $Face )
			{
				case 'L':	return new Vector3( -1,				-$ScreenPos->y,	$ScreenPos->x );
				case 'R':	return new Vector3(  1,				-$ScreenPos->y,	-$ScreenPos->x );
				case 'U':	return new Vector3( -$ScreenPos->x,	 1,				-$ScreenPos->y );
				case 'D':	return new Vector3( -$ScreenPos->x,	-1,				$ScreenPos->y );
				case 'F':	return new Vector3( $ScreenPos->x,	-$ScreenPos->y,	1 );
				case 'B':	return new Vector3( -$ScreenPos->x,	-$ScreenPos->y,	-1);
			}
			
			return false;
		}

		
		function ReadPixel_LatLon($Coords,$Image)
		{
			
			// The largest coordinate component determines which face we’re looking at.
			//	coords = pixel (camera) normal
			$coords = VectorFromCoordsRad($Coords);
			$ax = abs($coords->x);
			$ay = abs($coords->y);
			$az = abs($coords->z);
			$faceOffset;
			$x;
			$y;	//	offset from center of face
			
			//assert(ax != 0.0f || ay != 0.0f || az != 0.0f);
			
			if ($ax > $ay && $ax > $az)
			{//	facing x
				$x = $coords->z / $ax;
				$y = -$coords->y / $ax;
				if (0 < $coords->x)
				{
					$x = -$x;
					$faceOffset = $this->GetFaceOffset('R');
				}
				else
				{
					$faceOffset = $this->GetFaceOffset('L');
				}
			}
			else if ($ay > $ax && $ay > $az)
			{//	facing y
				$x = $coords->x / $ay;
				$y = $coords->z / $ay;
				if (0 < $coords->y)
				{
					$faceOffset = $this->GetFaceOffset('D');
				}
				else
				{
					$y = -$y;
					$faceOffset = $this->GetFaceOffset('U');
				}
			}
			else
			{//	must be facing z
				$x = $coords->x / $az;
				$y = -$coords->y / $az;
				if (0 < $coords->z)
				{
					$faceOffset = $this->GetFaceOffset('F');
				}
				else
				{
					$x = -$x;
					$faceOffset = $this->GetFaceOffset('B');
				}
			}
			
			$FaceSize = $this->mTileSize;
			$HalfSize = new Vector2( $FaceSize->x/2.0, $FaceSize->y/2.0 );
			
			$x = ($x * $HalfSize->x) + $HalfSize->x;
			$y = ($y * $HalfSize->y) + $HalfSize->y;
			assert( $x >= 0 && $x <= $FaceSize->x );
			assert( $y >= 0 && $y <= $FaceSize->y );

			$x += $faceOffset->x * $FaceSize->x;
			$y += $faceOffset->y * $FaceSize->y;
	
			/*
			var_dump($faceOffset);	echo "<p>";
			var_dump($FaceSize);	echo "<p>";
			var_dump($x);	echo "<p>";
			var_dump($y);	echo "<p>";
			exit(0);
			*/
			return ReadPixel_Clamped($Image, $x, $y );
		}
	};
	
	function GetRatio($Width,$Height,&$TileSize)
	{
		if ( $Width <= 0 || $Height <= 0 )
			return false;
		
		//	square
		if ( $Width == $Height )
		{
			$TileSize = $Width;
			return new Vector2(1,1);
		}
		
		if ( $Width > $Height )
		{
			$Remainder = $Width % $Height;
			if ( $Remainder == 0 )
			{
				$TileSize = $Height;
				return new Vector2($Width / $Height,1);
			}
			$TileSize = $Remainder;
			return new Vector2($Width/$Remainder,$Height/$Remainder);
		}
		else
		{
			$Ratio = GetRatio( $Height, $Width, $TileSize );
			return new Vector2( $Ratio->y, $Ratio->x );
		}
	}
	
	/*
	//	test
	$w = $_GET['width'];
	$h = $_GET['height'];
	$layout = $_GET['layout'];
	$Cubemap = new SoyCubemap( $w, $h, $layout );
	
	if ( !$Cubemap->IsValid() )
		return OnError("Invalid layout/size");
	
	//var_dump( $Cubemap );
	//	debug
	for ( $y=0;	$y<$Cubemap->GetHeight();	$y++)
	{
		echo '<div>';
		for ( $x=0;	$x<$Cubemap->GetWidth();	$x++)
		{
			echo $Cubemap->mTileMap[$x][$y];
		}
		echo '</div>';
	}
	 */
?>
