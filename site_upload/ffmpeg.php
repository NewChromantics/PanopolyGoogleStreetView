<?php
	echo "<div>";
	$ExitCode = -1;
	passthru('./ffmpeg -version 2>&1', $ExitCode );
	echo "<div>";

	echo "<div>Exit code $ExitCode</div>";

?>
<div>Finished</div>
