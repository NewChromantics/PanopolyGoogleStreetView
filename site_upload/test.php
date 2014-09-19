<?php
	echo "<div><h1>Memory limit</h1>" . ini_get('memory_limit') . "</div>";
	echo "<div><h1>Upload limit</h1>" . ini_get('upload_max_filesize') . "</div>";
	echo "<div><h1>POST content limit</h1>" . ini_get('post_max_size') . "</div>";

	define('FFMPEG_BIN', './ffmpeg' );
	define('FFPROBE_BIN', './ffprobe' );
	
	exec( FFMPEG_BIN . " 2>&1", $ExecOut, $ExitCode );
	$ExecOut = join("\n", $ExecOut );
	echo "<h1>exec " . FFMPEG_BIN . "</h1>[$ExitCode] $ExecOut </div>";

	exec( FFPROBE_BIN . " 2>&1", $ExecOut, $ExitCode );
	$ExecOut = join("\n", $ExecOut );
	echo "<h1>exec " . FFMPEG_BIN . "</h1>[$ExitCode] $ExecOut </div>";
?>
<h1>fin.</h1>