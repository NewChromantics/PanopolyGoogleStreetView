
SoyAsset_GsvPanoMeta.prototype = new SoyAsset('GsvPanoMeta');

function SoyAsset_GsvPanoMeta($Meta,$OnLoaded,$OnFailed,$DoLoad)
{
	$DoLoad = CheckDefaultParam($DoLoad,true);
	
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
