

$(function() {
	
	$.get( "/api/config", function(data) {
		$('#config_loc').text(data['Config_loc']);
		if( data['Media_loc'] ) {
			$('#media_loc').val(data['Media_loc']);
			$('#exclude').val(data['Exclude']);
			$('#remove_orig').prop('checked', data['Remove_orig']);
			showStatus();
		}
	});
	
	$("form").submit(function(event) {
		
		if( !$('#media_loc').val() ) {
			$('#ml_ctrl').addClass('has-error');
			event.preventDefault();
			return;
		}
		
		$('#ml_ctrl').removeClass('has-error');
				
		var exc_dirs = [];
		
		if( $('#exclude').val() ) {
			$.each($('#exclude').val().split(","), function(){
				var ed = $.trim(this);
				if( ed == '' ) {
					return true;//continue;
				}
				ed = '"' + ed + '"'; 
				exc_dirs.push(ed);
			});
		}
		
		var json_data = '{"Config_loc":"' + $('#config_loc').text() + '",' + 
			'"Media_loc":"' + $('#media_loc').val() + '",' +
			'"Exclude":[' + exc_dirs + '],' +
			'"Remove_orig":' + $('#remove_orig').prop("checked") + '}';
				
		$.post("/api/config", json_data, function(data) {
			$('#alr').removeClass("alert-success");
			$('#alr').removeClass("alert-danger");
			
			$('#alr').html('<p class="text-center">'+data['Message']+'</p>');
			if( data['Id'] == 'OK' ) {
				$('#alr').addClass("alert-success");
				showStatus();
			} else {
				$('#alr').addClass("alert-danger");
			}
		}, "json");

		event.preventDefault();
	});	
});

function showStatus() {
	$('#status').show();
	$("#castlnk").attr("href", "/webclient/cast.html");
	
	$.get( "/api/status", function(vfs) {
		var transPath;
		
		$.each(vfs, function(ind, vf) {
			if( vf.Transcoding ){
				transPath = vf.Path;
			}
			
			if( vf.Err ) {
				$('#errs').append(getSRow(vf.Path, vf.Err, true));
			} else {
				$('#files').append(getSRow(vf.Path, vf.Ready?'ready':'queued', false));
			}
		});
		
		if(transPath) {
			$('#ffmpegstat').html("<span>transcoding : " + transPath + "</span>");
		} else {
			$('#ffmpegstat').html("<span>not transcoding <button class='btn btn-outline-primary btn-sm' onclick='scan()'>scan</button> </span>");
		}
	})
}

function scan() {
	$('#ffmpegstat').html("<span>scanning ...</span>");
	$.get( "/api/scan", function(data) {});
}

function getSRow(path, msg, err) {
	 return "<div class='row'>" + 
	 	"<div class='col-xs-12 col-sm-12 col-md-11 col-lg-11 wbr'>" + path + "</div>" +
	 	"<div class='col-xs-2  col-sm-2  col-md-1  col-lg-1'>" + (err?"<p class='text-danger'>":"<p class='text-success'>") + msg + "</p></div>" +
	 	"</div>";
}
