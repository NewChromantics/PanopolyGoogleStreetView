<?php
	
	define('kPiF', 3.14159265358979323846264338327950288 );
	function DegreesToRadians($Deg)
	{
		return $Deg * (kPiF / 180.0);
	}
	function RadiansToDegrees($Rad)
	{
		return $Rad * (180.0 / kPiF);
	}

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
	
	function ViewToLatLon($View3,&$LatLon)
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
		
		$LatLon->x = $lat;
		$LatLon->y = $lon;
	}
	
	//	-PI...PI, -PI...PI
	function ScreenEquirectToLatLon($ScreenPos,$Width=1,$Height=1)
	{
		$xmul = 2.0;
		$xsub = 1.0;
		$ymul = 2.0;
		$ysub = 1.0;
		
		$xfract = $ScreenPos->x / $Width;
		$xfract *= $xmul;
		
		$yfract = ($Height - $ScreenPos->y) / $Height;
		$yfract *= $ymul;
		
		$lat = ( $xfract - $xsub) * kPiF;
		$lon = ( $yfract - $ysub) * kPiF;
		return new Vector2( $lat, $lon );
	}
	
	//	gr: old func.
	//	this MIGHT be correct. lat is -PI...PI Lon is -HalfPi...HalfPi (but that's confusing)
	function GetLatLong($x,$y,$Width,$Height)
	{
		$xmul = 2.0;
		$xsub = 1.0;
		$ymul = 1.0;
		$ysub = 0.5;
		
		$xfract = $x / $Width;
		$xfract *= $xmul;
		
		$yfract = ($Height - $y) / $Height;
		$yfract *= $ymul;
		
		$lon = ( $xfract - $xsub) * kPiF;
		$lat = ( $yfract - $ysub) * kPiF;
		return new Vector2( $lat, $lon );
	}
	
	function LatLonToScreenEquirect($LatLon)
	{
		$lat = $LatLon->x;
		$lon = $LatLon->y;
		$ScreenPos = new Vector2(0,0);
		GetScreenFromLatLong($lat,$lon,1,1,$ScreenPos);
		return $ScreenPos;
	}

	function GetScreenFromLatLong($lat,$lon,$Width,$Height,&$ScreenPos)
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
		
		$ScreenPos->x = $lat;
		$ScreenPos->y = $lon;
	}
	
	//	X		nothing
	//	UDLRFB	up down left right forward back
	//	Z		flipped back
	class SoyCubemap
	{
		var $mRatio;	//	w/h vector2
		var $mTileSize;	//	w/h vector2
		var $mTileMap;	//	2D array of falseUDLRFB
		var $mFaceMap;	//	reverse of mTileMap to vector2
		
		function SoyCubemap($Layout)
		{
			$Layout = str_split( $Layout );
			$Width = intval( array_shift($Layout) );
			$Height = intval( array_shift($Layout) );
			
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
					$Face = $Layout[$i];
					$RealFace = $this->GetRealFace($Face);
					
					//	gr: turn this whole thing into a matrix!
					$Matrix = $this->GetFaceMatrix($Face);
	
					$this->mTileMap[$x][$y] = $Face;
					$this->mFaceMap[$RealFace] = new Vector3($x,$y,$Matrix);
				}
			}
		}
		
		function GetFaceMatrix($Face)
		{
			switch ( $Face )
			{
				case 'U':
				case 'D':
				case 'L':
				case 'R':
				case 'F':
				case 'B':
					return new Vector2(1,1);
				case 'Z':
					return new Vector2(-1,-1);
			}
			return new Vector2(0,0);
		}
		
		function GetFlipFace($Face)
		{
			switch ( $Face )
			{
				case 'B':	return 'Z';
			}
			return false;
		}
		function GetRealFace($Face)
		{
			switch ( $Face )
			{
				case 'Z':	return 'B';
			}
			return $Face;
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
		
		function HasFace($Face)
		{
			if ( !array_key_exists( $Face, $this->mFaceMap ) )
				return false;
			return true;
		}
		
		function GetFaceOffset($Face)
		{
			if ( !$this->HasFace($Face) )
				return false;
			
			return $this->mFaceMap[$Face];
		}

		function ScreenToWorld($Face,$ScreenPosX,$ScreenPosY,&$View3)
		{
			//	0..1 -> -1..1
			$ScreenPosX *= 2.0;
			$ScreenPosY *= 2.0;
			$ScreenPosX -= 1.0;
			$ScreenPosY -= 1.0;
			
			switch ( $Face )
			{
				case 'L':	{	$View3->x = -1;					$View3->y = -$ScreenPosY;	$View3->z = $ScreenPosX;	return true;}
				case 'R':	{	$View3->x =  1;					$View3->y = -$ScreenPosY;	$View3->z = -$ScreenPosX;	return true;}
				case 'U':	{	$View3->x = -$ScreenPosX;		$View3->y =  1;				$View3->z = -$ScreenPosY;	return true;}
				case 'D':	{	$View3->x = -$ScreenPosX;		$View3->y = -1;				$View3->z = $ScreenPosY;	return true;}
				case 'F':	{	$View3->x =  $ScreenPosX;		$View3->y = -$ScreenPosY;	$View3->z =  1;				return true;}
				case 'B':	{	$View3->x = -$ScreenPosX;		$View3->y = -$ScreenPosY;	$View3->z = -1;				return true;}
			}
			
			return false;
		}

		
		function GetImageXYFromLatLon($Coords)
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
			
			//	need to flip
			$x *= $faceOffset->z->x;
			$y *= $faceOffset->z->y;
			
			$x = ($x * $HalfSize->x) + $HalfSize->x;
			$y = ($y * $HalfSize->y) + $HalfSize->y;
			assert( $x >= 0 && $x <= $FaceSize->x );
			assert( $y >= 0 && $y <= $FaceSize->y );

			$x += $faceOffset->x * $FaceSize->x;
			$y += $faceOffset->y * $FaceSize->y;
	
			return new Vector2($x,$y);
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
