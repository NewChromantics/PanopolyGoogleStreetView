
function GoogleLocationToMeta($Meta)
{
	var $Type = GetType($Meta);
	
	//	already meta
	//	gr: get real type please!
	if ( $Type == 'Object' )
		return $Meta;
	
	//	turn array of lat,lon into a string
	if ( $Type == 'Array' && $Meta.length == 2 )
	{
		$Meta = $Meta[0] + ',' + $Meta[1];
		$Type = GetType($Meta);
	}

	if ( $Type == 'string' )
	{
		var $Location = $Meta;
		$Meta = new SoyAssetMeta();
		$Meta.Filename = $Location;
	}
	
	return $Meta;
}


SoyAsset_GsvPanoMeta.prototype = new SoyAsset('GsvPanoMeta');

function SoyAsset_GsvPanoMeta($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
	$Meta = GoogleLocationToMeta($Meta);
	if ( isArray($Meta) )
	{
		var $Lat = $Meta[0];
		var $Lon = $Meta[1];
		$Meta = new SoyAssetMeta();
		$Meta.Filename = $Lat + ',' + $Lon;
	}
	if ( typeof $Meta == 'string' )
	{
		var $LatLon = $Meta;
		$Meta = new SoyAssetMeta();
		$Meta.Filename = $LatLon;
	}
	
	//	call super
	SoyAsset.apply( this, [$Meta,$OnLoaded,$OnFailed] );
	
	if ( $DoLoad )
		this.Load();
}

SoyAsset_GsvPanoMeta.prototype.Stop = function()
{
	this.mAsset = null;
	assert( !this.IsLoaded(), "Loaded state wrong" );
}

SoyAsset_GsvPanoMeta.prototype.Load = function()
{
	var $LatLon = this.mMeta.Filename.split(',');
	if ( $LatLon.length != 2 )
	{
		this.OnError('invalid lat,lon string: ' + this.mMeta.Filename );
		return false;
	}
	
	var $Location = new google.maps.LatLng( $LatLon[0], $LatLon[1] );
	var $StreetViewService = new google.maps.StreetViewService();
	
	var $MaxDistance = 50;
	
	var $this = this;
	//	https://developers.google.com/maps/documentation/javascript/streetview
	var $HandleResponse = function(result, status)
	{
		if (status === google.maps.StreetViewStatus.OK)
		{
			$this.mAsset = result.location.pano;
			$this.OnLoaded();
		}
		else
		{
			$this.OnError('getPanoramaByLocation failed');
		}
	};
	$StreetViewService.getPanoramaByLocation($Location, $MaxDistance, $HandleResponse );
	
	return true;
}
