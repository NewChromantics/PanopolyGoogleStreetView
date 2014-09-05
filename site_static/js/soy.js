function removeFromArray(array, item)
{
    while((index = array.indexOf(item)) > -1)
        array.splice(index,1);
}

function ShowElement($ElementName,Visible)
{
	if ( Visible == undefined )
		Visible = true;
	var Element = document.getElementById($ElementName);
	if ( !Element )
		return;
	Element.style.display = Visible ? "block" : "none";
}

function GetElement($Name)
{
	return document.getElementById($Name);
}

function IsDevice(Name)
{
	return ( navigator.userAgent.indexOf(Name) != -1 );
}

function IsWebsocketSupported()
{
	return true;
}

function IsAjaxSupported()
{
	return true;
}