<?php
		
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


	
?>